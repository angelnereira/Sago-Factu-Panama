/**
 * AES-256 Encryption/Decryption Utilities
 *
 * Used to securely store sensitive credentials (HKA tokens, certificate passwords)
 * in the database. Each organization's credentials are encrypted at rest.
 *
 * Security Notes:
 * - Uses AES-256-GCM for authenticated encryption
 * - Generates random IV for each encryption operation
 * - Key must be 32 bytes (256 bits) - stored in ENCRYPTION_KEY env var
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment
 * Validates that key is exactly 32 bytes
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  // Convert base64 key to buffer
  const keyBuffer = Buffer.from(key, 'base64');

  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(`Encryption key must be ${KEY_LENGTH} bytes (256 bits). Generate with: openssl rand -base64 32`);
  }

  return keyBuffer;
}

/**
 * Encrypts a string using AES-256-GCM
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData (all base64)
 *
 * @example
 * const encrypted = encrypt("my-secret-token");
 * // Returns: "x8dJ2k...==:p9Kl3m...==:a1bC2d...=="
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty string');
  }

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypts a string encrypted with encrypt()
 *
 * @param encryptedData - The encrypted string (iv:authTag:encryptedData)
 * @returns Decrypted plaintext string
 *
 * @throws Error if decryption fails (wrong key, tampered data, etc)
 *
 * @example
 * const decrypted = decrypt("x8dJ2k...==:p9Kl3m...==:a1bC2d...==");
 * // Returns: "my-secret-token"
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) {
    throw new Error('Cannot decrypt empty string');
  }

  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format. Expected: iv:authTag:encryptedData');
  }

  const [ivBase64, authTagBase64, encrypted] = parts;

  const key = getEncryptionKey();
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Encrypts multiple fields in an object
 *
 * @param data - Object with fields to encrypt
 * @param fields - Array of field names to encrypt
 * @returns New object with specified fields encrypted
 *
 * @example
 * const encrypted = encryptFields(
 *   { token: "secret", password: "pass123", name: "Test" },
 *   ["token", "password"]
 * );
 * // Returns: { token: "encrypted...", password: "encrypted...", name: "Test" }
 */
export function encryptFields<T extends Record<string, any>>(
  data: T,
  fields: (keyof T)[]
): T {
  const result = { ...data };

  for (const field of fields) {
    const value = data[field];
    if (value && typeof value === 'string') {
      result[field] = encrypt(value) as any;
    }
  }

  return result;
}

/**
 * Decrypts multiple fields in an object
 *
 * @param data - Object with encrypted fields
 * @param fields - Array of field names to decrypt
 * @returns New object with specified fields decrypted
 *
 * @example
 * const decrypted = decryptFields(
 *   { token: "encrypted...", password: "encrypted...", name: "Test" },
 *   ["token", "password"]
 * );
 * // Returns: { token: "secret", password: "pass123", name: "Test" }
 */
export function decryptFields<T extends Record<string, any>>(
  data: T,
  fields: (keyof T)[]
): T {
  const result = { ...data };

  for (const field of fields) {
    const value = data[field];
    if (value && typeof value === 'string') {
      try {
        result[field] = decrypt(value) as any;
      } catch (error) {
        // If decryption fails, field might not be encrypted or key is wrong
        console.error(`Failed to decrypt field ${String(field)}:`, error);
        throw new Error(`Decryption failed for field ${String(field)}`);
      }
    }
  }

  return result;
}

/**
 * Validates encryption key format and length
 * Useful for startup checks
 */
export function validateEncryptionKey(): boolean {
  try {
    const key = getEncryptionKey();
    return key.length === KEY_LENGTH;
  } catch {
    return false;
  }
}

/**
 * Test encryption/decryption round-trip
 * Useful for validation during setup
 */
export function testEncryption(): boolean {
  try {
    const testString = 'test-encryption-' + Date.now();
    const encrypted = encrypt(testString);
    const decrypted = decrypt(encrypted);
    return decrypted === testString;
  } catch {
    return false;
  }
}
