/**
 * Circuit Breaker Pattern for HKA API
 *
 * Protects both our system and HKA from cascading failures.
 * Works like an electrical circuit breaker: if too many errors occur,
 * it "opens" and stops attempting calls for a recovery period.
 *
 * States:
 * - CLOSED: Normal operation, calls flow through
 * - OPEN: Too many failures, reject all calls immediately
 * - HALF_OPEN: Testing if service recovered, allow one test call
 *
 * This pattern is critical for HKA because it protects folios from being
 * consumed during outages.
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Successes needed to close from half-open
  timeout: number; // Time to wait before attempting recovery (ms)
  monitoringPeriod: number; // Time window for counting failures (ms)
}

interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  nextAttemptTime: number | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number | null = null;
  private nextAttemptTime: number | null = null;
  private failureTimestamps: number[] = [];

  // Statistics
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;

  constructor(private config: CircuitBreakerConfig) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    // If circuit is OPEN, check if we should try recovery
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptTime!) {
        throw new CircuitBreakerOpenError(
          `Circuit breaker is OPEN. Next attempt at ${new Date(
            this.nextAttemptTime!
          ).toISOString()}`
        );
      }
      // Move to HALF_OPEN to test recovery
      this.state = 'HALF_OPEN';
      this.successes = 0;
      console.log('[CircuitBreaker] Transitioning to HALF_OPEN for recovery test');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.totalSuccesses++;
    this.failures = 0; // Reset failure count
    this.failureTimestamps = [];

    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        console.log(
          `[CircuitBreaker] ${this.successes} successes in HALF_OPEN, closing circuit`
        );
        this.state = 'CLOSED';
        this.successes = 0;
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.totalFailures++;
    this.failures++;
    this.lastFailureTime = Date.now();
    this.failureTimestamps.push(this.lastFailureTime);

    // Remove old failures outside monitoring period
    const cutoff = Date.now() - this.config.monitoringPeriod;
    this.failureTimestamps = this.failureTimestamps.filter((t) => t > cutoff);

    if (this.state === 'HALF_OPEN') {
      // If test call fails, go back to OPEN
      console.log('[CircuitBreaker] Test call failed in HALF_OPEN, reopening circuit');
      this.openCircuit();
    } else if (this.failureTimestamps.length >= this.config.failureThreshold) {
      // Too many failures in monitoring period
      console.log(
        `[CircuitBreaker] ${this.failureTimestamps.length} failures in ${
          this.config.monitoringPeriod / 1000
        }s, opening circuit`
      );
      this.openCircuit();
    }
  }

  /**
   * Open the circuit
   */
  private openCircuit(): void {
    this.state = 'OPEN';
    this.nextAttemptTime = Date.now() + this.config.timeout;
    console.log(
      `[CircuitBreaker] Circuit OPEN until ${new Date(
        this.nextAttemptTime
      ).toISOString()}`
    );
  }

  /**
   * Get current statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.failureTimestamps = [];
    console.log('[CircuitBreaker] Manually reset to CLOSED state');
  }

  /**
   * Check if circuit is allowing requests
   */
  isAllowingRequests(): boolean {
    if (this.state === 'CLOSED' || this.state === 'HALF_OPEN') {
      return true;
    }
    if (this.state === 'OPEN' && Date.now() >= this.nextAttemptTime!) {
      return true; // Will transition to HALF_OPEN on next request
    }
    return false;
  }
}

/**
 * Custom error for circuit breaker open state
 */
export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}

/**
 * Default configuration for HKA circuit breaker
 */
export const DEFAULT_HKA_CIRCUIT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5, // Open after 5 failures
  successThreshold: 2, // Need 2 successes to close
  timeout: 60000, // Wait 60 seconds before retry
  monitoringPeriod: 120000, // Count failures in 2 minute window
};

/**
 * Create a circuit breaker for HKA
 */
export function createHKACircuitBreaker(
  config: Partial<CircuitBreakerConfig> = {}
): CircuitBreaker {
  return new CircuitBreaker({
    ...DEFAULT_HKA_CIRCUIT_CONFIG,
    ...config,
  });
}
