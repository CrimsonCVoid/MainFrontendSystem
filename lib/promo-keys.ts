/**
 * PROMO KEY GENERATOR & VALIDATOR
 *
 * Generates cryptographically secure, non-brute-forceable promotional keys.
 * Used for one-time free project unlocks without payment.
 *
 * Key Format: XXXX-XXXX-XXXX-XXXX-XXXX (20 characters + 4 dashes for display)
 * Character Set: 32 safe characters (uppercase + digits, excludes 0, O, I, 1)
 * Security: Uses crypto.randomBytes() for true randomness
 * Keyspace: 32^20 = ~1.2 * 10^30 possible combinations
 */

import crypto from 'crypto';

// Safe character set: uppercase letters + digits, excludes ambiguous (0, O, I, 1)
const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const KEY_LENGTH = 20;

export interface PromoKey {
  keyCode: string;      // Raw key without dashes (e.g., "ABCD123456")
  formattedKey: string; // Display format with dashes (e.g., "ABCD-1234-56")
}

/**
 * Generate a single cryptographically secure promo key
 * Uses crypto.randomBytes for true randomness (not Math.random())
 */
export function generatePromoKey(): PromoKey {
  const bytes = crypto.randomBytes(KEY_LENGTH);
  let keyCode = '';

  for (let i = 0; i < KEY_LENGTH; i++) {
    // Use modulo to map byte value to character index
    const index = bytes[i] % SAFE_CHARS.length;
    keyCode += SAFE_CHARS[index];
  }

  return {
    keyCode,
    formattedKey: formatKey(keyCode),
  };
}

/**
 * Generate multiple unique promo keys
 * Ensures no duplicates using a Set
 *
 * @param count - Number of keys to generate
 * @returns Array of unique promo keys
 */
export function generatePromoKeys(count: number): PromoKey[] {
  const keys = new Set<string>();

  // Keep generating until we have the required count
  while (keys.size < count) {
    const key = generatePromoKey();
    keys.add(key.keyCode);
  }

  return Array.from(keys).map(keyCode => ({
    keyCode,
    formattedKey: formatKey(keyCode),
  }));
}

/**
<<<<<<< HEAD
 * Format key for display: XXXX-XXXX-XXXX-XXXX-XXXX
 * Adds dashes for readability
 *
 * @param keyCode - Raw 20-character key
 * @returns Formatted key with dashes
 */
export function formatKey(keyCode: string): string {
  if (keyCode.length !== KEY_LENGTH) {
    return keyCode; // Return as-is if invalid length
  }

  // Split into 4-character chunks separated by dashes
  return `${keyCode.slice(0, 4)}-${keyCode.slice(4, 8)}-${keyCode.slice(8, 12)}-${keyCode.slice(12, 16)}-${keyCode.slice(16)}`;
=======
 * Format key for display with dashes every 4 characters
 * Supports both 16-char (XXXX-XXXX-XXXX-XXXX) and 20-char (XXXX-XXXX-XXXX-XXXX-XXXX) keys
 *
 * @param keyCode - Raw key (16 or 20 characters)
 * @returns Formatted key with dashes
 */
export function formatKey(keyCode: string): string {
  // Split into 4-character chunks separated by dashes
  const chunks: string[] = [];
  for (let i = 0; i < keyCode.length; i += 4) {
    chunks.push(keyCode.slice(i, i + 4));
  }
  return chunks.join('-');
>>>>>>> 612adb7145dfaf30eb9bfdcf5073c0142a3976fa
}

/**
 * Normalize user input for validation
 * Removes dashes, whitespace, and converts to uppercase
 *
 * @param input - User-entered key (may contain dashes, spaces, lowercase)
 * @returns Normalized key code
 */
export function normalizeKeyInput(input: string): string {
  return input
    .replace(/[\s-]/g, '')  // Remove spaces and dashes
    .toUpperCase();          // Convert to uppercase
}

/**
 * Validate key format (before database lookup)
 * Checks length and character validity
 *
 * @param keyCode - Normalized key code to validate
 * @returns True if format is valid
 */
export function isValidKeyFormat(keyCode: string): boolean {
  const normalized = normalizeKeyInput(keyCode);

  // Check length
  if (normalized.length !== KEY_LENGTH) {
    return false;
  }

  // Check all characters are in safe set
  return normalized.split('').every(char => SAFE_CHARS.includes(char));
}

/**
 * Calculate the theoretical keyspace size
 * 32 characters ^ 20 positions = ~1.2 * 10^30 combinations
 *
 * @returns Object with keyspace information
 */
export function getKeyspaceInfo() {
  const combinations = Math.pow(SAFE_CHARS.length, KEY_LENGTH);

  return {
    characterSet: SAFE_CHARS,
    characterSetSize: SAFE_CHARS.length,
    keyLength: KEY_LENGTH,
    totalCombinations: combinations,
    combinationsFormatted: combinations.toExponential(2),
    securityLevel: 'Extremely High (1.2 nonillion combinations)',
    bruteForceResistant: true,
  };
}
