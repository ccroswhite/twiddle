/**
 * Password hashing utilities using Node.js built-in crypto
 * Uses scrypt for secure password hashing
 */
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';

// Configuration
const SALT_LENGTH = 32;
const KEY_LENGTH = 64;

/**
 * Promisified scrypt
 */
function scryptAsync(password: string, salt: string, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

/**
 * Hash a password using scrypt
 * Returns a string in the format: salt:hash
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const derivedKey = await scryptAsync(password, salt, KEY_LENGTH);
  return `${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) {
      return false;
    }
    
    const derivedKey = await scryptAsync(password, salt, KEY_LENGTH);
    const storedKey = Buffer.from(hash, 'hex');
    
    // Use timing-safe comparison to prevent timing attacks
    return timingSafeEqual(derivedKey, storedKey);
  } catch {
    return false;
  }
}

/**
 * Generate a secure random token for sessions
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Validate password strength
 * Returns an error message if invalid, null if valid
 */
export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (password.length > 128) {
    return 'Password must be less than 128 characters';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number';
  }
  return null;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
