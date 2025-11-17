/**
 * DGI XML Generator for Panama Electronic Invoicing
 *
 * Generates XML documents according to DGI (Dirección General de Ingresos)
 * specifications for electronic invoicing in Panama.
 *
 * Schema Version: FE_v1.00 (Factura Electrónica)
 */

import { create } from 'xmlbuilder2';
import { Invoice, InvoiceItem } from '@/lib/prisma';
import {
  TIPO_DOCUMENTO,
  TIPO_EMISION,
  TIPO_RECEPTOR,
  FORMA_PAGO,
  getITBMSPercentage,
} from '@/config/hka.config';

/**
 * Organization data needed for XML generation
 */
export interface OrganizationXMLData {
  ruc: string;
  dv: string;
  nombre: string;
  direccion: string;
  codigoSucursal: string;
  puntoFacturacion: string;
}

/**
 * Complete invoice data with items for XML generation
 */
export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
}

/**
 * Generate DGI-compliant XML for electronic invoice
 *
 * @param invoice - Invoice with items
 * @param organization - Organization data
 * @returns XML string ready to be Base64-encoded and sent to HKA
 */
export function generateInvoiceXML(
  invoice: InvoiceWithItems,
  organization: OrganizationXMLData
): string {
  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('rFE', {
      xmlns: 'http://dgi-fep.mef.gob.pa',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation': 'http://dgi-fep.mef.gob.pa FE_v1.00.xsd',
    });

  // 1. Encabezado (Header)
  const encabezado = root.ele('dEncab');

  // Tipo de documento
  encabezado.ele('dTipoDE').txt(invoice.tipoDocumento);

  // Número de documento
  encabezado.ele('dNroDF').txt(invoice.numeroDocumentoFiscal);

  // Punto de facturación y sucursal
  encabezado.ele('dPtoFacDF').txt(invoice.puntoFacturacionFiscal);
  encabezado.ele('dSucFacDF').txt(invoice.codigoSucursalEmisor);

  // Fecha de emisión (formato ISO 8601 para Panamá)
  const fechaEmision = invoice.createdAt.toISOString().split('.')[0] + '-05:00';
  encabezado.ele('dFechaEm').txt(fechaEmision);

  // Tipo de emisión
  encabezado.ele('dTipoEmision').txt(invoice.tipoEmision);

  // 2. Emisor (Organization)
  const emisor = root.ele('gEmis');

  emisor.ele('dRucEm').txt(organization.ruc);
  emisor.ele('dDVEm').txt(organization.dv);
  emisor.ele('dNombEm').txt(organization.nombre);
  emisor.ele('dDirecEm').txt(organization.direccion);

  // 3. Receptor (Customer)
  const receptor = root.ele('gRecep');

  receptor.ele('dTipoRecep').txt(invoice.tipoReceptor);
  receptor.ele('dNombRec').txt(invoice.receptorNombre);

  if (invoice.tipoReceptor === TIPO_RECEPTOR.CONTRIBUYENTE && invoice.receptorRuc) {
    receptor.ele('dRucRec').txt(invoice.receptorRuc);
    if (invoice.receptorDv) {
      receptor.ele('dDVRec').txt(invoice.receptorDv);
    }
  }

  if (invoice.receptorDireccion) {
    receptor.ele('dDirecRec').txt(invoice.receptorDireccion);
  }

  if (invoice.receptorEmail) {
    receptor.ele('dTelefonoRec').txt(invoice.receptorTelefono || '');
    receptor.ele('dCorreoRec').txt(invoice.receptorEmail);
  }

  // 4. Items (Líneas de factura)
  const items = root.ele('gDatosItems');

  invoice.items.forEach((item, index) => {
    const itemNode = items.ele('gDatosItem');

    // Número de ítem
    itemNode.ele('dNroItem').txt((index + 1).toString());

    // Descripción
    itemNode.ele('dDescItem').txt(item.descripcion);

    // Cantidad
    itemNode.ele('dCantItem').txt(item.cantidad.toFixed(2));

    // Precio unitario
    itemNode.ele('dPrecItem').txt(item.precioUnitario.toFixed(2));

    // Precio total del ítem (sin impuestos)
    const precioTotal = Number(item.cantidad) * Number(item.precioUnitario);
    itemNode.ele('dPrecTotItem').txt(precioTotal.toFixed(2));

    // Descuento (si aplica)
    if (Number(item.descuento) > 0) {
      itemNode.ele('dDescuentoItem').txt(item.descuento.toFixed(2));
    }

    // ITBMS del ítem
    const itbmsItem = itemNode.ele('gITBMSItem');
    itbmsItem.ele('dTasaITBMS').txt(item.tasaItbms);
    itbmsItem.ele('dValITBMS').txt(item.valorItbms.toFixed(2));

    // Valor total del ítem (con impuestos)
    itemNode.ele('dValTotItem').txt(item.valorTotal.toFixed(2));
  });

  // 5. Totales
  const totales = root.ele('gTotales');

  // Subtotal (sin impuestos)
  totales.ele('dSubTotal').txt(invoice.subtotal.toFixed(2));

  // Total descuentos
  if (Number(invoice.totalDescuento) > 0) {
    totales.ele('dTotalDesc').txt(invoice.totalDescuento.toFixed(2));
  }

  // Total ITBMS
  totales.ele('dTotITBMS').txt(invoice.totalItbms.toFixed(2));

  // Monto total gravado
  totales.ele('dTotalGravado').txt(invoice.totalMontoGravado.toFixed(2));

  // Total de la factura
  totales.ele('dTotalFact').txt(invoice.totalFactura.toFixed(2));

  // 6. Información de pago
  const pago = root.ele('gFormaPago');
  pago.ele('dFormaPago').txt(invoice.formaPago);

  // Si es crédito, podríamos agregar información adicional
  if (invoice.formaPago === FORMA_PAGO.CREDITO) {
    // Aquí se podrían agregar condiciones de crédito si están disponibles
    // pago.ele('dCondCredito').txt('NET30');
  }

  // Generate XML string
  const xml = root.end({ prettyPrint: false, headless: false });

  return xml;
}

