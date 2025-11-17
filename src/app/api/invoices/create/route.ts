/**
 * API Route: Create Invoice
 *
 * POST /api/invoices/create
 *
 * Creates a new invoice and enqueues it for processing.
 * This is the main entry point for invoice creation in the system.
 *
 * Flow:
 * 1. Validate request data
 * 2. Calculate totals
 * 3. Save invoice to DB with status QUEUED
 * 4. Enqueue for processing
 * 5. Return immediately (async processing)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma, InvoiceStatus } from '@/lib/prisma';
import { enqueueInvoiceProcessing } from '@/lib/queue/jobs';
import { calculateInvoiceTotals } from '@/lib/hka/xml-generator';
import {
  TIPO_DOCUMENTO,
  TIPO_EMISION,
  TIPO_RECEPTOR,
  FORMA_PAGO,
  TASA_ITBMS,
} from '@/config/hka.config';

/**
 * Request Schema Validation
 */
const InvoiceItemSchema = z.object({
  descripcion: z.string().max(500),
  cantidad: z.number().positive(),
  precioUnitario: z.number().positive(),
  tasaItbms: z.enum([TASA_ITBMS.CERO, TASA_ITBMS.SIETE, TASA_ITBMS.DIEZ, TASA_ITBMS.QUINCE]),
  descuento: z.number().nonnegative().optional().default(0),
});

const CreateInvoiceSchema = z.object({
  organizationId: z.string(),
  userId: z.string(),

  // Document type
  tipoDocumento: z.string().default(TIPO_DOCUMENTO.FACTURA),
  tipoEmision: z.string().default(TIPO_EMISION.NORMAL),

  // Receptor
  tipoReceptor: z.enum([
    TIPO_RECEPTOR.CONTRIBUYENTE,
    TIPO_RECEPTOR.CONSUMIDOR_FINAL,
    TIPO_RECEPTOR.GOBIERNO,
    TIPO_RECEPTOR.EXTRANJERO,
  ]),
  receptorRuc: z.string().optional(),
  receptorDv: z.string().optional(),
  receptorNombre: z.string(),
  receptorEmail: z.string().email().optional(),
  receptorTelefono: z.string().optional(),
  receptorDireccion: z.string().optional(),

  // Payment
  formaPago: z.string().default(FORMA_PAGO.CONTADO),

  // Items
  items: z.array(InvoiceItemSchema).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validatedData = CreateInvoiceSchema.parse(body);

    // Verify organization exists and user belongs to it
    const organization = await prisma.organization.findUnique({
      where: { id: validatedData.organizationId },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        id: validatedData.userId,
        organizationId: validatedData.organizationId,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found or does not belong to organization' },
        { status: 403 }
      );
    }

    // Validate HKA credentials are configured
    if (!organization.hkaTokenEmpresa || !organization.hkaValidated) {
      return NextResponse.json(
        {
          error: 'HKA credentials not configured or validated',
          details: 'Please configure and validate HKA credentials in organization settings',
        },
        { status: 400 }
      );
    }

    // Get next document number (simplified - in production use atomic counters)
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        organizationId: validatedData.organizationId,
        tipoDocumento: validatedData.tipoDocumento,
      },
      orderBy: { numeroDocumentoFiscal: 'desc' },
    });

    const nextNumber = lastInvoice
      ? (parseInt(lastInvoice.numeroDocumentoFiscal) + 1).toString().padStart(10, '0')
      : '0000000001';

    // Calculate totals
    const totals = calculateInvoiceTotals(validatedData.items.map(item => ({
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      tasaItbms: item.tasaItbms,
      descuento: item.descuento || 0,
    })));

    // Create invoice with items in transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice = await prisma.$transaction(async (tx: any) => {
      // Create invoice
      const inv = await tx.invoice.create({
        data: {
          organizationId: validatedData.organizationId,
          createdBy: validatedData.userId,

          // Document identification
          tipoDocumento: validatedData.tipoDocumento,
          numeroDocumentoFiscal: nextNumber,
          codigoSucursalEmisor: organization.codigoSucursal,
          puntoFacturacionFiscal: organization.puntoFacturacion,
          tipoEmision: validatedData.tipoEmision,

          // Receptor
          tipoReceptor: validatedData.tipoReceptor,
          receptorRuc: validatedData.receptorRuc,
          receptorDv: validatedData.receptorDv,
          receptorNombre: validatedData.receptorNombre,
          receptorEmail: validatedData.receptorEmail,
          receptorTelefono: validatedData.receptorTelefono,
          receptorDireccion: validatedData.receptorDireccion,

          // Totals
          subtotal: totals.subtotal,
          totalItbms: totals.totalItbms,
          totalDescuento: totals.totalDescuento,
          totalMontoGravado: totals.totalMontoGravado,
          totalFactura: totals.totalFactura,

          // Payment
          formaPago: validatedData.formaPago,

          // Status
          status: InvoiceStatus.QUEUED,
          enqueuedAt: new Date(),
        },
      });

      // Create items
      await tx.invoiceItem.createMany({
        data: validatedData.items.map(item => {
          const itemSubtotal = item.cantidad * item.precioUnitario;
          const itemItbms = itemSubtotal * (item.tasaItbms === TASA_ITBMS.SIETE ? 0.07 : item.tasaItbms === TASA_ITBMS.DIEZ ? 0.10 : item.tasaItbms === TASA_ITBMS.QUINCE ? 0.15 : 0);
          const itemTotal = itemSubtotal + itemItbms - (item.descuento || 0);

          return {
            invoiceId: inv.id,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            valorTotal: itemTotal,
            tasaItbms: item.tasaItbms,
            valorItbms: itemItbms,
            descuento: item.descuento || 0,
          };
        }),
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          organizationId: validatedData.organizationId,
          userId: validatedData.userId,
          invoiceId: inv.id,
          action: 'CREATE',
          entity: 'Invoice',
          details: {
            numeroDocumento: nextNumber,
            totalFactura: totals.totalFactura,
          },
        },
      });

      return inv;
    });

    // Enqueue for processing (async - don't await)
    enqueueInvoiceProcessing({
      invoiceId: invoice.id,
      organizationId: validatedData.organizationId,
    }).catch(err => {
      console.error('Failed to enqueue invoice:', err);
    });

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        numeroDocumentoFiscal: invoice.numeroDocumentoFiscal,
        status: invoice.status,
        totalFactura: invoice.totalFactura,
      },
      message: 'Invoice created and queued for processing',
    });

  } catch (error: any) {
    console.error('Error creating invoice:', error);

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
