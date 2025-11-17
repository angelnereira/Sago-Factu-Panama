/**
 * HKA & DGI Configuration for Panama Electronic Invoicing
 *
 * This file contains complete configuration for:
 * - HKA (The Factory HKA) as PAC (Proveedor Autorizado Calificado)
 * - DGI (Dirección General de Ingresos) direct endpoints
 * - All catalogs, codes, and constants according to official specifications
 */

export type HKAEnvironmentType = 'demo' | 'production';

/**
 * DGI Official Endpoints (Direct Integration)
 */
export const DGI_ENDPOINTS = {
  test: {
    recepcionFE: 'https://dgi-fepws-test.mef.gob.pa:40010/FepWcfService/feRecepFE.svc',
    recepcionLote: 'https://dgi-fepws-test.mef.gob.pa:40010/FepWcfService/feRecepLoteFE.svc',
    consultaFE: 'https://dgi-fepws-test.mef.gob.pa:40010/FepWcfService/feConsFE.svc',
    recepcionEvento: 'https://dgi-fepws-test.mef.gob.pa:40010/FepWcfService/feRecepEvento.svc',
    consultaQR: 'https://dgi-fep-test.mef.gob.pa:40001/Consultas/FacturasPorQR',
  },
  production: {
    recepcionFE: 'https://dgi-fepws.mef.gob.pa:40100/FepWcfService/feRecepFE.svc',
    recepcionLote: 'https://dgi-fepws.mef.gob.pa:40100/FepWcfService/feRecepLoteFE.svc',
    consultaFE: 'https://dgi-fepws.mef.gob.pa:40100/FepWcfService/feConsFE.svc',
    recepcionEvento: 'https://dgi-fepws.mef.gob.pa:40100/FepWcfService/feRecepEvento.svc',
    consultaQR: 'https://dgi-fep.mef.gob.pa:40001/Consultas/FacturasPorQR',
  },
} as const;

/**
 * HKA Endpoints (PAC Integration)
 */
export const HKA_ENDPOINTS = {
  demo: {
    wsdl: 'https://demoemision.thefactoryhka.com.pa/ws/obj/v1.0/Service.svc?wsdl',
    wsdlSingle: 'https://demoemision.thefactoryhka.com.pa/ws/obj/v1.0/Service.svc?singleWsdl',
    soap: 'https://demoemision.thefactoryhka.com.pa/ws/obj/v1.0/Service.svc',
    rest: 'https://demointegracion.thefactoryhka.com.pa/api/v1/',
    portal: 'https://demo.thefactoryhka.com.pa/',
  },
  production: {
    wsdl: 'https://emision.thefactoryhka.com.pa/ws/obj/v1.0/Service.svc?wsdl',
    wsdlSingle: 'https://emision.thefactoryhka.com.pa/ws/obj/v1.0/Service.svc?singleWsdl',
    soap: 'https://emision.thefactoryhka.com.pa/ws/obj/v1.0/Service.svc',
    rest: 'https://integracion.thefactoryhka.com.pa/api/v1/',
    portal: 'https://factura.thefactoryhka.com.pa/',
  },
} as const;

/**
 * Demo Credentials (for testing only)
 */
export const HKA_DEMO_CREDENTIALS = {
  tokenEmpresa: 'walgofugiitj_ws_tfhka',
  tokenPassword: 'Octopusp1oQs5',
  portalUser: 'soporte@ubicsys.com',
  portalPassword: 'Cactus4obk01B$m',
  rucPrueba: '155660055-2-2018',
  dvPrueba: '77',
} as const;

/**
 * XML Namespaces
 */
export const XML_NAMESPACES = {
  dgi: 'http://dgi-fep.mef.gob.pa',
  xmldsig: 'http://www.w3.org/2000/09/xmldsig#',
  soap: 'http://schemas.xmlsoap.org/soap/envelope/',
  xsi: 'http://www.w3.org/2001/XMLSchema-instance',
} as const;

/**
 * DGI Official Response Codes
 */
export const DGI_RESPONSE_CODES = {
  // Success
  AUTORIZADO: '0260',

  // Errors - Structure
  ERROR_ESTRUCTURA: '0400',
  ERROR_FIRMA: '0401',
  CERTIFICADO_INVALIDO: '0402',
  FACTURA_DUPLICADA: '0403',

  // Warnings
  ADVERTENCIA: '0500',
} as const;

/**
 * Document Type Codes (iDoc - Tipo de Documento)
 */
