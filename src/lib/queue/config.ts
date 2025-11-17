/**
 * BullMQ Queue Configuration
 *
 * Manages asynchronous job processing for invoice operations.
 * Uses Redis as the backing store for job persistence and coordination.
 */

import { Queue, QueueOptions } from 'bullmq';
import { Redis } from 'ioredis';

/**
 * Queue Names
 */
export const QUEUE_NAMES = {
  INVOICE_PROCESSING: 'invoice-processing',
  HKA_SYNC: 'hka-sync',
  PDF_GENERATION: 'pdf-generation',
  EMAIL_NOTIFICATION: 'email-notification',
} as const;

/**
 * Job Types
 */
export const JOB_TYPES = {
  PROCESS_INVOICE: 'process-invoice',
  SYNC_INVOICE_STATUS: 'sync-invoice-status',
  GENERATE_PDF: 'generate-pdf',
  SEND_EMAIL: 'send-email',
  CHECK_FOLIOS: 'check-folios',
} as const;

/**
 * Redis Connection
 */
let redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    redisConnection = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisConnection.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    redisConnection.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }

  return redisConnection;
}

/**
 * Default Queue Options
 */
const defaultQueueOptions: QueueOptions = {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 seconds
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // Keep for 24 hours
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs for debugging
      age: 7 * 24 * 3600, // Keep for 7 days
    },
  },
};

/**
 * Invoice Processing Queue
 * Main queue for processing invoices with HKA
 */
export const invoiceProcessingQueue = new Queue(
  QUEUE_NAMES.INVOICE_PROCESSING,
  {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      attempts: 5, // More retries for invoice processing (critical operation)
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      timeout: 300000, // 5 minutes timeout for HKA operations
    },
  }
);

/**
 * HKA Sync Queue
 * For background syncing of invoice statuses
 */
export const hkaSyncQueue = new Queue(
  QUEUE_NAMES.HKA_SYNC,
  defaultQueueOptions
);

/**
 * PDF Generation Queue
 * For generating PDF representations
 */
export const pdfGenerationQueue = new Queue(
  QUEUE_NAMES.PDF_GENERATION,
  defaultQueueOptions
);

/**
 * Email Notification Queue
 * For sending email notifications
 */
export const emailNotificationQueue = new Queue(
  QUEUE_NAMES.EMAIL_NOTIFICATION,
  {
    ...defaultQueueOptions,
    defaultJobOptions: {
      ...defaultQueueOptions.defaultJobOptions,
      attempts: 5, // Email delivery should be reliable
    },
  }
);

/**
 * Get queue by name
 */
export function getQueue(queueName: string): Queue {
  switch (queueName) {
    case QUEUE_NAMES.INVOICE_PROCESSING:
      return invoiceProcessingQueue;
    case QUEUE_NAMES.HKA_SYNC:
      return hkaSyncQueue;
    case QUEUE_NAMES.PDF_GENERATION:
      return pdfGenerationQueue;
    case QUEUE_NAMES.EMAIL_NOTIFICATION:
      return emailNotificationQueue;
    default:
      throw new Error(`Unknown queue: ${queueName}`);
  }
}

/**
 * Graceful shutdown
 * Close all queues and Redis connection
 */
export async function closeQueues(): Promise<void> {
  await Promise.all([
    invoiceProcessingQueue.close(),
    hkaSyncQueue.close(),
    pdfGenerationQueue.close(),
    emailNotificationQueue.close(),
  ]);

  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}

/**
 * Health check for queue system
 */
export async function checkQueueHealth(): Promise<{
  redis: boolean;
  queues: Record<string, boolean>;
}> {
  const redis = redisConnection?.status === 'ready';

  const queues = {
    [QUEUE_NAMES.INVOICE_PROCESSING]: await invoiceProcessingQueue.isPaused() === false,
    [QUEUE_NAMES.HKA_SYNC]: await hkaSyncQueue.isPaused() === false,
    [QUEUE_NAMES.PDF_GENERATION]: await pdfGenerationQueue.isPaused() === false,
    [QUEUE_NAMES.EMAIL_NOTIFICATION]: await emailNotificationQueue.isPaused() === false,
  };

  return { redis, queues };
}
