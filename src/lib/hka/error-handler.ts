/**
 * HKA Error Classification and Handling System
 *
 * Errors in HKA are not just messages; they are structured signals that
 * tell us exactly what went wrong, where, and often how to fix it.
 *
 * Error Categories:
 * - 100 series: Authentication/Authorization errors (manual intervention needed)
 * - 200 series: Validation errors (fix data and retry)
 * - 300 series: Business rule violations (check fiscal regulations)
 * - 500 series: System/Infrastructure errors (retry with backoff)
 */

export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  BUSINESS_RULE = 'BUSINESS_RULE',
  SYSTEM = 'SYSTEM',
  NETWORK = 'NETWORK',
  UNKNOWN = 'UNKNOWN',
}

export enum ErrorSeverity {
  CRITICAL = 'CRITICAL', // Requires immediate attention
  HIGH = 'HIGH', // Should be addressed soon
  MEDIUM = 'MEDIUM', // Can wait, but should be fixed
  LOW = 'LOW', // Informational
}

export interface HKAError {
  code: string;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  retryable: boolean;
  requiresManualIntervention: boolean;
  suggestedAction: string;
}

/**
 * Error code to category mapping
 */
const ERROR_CATALOG: Record<string, Omit<HKAError, 'message'>> = {
  // Authentication Errors (100-199)
  ERR_001: {
    code: 'ERR_001',
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.CRITICAL,
    retryable: false,
    requiresManualIntervention: true,
    suggestedAction: 'Verificar credenciales HKA en configuración. Token inválido o expirado.',
  },
  ERR_003: {
    code: 'ERR_003',
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.CRITICAL,
    retryable: false,
    requiresManualIntervention: true,
    suggestedAction: 'El RUC del emisor no coincide con el token. Verificar configuración de organización.',
  },
  ERR_008: {
    code: 'ERR_008',
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.HIGH,
    retryable: false,
    requiresManualIntervention: true,
    suggestedAction: 'Punto de facturación no autorizado. Contactar a HKA para autorizar el punto.',
  },

  // Validation Errors (200-299)
  ERR_002: {
    code: 'ERR_002',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.HIGH,
    retryable: false,
    requiresManualIntervention: false,
    suggestedAction: 'XML malformado. Verificar estructura del documento según esquema DGI.',
  },
  ERR_005: {
    code: 'ERR_005',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.HIGH,
    retryable: false,
    requiresManualIntervention: false,
    suggestedAction: 'Los totales no cuadran. Recalcular subtotal, ITBMS y total.',
  },
  ERR_006: {
    code: 'ERR_006',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.HIGH,
    retryable: false,
    requiresManualIntervention: false,
    suggestedAction: 'Tasa ITBMS inválida. Usar solo: 00 (0%), 01 (7%), 02 (10%), 03 (15%).',
  },
  ERR_007: {
    code: 'ERR_007',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.MEDIUM,
    retryable: false,
    requiresManualIntervention: false,
    suggestedAction: 'Fecha de emisión fuera de rango. Verificar que la fecha sea reciente y no futura.',
  },
  ERR_009: {
    code: 'ERR_009',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.HIGH,
    retryable: false,
    requiresManualIntervention: false,
    suggestedAction: 'RUC del receptor inválido. Verificar formato y dígito verificador.',
  },

  // Business Rule Errors (300-399)
  ERR_004: {
    code: 'ERR_004',
    category: ErrorCategory.BUSINESS_RULE,
    severity: ErrorSeverity.CRITICAL,
    retryable: false,
    requiresManualIntervention: true,
    suggestedAction: 'Folios agotados. Contactar a HKA para adquirir más folios.',
  },
  ERR_010: {
    code: 'ERR_010',
    category: ErrorCategory.BUSINESS_RULE,
    severity: ErrorSeverity.HIGH,
    retryable: false,
    requiresManualIntervention: false,
    suggestedAction: 'Documento duplicado. Verificar que el número de factura no haya sido usado previamente.',
  },

  // System/Network Errors (500-599)
  ETIMEDOUT: {
    code: 'ETIMEDOUT',
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    requiresManualIntervention: false,
    suggestedAction: 'Timeout de conexión. Reintentar automáticamente con backoff exponencial.',
  },
  ECONNREFUSED: {
    code: 'ECONNREFUSED',
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.HIGH,
    retryable: true,
    requiresManualIntervention: false,
    suggestedAction: 'Conexión rechazada. Verificar conectividad de red y estado del servicio HKA.',
  },
  ENOTFOUND: {
    code: 'ENOTFOUND',
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.HIGH,
    retryable: true,
    requiresManualIntervention: false,
    suggestedAction: 'DNS no encontrado. Verificar configuración de red y URLs de HKA.',
  },
};

