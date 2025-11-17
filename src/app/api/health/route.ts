/**
 * Health Check Endpoint
 *
 * GET /api/health
 *
 * Returns system health status
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkQueueHealth } from '@/lib/queue/config';

export async function GET() {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: false,
      redis: false,
      queues: {},
    },
  };

  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    checks.services.database = true;
  } catch (error) {
    checks.services.database = false;
    checks.status = 'unhealthy';
  }

  try {
    // Check queue system
    const queueHealth = await checkQueueHealth();
    checks.services.redis = queueHealth.redis;
    checks.services.queues = queueHealth.queues;

    if (!queueHealth.redis) {
      checks.status = 'degraded';
    }
  } catch (error) {
    checks.services.redis = false;
    checks.status = 'degraded';
  }

  const statusCode = checks.status === 'healthy' ? 200 : 503;

  return NextResponse.json(checks, { status: statusCode });
}
