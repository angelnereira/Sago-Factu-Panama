/**
 * Enhanced HKA SOAP Client with Advanced Patterns
 *
 * This enhanced version integrates:
 * - Circuit Breaker Pattern for fault tolerance
 * - Intelligent Error Classification and Handling
 * - Automatic Retry with Exponential Backoff
 * - Request/Response Logging for Auditing
 * - Performance Metrics Collection
 *
 * Use this client in production for maximum reliability.
 */

import { HKASOAPClient, HKACredentials, type HKAEnvironmentType } from './soap-client';
import { CircuitBreaker, createHKACircuitBreaker, CircuitBreakerOpenError } from './circuit-breaker';
import {
  classifyHKAError,
  getRetryStrategy,
  formatErrorForLog,
  shouldTriggerCircuitBreaker,
  type HKAError,
} from './error-handler';

/**
 * Request metadata for logging and metrics
 */
interface RequestMetadata {
  method: string;
  timestamp: number;
  attempt: number;
}

/**
 * Performance metrics
 */
interface PerformanceMetrics {
  method: string;
  duration: number;
  success: boolean;
  error?: HKAError;
  attempts: number;
}

/**
 * Enhanced HKA SOAP Client
 */
export class EnhancedHKASOAPClient {
  private baseClient: HKASOAPClient;
  private circuitBreaker: CircuitBreaker;
  private metrics: PerformanceMetrics[] = [];

  constructor(
    environment: HKAEnvironmentType,
    credentials: HKACredentials,
    circuitBreaker?: CircuitBreaker
  ) {
    this.baseClient = new HKASOAPClient(environment, credentials);
    this.circuitBreaker = circuitBreaker || createHKACircuitBreaker();
  }

  /**
   * Execute a method with all protections
   */
  private async executeWithProtection<T>(
    methodName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    let attempts = 0;
    let lastError: HKAError | undefined;

    const metadata: RequestMetadata = {
      method: methodName,
      timestamp: startTime,
      attempt: 0,
    };

    while (true) {
      attempts++;
      metadata.attempt = attempts;

      try {
        // Execute through circuit breaker
        const result = await this.circuitBreaker.execute(async () => {
          console.log(`[EnhancedClient] ${methodName} - Attempt ${attempts}`);
          return await fn();
        });

        // Success - record metrics
        const duration = Date.now() - startTime;
        this.recordMetrics({
          method: methodName,
          duration,
          success: true,
          attempts,
        });

        console.log(`[EnhancedClient] ${methodName} succeeded in ${duration}ms (${attempts} attempts)`);

        return result;
      } catch (error: any) {
        // Classify the error
        const classifiedError = classifyHKAError(error);
        lastError = classifiedError;

        console.error(`[EnhancedClient] ${methodName} error:`, formatErrorForLog(classifiedError));

        // Check if circuit breaker is open
        if (error instanceof CircuitBreakerOpenError) {
          // Don't retry if circuit is open
          const duration = Date.now() - startTime;
          this.recordMetrics({
            method: methodName,
            duration,
            success: false,
            error: classifiedError,
            attempts,
          });

          throw error;
        }

        // Get retry strategy
        const retryStrategy = getRetryStrategy(classifiedError, attempts - 1);

        // Check if we should retry
        if (!retryStrategy.shouldRetry || attempts > retryStrategy.maxRetries) {
          // No more retries - fail
          const duration = Date.now() - startTime;
          this.recordMetrics({
            method: methodName,
            duration,
            success: false,
            error: classifiedError,
            attempts,
          });

          throw error;
        }

        // Wait before retry
        console.log(
          `[EnhancedClient] ${methodName} will retry in ${retryStrategy.delayMs}ms (attempt ${attempts}/${retryStrategy.maxRetries})`
        );

        await new Promise((resolve) => setTimeout(resolve, retryStrategy.delayMs));
      }
    }
  }

  /**
   * Record performance metrics
   */
  private recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const total = this.metrics.length;
    const successful = this.metrics.filter((m) => m.success).length;
    const failed = total - successful;

    const avgDuration =
      total > 0
        ? this.metrics.reduce((sum, m) => sum + m.duration, 0) / total
        : 0;

    const byMethod: Record<string, { total: number; success: number; avgDuration: number }> = {};

    this.metrics.forEach((m) => {
      if (!byMethod[m.method]) {
        byMethod[m.method] = { total: 0, success: 0, avgDuration: 0 };
      }
      byMethod[m.method].total++;
      if (m.success) {
        byMethod[m.method].success++;
      }
      byMethod[m.method].avgDuration += m.duration;
    });

    Object.keys(byMethod).forEach((method) => {
      byMethod[method].avgDuration /= byMethod[method].total;
    });

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      avgDuration,
      byMethod,
      circuitBreaker: this.circuitBreaker.getStats(),
    };
  }

  // ===== Wrapped HKA Methods =====

  async enviar(xmlBase64: string) {
    return this.executeWithProtection('Enviar', () =>
      this.baseClient.enviar(xmlBase64)
    );
  }

  async estadoDocumento(documentData: any) {
    return this.executeWithProtection('EstadoDocumento', () =>
      this.baseClient.estadoDocumento(documentData)
    );
  }

  async anulacionDocumento(documentData: any, motivoAnulacion: string) {
    return this.executeWithProtection('AnulacionDocumento', () =>
      this.baseClient.anulacionDocumento(documentData, motivoAnulacion)
    );
  }

  async descargaXML(documentData: any) {
    return this.executeWithProtection('DescargaXML', () =>
      this.baseClient.descargaXML(documentData)
    );
  }

  async descargaPDF(documentData: any) {
    return this.executeWithProtection('DescargaPDF', () =>
      this.baseClient.descargaPDF(documentData)
    );
  }

  async foliosRestantes() {
    return this.executeWithProtection('FoliosRestantes', () =>
      this.baseClient.foliosRestantes()
    );
  }

  async envioCorreo(documentData: any, correo: string) {
    return this.executeWithProtection('EnvioCorreo', () =>
      this.baseClient.envioCorreo(documentData, correo)
    );
  }

  async rastreoCorreo(documentData: any) {
    return this.executeWithProtection('RastreoCorreo', () =>
      this.baseClient.rastreoCorreo(documentData)
    );
  }

  async consultarRucDV(ruc: string) {
    return this.executeWithProtection('ConsultarRucDV', () =>
      this.baseClient.consultarRucDV(ruc)
    );
  }

  async testConnection() {
    return this.executeWithProtection('TestConnection', () =>
      this.baseClient.testConnection()
    );
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus() {
    return this.circuitBreaker.getStats();
  }

  /**
   * Manually reset circuit breaker
   */
  resetCircuitBreaker() {
    this.circuitBreaker.reset();
  }
}

/**
 * Factory function to create enhanced HKA client
 */
export function createEnhancedHKAClient(
  environment: HKAEnvironmentType,
  credentials: HKACredentials,
  circuitBreaker?: CircuitBreaker
): EnhancedHKASOAPClient {
  return new EnhancedHKASOAPClient(environment, credentials, circuitBreaker);
}
