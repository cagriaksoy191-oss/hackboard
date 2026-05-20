/**
 * password.js — Password Hashing Utilities
 *
 * Uses Node.js built-in crypto module (scrypt) for password hashing.
 * No external dependency (bcrypt) required — reduces native addon issues
 * across platforms (Windows, Linux, Docker).
 *
 * Hash format: salt:derivedKey (both hex-encoded)
 * Key length: 64 bytes, salt: 32 bytes
 */

import crypto from 'crypto';

const SALT_LENGTH = 32;
const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = {
  N: 16384,   // CPU/memory cost (2^14)
  r: 8,       // block size
  p: 1,       // parallelism
  maxmem: 64 * 1024 * 1024, // 64MB
};

/**
 * Hash a plaintext password.
 * @param {string} password - The plaintext password
 * @returns {Promise<string>} The hash in "salt:key" hex format
 */
export async function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_LENGTH);
    crypto.scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt.toString('hex')}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verify a plaintext password against a stored hash.
 * @param {string} password - The plaintext password to verify
 * @param {string} storedHash - The stored hash in "salt:key" hex format
 * @returns {Promise<boolean>} True if the password matches
 */
export async function verifyPassword(password, storedHash) {
  return new Promise((resolve, reject) => {
    const [saltHex, keyHex] = storedHash.split(':');
    if (!saltHex || !keyHex) return resolve(false);

    const salt = Buffer.from(saltHex, 'hex');
    const storedKey = Buffer.from(keyHex, 'hex');

    crypto.scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(crypto.timingSafeEqual(storedKey, derivedKey));
    });
  });
}