export const TIPO_DOCUMENTO = {
  FACTURA: '01',
  NOTA_CREDITO: '02',
  NOTA_DEBITO: '03',
  FACTURA_EXPORTACION: '04',
  FACTURA_IMPORTACION: '05',
} as const;

/**
 * Emission Type Codes (iTpEmis - Tipo de Emisión)
 */
export const TIPO_EMISION = {
  NORMAL: '01',
  CONTINGENCIA: '02',
} as const;

/**
 * Receptor Type Codes (iTipoRec - Tipo de Receptor)
 */
export const TIPO_RECEPTOR = {
  CONTRIBUYENTE: '01',
  NO_CONTRIBUYENTE: '02',
  EXTRANJERO: '03',
} as const;

/**
 * RUC Type Codes (dTipoRuc - Tipo de RUC)
 */
export const TIPO_RUC = {
  PERSONA_NATURAL: '1',
  PERSONA_JURIDICA: '2',
  GOBIERNO: '3',
} as const;

/**
 * ITBMS Tax Rates (dTasaITBMS - Tasas de ITBMS)
 */
export const TASA_ITBMS = {
  CERO: '00', // 0%
  SIETE: '01', // 7%
  DIEZ: '02', // 10%
  QUINCE: '03', // 15%
} as const;

/**
 * ITBMS Percentage Values
 */
export const ITBMS_PERCENTAGES: Record<string, number> = {
  '00': 0.0,
  '01': 0.07,
  '02': 0.10,
  '03': 0.15,
};

/**
 * Payment Method Codes (iFormaPago - Forma de Pago)
 */
export const FORMA_PAGO = {
  EFECTIVO: '01',
  CHEQUE: '02',
  ACH: '03',
  TRANSFERENCIA: '04',
  TARJETA_CREDITO: '05',
  TARJETA_DEBITO: '06',
  VALE: '07',
  OTRO: '99',
} as const;

/**
 * Nature of Operation (iNatOp - Naturaleza de la Operación)
 */
export const NATURALEZA_OPERACION = {
  VENTA_INTERNA: '01',
  EXPORTACION: '02',
} as const;

/**
 * Ambiente (iAmb - Environment)
 */
export const AMBIENTE = {
  PRODUCCION: 1,
  PRUEBAS: 2,
} as const;

/**
 * Unit Codes (cUnidad - Código de Unidad)
 */
export const UNIDADES = {
  UNIDAD: 'und',
  CAJA: 'cja',
  PAQUETE: 'paq',
  KILOGRAMO: 'kg',
  GRAMO: 'g',
  LITRO: 'l',
  METRO: 'm',
  HORA: 'hr',
  SERVICIO: 'srv',
} as const;

/**
 * HKA SOAP Methods
 */
export const HKA_METHODS = {
  ENVIAR: 'Enviar',
  ESTADO_DOCUMENTO: 'EstadoDocumento',
  ANULACION_DOCUMENTO: 'AnulacionDocumento',
  DESCARGA_XML: 'DescargaXML',
  DESCARGA_PDF: 'DescargaPDF',
  FOLIOS_RESTANTES: 'FoliosRestantes',
  ENVIO_CORREO: 'EnvioCorreo',
  RASTREO_CORREO: 'RastreoCorreo',
  CONSULTAR_RUC_DV: 'ConsultarRucDV',
} as const;

/**
 * Document States
 */
export const ESTADO_DOCUMENTO = {
  ACEPTADO: 'AUTORIZADO',
  RECHAZADO: 'RECHAZADO',
  EN_PROCESO: 'EN_PROCESO',
  ANULADO: 'ANULADO',
} as const;

/**
 * Configuration Limits
 */
export const HKA_LIMITS = {
  MAX_XML_SIZE_MB: 10,
  MAX_ITEMS_PER_INVOICE: 999,
  MAX_DESCRIPTION_LENGTH: 500,
  CONNECTION_TIMEOUT_MS: 30000,
  RESPONSE_TIMEOUT_MS: 60000,
  ASYNC_PROCESSING_TIMEOUT_MS: 300000, // 5 minutes
} as const;

/**
 * Date Format for DGI (ISO 8601 with Panama timezone)
 */
export const DGI_DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ss-05:00';

/**
 * Schema Version
 */
export const DGI_VERSION = '1.00';

/**
 * Digital Signature Configuration
 */
export const XMLDSIG_CONFIG = {
  canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
  signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
  digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
  transforms: [
    'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
    'http://www.w3.org/2001/10/xml-exc-c14n#',
  ],
} as const;

/**
 * Helper Functions
 */

