/**
 * DGI XML Generator for Panama Electronic Invoicing
 *
 * Generates XML documents according to DGI (Dirección General de Ingresos)
 * specifications for electronic invoicing in Panama.
 *
 * Schema Version: FE_v1.00 (Factura Electrónica)
 * Based on: Official DGI Blueprint and Technical Documentation
 */

import { create } from 'xmlbuilder2';
import { Invoice, InvoiceItem, Organization } from '@prisma/client';
import {
  TIPO_DOCUMENTO,
  TIPO_EMISION,
  TIPO_RECEPTOR,
  FORMA_PAGO,
  XML_NAMESPACES,
  generateDocumentId,
  formatDGIDate,
  getITBMSPercentage,
} from '@/config/hka.config';

/**
 * Complete invoice data with items for XML generation
 */
export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
}

/**
 * Generate DGI-compliant XML for electronic invoice
 *
 * Official Structure:
 * - rFE (root)
 *   - dEncabezado (header with document identification)
 *   - dGeneral (general data: dates, codes, nature)
 *   - gEmis (issuer/organization data)
 *     - gRucEmi (RUC structure)
 *     - gUbiEm (geographic location)
 *   - gDatRec (receptor/customer data)
 *     - gUbiRec (receptor location - optional)
 *   - gDtipDe (document type specific data)
 *   - gItem[] (invoice items)
 *     - gPrecios (pricing details)
 *     - gITBMSItem (ITBMS tax details)
 *     - gISCItem (ISC tax details - optional)
 *   - gTot (totals)
 *     - gTotSub (subtotals by tax rate)
 *   - gFormaPago (payment method)
 *   - Signature (XMLDSig - added after generation)
 *
 * @param invoice - Invoice with items
 * @param organization - Organization data
 * @returns XML string ready to be digitally signed
 */
