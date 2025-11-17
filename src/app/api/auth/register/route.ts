/**
 * User Registration API
 *
 * Creates new user account and associated organization
 *
 * POST /api/auth/register
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface RegisterRequest {
  // User data
  name: string;
  email: string;
  password: string;

  // Organization data
  organizationName: string;
  ruc: string;
  dv: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json();

    // Validate required fields
    if (!body.email || !body.password || !body.name) {
      return NextResponse.json(
        { error: 'Nombre, email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    if (!body.organizationName || !body.ruc || !body.dv) {
      return NextResponse.json(
        { error: 'Datos de la organización son requeridos' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email ya está registrado' },
        { status: 400 }
      );
    }

    // Check if RUC already exists
    const existingOrg = await prisma.organization.findUnique({
      where: { ruc: body.ruc },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Este RUC ya está registrado' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(body.password, 10);

    // Create organization and user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          ruc: body.ruc,
          dv: body.dv,
          razonSocial: body.organizationName,
          email: body.email,
        },
      });

      // Create user (admin role)
      const user = await tx.user.create({
        data: {
          name: body.name,
          email: body.email,
          password: hashedPassword,
          role: 'ADMIN', // First user is admin
          organizationId: organization.id,
        },
      });

      return { user, organization };
    });

    console.log(`[Register] Created user ${result.user.email} for org ${result.organization.ruc}`);

    // Return success (don't include password)
    return NextResponse.json({
      success: true,
      message: 'Cuenta creada exitosamente',
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
      organization: {
        id: result.organization.id,
        razonSocial: result.organization.razonSocial,
        ruc: result.organization.ruc,
      },
    });
  } catch (error: any) {
    console.error('[Register] Error:', error);

    return NextResponse.json(
      {
        error: 'Error creando cuenta',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
