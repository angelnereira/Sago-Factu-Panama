/**
 * Invoice Processing Worker
 *
 * This worker consumes jobs from the invoice-processing queue and handles
 * the complete lifecycle of sending invoices to HKA for certification.
 *
 * Responsibilities:
 * 1. Retrieve invoice and organization data from DB
 * 2. Decrypt organization credentials
 * 3. Generate DGI-compliant XML
 * 4. Send to HKA via SOAP
 * 5. Update invoice status based on response
 * 6. Trigger notifications
 */

import { Worker, Job } from 'bullmq';
import { prisma, InvoiceStatus } from '@/lib/prisma';
import { getRedisConnection, QUEUE_NAMES, JOB_TYPES } from '@/lib/queue/config';
import { ProcessInvoiceJobData } from '@/lib/queue/jobs';
import { createHKAClient, HKACredentials } from '@/lib/hka/soap-client';
import { generateInvoiceXML, xmlToBase64, validateInvoiceData } from '@/lib/hka/xml-generator';
import { decrypt } from '@/lib/encryption';
import { isHKASuccess } from '@/config/hka.config';

/**
 * Process a single invoice
 */
async function processInvoice(job: Job<ProcessInvoiceJobData>) {
  const { invoiceId, organizationId } = job.data;

  console.log(`[Worker] Processing invoice ${invoiceId} for organization ${organizationId}`);

  try {
    // Step 1: Retrieve invoice with items
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true },
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    // Verify it belongs to the organization
    if (invoice.organizationId !== organizationId) {
      throw new Error(`Invoice ${invoiceId} does not belong to organization ${organizationId}`);
    }

    // Step 2: Update status to PROCESSING
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.PROCESSING,
        processingStartedAt: new Date(),
      },
    });

    await job.updateProgress(20);

    // Step 3: Retrieve organization with credentials
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    if (!organization.hkaTokenEmpresa || !organization.hkaTokenPassword) {
      throw new Error(`Organization ${organizationId} has no HKA credentials configured`);
    }

    if (!organization.hkaValidated) {
      throw new Error(`Organization ${organizationId} HKA credentials not validated. Please run connection test first.`);
    }

    // Step 4: Decrypt credentials
    const credentials: HKACredentials = {
      tokenEmpresa: decrypt(organization.hkaTokenEmpresa),
      tokenPassword: decrypt(organization.hkaTokenPassword),
    };

    await job.updateProgress(40);

    // Step 5: Validate invoice data
    const validationErrors = validateInvoiceData(invoice as any);
    if (validationErrors.length > 0) {
      throw new Error(`Invoice validation failed: ${validationErrors.join(', ')}`);
    }

    // Step 6: Generate XML
    const xml = generateInvoiceXML(invoice as any, {
      ruc: organization.ruc,
      dv: organization.dv,
      nombre: organization.razonSocial,
      direccion: organization.direccion || '',
      codigoSucursal: organization.codigoSucursal,
      puntoFacturacion: organization.puntoFacturacion,
    });

    const xmlBase64 = xmlToBase64(xml);

    await job.updateProgress(60);

    // Step 7: Send to HKA
    const hkaClient = createHKAClient(organization.hkaEnvironment, credentials);

    console.log(`[Worker] Sending invoice ${invoiceId} to HKA (${organization.hkaEnvironment})`);

    const response = await hkaClient.enviar(xmlBase64);

    await job.updateProgress(80);

    // Step 8: Process response
    const success = isHKASuccess(response.codigo);

    if (success && response.cufe) {
      // SUCCESS: Invoice authorized by HKA
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: InvoiceStatus.AUTHORIZED,
          cufe: response.cufe,
          hkaStatus: 'ACEPTADO',
          hkaResponseCode: response.codigo,
          hkaResponseMessage: response.mensaje,
          hkaResponse: response as any,
          xmlSigned: response.xmlFirmado,
          pdfBase64: response.pdf,
          qrCode: response.qr,
          processedAt: new Date(),
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          organizationId,
          invoiceId,
          action: 'HKA_AUTHORIZED',
          entity: 'Invoice',
          details: {
            cufe: response.cufe,
            responseCode: response.codigo,
          },
        },
      });

      console.log(`[Worker] Invoice ${invoiceId} AUTHORIZED with CUFE: ${response.cufe}`);

      // TODO: Enqueue email notification
      // await enqueueEmailNotification({
      //   invoiceId,
      //   recipientEmail: invoice.receptorEmail || '',
      //   type: 'invoice_authorized',
      // });

    } else {
      // REJECTED: HKA rejected the invoice
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: InvoiceStatus.REJECTED,
          hkaStatus: 'RECHAZADO',
          hkaResponseCode: response.codigo,
          hkaResponseMessage: response.mensaje,
          hkaResponse: response as any,
          lastError: response.mensaje,
          processedAt: new Date(),
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          organizationId,
          invoiceId,
          action: 'HKA_REJECTED',
          entity: 'Invoice',
          details: {
            responseCode: response.codigo,
            reason: response.mensaje,
          },
        },
      });

      console.log(`[Worker] Invoice ${invoiceId} REJECTED: ${response.mensaje}`);

      throw new Error(`HKA rejected invoice: ${response.mensaje}`);
    }

    await job.updateProgress(100);

    return {
      success: true,
      cufe: response.cufe,
      invoiceId,
    };

  } catch (error: any) {
    console.error(`[Worker] Error processing invoice ${invoiceId}:`, error);

    // Update invoice status to FAILED
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.FAILED,
        lastError: error.message,
        retryCount: {
          increment: 1,
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        organizationId,
        invoiceId,
        action: 'HKA_ERROR',
        entity: 'Invoice',
        details: {
          error: error.message,
          stack: error.stack,
        },
      },
    });

    // Re-throw to trigger BullMQ retry mechanism
    throw error;
  }
}

/**
 * Create and start the invoice processing worker
 */
export function createInvoiceProcessingWorker() {
  const worker = new Worker(
    QUEUE_NAMES.INVOICE_PROCESSING,
    async (job: Job<ProcessInvoiceJobData>) => {
      return await processInvoice(job);
    },
    {
      connection: getRedisConnection(),
      concurrency: 5, // Process up to 5 invoices simultaneously
      limiter: {
        max: 10, // Max 10 jobs per duration
        duration: 1000, // Per 1 second
      },
    }
  );

  // Event handlers
  worker.on('completed', (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err);
  });

  worker.on('error', (err) => {
    console.error('[Worker] Worker error:', err);
  });

  console.log(`[Worker] Invoice processing worker started`);

  return worker;
}