export function generateInvoiceXML(
  invoice: InvoiceWithItems,
  organization: Organization
): string {
  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('rFE', {
      xmlns: XML_NAMESPACES.dgi,
      'xmlns:xsi': XML_NAMESPACES.xsi,
      'xsi:schemaLocation': `${XML_NAMESPACES.dgi} FE_v1.00.xsd`,
    });

  // ============================================
  // 1. dEncabezado - Document Header
  // ============================================
  const encabezado = root.ele('dEncabezado');

  // Document version
  encabezado.ele('dVerForm', {}, '1.00');

  // Environment (01=Production, 02=Test/Demo)
  const ambiente = organization.hkaEnvironment === 'PRODUCTION' ? '01' : '02';
  encabezado.ele('dAmb', {}, ambiente);

  // Emission type (01=Normal, 02=Contingency)
  encabezado.ele('dTipoEmision', {}, invoice.tipoEmision);

  // Document type (01=Factura, 04=Nota Crédito, 05=Nota Débito)
  encabezado.ele('dTipoDE', {}, invoice.tipoDocumento);

  // Security code (8 numeric digits)
  // Use existing code from invoice or generate new one
  const codigoSeguridad = invoice.codigoSeguridad || generateSecurityCode();
  encabezado.ele('dCodigoSeg', {}, codigoSeguridad);

  // Document ID (dId/CUFE) - Generated according to DGI format
  // Format: FE + tipoDoc + ambiente + RUC-DV-tipoEmision-numeroDoc + codigoSeg
  const dId = generateDocumentId({
    tipoDocumento: invoice.tipoDocumento,
    ambiente: parseInt(ambiente),
    ruc: organization.ruc,
    dv: organization.dv,
    tipoEmision: invoice.tipoEmision,
    numeroDocumento: invoice.numeroDocumentoFiscal,
    codigoSeguridad: codigoSeguridad,
  });
  encabezado.ele('dId', {}, dId);

  // ============================================
  // 2. dGeneral - General Data
  // ============================================
  const general = root.ele('dGeneral');

  // Emission date and time (ISO 8601 format with Panama timezone)
  const fechaEmision = formatDGIDate(invoice.createdAt);
  general.ele('dFechaSalida', {}, fechaEmision);

  // Nature of operation (01=Venta, 02=Exportación, etc.)
  general.ele('dNatOp', {}, invoice.naturalezaOperacion);

  // Transaction type (01=Sale, 02=Service, 03=Mixed)
  general.ele('dTipoOp', {}, invoice.tipoOperacion);

  // Commercial operation (true=commercial, false=non-commercial)
  general.ele('dComOp', {}, 'true');

  // ============================================
  // 3. gEmis - Issuer/Organization Data
  // ============================================
  const emisor = root.ele('gEmis');

  // RUC structure
  const rucEmi = emisor.ele('gRucEmi');
  rucEmi.ele('dTipoRuc', {}, organization.tipoRuc);
  rucEmi.ele('dRuc', {}, organization.ruc);
  rucEmi.ele('dDV', {}, organization.dv);

  // Issuer names
  emisor.ele('dNombEm', {}, organization.razonSocial);
  if (organization.nombreComercial) {
    emisor.ele('dNombCEm', {}, organization.nombreComercial);
  }

  // Economic activity
  if (organization.actividadEconomica) {
    emisor.ele('dActEco', {}, organization.actividadEconomica);
  }

  // Contact information
  emisor.ele('dDirecEm', {}, organization.direccion || 'Sin dirección registrada');
  if (organization.telefono) {
    emisor.ele('dTelefonoEm', {}, organization.telefono);
  }
  emisor.ele('dCorreoEm', {}, organization.email);

  // Branch and billing point codes
  emisor.ele('dCodSuc', {}, invoice.codigoSucursalEmisor);
  emisor.ele('dPuntoFact', {}, invoice.puntoFacturacionFiscal);

  // Geographic location of issuer
  const ubicacionEmi = emisor.ele('gUbiEm');
  ubicacionEmi.ele('dProv', {}, organization.provincia || '0');
  ubicacionEmi.ele('dDistr', {}, organization.distrito || '0');
  ubicacionEmi.ele('dCorreg', {}, organization.corregimiento || '0');
  // Optional coordinates
  if (organization.latitud) {
    ubicacionEmi.ele('dLat', {}, organization.latitud);
  }
  if (organization.longitud) {
    ubicacionEmi.ele('dLon', {}, organization.longitud);
  }

  // ============================================
  // 4. gDatRec - Receptor/Customer Data
  // ============================================
  const receptor = root.ele('gDatRec');

  // Receptor type (01=Contribuyente, 02=Consumidor Final, 03=Extranjero)
  receptor.ele('dTipoRec', {}, invoice.tipoReceptor);

  // Customer identification
  if (invoice.tipoReceptor === TIPO_RECEPTOR.CONTRIBUYENTE && invoice.receptorRuc) {
    const rucRec = receptor.ele('gRucRec');
    rucRec.ele('dRuc', {}, invoice.receptorRuc);
    if (invoice.receptorDv) {
      rucRec.ele('dDV', {}, invoice.receptorDv);
    }
  }

  // Customer name
  receptor.ele('dNombRec', {}, invoice.receptorNombre);

  // Contact information
  if (invoice.receptorDireccion) {
    receptor.ele('dDirecRec', {}, invoice.receptorDireccion);
  }
  if (invoice.receptorTelefono) {
    receptor.ele('dTelefonoRec', {}, invoice.receptorTelefono);
  }
  if (invoice.receptorEmail) {
    receptor.ele('dCorreoRec', {}, invoice.receptorEmail);
  }

  // Receptor location (optional - similar structure to emisor)
  // TODO: Add receptor location fields to schema if needed
  // const ubicacionRec = receptor.ele('gUbiRec');
  // ubicacionRec.ele('dProv', {}, '0');
  // ubicacionRec.ele('dDistr', {}, '0');
  // ubicacionRec.ele('dCorreg', {}, '0');

  // ============================================
  // 5. gDtipDE - Document Type Specific Data
  // ============================================
  const tipoDE = root.ele('gDtipDE');

  // For invoices (01), include sales-specific data
  if (invoice.tipoDocumento === TIPO_DOCUMENTO.FACTURA) {
    const facturaData = tipoDE.ele('gDatFact');
    // Document number
    facturaData.ele('dNumFact', {}, invoice.numeroDocumentoFiscal);
  }

  // For credit notes (04)
  if (invoice.tipoDocumento === TIPO_DOCUMENTO.NOTA_CREDITO) {
    const ncData = tipoDE.ele('gDatNC');
    ncData.ele('dNumNC', {}, invoice.numeroDocumentoFiscal);
    // TODO: Add reference to original invoice
    // ncData.ele('dIdOrig', {}, originalInvoiceCUFE);
  }

  // For debit notes (05)
  if (invoice.tipoDocumento === TIPO_DOCUMENTO.NOTA_DEBITO) {
    const ndData = tipoDE.ele('gDatND');
    ndData.ele('dNumND', {}, invoice.numeroDocumentoFiscal);
    // TODO: Add reference to original invoice
    // ndData.ele('dIdOrig', {}, originalInvoiceCUFE);
  }

  // ============================================
  // 6. gItem[] - Invoice Items
  // ============================================
  invoice.items.forEach((item, index) => {
    const itemNode = root.ele('gItem');

    // Item sequence number (1-based)
    itemNode.ele('dSecItem', {}, (index + 1).toString());

    // Product/service information
    if (item.codigoProducto) {
      itemNode.ele('dCodProd', {}, item.codigoProducto);
    }
    itemNode.ele('dDescProd', {}, item.descripcion);

    // Quantity and unit
    itemNode.ele('dCant', {}, item.cantidad.toFixed(4));
    itemNode.ele('dUnidad', {}, item.unidadMedida);

    // Pricing details
    const precios = itemNode.ele('gPrecios');
    precios.ele('dPrecUnit', {}, item.precioUnitario.toFixed(2));
    precios.ele('dPrecUnitDesc', {}, item.precioUnitario.toFixed(2)); // After item discount

    // Item subtotal (quantity x unit price)
    const precioItem = Number(item.cantidad) * Number(item.precioUnitario);
    precios.ele('dPrecItem', {}, precioItem.toFixed(2));

    // Item discount
    if (Number(item.descuento) > 0) {
      precios.ele('dDescItem', {}, item.descuento.toFixed(2));
      const precioItemConDesc = precioItem - Number(item.descuento);
      precios.ele('dPrecItemDesc', {}, precioItemConDesc.toFixed(2));
    } else {
      precios.ele('dPrecItemDesc', {}, precioItem.toFixed(2));
    }

    // ITBMS (Sales Tax) details
    const itbmsItem = itemNode.ele('gITBMSItem');
    itbmsItem.ele('dTasaITBMS', {}, item.tasaItbms);
    const baseImponible = precioItem - Number(item.descuento);
    itbmsItem.ele('dBaseImp', {}, baseImponible.toFixed(2));
    itbmsItem.ele('dValITBMS', {}, item.valorItbms.toFixed(2));

    // ISC (Selective Consumption Tax) - TODO: Add to schema if needed
    // const iscItem = itemNode.ele('gISCItem');
    // iscItem.ele('dTasaISC', {}, '00');
    // iscItem.ele('dValISC', {}, '0.00');

    // Total value of item (with all taxes)
    itemNode.ele('dValTotItem', {}, item.valorTotal.toFixed(2));
  });

  // ============================================
  // 7. gTot - Totals
  // ============================================
  const totales = root.ele('gTot');

  // Subtotals by tax rate
  const totalesSubtotal = totales.ele('gTotSub');

  // Group items by ITBMS rate
  const itemsByRate = groupItemsByITBMSRate(invoice.items);

  // Taxed items (with ITBMS)
  const gravado = totalesSubtotal.ele('gTotGrav');
  itemsByRate.taxed.forEach(rateGroup => {
    const gravadoItem = gravado.ele('gGravItem');
    gravadoItem.ele('dTasaITBMS', {}, rateGroup.rate);
    gravadoItem.ele('dValGravItem', {}, rateGroup.subtotal.toFixed(2));
    gravadoItem.ele('dValITBMSItem', {}, rateGroup.tax.toFixed(2));
  });

  // Exempt items (ITBMS = 0%)
  if (itemsByRate.exempt.subtotal > 0) {
    const exento = totalesSubtotal.ele('gTotExe');
    exento.ele('dValTotExe', {}, itemsByRate.exempt.subtotal.toFixed(2));
  }

  // Total amounts
  totales.ele('dSubTotal', {}, invoice.subtotal.toFixed(2));

  if (Number(invoice.totalDescuento) > 0) {
    totales.ele('dTotDesc', {}, invoice.totalDescuento.toFixed(2));
  }

  totales.ele('dTotITBMS', {}, invoice.totalItbms.toFixed(2));

  // TODO: Add ISC if applicable
  // totales.ele('dTotISC', {}, '0.00');

  totales.ele('dTotGrav', {}, invoice.totalMontoGravado.toFixed(2));
  totales.ele('dTotFinal', {}, invoice.totalFactura.toFixed(2));

  // ============================================
  // 8. gFormaPago - Payment Method
  // ============================================
  const pago = root.ele('gFormaPago');
  pago.ele('dFormaPago', {}, invoice.formaPago);

  // Credit terms (if applicable)
  if (invoice.formaPago === FORMA_PAGO.CREDITO) {
    // TODO: Add credit terms to schema
    // pago.ele('dPlazoCredito', {}, '30'); // Days
    // pago.ele('dMonCuota', {}, invoice.totalFactura.toFixed(2));
  }

  // ============================================
  // 9. Generate XML String
  // ============================================
  // Note: Digital signature (Signature element) will be added after this
  // by the signing function
  const xml = root.end({
    prettyPrint: false,
    headless: false
  });

  return xml;
}

