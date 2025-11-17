/**
 * HKA SOAP Client - Generic Adapter
 *
 * This is the core integration module with The Factory HKA SOAP API.
 * It provides a clean abstraction over the SOAP protocol and handles
 * all communication with HKA for electronic invoicing in Panama.
 *
 * Key Features:
 * - Environment-agnostic (Demo/Production)
 * - Credential injection per request (Multi-tenant support)
 * - Automatic retry with exponential backoff
 * - Complete error handling and logging
 * - All HKA methods implemented
 */

import soap from 'soap';
import {
  getHKAWsdl,
  HKA_METHODS,
  HKA_RETRY_CONFIG,
  HKA_LIMITS,
  isHKASuccess,
  getHKAErrorMessage,
  type HKAEnvironmentType,
} from '@/config/hka.config';

/**
 * HKA Credentials Interface
 * Each organization provides their own credentials (BYOC model)
 */
export interface HKACredentials {
  tokenEmpresa: string;
  tokenPassword: string;
}

/**
 * Document Identification Data
 * Used for querying document status, downloading PDFs/XMLs, etc.
 */
export interface DocumentData {
  codigoSucursalEmisor: string; // e.g., "0000"
  numeroDocumentoFiscal: string; // Sequential number
  puntoFacturacionFiscal: string; // e.g., "001"
  tipoDocumento: string; // "01" for Factura
  tipoEmision: string; // "01" for Normal
}

/**
 * Response from Enviar method
 */
export interface EnviarResponse {
  codigo: string; // "00" = success
  resultado: string; // XML with result details
  cufe?: string; // Unique invoice code (if successful)
  qr?: string; // QR code
  mensaje: string; // Descriptive message
  xmlFirmado?: string; // Signed XML (Base64)
  pdf?: string; // PDF document (Base64)
}

/**
 * Response from EstadoDocumento method
 */
export interface EstadoDocumentoResponse {
  estado: 'ACEPTADO' | 'RECHAZADO' | 'EN_PROCESO' | 'ANULADO';
  cufe?: string;
  mensaje: string;
}

/**
 * Response from FoliosRestantes method
 */
export interface FoliosRestantesResponse {
  foliosDisponibles: number;
  foliosUsados: number;
  foliosTotal: number;
  mensaje: string;
}

/**
 * Response from AnulacionDocumento method
 */
export interface AnulacionResponse {
  codigo: string;
  resultado: string;
  mensaje: string;
}

/**
 * Response from Descarga methods (XML/PDF)
 */
export interface DescargaResponse {
  contenido: string; // Base64 encoded content
  codigo: string;
  mensaje: string;
}

/**
 * HKA SOAP Client Class
 */
export class HKASOAPClient {
  private environment: HKAEnvironmentType;
  private credentials: HKACredentials;
  private soapClient: soap.Client | null = null;

  constructor(environment: HKAEnvironmentType, credentials: HKACredentials) {
    this.environment = environment;
    this.credentials = credentials;
  }

  /**
   * Initialize SOAP client (lazy loading)
   */
  private async initClient(): Promise<soap.Client> {
    if (this.soapClient) {
      return this.soapClient;
    }

    const wsdl = getHKAWsdl(this.environment);

    try {
      this.soapClient = await soap.createClientAsync(wsdl, {
        timeout: HKA_LIMITS.CONNECTION_TIMEOUT_MS,
        disableCache: false,
      });

      return this.soapClient;
    } catch (error) {
      throw new Error(`Failed to initialize HKA SOAP client: ${error}`);
    }
  }

  /**
   * Execute a SOAP method with retry logic
   */
  private async executeWithRetry<T>(
    methodName: string,
    args: any,
    retryCount = 0
  ): Promise<T> {
    const client = await this.initClient();

    try {
      const [result] = await client[`${methodName}Async`](args);
      return result;
    } catch (error: any) {
      // Check if we should retry
      const isNetworkError = error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND';

      if (isNetworkError && retryCount < HKA_RETRY_CONFIG.maxRetries) {
        // Exponential backoff
        const delay = HKA_RETRY_CONFIG.exponentialBackoff
          ? HKA_RETRY_CONFIG.baseDelayMs * Math.pow(2, retryCount)
          : HKA_RETRY_CONFIG.baseDelayMs;

        await new Promise(resolve => setTimeout(resolve, delay));

        return this.executeWithRetry<T>(methodName, args, retryCount + 1);
      }

      // No more retries or non-retryable error
      throw new Error(`HKA SOAP Error (${methodName}): ${error.message}`);
    }
  }

