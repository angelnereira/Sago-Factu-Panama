/**
 * Invoice Timestamp Utilities
 *
 * Provides synchronized timestamps for invoice generation.
 * Ensures all invoices have accurate Panama time.
 */

import { getSyncedTime, getSyncedISOString, getSyncedTimestamp } from './time-sync';

/**
 * Get invoice creation timestamp
 * Returns ISO 8601 format for database storage
 */
export function getInvoiceTimestamp(): string {
  return getSyncedISOString();
}

/**
 * Get invoice date in DGI format (YYYY-MM-DD)
 */
export function getInvoiceDateDGI(): string {
  const syncedTime = getSyncedTime();
  const year = syncedTime.getFullYear();
  const month = (syncedTime.getMonth() + 1).toString().padStart(2, '0');
  const day = syncedTime.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get invoice time in DGI format (HH:MM:SS)
 */
export function getInvoiceTimeDGI(): string {
  const syncedTime = getSyncedTime();
  const hours = syncedTime.getHours().toString().padStart(2, '0');
  const minutes = syncedTime.getMinutes().toString().padStart(2, '0');
  const seconds = syncedTime.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Get invoice datetime in DGI format (YYYY-MM-DDTHH:MM:SS)
 */
export function getInvoiceDateTimeDGI(): string {
  return `${getInvoiceDateDGI()}T${getInvoiceTimeDGI()}`;
}

/**
 * Check if invoice date is valid for emission
 * DGI allows invoices up to 7 days in the past
 */
export function isValidInvoiceDate(invoiceDate: Date): boolean {
  const now = getSyncedTime();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Must not be in the future
  if (invoiceDate > now) {
    return false;
  }

  // Must not be more than 7 days old
  if (invoiceDate < sevenDaysAgo) {
    return false;
  }

  return true;
}

/**
 * Format date for display in Panama locale
 */
export function formatInvoiceDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleDateString('es-PA', {
    timeZone: 'America/Panama',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format datetime for display in Panama locale
 */
export function formatInvoiceDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  return d.toLocaleString('es-PA', {
    timeZone: 'America/Panama',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Get current Panama date for default values in forms
 */
export function getCurrentPanamaDate(): string {
  return getInvoiceDateDGI();
}

/**
 * Validate emission date range
 */
export function validateEmissionDate(
  emissionDate: string
): { valid: boolean; error?: string } {
  try {
    const date = new Date(emissionDate);

    if (isNaN(date.getTime())) {
      return { valid: false, error: 'Fecha inválida' };
    }

    if (!isValidInvoiceDate(date)) {
      const now = getSyncedTime();
      if (date > now) {
        return { valid: false, error: 'La fecha no puede ser futura' };
      } else {
        return {
          valid: false,
          error: 'La fecha no puede ser mayor a 7 días en el pasado',
        };
      }
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Error validando fecha' };
  }
}

/**
 * Get timestamp for audit logs
 */
export function getAuditTimestamp(): number {
  return getSyncedTimestamp();
}