/**
 * Group invoice items by ITBMS rate for totals section
 */
function groupItemsByITBMSRate(items: InvoiceItem[]) {
  const taxedRates = new Map<string, { subtotal: number; tax: number }>();
  let exemptSubtotal = 0;

  items.forEach(item => {
    const itemSubtotal = Number(item.cantidad) * Number(item.precioUnitario) - Number(item.descuento);

    if (item.tasaItbms === '00') {
      // Exempt
      exemptSubtotal += itemSubtotal;
    } else {
      // Taxed
      if (!taxedRates.has(item.tasaItbms)) {
        taxedRates.set(item.tasaItbms, { subtotal: 0, tax: 0 });
      }
      const rateData = taxedRates.get(item.tasaItbms)!;
      rateData.subtotal += itemSubtotal;
      rateData.tax += Number(item.valorItbms);
    }
  });

  return {
    taxed: Array.from(taxedRates.entries()).map(([rate, data]) => ({
      rate,
      subtotal: data.subtotal,
      tax: data.tax,
    })),
    exempt: {
      subtotal: exemptSubtotal,
    },
  };
}

/**
 * Generate 8-digit security code
 * Used in CUFE/dId generation
 * TODO: Implement proper cryptographic generation
 */
function generateSecurityCode(): string {
  // For now, generate random 8-digit number
  // In production, this should use cryptographic random
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

/**
 * Convert XML string to Base64
 * Required by HKA/DGI API
 */
export function xmlToBase64(xml: string): string {
  return Buffer.from(xml, 'utf-8').toString('base64');
}

/**
 * Convert Base64 to XML string
 * For decoding responses from HKA/DGI
 */
export function base64ToXml(base64: string): string {
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Validate invoice data before XML generation
 * Ensures all required fields are present and valid
 */
export function validateInvoiceData(
  invoice: InvoiceWithItems,
  organization: Organization
): string[] {
  const errors: string[] = [];

  // Organization validations
  if (!organization.ruc) {
    errors.push('RUC de la organización es requerido');
  }
  if (!organization.dv) {
    errors.push('Dígito verificador de la organización es requerido');
  }
  if (!organization.razonSocial) {
    errors.push('Razón social de la organización es requerida');
  }
  if (!organization.email) {
    errors.push('Email de la organización es requerido');
  }

  // Invoice required fields
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

  // Validate item fields
  invoice.items.forEach((item, index) => {
    if (!item.descripcion || item.descripcion.trim() === '') {
      errors.push(`Ítem ${index + 1}: Descripción es requerida`);
    }
    if (Number(item.cantidad) <= 0) {
      errors.push(`Ítem ${index + 1}: Cantidad debe ser mayor a 0`);
    }
    if (Number(item.precioUnitario) <= 0) {
      errors.push(`Ítem ${index + 1}: Precio unitario debe ser mayor a 0`);
    }
  });

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

  // Allow small rounding differences (0.02 to account for multiple items)
  if (Math.abs(Number(invoice.subtotal) - calculatedSubtotal) > 0.02) {
    errors.push(
      `Subtotal no coincide. Calculado: ${calculatedSubtotal.toFixed(2)}, Registrado: ${invoice.subtotal}`
    );
  }

  if (Math.abs(Number(invoice.totalItbms) - calculatedITBMS) > 0.02) {
    errors.push(
      `Total ITBMS no coincide. Calculado: ${calculatedITBMS.toFixed(2)}, Registrado: ${invoice.totalItbms}`
    );
  }

  if (Math.abs(Number(invoice.totalFactura) - calculatedTotal) > 0.02) {
    errors.push(
      `Total factura no coincide. Calculado: ${calculatedTotal.toFixed(2)}, Registrado: ${invoice.totalFactura}`
    );
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
  tasaItbms: string,
  descuento: number = 0
): number {
  const subtotal = precioUnitario * cantidad;
  const baseImponible = subtotal - descuento;
  const percentage = getITBMSPercentage(tasaItbms);
  return baseImponible * percentage;
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
    const itemItbms = calculateItemITBMS(
      item.precioUnitario,
      item.cantidad,
      item.tasaItbms,
      itemDescuento
    );

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
