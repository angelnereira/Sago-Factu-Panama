/**
 * Organization Settings API
 *
 * Handles saving and retrieving organization configuration:
 * - Issuer/Company data
 * - HKA credentials (encrypted)
 * - Digital signature certificate
 *
 * POST /api/settings/organization
 * GET /api/settings/organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { encrypt, decrypt } from '@/lib/encryption';

const prisma = new PrismaClient();

/**
 * GET - Retrieve organization settings
 */
export async function GET(request: NextRequest) {
  try {
    // In real app, get organizationId from session/auth
    const organizationId = 'org_demo';

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organización no encontrada' },
        { status: 404 }
      );
    }

    // Decrypt sensitive fields
    const decryptedData = {
      ...organization,
      hkaTokenEmpresa: organization.hkaTokenEmpresa
        ? decrypt(organization.hkaTokenEmpresa)
        : '',
      hkaTokenPassword: organization.hkaTokenPassword
        ? decrypt(organization.hkaTokenPassword)
        : '',
      certificadoPassword: organization.certificadoPassword
        ? decrypt(organization.certificadoPassword)
        : '',
    };

    return NextResponse.json({ success: true, data: decryptedData });
  } catch (error: any) {
    console.error('[SettingsAPI] Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Error obteniendo configuración', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST - Update organization settings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // In real app, get organizationId from session/auth
    const organizationId = 'org_demo';

    // Validate required fields
    if (!body.ruc || !body.dv || !body.razonSocial) {
      return NextResponse.json(
        { error: 'RUC, DV y Razón Social son campos requeridos' },
        { status: 400 }
      );
    }

    // Encrypt sensitive fields
    const encryptedData: any = {
      ruc: body.ruc,
      dv: body.dv,
      razonSocial: body.razonSocial,
      nombreComercial: body.nombreComercial || null,
      direccion: body.direccion || null,
      telefono: body.telefono || null,
      email: body.email || null,
      codigoSucursal: body.codigoSucursal || '001',
      puntoFacturacion: body.puntoFacturacion || '001',
      actividadEconomica: body.actividadEconomica || null,
      hkaEnvironment: body.hkaEnvironment || 'DEMO',
    };

    // Encrypt HKA credentials if provided
    if (body.hkaTokenEmpresa) {
      encryptedData.hkaTokenEmpresa = encrypt(body.hkaTokenEmpresa);
    }
    if (body.hkaTokenPassword) {
      encryptedData.hkaTokenPassword = encrypt(body.hkaTokenPassword);
    }

    // Store HKA validation status
    if (body.hkaValidated !== undefined) {
      encryptedData.hkaValidated = body.hkaValidated;
      encryptedData.hkaFoliosRestantes = body.hkaFoliosRestantes;
    }

    // Encrypt certificate password if provided
    if (body.certificadoPassword) {
      encryptedData.certificadoPassword = encrypt(body.certificadoPassword);
    }

    // Store certificate (already base64)
    if (body.certificadoDigital) {
      encryptedData.certificadoDigital = body.certificadoDigital;
      encryptedData.certificadoEmisor = body.certificadoEmisor || null;
      encryptedData.certificadoVigencia = body.certificadoVigencia || null;
    }

    // Upsert organization
    const organization = await prisma.organization.upsert({
      where: { id: organizationId },
      update: encryptedData,
      create: {
        id: organizationId,
        ...encryptedData,
      },
    });

    console.log(`[SettingsAPI] Updated organization ${organization.id}`);

    return NextResponse.json({
      success: true,
      message: 'Configuración guardada exitosamente',
    });
  } catch (error: any) {
    console.error('[SettingsAPI] Error saving settings:', error);
    return NextResponse.json(
      { error: 'Error guardando configuración', details: error.message },
      { status: 500 }
    );
  }
}
