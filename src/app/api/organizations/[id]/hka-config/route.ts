/**
 * API Route: HKA Configuration for Organization
 *
 * POST /api/organizations/[id]/hka-config - Update HKA credentials
 * GET /api/organizations/[id]/hka-config - Get current configuration (without credentials)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/encryption';
import { createHKAClient } from '@/lib/hka/soap-client';

const HKAConfigSchema = z.object({
  hkaEnvironment: z.enum(['DEMO', 'PRODUCTION']),
  hkaTokenEmpresa: z.string().min(1),
  hkaTokenPassword: z.string().min(1),
  validateConnection: z.boolean().default(true),
});

/**
 * GET - Retrieve HKA configuration status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const organization = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        ruc: true,
        hkaEnvironment: true,
        hkaValidated: true,
        hkaFoliosRestantes: true,
        hkaLastSync: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      organization,
      hasCredentials: true, // We don't expose actual credentials
    });

  } catch (error: any) {
    console.error('Error fetching HKA config:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST - Update HKA credentials and validate connection
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validatedData = HKAConfigSchema.parse(body);

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Validate connection if requested
    let validated = false;
    let foliosRestantes = null;
    let validationError = null;

    if (validatedData.validateConnection) {
      try {
        const hkaClient = createHKAClient(
          validatedData.hkaEnvironment.toLowerCase() as 'demo' | 'production',
          {
            tokenEmpresa: validatedData.hkaTokenEmpresa,
            tokenPassword: validatedData.hkaTokenPassword,
          }
        );

        // Test connection by calling FoliosRestantes
        const result = await hkaClient.foliosRestantes();
        foliosRestantes = result.foliosDisponibles;
        validated = true;

      } catch (error: any) {
        validationError = error.message;
        validated = false;
      }
    }

    // Encrypt credentials
    const encryptedTokenEmpresa = encrypt(validatedData.hkaTokenEmpresa);
    const encryptedTokenPassword = encrypt(validatedData.hkaTokenPassword);

    // Update organization
    const updatedOrg = await prisma.organization.update({
      where: { id },
      data: {
        hkaEnvironment: validatedData.hkaEnvironment,
        hkaTokenEmpresa: encryptedTokenEmpresa,
        hkaTokenPassword: encryptedTokenPassword,
        hkaValidated: validated,
        hkaFoliosRestantes: foliosRestantes,
        hkaLastSync: validated ? new Date() : null,
      },
      select: {
        id: true,
        name: true,
        hkaEnvironment: true,
        hkaValidated: true,
        hkaFoliosRestantes: true,
        hkaLastSync: true,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        organizationId: id,
        action: 'UPDATE_HKA_CONFIG',
        entity: 'Organization',
        details: {
          environment: validatedData.hkaEnvironment,
          validated,
          foliosRestantes,
          validationError,
        },
      },
    });

    if (!validated && validatedData.validateConnection) {
      return NextResponse.json({
        success: false,
        organization: updatedOrg,
        error: 'Connection validation failed',
        details: validationError,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      organization: updatedOrg,
      message: validated
        ? `HKA credentials validated successfully. ${foliosRestantes} folios available.`
        : 'HKA credentials saved (validation skipped)',
    });

  } catch (error: any) {
    console.error('Error updating HKA config:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
