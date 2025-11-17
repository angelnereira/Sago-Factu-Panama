/**
 * Invoice Import API
 *
 * Handles file uploads for bulk invoice import.
 * Supports: xlsx, xls, csv, xml
 *
 * POST /api/invoices/import
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseInvoiceFile } from '@/lib/import/parsers';
import { mapInvoices, MappedInvoiceData } from '@/lib/import/field-mapper';
import { prisma, InvoiceStatus } from '@/lib/prisma';
import { enqueueInvoiceProcessing } from '@/lib/queue/jobs';

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();

    const file = formData.get('file') as File;
    const organizationId = formData.get('organizationId') as string;
    const sendDirectly = formData.get('sendDirectly') === 'true';

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: 'organizationId es requerido' },
        { status: 400 }
      );
    }

    // Verify organization exists and has HKA credentials
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
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

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse file based on extension
    let parsedInvoices;
    try {
      parsedInvoices = parseInvoiceFile(buffer, file.name);
    } catch (error: any) {
      return NextResponse.json(
        {
          error: 'Error parseando archivo',
          details: error.message,
        },
        { status: 400 }
      );
    }

    if (parsedInvoices.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron facturas en el archivo' },
        { status: 400 }
      );
    }

    // Map to HKA format and validate
    const { mapped, errors } = mapInvoices(parsedInvoices, organizationId);

    // If sendDirectly is false, just return preview
    if (!sendDirectly) {
      return NextResponse.json({
        success: true,
        preview: true,
        invoices: mapped,
        errors: errors.length > 0 ? errors : undefined,
        stats: {
          total: parsedInvoices.length,
          valid: mapped.length,
          invalid: errors.length,
        },
      });
    }

    // If sendDirectly is true, create and enqueue invoices
    const createdInvoices = await createAndEnqueueInvoices(
      mapped,
      organizationId
    );

    return NextResponse.json({
      success: true,
      preview: false,
      created: createdInvoices.length,
      errors: errors.length > 0 ? errors : undefined,
      stats: {
        total: parsedInvoices.length,
        valid: mapped.length,
        invalid: errors.length,
        created: createdInvoices.length,
      },
      invoices: createdInvoices.map((inv) => ({
        id: inv.id,
        numeroDocumentoFiscal: inv.numeroDocumentoFiscal,
        status: inv.status,
      })),
    });
  } catch (error: any) {
    console.error('[ImportAPI] Error:', error);

    return NextResponse.json(
      {
        error: 'Error procesando archivo',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Create invoices in database and enqueue for processing
 */
async function createAndEnqueueInvoices(
  invoices: MappedInvoiceData[],
  organizationId: string
) {
  const created = [];

  for (const invoiceData of invoices) {
    try {
      // Create invoice with items in transaction
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const invoice = await prisma.$transaction(async (tx: any) => {
        // Get next invoice number from organization
        const org = await tx.organization.findUnique({
          where: { id: organizationId },
          select: {
            codigoSucursal: true,
            puntoFacturacion: true,
            _count: {
              select: { invoices: true },
            },
          },
        });

        if (!org) {
          throw new Error('Organización no encontrada');
        }

        // Generate sequential number
        const sequentialNumber = (org._count.invoices + 1)
          .toString()
          .padStart(8, '0');

        const numeroDocumentoFiscal = invoiceData.numeroDocumentoFiscal;
        const codigoSucursalEmisor = org.codigoSucursal || '001';
        const puntoFacturacionFiscal = org.puntoFacturacion || '001';

        // Create invoice
        const inv = await tx.invoice.create({
          data: {
            organizationId,
            status: InvoiceStatus.QUEUED,

            // Document identification
            tipoDocumento: invoiceData.tipoDocumento,
            numeroDocumentoFiscal,
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

      created.push(invoice);

      console.log(
        `[ImportAPI] Created and enqueued invoice ${invoice.numeroDocumentoFiscal}`
      );
    } catch (error: any) {
      console.error(
        `[ImportAPI] Error creating invoice ${invoiceData.numeroDocumentoFiscal}:`,
        error
      );
      // Continue with next invoice
    }
  }

  return created;
}