/**
 * Classify an error and provide actionable information
 */
export function classifyHKAError(error: any): HKAError {
  // Extract error code from various possible sources
  const errorCode =
    error.code ||
    error.response?.codigo ||
    error.response?.code ||
    (typeof error === 'string' ? error : undefined);

  // Look up in catalog
  const catalogEntry = errorCode ? ERROR_CATALOG[errorCode] : undefined;

  if (catalogEntry) {
    return {
      ...catalogEntry,
      message: error.message || error.toString(),
    };
  }

  // Unknown error - classify by pattern
  const errorString = error.toString().toLowerCase();

  if (errorString.includes('timeout') || errorString.includes('timed out')) {
    return {
      code: 'TIMEOUT',
      message: error.message || error.toString(),
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      requiresManualIntervention: false,
      suggestedAction: 'Timeout detectado. Reintentar con backoff exponencial.',
    };
  }

  if (errorString.includes('network') || errorString.includes('connection')) {
    return {
      code: 'NETWORK_ERROR',
      message: error.message || error.toString(),
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
      retryable: true,
      requiresManualIntervention: false,
      suggestedAction: 'Error de red. Verificar conectividad y reintentar.',
    };
  }

  if (errorString.includes('auth') || errorString.includes('unauthorized')) {
    return {
      code: 'AUTH_ERROR',
      message: error.message || error.toString(),
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.CRITICAL,
      retryable: false,
      requiresManualIntervention: true,
      suggestedAction: 'Error de autenticación. Verificar credenciales HKA.',
    };
  }

  // Completely unknown error
  return {
    code: 'UNKNOWN',
    message: error.message || error.toString(),
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.HIGH,
    retryable: false,
    requiresManualIntervention: true,
    suggestedAction: 'Error desconocido. Revisar logs y contactar soporte técnico.',
  };
}

/**
 * Determine retry strategy based on error classification
 */
export interface RetryStrategy {
  shouldRetry: boolean;
  delayMs: number;
  maxRetries: number;
}

export function getRetryStrategy(
  error: HKAError,
  attemptNumber: number = 0
): RetryStrategy {
  // Don't retry non-retryable errors
  if (!error.retryable) {
    return {
      shouldRetry: false,
      delayMs: 0,
      maxRetries: 0,
    };
  }

  // Network/System errors: retry with exponential backoff
  if (error.category === ErrorCategory.NETWORK || error.category === ErrorCategory.SYSTEM) {
    const baseDelay = 2000; // 2 seconds
    const maxRetries = 5;

    if (attemptNumber >= maxRetries) {
      return {
        shouldRetry: false,
        delayMs: 0,
        maxRetries,
      };
    }

    return {
      shouldRetry: true,
      delayMs: baseDelay * Math.pow(2, attemptNumber), // Exponential backoff
      maxRetries,
    };
  }

  // Default: don't retry
  return {
    shouldRetry: false,
    delayMs: 0,
    maxRetries: 0,
  };
}

/**
 * Format error for logging
 */
export function formatErrorForLog(error: HKAError): string {
  return `[${error.category}/${error.severity}] ${error.code}: ${error.message}\nAction: ${error.suggestedAction}`;
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: HKAError): string {
  if (error.category === ErrorCategory.AUTHENTICATION) {
    return 'Error de autenticación con HKA. Por favor, verifica tu configuración.';
  }

  if (error.category === ErrorCategory.VALIDATION) {
    return `Error en los datos de la factura: ${error.message}`;
  }

  if (error.category === ErrorCategory.BUSINESS_RULE) {
    return `Error de reglas de negocio: ${error.message}`;
  }

  if (error.category === ErrorCategory.NETWORK || error.category === ErrorCategory.SYSTEM) {
    return 'Error temporal del servicio. Estamos reintentando automáticamente.';
  }

  return 'Ha ocurrido un error. Por favor, contacta al soporte técnico.';
}

/**
 * Check if error should trigger circuit breaker
 */
export function shouldTriggerCircuitBreaker(error: HKAError): boolean {
  // Network and system errors should trigger circuit breaker
  return (
    error.category === ErrorCategory.NETWORK ||
    error.category === ErrorCategory.SYSTEM
  );
}
