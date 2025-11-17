/**
 * Field Mapper for Invoice Import
 *
 * Maps imported invoice data to our database schema and validates
 * that all required HKA fields are present.
 */

import { InvoiceImportData, InvoiceItemImportData } from './parsers';
import { TASA_ITBMS } from '@/config/hka.config';

export interface MappedInvoiceData {
  // Receptor
  tipoReceptor: string;
  tipoContribuyente: string;
  numeroRUC: string;
  digitoVerificadorRUC: string;
  razonSocial: string;
  direccion: string;
  correoElectronico?: string;

  // Document info
  tipoDocumento: string;
  numeroDocumentoFiscal: string;
  fechaEmision: Date;

  // Payment
  formaPago: string;
  plazoPago?: string;

  // Items
  items: MappedInvoiceItem[];

  // Totals (calculated)
  subtotal: number;
  totalItbms: number;
  totalDescuento: number;
  totalFactura: number;

  // Optional
  informacionAdicional?: string;
}

export interface MappedInvoiceItem {
  descripcion: string;
  cantidad: number;
  unidadMedida: string;
  precioUnitario: number;
  precioTotal: number;
  tasaItbms: string;
  valorItbms: number;
  valorDescuento: number;
  valorTotal: number;
  codigoGTIN?: string;
  cantidadGTIN?: string;
}

/**
 * Validation errors
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public invoiceNumber?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate and map a single invoice
 */
export function mapInvoiceData(
  data: InvoiceImportData,
  organizationId: string
): MappedInvoiceData {
  // Validate required fields
  validateRequiredFields(data);

  // Map items and calculate totals
  const mappedItems = data.items.map((item) => mapInvoiceItem(item));

  // Calculate invoice totals
  const totals = calculateInvoiceTotals(mappedItems);

  // Parse fecha emision or use today
  const fechaEmision = data.fechaEmision
    ? parseDate(data.fechaEmision)
    : new Date();

  // Validate fecha emision is not in the future and not too old (max 7 days back)
  validateFechaEmision(fechaEmision, data.numeroDocumentoFiscal);

  // Build mapped invoice
  const mapped: MappedInvoiceData = {
    tipoReceptor: data.tipoReceptor,
    tipoContribuyente: data.tipoContribuyente || '1',
    numeroRUC: data.numeroRUC || '',
    digitoVerificadorRUC: data.digitoVerificadorRUC || '',
    razonSocial: data.razonSocial || 'CONSUMIDOR FINAL',
    direccion: data.direccion || 'PANAMA',
    correoElectronico: data.correoElectronico,
    tipoDocumento: data.tipoDocumento || '01',
    numeroDocumentoFiscal: data.numeroDocumentoFiscal,
    fechaEmision,
    formaPago: data.formaPago || '1',
    plazoPago: data.plazoPago,
    items: mappedItems,
    subtotal: totals.subtotal,
    totalItbms: totals.totalItbms,
    totalDescuento: totals.totalDescuento,
    totalFactura: totals.totalFactura,
    informacionAdicional: data.informacionAdicional,
  };

  return mapped;
}

/**
 * Validate required fields
 */
function validateRequiredFields(data: InvoiceImportData): void {
  const errors: string[] = [];

  if (!data.numeroDocumentoFiscal) {
    errors.push('numeroDocumentoFiscal es requerido');
  }

  if (!data.tipoReceptor) {
    errors.push('tipoReceptor es requerido');
  }

  // If tipoReceptor is '01' (Contribuyente), RUC is required
  if (data.tipoReceptor === '01') {
    if (!data.numeroRUC) {
      errors.push('numeroRUC es requerido para contribuyentes');
    }
    if (!data.digitoVerificadorRUC) {
      errors.push('digitoVerificadorRUC es requerido para contribuyentes');
    }
    if (!data.razonSocial) {
      errors.push('razonSocial es requerida para contribuyentes');
    }
  }

  if (!data.items || data.items.length === 0) {
    errors.push('La factura debe tener al menos un item');
  }

  // Validate items
  data.items.forEach((item, index) => {
    if (!item.descripcion) {
      errors.push(`Item ${index + 1}: descripcion es requerida`);
    }
    if (!item.cantidad || item.cantidad <= 0) {
      errors.push(`Item ${index + 1}: cantidad debe ser mayor a 0`);
    }
    if (!item.precioUnitario || item.precioUnitario < 0) {
      errors.push(`Item ${index + 1}: precioUnitario debe ser mayor o igual a 0`);
    }
    if (!item.tasaItbms) {
      errors.push(`Item ${index + 1}: tasaItbms es requerida`);
    }
    if (!isValidTasaItbms(item.tasaItbms)) {
      errors.push(
        `Item ${index + 1}: tasaItbms inválida. Use: 00 (0%), 01 (7%), 02 (10%), 03 (15%)`
      );
    }
  });

  if (errors.length > 0) {
    throw new ValidationError(
      errors.join('; '),
      'validation',
      data.numeroDocumentoFiscal
    );
  }
}

