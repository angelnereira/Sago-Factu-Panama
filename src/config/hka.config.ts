/**
 * HKA (The Factory HKA Corp) Configuration
 *
 * Complete reference for HKA PAC integration in Panama
 * This file contains all endpoints, methods, catalogs, and constants
 * needed to integrate with the HKA SOAP API for electronic invoicing.
 */

export type HKAEnvironmentType = 'demo' | 'production';

/**
 * HKA Endpoints by Environment
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
 * Production credentials are provided by each organization (BYOC model)
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
 * SOAP Namespaces
 */
export const HKA_NAMESPACES = {
  main: 'http://tempuri.org/',
  objects: 'http://schemas.datacontract.org/2004/07/Services.ObjComprobante.v1_0',
  soap: 'http://www.w3.org/2003/05/soap-envelope',
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
 * Document Type Codes (Tipo de Documento)
 */
export const TIPO_DOCUMENTO = {
  FACTURA: '01',
  FACTURA_EXPORTACION: '02',
  FACTURA_ZONA_FRANCA: '03',
  NOTA_CREDITO: '04',
  NOTA_DEBITO: '05',
  FACTURA_IMPORTACION: '06',
  FACTURA_GOBIERNO: '07',
  FACTURA_AGENTE_REVENDEDOR: '08',
  FACTURA_CONSIGNACION: '09',
} as const;

/**
 * Emission Type Codes (Tipo de Emisión)
 */
export const TIPO_EMISION = {
  NORMAL: '01',
  CONTINGENCIA: '02',
  ESTADO: '03',
} as const;

/**
 * Receptor Type Codes (Tipo de Receptor)
 */
export const TIPO_RECEPTOR = {
  CONTRIBUYENTE: '01',
  CONSUMIDOR_FINAL: '02',
  GOBIERNO: '03',
  EXTRANJERO: '04',
} as const;

/**
 * ITBMS Tax Rates (Tasas de ITBMS)
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
 * Payment Method Codes (Forma de Pago)
 */
export const FORMA_PAGO = {
  CREDITO: '01',
  CONTADO: '02',
  TARJETA_CREDITO: '03',
  TARJETA_DEBITO: '04',
  ACH: '05',
  VALE: '06',
  OTRO: '08',
} as const;

/**
 * HKA Response Codes
 */
export const HKA_RESPONSE_CODES = {
  SUCCESS: '00',
  SUCCESS_WITH_OBSERVATIONS: '01',
  // Errors
  INVALID_TOKEN: 'ERR_001',
  MALFORMED_XML: 'ERR_002',
  RUC_MISMATCH: 'ERR_003',
  NO_FOLIOS: 'ERR_004',
  TOTALS_MISMATCH: 'ERR_005',
  INVALID_ITBMS_RATE: 'ERR_006',
  INVALID_DATE: 'ERR_007',
  UNAUTHORIZED_PUNTO: 'ERR_008',
  INVALID_RUC_RECEPTOR: 'ERR_009',
  DUPLICATE_DOCUMENT: 'ERR_010',
} as const;

/**
 * Error Messages Map
 */
export const HKA_ERROR_MESSAGES: Record<string, string> = {
  [HKA_RESPONSE_CODES.SUCCESS]: 'Operación exitosa',
  [HKA_RESPONSE_CODES.SUCCESS_WITH_OBSERVATIONS]: 'Documento aceptado con observaciones',
  [HKA_RESPONSE_CODES.INVALID_TOKEN]: 'Token inválido o expirado',
  [HKA_RESPONSE_CODES.MALFORMED_XML]: 'XML malformado',
  [HKA_RESPONSE_CODES.RUC_MISMATCH]: 'RUC del emisor no coincide con token',
  [HKA_RESPONSE_CODES.NO_FOLIOS]: 'Folios agotados',
  [HKA_RESPONSE_CODES.TOTALS_MISMATCH]: 'Totales no cuadran',
  [HKA_RESPONSE_CODES.INVALID_ITBMS_RATE]: 'Tasa ITBMS inválida',
  [HKA_RESPONSE_CODES.INVALID_DATE]: 'Fecha de emisión fuera de rango permitido',
  [HKA_RESPONSE_CODES.UNAUTHORIZED_PUNTO]: 'Punto de facturación no autorizado',
  [HKA_RESPONSE_CODES.INVALID_RUC_RECEPTOR]: 'RUC del receptor inválido',
  [HKA_RESPONSE_CODES.DUPLICATE_DOCUMENT]: 'Documento duplicado',
};

/**
 * Document States
 */
export const ESTADO_DOCUMENTO = {
  ACEPTADO: 'ACEPTADO',
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
 * Retry Configuration
 */
export const HKA_RETRY_CONFIG = {
  maxRetries: 3,
  exponentialBackoff: true,
  baseDelayMs: 2000,
} as const;

/**
 * Date Format for DGI
 */
export const HKA_DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ss-05:00';

/**
 * Helper Functions
 */

/**
 * Get SOAP endpoint for environment
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
 * Get error message for response code
 */
export function getHKAErrorMessage(code: string): string {
  return HKA_ERROR_MESSAGES[code] || `Error desconocido: ${code}`;
}

/**
 * Check if response code indicates success
 */
export function isHKASuccess(code: string): boolean {
  return code === HKA_RESPONSE_CODES.SUCCESS || code === HKA_RESPONSE_CODES.SUCCESS_WITH_OBSERVATIONS;
}

/**
 * Get ITBMS percentage from code
 */
export function getITBMSPercentage(code: string): number {
  return ITBMS_PERCENTAGES[code] || 0;
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
 * Complete HKA Integration Reference
 * Export for documentation/testing purposes
 */
export const HKA_COMPLETE_REFERENCE = {
  endpoints: HKA_ENDPOINTS,
  demoCredentials: HKA_DEMO_CREDENTIALS,
  namespaces: HKA_NAMESPACES,
  methods: HKA_METHODS,
  catalogs: {
    tipoDocumento: TIPO_DOCUMENTO,
    tipoEmision: TIPO_EMISION,
    tipoReceptor: TIPO_RECEPTOR,
    tasaItbms: TASA_ITBMS,
    formaPago: FORMA_PAGO,
  },
  responseCodes: HKA_RESPONSE_CODES,
  errorMessages: HKA_ERROR_MESSAGES,
  limits: HKA_LIMITS,
  retryConfig: HKA_RETRY_CONFIG,
} as const;
