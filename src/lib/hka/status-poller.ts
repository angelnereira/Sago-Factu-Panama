/**
 * Intelligent Status Polling Service
 *
 * After sending a document to HKA, we need to poll for its status.
 * However, we don't want to bombard HKA with constant queries.
 *
 * Strategy: Incremental backoff polling
 * - Poll after 5 seconds
 * - Then 10 seconds
 * - Then 30 seconds
 * - Then every 1 minute
 * - Maximum every 5 minutes for long-running processes
 *
 * This balances responsiveness with efficiency.
 */

import { prisma } from '@/lib/prisma';
import { createHKAClient, DocumentData } from './soap-client';
import { decrypt } from '@/lib/encryption';

/**
 * Polling intervals (in milliseconds)
 */
const POLLING_INTERVALS = [
  5000, // 5 seconds
  10000, // 10 seconds (cumulative: 15s)
  30000, // 30 seconds (cumulative: 45s)
  60000, // 1 minute (cumulative: 1m 45s)
  120000, // 2 minutes (cumulative: 3m 45s)
  300000, // 5 minutes (cumulative: 8m 45s)
];

/**
 * Maximum interval for long-running processes
 */
const MAX_POLLING_INTERVAL = 300000; // 5 minutes

/**
 * Maximum total time to poll before giving up
 */
const MAX_POLLING_TIME = 3600000; // 1 hour

export interface PollingResult {
  status: 'ACEPTADO' | 'RECHAZADO' | 'EN_PROCESO' | 'TIMEOUT';
  cufe?: string;
  message: string;
  pollCount: number;
  totalTime: number;
}

/**
 * Get next polling interval based on attempt number
 */
function getNextInterval(attemptNumber: number): number {
  if (attemptNumber < POLLING_INTERVALS.length) {
    return POLLING_INTERVALS[attemptNumber];
  }
  return MAX_POLLING_INTERVAL;
}

/**
 * Poll HKA for document status with intelligent backoff
 */
export async function pollDocumentStatus(
  invoiceId: string,
  maxAttempts: number = 20
): Promise<PollingResult> {
  const startTime = Date.now();
  let attemptCount = 0;

  console.log(`[StatusPoller] Starting polling for invoice ${invoiceId}`);

  while (attemptCount < maxAttempts) {
    // Check if we've exceeded max time
    const elapsedTime = Date.now() - startTime;
    if (elapsedTime > MAX_POLLING_TIME) {
      console.log(`[StatusPoller] Polling timeout after ${elapsedTime}ms`);
      return {
        status: 'TIMEOUT',
        message: 'Polling timeout exceeded',
        pollCount: attemptCount,
        totalTime: elapsedTime,
      };
    }

    // Get invoice and organization
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { organization: true },
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    // If invoice already has final status, return it
    if (invoice.status === 'AUTHORIZED' || invoice.status === 'REJECTED') {
      return {
        status: invoice.status === 'AUTHORIZED' ? 'ACEPTADO' : 'RECHAZADO',
        cufe: invoice.cufe || undefined,
        message: invoice.hkaResponseMessage || 'Status already finalized',
        pollCount: attemptCount,
        totalTime: elapsedTime,
      };
    }

    // Prepare HKA client
    if (
      !invoice.organization.hkaTokenEmpresa ||
      !invoice.organization.hkaTokenPassword
    ) {
      throw new Error('HKA credentials not configured');
    }

    const credentials = {
      tokenEmpresa: decrypt(invoice.organization.hkaTokenEmpresa),
      tokenPassword: decrypt(invoice.organization.hkaTokenPassword),
    };

    const hkaClient = createHKAClient(
      invoice.organization.hkaEnvironment.toLowerCase() as 'demo' | 'production',
      credentials
    );

    // Query status
    try {
      const documentData: DocumentData = {
        codigoSucursalEmisor: invoice.codigoSucursalEmisor,
        numeroDocumentoFiscal: invoice.numeroDocumentoFiscal,
        puntoFacturacionFiscal: invoice.puntoFacturacionFiscal,
        tipoDocumento: invoice.tipoDocumento,
        tipoEmision: invoice.tipoEmision,
      };

      const statusResponse = await hkaClient.estadoDocumento(documentData);

      console.log(
        `[StatusPoller] Attempt ${attemptCount + 1}: Status = ${
          statusResponse.estado
        }`
      );

      // If status is final, update and return
      if (
        statusResponse.estado === 'ACEPTADO' ||
        statusResponse.estado === 'RECHAZADO'
      ) {
        // Update invoice in database
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status:
              statusResponse.estado === 'ACEPTADO' ? 'AUTHORIZED' : 'REJECTED',
            cufe: statusResponse.cufe,
            hkaStatus: statusResponse.estado,
            hkaResponseMessage: statusResponse.mensaje,
            processedAt: new Date(),
          },
        });

        return {
          status: statusResponse.estado,
          cufe: statusResponse.cufe,
          message: statusResponse.mensaje,
          pollCount: attemptCount + 1,
          totalTime: Date.now() - startTime,
        };
      }

      // Status still pending, wait before next poll
      attemptCount++;
      const interval = getNextInterval(attemptCount);

      console.log(
        `[StatusPoller] Status still pending, waiting ${interval}ms before next poll`
      );

      await new Promise((resolve) => setTimeout(resolve, interval));
    } catch (error) {
      console.error(`[StatusPoller] Error querying status:`, error);

      // On error, wait and retry (with backoff)
      attemptCount++;
      const interval = getNextInterval(attemptCount);
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  // Max attempts reached
  console.log(
    `[StatusPoller] Max attempts (${maxAttempts}) reached for invoice ${invoiceId}`
  );

  return {
    status: 'TIMEOUT',
    message: `Max polling attempts (${maxAttempts}) reached`,
    pollCount: attemptCount,
    totalTime: Date.now() - startTime,
  };
}

/**
 * Background job to poll pending invoices
 */
export async function pollPendingInvoices(): Promise<void> {
  console.log('[StatusPoller] Starting batch poll of pending invoices');

  // Find all invoices in PROCESSING state that are older than 5 seconds
  const fiveSecondsAgo = new Date(Date.now() - 5000);

  const pendingInvoices = await prisma.invoice.findMany({
    where: {
      status: 'PROCESSING',
      processingStartedAt: {
        lte: fiveSecondsAgo,
      },
    },
    take: 10, // Process 10 at a time
    orderBy: {
      processingStartedAt: 'asc', // Oldest first
    },
  });

  console.log(
    `[StatusPoller] Found ${pendingInvoices.length} pending invoices to poll`
  );

  // Poll each invoice (in parallel, but limited)
  const results = await Promise.allSettled(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pendingInvoices.map((invoice: any) =>
      pollDocumentStatus(invoice.id, 3) // Limit to 3 attempts in batch mode
    )
  );

  const successful = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(
    `[StatusPoller] Batch complete: ${successful} successful, ${failed} failed`
  );
}

/**
 * Start periodic polling worker
 * Call this from a cron job or background worker
 */
export async function startPeriodicPoller(intervalMs: number = 60000): Promise<void> {
  console.log(`[StatusPoller] Starting periodic poller every ${intervalMs}ms`);

  const poll = async () => {
    try {
      await pollPendingInvoices();
    } catch (error) {
      console.error('[StatusPoller] Error in periodic poll:', error);
    }
  };

  // Run immediately
  await poll();

  // Then run periodically
  setInterval(poll, intervalMs);
}
