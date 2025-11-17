/**
 * Workers Entry Point
 *
 * This file starts all background workers for the SAGO-FACTU system.
 * Run this with: npm run worker
 *
 * In production (Vercel), you would deploy this as a separate service
 * or use a dedicated worker platform like Railway, Render, or AWS ECS.
 */

import { createInvoiceProcessingWorker } from './invoice-processor';
import { closeQueues } from '@/lib/queue/config';

console.log('🚀 Starting SAGO-FACTU Workers...');

// Start all workers
const workers = [
  createInvoiceProcessingWorker(),
  // Add more workers here as needed
  // createHKASyncWorker(),
  // createEmailWorker(),
];

console.log(`✅ ${workers.length} worker(s) started successfully`);

// Graceful shutdown
const shutdown = async () => {
  console.log('📴 Shutting down workers...');

  // Close all workers
  await Promise.all(workers.map(worker => worker.close()));

  // Close queues and Redis
  await closeQueues();

  console.log('✅ Workers shut down successfully');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Keep process alive
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