/**
 * Convert XML string to Base64
 * Required by HKA API
 */
export function xmlToBase64(xml: string): string {
  return Buffer.from(xml, 'utf-8').toString('base64');
}

/**
 * Convert Base64 to XML string
 * For decoding responses from HKA
 */
export function base64ToXml(base64: string): string {
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Validate invoice data before XML generation
 * Ensures all required fields are present and valid
 */
export function validateInvoiceData(invoice: InvoiceWithItems): string[] {
  const errors: string[] = [];

  // Required fields
  if (!invoice.numeroDocumentoFiscal) {
    errors.push('Número de documento fiscal es requerido');
  }

  if (!invoice.receptorNombre) {
    errors.push('Nombre del receptor es requerido');
  }

  // Validate RUC for contributors
  if (invoice.tipoReceptor === TIPO_RECEPTOR.CONTRIBUYENTE) {
    if (!invoice.receptorRuc) {
      errors.push('RUC del receptor es requerido para contribuyentes');
    }
  }

  // Validate items
  if (!invoice.items || invoice.items.length === 0) {
    errors.push('La factura debe tener al menos un ítem');
  }

  // Validate totals
  const calculatedSubtotal = invoice.items.reduce(
    (sum, item) => sum + Number(item.cantidad) * Number(item.precioUnitario),
    0
  );

  const calculatedITBMS = invoice.items.reduce(
    (sum, item) => sum + Number(item.valorItbms),
    0
  );

  const calculatedTotal = calculatedSubtotal + calculatedITBMS - Number(invoice.totalDescuento);

  // Allow small rounding differences (0.01)
  if (Math.abs(Number(invoice.subtotal) - calculatedSubtotal) > 0.01) {
    errors.push(`Subtotal no coincide. Calculado: ${calculatedSubtotal.toFixed(2)}, Registrado: ${invoice.subtotal}`);
  }

  if (Math.abs(Number(invoice.totalItbms) - calculatedITBMS) > 0.01) {
    errors.push(`Total ITBMS no coincide. Calculado: ${calculatedITBMS.toFixed(2)}, Registrado: ${invoice.totalItbms}`);
  }

  if (Math.abs(Number(invoice.totalFactura) - calculatedTotal) > 0.01) {
    errors.push(`Total factura no coincide. Calculado: ${calculatedTotal.toFixed(2)}, Registrado: ${invoice.totalFactura}`);
  }

  return errors;
}

/**
 * Calculate ITBMS for an item
 * Helper function for frontend calculations
 */
export function calculateItemITBMS(
  precioUnitario: number,
  cantidad: number,
  tasaItbms: string
): number {
  const subtotal = precioUnitario * cantidad;
  const percentage = getITBMSPercentage(tasaItbms);
  return subtotal * percentage;
}

/**
 * Calculate invoice totals
 * Helper function for frontend calculations
 */
export function calculateInvoiceTotals(items: Array<{
  cantidad: number;
  precioUnitario: number;
  tasaItbms: string;
  descuento?: number;
}>) {
  let subtotal = 0;
  let totalItbms = 0;
  let totalDescuento = 0;

  items.forEach(item => {
    const itemSubtotal = item.cantidad * item.precioUnitario;
    const itemDescuento = item.descuento || 0;
    const itemItbms = calculateItemITBMS(item.precioUnitario, item.cantidad, item.tasaItbms);

    subtotal += itemSubtotal;
    totalItbms += itemItbms;
    totalDescuento += itemDescuento;
  });

  const totalMontoGravado = subtotal - totalDescuento;
  const totalFactura = totalMontoGravado + totalItbms;

  return {
    subtotal,
    totalItbms,
    totalDescuento,
    totalMontoGravado,
    totalFactura,
  };
}