/**
 * Validate tasa ITBMS
 */
function isValidTasaItbms(tasa: string): boolean {
  return ['00', '01', '02', '03'].includes(tasa);
}

/**
 * Map a single invoice item
 */
function mapInvoiceItem(item: InvoiceItemImportData): MappedInvoiceItem {
  const cantidad = item.cantidad;
  const precioUnitario = item.precioUnitario;
  const valorDescuento = item.valorDescuento || 0;

  // Calculate precio total (before tax)
  const precioTotal = cantidad * precioUnitario;

  // Get ITBMS rate
  const itbmsRate = getItbmsRate(item.tasaItbms);

  // Calculate ITBMS (on amount after discount)
  const baseImponible = precioTotal - valorDescuento;
  const valorItbms = baseImponible * itbmsRate;

  // Calculate valor total (with tax)
  const valorTotal = baseImponible + valorItbms;

  return {
    descripcion: item.descripcion,
    cantidad,
    unidadMedida: item.unidadMedida || 'UND',
    precioUnitario,
    precioTotal,
    tasaItbms: item.tasaItbms,
    valorItbms,
    valorDescuento,
    valorTotal,
    codigoGTIN: item.codigoGTIN,
    cantidadGTIN: item.cantidadGTIN,
  };
}

/**
 * Get ITBMS rate as decimal
 */
function getItbmsRate(tasaItbms: string): number {
  switch (tasaItbms) {
    case TASA_ITBMS.CERO:
      return 0.0;
    case TASA_ITBMS.SIETE:
      return 0.07;
    case TASA_ITBMS.DIEZ:
      return 0.1;
    case TASA_ITBMS.QUINCE:
      return 0.15;
    default:
      return 0.0;
  }
}

/**
 * Calculate invoice totals
 */
function calculateInvoiceTotals(items: MappedInvoiceItem[]): {
  subtotal: number;
  totalItbms: number;
  totalDescuento: number;
  totalFactura: number;
} {
  let subtotal = 0;
  let totalItbms = 0;
  let totalDescuento = 0;

  items.forEach((item) => {
    subtotal += item.precioTotal;
    totalItbms += item.valorItbms;
    totalDescuento += item.valorDescuento;
  });

  const totalFactura = subtotal - totalDescuento + totalItbms;

  return {
    subtotal: roundToTwo(subtotal),
    totalItbms: roundToTwo(totalItbms),
    totalDescuento: roundToTwo(totalDescuento),
    totalFactura: roundToTwo(totalFactura),
  };
}

/**
 * Round to 2 decimal places
 */
function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Parse date from various formats
 */
function parseDate(dateString: string): Date {
  // Try YYYY-MM-DD format
  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(dateString);
  }

  // Try DD/MM/YYYY format
  const dmyMatch = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return new Date(`${year}-${month}-${day}`);
  }

  // Try MM/DD/YYYY format
  const mdyMatch = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    return new Date(`${year}-${month}-${day}`);
  }

  // Try parsing as-is
  const parsed = new Date(dateString);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  throw new Error(`Formato de fecha inválido: ${dateString}. Use YYYY-MM-DD o DD/MM/YYYY`);
}

/**
 * Validate fecha emision
 */
function validateFechaEmision(fecha: Date, invoiceNumber?: string): void {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (fecha > now) {
    throw new ValidationError(
      'La fecha de emisión no puede ser futura',
      'fechaEmision',
      invoiceNumber
    );
  }

  if (fecha < sevenDaysAgo) {
    throw new ValidationError(
      'La fecha de emisión no puede ser mayor a 7 días en el pasado',
      'fechaEmision',
      invoiceNumber
    );
  }
}

/**
 * Map multiple invoices
 */
export function mapInvoices(
  invoices: InvoiceImportData[],
  organizationId: string
): {
  mapped: MappedInvoiceData[];
  errors: Array<{ invoiceNumber: string; error: string }>;
} {
  const mapped: MappedInvoiceData[] = [];
  const errors: Array<{ invoiceNumber: string; error: string }> = [];

  invoices.forEach((invoice) => {
    try {
      const mappedInvoice = mapInvoiceData(invoice, organizationId);
      mapped.push(mappedInvoice);
    } catch (error: any) {
      errors.push({
        invoiceNumber: invoice.numeroDocumentoFiscal || 'Unknown',
        error: error.message,
      });
    }
  });

  return { mapped, errors };
}
