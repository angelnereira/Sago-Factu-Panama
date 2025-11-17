/**
 * Reconciliation Worker
 *
 * Even with the best polling, discrepancies can occur due to network issues
 * or temporary errors. This worker runs periodically (recommended: nightly)
 * to verify that all local documents match their state in HKA.
 *
 * This ensures data consistency and catches any documents that might have
 * "fallen through the cracks" during normal processing.
 */

import { PrismaClient, InvoiceStatus } from '@prisma/client';
import { createHKAClient, DocumentData } from '@/lib/hka/soap-client';
import { decrypt } from '@/lib/encryption';

const prisma = new PrismaClient();

interface ReconciliationReport {
  totalChecked: number;
  discrepanciesFound: number;
  fixed: number;
  errors: number;
  details: Array<{
    invoiceId: string;
    numeroDocumento: string;
    localStatus: string;
    hkaStatus: string;
    action: string;
  }>;
}

/**
 * Reconcile a single invoice with HKA
 */
async function reconcileInvoice(invoiceId: string): Promise<{
  hasDiscrepancy: boolean;
  fixed: boolean;
  details: string;
}> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { organization: true },
  });

  if (!invoice) {
    return {
      hasDiscrepancy: false,
      fixed: false,
      details: 'Invoice not found',
    };
  }

  // Skip drafts and cancelled invoices
  if (invoice.status === 'DRAFT' || invoice.status === 'CANCELLED') {
    return {
      hasDiscrepancy: false,
      fixed: false,
      details: 'Skipped (draft or cancelled)',
    };
  }

  // Decrypt credentials
  if (
    !invoice.organization.hkaTokenEmpresa ||
    !invoice.organization.hkaTokenPassword
  ) {
    return {
      hasDiscrepancy: false,
      fixed: false,
      details: 'No HKA credentials',
    };
  }

  const credentials = {
    tokenEmpresa: decrypt(invoice.organization.hkaTokenEmpresa),
    tokenPassword: decrypt(invoice.organization.hkaTokenPassword),
  };

  const hkaClient = createHKAClient(
    invoice.organization.hkaEnvironment.toLowerCase() as 'demo' | 'production',
    credentials
  );

  // Query HKA for current status
  try {
    const documentData: DocumentData = {
      codigoSucursalEmisor: invoice.codigoSucursalEmisor,
      numeroDocumentoFiscal: invoice.numeroDocumentoFiscal,
      puntoFacturacionFiscal: invoice.puntoFacturacionFiscal,
      tipoDocumento: invoice.tipoDocumento,
      tipoEmision: invoice.tipoEmision,
    };

    const statusResponse = await hkaClient.estadoDocumento(documentData);

    // Map HKA status to our status
    const hkaToLocalStatus: Record<string, InvoiceStatus> = {
      ACEPTADO: 'AUTHORIZED',
      RECHAZADO: 'REJECTED',
      EN_PROCESO: 'PROCESSING',
      ANULADO: 'ANNULLED',
    };

    const expectedStatus = hkaToLocalStatus[statusResponse.estado];

    // Check for discrepancy
    if (invoice.status !== expectedStatus) {
      console.log(
        `[Reconciliation] Discrepancy found: Invoice ${invoice.numeroDocumentoFiscal} - Local: ${invoice.status}, HKA: ${statusResponse.estado}`
      );

      // Fix the discrepancy
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: expectedStatus,
          cufe: statusResponse.cufe || invoice.cufe,
          hkaStatus: statusResponse.estado,
          hkaResponseMessage: statusResponse.mensaje,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          organizationId: invoice.organizationId,
          invoiceId: invoice.id,
          action: 'RECONCILIATION_FIX',
          entity: 'Invoice',
          details: {
            oldStatus: invoice.status,
            newStatus: expectedStatus,
            hkaStatus: statusResponse.estado,
            cufe: statusResponse.cufe,
          },
        },
      });

      return {
        hasDiscrepancy: true,
        fixed: true,
        details: `Fixed: ${invoice.status} → ${expectedStatus}`,
      };
    }

    // No discrepancy
    return {
      hasDiscrepancy: false,
      fixed: false,
      details: 'Status matches',
    };
  } catch (error: any) {
    console.error(
      `[Reconciliation] Error reconciling invoice ${invoiceId}:`,
      error
    );

    return {
      hasDiscrepancy: false,
      fixed: false,
      details: `Error: ${error.message}`,
    };
  }
}