  /**
   * 1. Enviar - Send document to HKA for certification
   *
   * @param xmlBase64 - The invoice XML in Base64 format
   * @returns Response with CUFE, signed XML, and PDF if successful
   */
  async enviar(xmlBase64: string): Promise<EnviarResponse> {
    const args = {
      tokenEmpresa: this.credentials.tokenEmpresa,
      tokenPassword: this.credentials.tokenPassword,
      documento: xmlBase64,
    };

    const response = await this.executeWithRetry<any>(HKA_METHODS.ENVIAR, args);

    return {
      codigo: response.codigo || response.Codigo,
      resultado: response.resultado || response.Resultado || '',
      cufe: response.cufe || response.CUFE,
      qr: response.qr || response.QR,
      mensaje: response.mensaje || response.Mensaje || '',
      xmlFirmado: response.xmlFirmado || response.XMLFirmado,
      pdf: response.pdf || response.PDF,
    };
  }

  /**
   * 2. EstadoDocumento - Query document processing status
   *
   * @param documentData - Document identification data
   * @returns Current state of the document
   */
  async estadoDocumento(documentData: DocumentData): Promise<EstadoDocumentoResponse> {
    const args = {
      tokenEmpresa: this.credentials.tokenEmpresa,
      tokenPassword: this.credentials.tokenPassword,
      datosDocumento: documentData,
    };

    const response = await this.executeWithRetry<any>(
      HKA_METHODS.ESTADO_DOCUMENTO,
      args
    );

    return {
      estado: response.estado || response.Estado,
      cufe: response.cufe || response.CUFE,
      mensaje: response.mensaje || response.Mensaje || '',
    };
  }

  /**
   * 3. AnulacionDocumento - Annul a previously issued document
   *
   * @param documentData - Document identification data
   * @param motivoAnulacion - Reason for annulment
   * @returns Confirmation of annulment
   */
  async anulacionDocumento(
    documentData: DocumentData,
    motivoAnulacion: string
  ): Promise<AnulacionResponse> {
    const args = {
      tokenEmpresa: this.credentials.tokenEmpresa,
      tokenPassword: this.credentials.tokenPassword,
      datosDocumento: documentData,
      motivoAnulacion,
    };

    const response = await this.executeWithRetry<any>(
      HKA_METHODS.ANULACION_DOCUMENTO,
      args
    );

    return {
      codigo: response.codigo || response.Codigo,
      resultado: response.resultado || response.Resultado || '',
      mensaje: response.mensaje || response.Mensaje || '',
    };
  }

  /**
   * 4. DescargaXML - Download certified and signed XML
   *
   * @param documentData - Document identification data
   * @returns Signed XML in Base64
   */
  async descargaXML(documentData: DocumentData): Promise<DescargaResponse> {
    const args = {
      tokenEmpresa: this.credentials.tokenEmpresa,
      tokenPassword: this.credentials.tokenPassword,
      datosDocumento: documentData,
    };

    const response = await this.executeWithRetry<any>(
      HKA_METHODS.DESCARGA_XML,
      args
    );

    return {
      contenido: response.xml || response.XML || '',
      codigo: response.codigo || response.Codigo,
      mensaje: response.mensaje || response.Mensaje || '',
    };
  }

  /**
   * 5. DescargaPDF - Download graphical representation (PDF)
   *
   * @param documentData - Document identification data
   * @returns PDF in Base64
   */
  async descargaPDF(documentData: DocumentData): Promise<DescargaResponse> {
    const args = {
      tokenEmpresa: this.credentials.tokenEmpresa,
      tokenPassword: this.credentials.tokenPassword,
      datosDocumento: documentData,
    };

    const response = await this.executeWithRetry<any>(
      HKA_METHODS.DESCARGA_PDF,
      args
    );

    return {
      contenido: response.pdf || response.PDF || '',
      codigo: response.codigo || response.Codigo,
      mensaje: response.mensaje || response.Mensaje || '',
    };
  }

