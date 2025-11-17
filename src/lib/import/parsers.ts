/**
 * File Parsers for Invoice Import
 *
 * Supports parsing invoices from multiple file formats:
 * - Excel (xlsx, xls)
 * - CSV
 * - XML
 *
 * All parsers return a standardized InvoiceImportData structure
 */

import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { XMLParser } from 'fast-xml-parser';

/**
 * Standardized invoice data structure from import
 */
export interface InvoiceImportData {
  // Emisor (already known from organization, but can validate)
  rucEmisor?: string;

  // Receptor
  tipoReceptor: string; // '01' = Contribuyente, '02' = Consumidor Final
  tipoContribuyente?: string;
  numeroRUC?: string;
  digitoVerificadorRUC?: string;
  razonSocial?: string;
  direccion?: string;
  correoElectronico?: string;

  // Document info
  tipoDocumento: string; // '01' = Factura
  numeroDocumentoFiscal: string;
  fechaEmision?: string; // YYYY-MM-DD, defaults to today if not provided

  // Items
  items: InvoiceItemImportData[];

  // Payment terms (optional)
  formaPago?: string; // '1' = Contado, '2' = Crédito
  plazoPago?: string;

  // Notes (optional)
  informacionAdicional?: string;
}

export interface InvoiceItemImportData {
  descripcion: string;
  cantidad: number;
  unidadMedida: string; // 'UND', 'KG', etc.
  precioUnitario: number;
  tasaItbms: string; // '00', '01', '02', '03'
  valorDescuento?: number;
  codigoGTIN?: string;
  cantidadGTIN?: string;
}

/**
 * Parse Excel file (xlsx or xls)
 */
export function parseExcelFile(buffer: Buffer): InvoiceImportData[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  // Assume first sheet contains invoice data
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

  if (rows.length === 0) {
    throw new Error('El archivo Excel está vacío');
  }

  // Group rows by invoice number
  const invoiceMap = new Map<string, any[]>();

  rows.forEach((row) => {
    const invoiceNumber = row.numeroDocumentoFiscal || row.numeroFactura || row.factura;

    if (!invoiceNumber) {
      throw new Error('Falta columna numeroDocumentoFiscal en algunas filas');
    }

    if (!invoiceMap.has(invoiceNumber)) {
      invoiceMap.set(invoiceNumber, []);
    }

    invoiceMap.get(invoiceNumber)!.push(row);
  });

  // Convert to InvoiceImportData
  const invoices: InvoiceImportData[] = [];

  invoiceMap.forEach((rows, invoiceNumber) => {
    const firstRow = rows[0];

    const invoice: InvoiceImportData = {
      tipoReceptor: firstRow.tipoReceptor || '01',
      numeroRUC: firstRow.numeroRUC || firstRow.ruc,
      digitoVerificadorRUC: firstRow.digitoVerificadorRUC || firstRow.dv,
      razonSocial: firstRow.razonSocial || firstRow.nombre || firstRow.cliente,
      direccion: firstRow.direccion,
      correoElectronico: firstRow.correoElectronico || firstRow.email,
      tipoDocumento: firstRow.tipoDocumento || '01',
      numeroDocumentoFiscal: invoiceNumber,
      fechaEmision: firstRow.fechaEmision || firstRow.fecha,
      formaPago: firstRow.formaPago,
      plazoPago: firstRow.plazoPago,
      informacionAdicional: firstRow.informacionAdicional || firstRow.notas,
      items: rows.map((row) => ({
        descripcion: row.descripcion || row.producto,
        cantidad: parseFloat(row.cantidad) || 1,
        unidadMedida: row.unidadMedida || row.unidad || 'UND',
        precioUnitario: parseFloat(row.precioUnitario || row.precio),
        tasaItbms: row.tasaItbms || row.itbms || '01',
        valorDescuento: row.valorDescuento || row.descuento ? parseFloat(row.valorDescuento || row.descuento) : 0,
        codigoGTIN: row.codigoGTIN,
        cantidadGTIN: row.cantidadGTIN,
      })),
    };

    invoices.push(invoice);
  });

  return invoices;
}

/**
 * Parse CSV file
 */
export function parseCSVFile(buffer: Buffer): InvoiceImportData[] {
  const csvText = buffer.toString('utf-8');

  const parseResult = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parseResult.errors.length > 0) {
    throw new Error(`Error parseando CSV: ${parseResult.errors[0].message}`);
  }

  const rows = parseResult.data as any[];

  if (rows.length === 0) {
    throw new Error('El archivo CSV está vacío');
  }

  // Group rows by invoice number
  const invoiceMap = new Map<string, any[]>();

  rows.forEach((row) => {
    const invoiceNumber = row.numeroDocumentoFiscal || row.numeroFactura || row.factura;

    if (!invoiceNumber) {
      throw new Error('Falta columna numeroDocumentoFiscal en algunas filas');
    }

    if (!invoiceMap.has(invoiceNumber)) {
      invoiceMap.set(invoiceNumber, []);
    }

    invoiceMap.get(invoiceNumber)!.push(row);
  });

  // Convert to InvoiceImportData (same logic as Excel)
  const invoices: InvoiceImportData[] = [];

  invoiceMap.forEach((rows, invoiceNumber) => {
    const firstRow = rows[0];

    const invoice: InvoiceImportData = {
      tipoReceptor: firstRow.tipoReceptor || '01',
      numeroRUC: firstRow.numeroRUC || firstRow.ruc,
      digitoVerificadorRUC: firstRow.digitoVerificadorRUC || firstRow.dv,
      razonSocial: firstRow.razonSocial || firstRow.nombre || firstRow.cliente,
      direccion: firstRow.direccion,
      correoElectronico: firstRow.correoElectronico || firstRow.email,
      tipoDocumento: firstRow.tipoDocumento || '01',
      numeroDocumentoFiscal: invoiceNumber,
      fechaEmision: firstRow.fechaEmision || firstRow.fecha,
      formaPago: firstRow.formaPago,
      plazoPago: firstRow.plazoPago,
      informacionAdicional: firstRow.informacionAdicional || firstRow.notas,
      items: rows.map((row) => ({
        descripcion: row.descripcion || row.producto,
        cantidad: parseFloat(row.cantidad) || 1,
        unidadMedida: row.unidadMedida || row.unidad || 'UND',
        precioUnitario: parseFloat(row.precioUnitario || row.precio),
        tasaItbms: row.tasaItbms || row.itbms || '01',
        valorDescuento: row.valorDescuento || row.descuento ? parseFloat(row.valorDescuento || row.descuento) : 0,
        codigoGTIN: row.codigoGTIN,
        cantidadGTIN: row.cantidadGTIN,
      })),
    };

    invoices.push(invoice);
  });

  return invoices;
}

