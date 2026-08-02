import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { Config } from './types';
import { _getByPath, _setByPath } from './utils';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;   // 96-bit IV recommended for GCM
const TAG_LENGTH = 16;  // 128-bit auth tag
const ENC_PREFIX = 'enc:';

/** Derive a 32-byte key from any string via SHA-256. */
const deriveKey = (secret: string): Buffer =>
  createHash('sha256').update(secret).digest();

/**
 * Encrypt a plaintext string value with AES-256-GCM.
 * Returns `enc:<ivB64>:<tagB64>:<ciphertextB64>`.
 */
export const encrypt = (plaintext: string, secret: string): string => {
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
};

/**
 * Decrypt a value previously encrypted with `encrypt()`.
 * Returns the original string unchanged if it is not in `enc:` format.
 */
export const decrypt = (value: string, secret: string): string => {
  if (!value.startsWith(ENC_PREFIX)) return value;
  const parts = value.slice(ENC_PREFIX.length).split(':');
  if (parts.length !== 3) return value;
  const [ivB64, tagB64, dataB64] = parts;
  const key = deriveKey(secret);
  const iv = Buffer.from(ivB64!, 'base64');
  const tag = Buffer.from(tagB64!, 'base64');
  const data = Buffer.from(dataB64!, 'base64');
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
};

/** Check whether a string is an encrypted value. */
export const isEncrypted = (value: string): boolean => value.startsWith(ENC_PREFIX);

/**
 * Walk the config and encrypt the specified dot-notation field paths in place.
 * Returns a new config object.
 */
export const encryptFields = (
  config: Config,
  fields: string[],
  secret: string
): Config => {
  const result = structuredClone(config) as Record<string, unknown>;
  for (const field of fields) {
    const value = _getByPath(result, field);
    if (typeof value === 'string' && !isEncrypted(value)) {
      _setByPath(result, field, encrypt(value, secret));
    }
  }
  return result;
};

/**
 * Walk the config and decrypt the specified dot-notation field paths in place.
 * Returns a new config object.
 */
export const decryptFields = (
  config: Config,
  fields: string[],
  secret: string
): Config => {
  const result = structuredClone(config) as Record<string, unknown>;
  for (const field of fields) {
    const value = _getByPath(result, field);
    if (typeof value === 'string' && isEncrypted(value)) {
      _setByPath(result, field, decrypt(value, secret));
    }
  }
  return result;
};