  /**
   * 6. FoliosRestantes - Query available transaction folios
   *
   * @returns Number of available folios (transactions)
   */
  async foliosRestantes(): Promise<FoliosRestantesResponse> {
    const args = {
      tokenEmpresa: this.credentials.tokenEmpresa,
      tokenPassword: this.credentials.tokenPassword,
    };

    const response = await this.executeWithRetry<any>(
      HKA_METHODS.FOLIOS_RESTANTES,
      args
    );

    return {
      foliosDisponibles: parseInt(response.foliosDisponibles || response.FoliosDisponibles || '0'),
      foliosUsados: parseInt(response.foliosUsados || response.FoliosUsados || '0'),
      foliosTotal: parseInt(response.foliosTotal || response.FoliosTotal || '0'),
      mensaje: response.mensaje || response.Mensaje || '',
    };
  }

  /**
   * 7. EnvioCorreo - Resend document by email
   *
   * @param documentData - Document identification data
   * @param correo - Email address
   * @returns Confirmation of email sending
   */
  async envioCorreo(
    documentData: DocumentData,
    correo: string
  ): Promise<{ codigo: string; mensaje: string }> {
    const args = {
      tokenEmpresa: this.credentials.tokenEmpresa,
      tokenPassword: this.credentials.tokenPassword,
      datosDocumento: documentData,
      correo,
    };

    const response = await this.executeWithRetry<any>(
      HKA_METHODS.ENVIO_CORREO,
      args
    );

    return {
      codigo: response.codigo || response.Codigo,
      mensaje: response.mensaje || response.Mensaje || '',
    };
  }

  /**
   * 8. RastreoCorreo - Track email delivery status
   *
   * @param documentData - Document identification data
   * @returns Email delivery status
   */
  async rastreoCorreo(documentData: DocumentData): Promise<{
    estadoEnvio: string;
    fechaEnvio?: string;
    destinatario?: string;
    mensaje: string;
  }> {
    const args = {
      tokenEmpresa: this.credentials.tokenEmpresa,
      tokenPassword: this.credentials.tokenPassword,
      datosDocumento: documentData,
    };

    const response = await this.executeWithRetry<any>(
      HKA_METHODS.RASTREO_CORREO,
      args
    );

    return {
      estadoEnvio: response.estadoEnvio || response.EstadoEnvio,
      fechaEnvio: response.fechaEnvio || response.FechaEnvio,
      destinatario: response.destinatario || response.Destinatario,
      mensaje: response.mensaje || response.Mensaje || '',
    };
  }

  /**
   * 9. ConsultarRucDV - Query and validate RUC with verification digit
   *
   * @param ruc - RUC without verification digit
   * @returns Calculated verification digit
   */
  async consultarRucDV(ruc: string): Promise<{
    digitoVerificador: string;
    rucCompleto: string;
    valido: boolean;
    mensaje: string;
  }> {
    const args = {
      tokenEmpresa: this.credentials.tokenEmpresa,
      tokenPassword: this.credentials.tokenPassword,
      ruc,
    };

    const response = await this.executeWithRetry<any>(
      HKA_METHODS.CONSULTAR_RUC_DV,
      args
    );

    return {
      digitoVerificador: response.digitoVerificador || response.DigitoVerificador,
      rucCompleto: response.rucCompleto || response.RucCompleto,
      valido: response.valido || response.Valido || false,
      mensaje: response.mensaje || response.Mensaje || '',
    };
  }

  /**
   * Test connection to HKA
   * Useful for validating credentials during onboarding
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.foliosRestantes();
      return result.foliosDisponibles >= 0;
    } catch {
      return false;
    }
  }
}

/**
 * Factory function to create HKA client
 *
 * @param environment - Demo or Production
 * @param credentials - Organization's HKA credentials
 * @returns Configured SOAP client instance
 */
export function createHKAClient(
  environment: HKAEnvironmentType,
  credentials: HKACredentials
): HKASOAPClient {
  return new HKASOAPClient(environment, credentials);
}