/**
 * Get DGI endpoint for environment
 */
export function getDGIEndpoint(environment: 'test' | 'production', type: 'recepcionFE' | 'consultaFE' = 'recepcionFE'): string {
  return DGI_ENDPOINTS[environment][type];
}

/**
 * Get HKA endpoint for environment
 */
export function getHKAEndpoint(environment: HKAEnvironmentType): string {
  return HKA_ENDPOINTS[environment].soap;
}

/**
 * Get WSDL URL for environment
 */
export function getHKAWsdl(environment: HKAEnvironmentType): string {
  return HKA_ENDPOINTS[environment].wsdl;
}

/**
 * Get error message for DGI response code
 */
export function getDGIErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    [DGI_RESPONSE_CODES.AUTORIZADO]: 'Autorizado el uso de la FE',
    [DGI_RESPONSE_CODES.ERROR_ESTRUCTURA]: 'Error en la estructura del XML',
    [DGI_RESPONSE_CODES.ERROR_FIRMA]: 'Error en la firma digital del documento',
    [DGI_RESPONSE_CODES.CERTIFICADO_INVALIDO]: 'Certificado no válido o vencido',
    [DGI_RESPONSE_CODES.FACTURA_DUPLICADA]: 'Factura duplicada',
    [DGI_RESPONSE_CODES.ADVERTENCIA]: 'Documento procesado con advertencias',
  };

  return messages[code] || `Código de respuesta desconocido: ${code}`;
}

/**
 * Check if response code indicates success
 */
export function isDGISuccess(code: string): boolean {
  return code === DGI_RESPONSE_CODES.AUTORIZADO;
}

/**
 * Get ITBMS percentage from code
 */
export function getITBMSPercentage(code: string): number {
  return ITBMS_PERCENTAGES[code] || 0;
}

/**
 * Generate document ID (dId) according to DGI format
 * Format: FE{iDoc}{iAmb}{RUC-DV}{TipoEmision}{NumeroDocumento}{CodigoSeguridad}
 */
export function generateDocumentId(params: {
  tipoDocumento: string;
  ambiente: number;
  ruc: string;
  dv: string;
  tipoEmision: string;
  numeroDocumento: string;
  codigoSeguridad: string;
}): string {
  const { tipoDocumento, ambiente, ruc, dv, tipoEmision, numeroDocumento, codigoSeguridad } = params;
  return `FE${tipoDocumento}${ambiente}${ruc}-${dv}-${tipoEmision}-${numeroDocumento}${codigoSeguridad}`;
}

/**
 * Format date for DGI (ISO 8601 with Panama timezone)
 */
export function formatDGIDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}-05:00`;
}

/**
 * Validate document type code
 */
export function isValidTipoDocumento(code: string): boolean {
  return Object.values(TIPO_DOCUMENTO).includes(code as any);
}

/**
 * Validate emission type code
 */
export function isValidTipoEmision(code: string): boolean {
  return Object.values(TIPO_EMISION).includes(code as any);
}

/**
 * Validate receptor type code
 */
export function isValidTipoReceptor(code: string): boolean {
  return Object.values(TIPO_RECEPTOR).includes(code as any);
}

/**
 * Validate payment method code
 */
export function isValidFormaPago(code: string): boolean {
  return Object.values(FORMA_PAGO).includes(code as any);
}

/**
 * Validate ITBMS rate code
 */
export function isValidTasaITBMS(code: string): boolean {
  return Object.values(TASA_ITBMS).includes(code as any);
}

/**
 * Complete Configuration Export
 */
export const DGI_HKA_COMPLETE_REFERENCE = {
  dgiEndpoints: DGI_ENDPOINTS,
  hkaEndpoints: HKA_ENDPOINTS,
  demoCredentials: HKA_DEMO_CREDENTIALS,
  namespaces: XML_NAMESPACES,
  methods: HKA_METHODS,
  catalogs: {
    tipoDocumento: TIPO_DOCUMENTO,
    tipoEmision: TIPO_EMISION,
    tipoReceptor: TIPO_RECEPTOR,
    tipoRuc: TIPO_RUC,
    tasaItbms: TASA_ITBMS,
    formaPago: FORMA_PAGO,
    naturalezaOperacion: NATURALEZA_OPERACION,
    ambiente: AMBIENTE,
    unidades: UNIDADES,
  },
  responseCodes: DGI_RESPONSE_CODES,
  limits: HKA_LIMITS,
  xmldsigConfig: XMLDSIG_CONFIG,
  version: DGI_VERSION,
} as const;