/**
 * Parse XML file
 * Supports both HKA XML format and custom simplified format
 */
export function parseXMLFile(buffer: Buffer): InvoiceImportData[] {
  const xmlText = buffer.toString('utf-8');

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  const result = parser.parse(xmlText);

  // Check if it's HKA format (rFE root element)
  if (result.rFE) {
    return parseHKAXML(result.rFE);
  }

  // Check if it's our simplified format
  if (result.facturas || result.invoices) {
    return parseSimplifiedXML(result.facturas || result.invoices);
  }

  throw new Error('Formato XML no reconocido. Use formato HKA o el template simplificado.');
}

/**
 * Parse HKA XML format
 */
function parseHKAXML(rFE: any): InvoiceImportData[] {
  const invoices: InvoiceImportData[] = [];

  // HKA XML can have multiple documents
  const documents = Array.isArray(rFE) ? rFE : [rFE];

  documents.forEach((doc) => {
    const encabezado = doc.dEncab;
    const receptor = doc.dReceptor;
    const items = doc.dItems?.item || [];

    const invoice: InvoiceImportData = {
      tipoReceptor: receptor.dTipoRec || '01',
      numeroRUC: receptor.dRUCRec,
      digitoVerificadorRUC: receptor.dDVRec,
      razonSocial: receptor.dRazonRec,
      direccion: receptor.dDirecRec,
      correoElectronico: receptor.dCorreoRec,
      tipoDocumento: encabezado.dTipoDE || '01',
      numeroDocumentoFiscal: encabezado.dNroDF,
      fechaEmision: encabezado.dFechaEm,
      formaPago: encabezado.dFormaPago,
      informacionAdicional: encabezado.dInfoAdicional,
      items: (Array.isArray(items) ? items : [items]).map((item: any) => ({
        descripcion: item.dDescripcion,
        cantidad: parseFloat(item.dCantidad),
        unidadMedida: item.dUnidad || 'UND',
        precioUnitario: parseFloat(item.dPrecioUnitario),
        tasaItbms: item.dTasaITBMS,
        valorDescuento: item.dDescuento ? parseFloat(item.dDescuento) : 0,
        codigoGTIN: item.dGTIN,
        cantidadGTIN: item.dCantGTIN,
      })),
    };

    invoices.push(invoice);
  });

  return invoices;
}

/**
 * Parse simplified XML format
 */
function parseSimplifiedXML(data: any): InvoiceImportData[] {
  const invoices: InvoiceImportData[] = [];

  const facturas = Array.isArray(data.factura) ? data.factura : [data.factura];

  facturas.forEach((factura: any) => {
    const items = factura.items?.item || [];

    const invoice: InvoiceImportData = {
      tipoReceptor: factura.tipoReceptor || '01',
      numeroRUC: factura.numeroRUC,
      digitoVerificadorRUC: factura.digitoVerificadorRUC,
      razonSocial: factura.razonSocial,
      direccion: factura.direccion,
      correoElectronico: factura.correoElectronico,
      tipoDocumento: factura.tipoDocumento || '01',
      numeroDocumentoFiscal: factura.numeroDocumentoFiscal,
      fechaEmision: factura.fechaEmision,
      formaPago: factura.formaPago,
      informacionAdicional: factura.informacionAdicional,
      items: (Array.isArray(items) ? items : [items]).map((item: any) => ({
        descripcion: item.descripcion,
        cantidad: parseFloat(item.cantidad),
        unidadMedida: item.unidadMedida || 'UND',
        precioUnitario: parseFloat(item.precioUnitario),
        tasaItbms: item.tasaItbms,
        valorDescuento: item.valorDescuento ? parseFloat(item.valorDescuento) : 0,
        codigoGTIN: item.codigoGTIN,
        cantidadGTIN: item.cantidadGTIN,
      })),
    };

    invoices.push(invoice);
  });

  return invoices;
}

/**
 * Main parser function - detects file type and calls appropriate parser
 */
export function parseInvoiceFile(
  buffer: Buffer,
  filename: string
): InvoiceImportData[] {
  const extension = filename.toLowerCase().split('.').pop();

  switch (extension) {
    case 'xlsx':
    case 'xls':
      return parseExcelFile(buffer);

    case 'csv':
      return parseCSVFile(buffer);

    case 'xml':
      return parseXMLFile(buffer);

    default:
      throw new Error(`Formato de archivo no soportado: ${extension}`);
  }
}
