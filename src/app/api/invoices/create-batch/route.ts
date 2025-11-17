/**
 * Batch Invoice Creation API
 *
 * Creates multiple invoices from edited/manual data.
 * Used after users have reviewed and edited imported invoices.
 *
 * POST /api/invoices/create-batch
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma, InvoiceStatus } from '@/lib/prisma';
import { MappedInvoiceData } from '@/lib/import/field-mapper';
import { enqueueInvoiceProcessing } from '@/lib/queue/jobs';

interface CreateBatchRequest {
  organizationId: string;
  invoices: MappedInvoiceData[];
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateBatchRequest = await request.json();

    const { organizationId, invoices } = body;

    // Validate inputs
    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId es requerido' },
        { status: 400 }
      );
    }

    if (!invoices || invoices.length === 0) {
      return NextResponse.json(
        { error: 'No se proporcionaron facturas' },
        { status: 400 }
      );
    }

    // Verify organization exists and has HKA credentials
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        hkaValidated: true,
        codigoSucursal: true,
        puntoFacturacion: true,
        _count: {
          select: { invoices: true },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: 'Organización no encontrada' },
        { status: 404 }
      );
    }

    if (!organization.hkaValidated) {
      return NextResponse.json(
        {
          error:
            'La organización no tiene credenciales HKA validadas. Configure HKA primero.',
        },
        { status: 400 }
      );
    }

    // Create invoices
    const created = [];
    const errors = [];

    for (const invoiceData of invoices) {
      try {
        // Validate required fields
        if (!invoiceData.numeroDocumentoFiscal) {
          errors.push({
            invoiceNumber: invoiceData.numeroDocumentoFiscal || 'Unknown',
            error: 'Número de factura es requerido',
          });
          continue;
        }

        if (!invoiceData.razonSocial) {
          errors.push({
            invoiceNumber: invoiceData.numeroDocumentoFiscal,
            error: 'Razón social es requerida',
          });
          continue;
        }

        if (invoiceData.items.length === 0) {
          errors.push({
            invoiceNumber: invoiceData.numeroDocumentoFiscal,
            error: 'La factura debe tener al menos un item',
          });
          continue;
        }

        // Create invoice with items in transaction
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = await prisma.$transaction(async (tx: any) => {
          const codigoSucursalEmisor = organization.codigoSucursal || '001';
          const puntoFacturacionFiscal = organization.puntoFacturacion || '001';

          // Create invoice
          const inv = await tx.invoice.create({
            data: {
              organizationId,
              status: InvoiceStatus.QUEUED,

              // Document identification
              tipoDocumento: invoiceData.tipoDocumento,
              numeroDocumentoFiscal: invoiceData.numeroDocumentoFiscal,
              codigoSucursalEmisor,
              puntoFacturacionFiscal,
              tipoEmision: '01',

              // Dates
              fechaEmision: invoiceData.fechaEmision,

              // Receptor
              tipoReceptor: invoiceData.tipoReceptor,
              tipoContribuyente: invoiceData.tipoContribuyente,
              numeroRUCReceptor: invoiceData.numeroRUC || null,
              digitoVerificadorReceptor: invoiceData.digitoVerificadorRUC || null,
              razonSocialReceptor: invoiceData.razonSocial,
              direccionReceptor: invoiceData.direccion,
              correoReceptor: invoiceData.correoElectronico || null,

              // Payment
              formaPago: invoiceData.formaPago,
              plazoPago: invoiceData.plazoPago,

              // Totals
              subtotal: invoiceData.subtotal,
              totalItbms: invoiceData.totalItbms,
              totalDescuento: invoiceData.totalDescuento,
              totalFactura: invoiceData.totalFactura,

              // Optional
              informacionAdicional: invoiceData.informacionAdicional,

              // Processing metadata
              enqueuedAt: new Date(),
            },
          });

          // Create items
          await tx.invoiceItem.createMany({
            data: invoiceData.items.map((item, index) => ({
              invoiceId: inv.id,
              numeroItem: index + 1,
              descripcion: item.descripcion,
              cantidad: item.cantidad,
              unidadMedida: item.unidadMedida,
              precioUnitario: item.precioUnitario,
              precioTotal: item.precioTotal,
              tasaItbms: item.tasaItbms,
              valorItbms: item.valorItbms,
              valorDescuento: item.valorDescuento,
              valorTotal: item.valorTotal,
              codigoGTIN: item.codigoGTIN || null,
              cantidadGTIN: item.cantidadGTIN || null,
            })),
          });

          return inv;
        });

        // Enqueue for HKA processing
        await enqueueInvoiceProcessing({
          invoiceId: invoice.id,
          organizationId,
        });

        created.push({
          id: invoice.id,
          numeroDocumentoFiscal: invoice.numeroDocumentoFiscal,
          status: invoice.status,
        });

        console.log(
          `[CreateBatch] Created and enqueued invoice ${invoice.numeroDocumentoFiscal}`
        );
      } catch (error: any) {
        console.error(
          `[CreateBatch] Error creating invoice ${invoiceData.numeroDocumentoFiscal}:`,
          error
        );

        errors.push({
          invoiceNumber: invoiceData.numeroDocumentoFiscal,
          error: error.message || 'Error creando factura',
        });
      }
    }

    return NextResponse.json({
      success: true,
      created,
      errors: errors.length > 0 ? errors : undefined,
      stats: {
        total: invoices.length,
        created: created.length,
        failed: errors.length,
      },
    });
  } catch (error: any) {
    console.error('[CreateBatch] Error:', error);

    return NextResponse.json(
      {
        error: 'Error procesando facturas',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
