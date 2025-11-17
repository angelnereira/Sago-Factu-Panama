/**
 * Queue Job Definitions and Helpers
 *
 * Type-safe job creation and enqueueing functions
 */

import { JobsOptions } from 'bullmq';
import {
  invoiceProcessingQueue,
  hkaSyncQueue,
  emailNotificationQueue,
  JOB_TYPES,
} from './config';

/**
 * Invoice Processing Job Data
 */
export interface ProcessInvoiceJobData {
  invoiceId: string;
  organizationId: string;
  retryCount?: number;
}

/**
 * Sync Invoice Status Job Data
 */
export interface SyncInvoiceStatusJobData {
  invoiceId: string;
  organizationId: string;
}

/**
 * Email Notification Job Data
 */
export interface EmailNotificationJobData {
  invoiceId: string;
  recipientEmail: string;
  type: 'invoice_created' | 'invoice_authorized' | 'invoice_rejected';
}

/**
 * Enqueue invoice for processing
 * This is the main entry point for invoice processing
 */
export async function enqueueInvoiceProcessing(
  data: ProcessInvoiceJobData,
  options?: JobsOptions
) {
  const jobId = `invoice-${data.invoiceId}-${Date.now()}`;

  return await invoiceProcessingQueue.add(
    JOB_TYPES.PROCESS_INVOICE,
    data,
    {
      jobId,
      ...options,
    }
  );
}

/**
 * Enqueue invoice status sync
 * For checking status of pending invoices
 */
export async function enqueueInvoiceStatusSync(
  data: SyncInvoiceStatusJobData,
  options?: JobsOptions
) {
  const jobId = `sync-${data.invoiceId}-${Date.now()}`;

  return await hkaSyncQueue.add(
    JOB_TYPES.SYNC_INVOICE_STATUS,
    data,
    {
      jobId,
      delay: 5000, // Wait 5 seconds before checking status
      ...options,
    }
  );
}

/**
 * Enqueue email notification
 */
export async function enqueueEmailNotification(
  data: EmailNotificationJobData,
  options?: JobsOptions
) {
  const jobId = `email-${data.invoiceId}-${Date.now()}`;

  return await emailNotificationQueue.add(
    JOB_TYPES.SEND_EMAIL,
    data,
    {
      jobId,
      ...options,
    }
  );
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string, queueName: string) {
  const { getQueue } = await import('./config');
  const queue = getQueue(queueName);
  const job = await queue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress;

  return {
    id: job.id,
    name: job.name,
    data: job.data,
    state,
    progress,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason,
    finishedOn: job.finishedOn,
    processedOn: job.processedOn,
  };
}

/**
 * Cancel a job
 */
export async function cancelJob(jobId: string, queueName: string) {
  const { getQueue } = await import('./config');
  const queue = getQueue(queueName);
  const job = await queue.getJob(jobId);

  if (job) {
    await job.remove();
    return true;
  }

  return false;
}