/**
 * Run full reconciliation process
 *
 * @param hoursBack - How many hours back to check (default: 24)
 * @returns Reconciliation report
 */
export async function runReconciliation(
  hoursBack: number = 24
): Promise<ReconciliationReport> {
  console.log(
    `[Reconciliation] Starting reconciliation for last ${hoursBack} hours`
  );

  const cutoffDate = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  // Find all invoices that were processed in the last N hours
  // and are not in a final stable state
  const invoicesToCheck = await prisma.invoice.findMany({
    where: {
      createdAt: {
        gte: cutoffDate,
      },
      status: {
        in: ['QUEUED', 'PROCESSING', 'AUTHORIZED', 'REJECTED'],
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(
    `[Reconciliation] Found ${invoicesToCheck.length} invoices to reconcile`
  );

  const report: ReconciliationReport = {
    totalChecked: invoicesToCheck.length,
    discrepanciesFound: 0,
    fixed: 0,
    errors: 0,
    details: [],
  };

  // Process invoices in batches to avoid overwhelming HKA
  const batchSize = 5;

  for (let i = 0; i < invoicesToCheck.length; i += batchSize) {
    const batch = invoicesToCheck.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map((invoice) => reconcileInvoice(invoice.id))
    );

    results.forEach((result, index) => {
      const invoice = batch[index];

      if (result.status === 'fulfilled') {
        const { hasDiscrepancy, fixed, details } = result.value;

        if (hasDiscrepancy) {
          report.discrepanciesFound++;
          if (fixed) {
            report.fixed++;
          }

          report.details.push({
            invoiceId: invoice.id,
            numeroDocumento: invoice.numeroDocumentoFiscal,
            localStatus: invoice.status,
            hkaStatus: 'Unknown',
            action: details,
          });
        }
      } else {
        report.errors++;
        console.error(
          `[Reconciliation] Error processing ${invoice.numeroDocumentoFiscal}:`,
          result.reason
        );
      }
    });

    // Wait a bit between batches to be nice to HKA
    if (i + batchSize < invoicesToCheck.length) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 second delay
    }
  }

  console.log(`[Reconciliation] Reconciliation complete:`, report);

  // Store reconciliation report in audit log
  await prisma.auditLog.create({
    data: {
      action: 'RECONCILIATION_RUN',
      entity: 'System',
      details: report,
    },
  });

  return report;
}

/**
 * Schedule periodic reconciliation
 * Recommended: Run nightly at low-traffic hours
 */
export async function scheduleReconciliation(): Promise<void> {
  console.log('[Reconciliation] Scheduling nightly reconciliation at 2:00 AM');

  const runAtScheduledTime = async () => {
    const now = new Date();
    const scheduledHour = 2; // 2:00 AM

    if (now.getHours() === scheduledHour) {
      console.log('[Reconciliation] Running scheduled reconciliation');
      try {
        const report = await runReconciliation(48); // Check last 48 hours
        console.log('[Reconciliation] Report:', report);
      } catch (error) {
        console.error('[Reconciliation] Error in scheduled run:', error);
      }
    }
  };

  // Check every hour if it's time to run
  setInterval(runAtScheduledTime, 60 * 60 * 1000); // Every hour

  // Also run immediately if it's the scheduled hour
  await runAtScheduledTime();
}

/**
 * Manual reconciliation trigger (for admin use)
 */
export async function triggerManualReconciliation(
  hoursBack: number = 24
): Promise<ReconciliationReport> {
  console.log('[Reconciliation] Manual reconciliation triggered');
  return await runReconciliation(hoursBack);
}
