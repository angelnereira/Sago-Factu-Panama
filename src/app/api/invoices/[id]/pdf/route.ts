/**
 * API Route: Download Invoice PDF
 *
 * GET /api/invoices/[id]/pdf
 *
 * Returns the PDF representation of an authorized invoice
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma, InvoiceStatus } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: {
        id: true,
        numeroDocumentoFiscal: true,
        status: true,
        pdfBase64: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    if (invoice.status !== InvoiceStatus.AUTHORIZED) {
      return NextResponse.json(
        { error: 'Invoice not yet authorized', status: invoice.status },
        { status: 400 }
      );
    }

    if (!invoice.pdfBase64) {
      return NextResponse.json(
        { error: 'PDF not available' },
        { status: 404 }
      );
    }

    // Decode Base64 to binary
    const pdfBuffer = Buffer.from(invoice.pdfBase64, 'base64');

    // Return PDF with proper headers
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="factura-${invoice.numeroDocumentoFiscal}.pdf"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error: any) {
    console.error('Error downloading PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
