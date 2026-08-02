import * as path from 'node:path';
import { type AllowedFileTypes, allowedFileTypes } from './types';

export const _getErrMsg = (e: unknown, defMsg?: string): string => {
  if (e instanceof Error) return e.message;
  return defMsg ?? String(e);
};

export const _validateFileType = (ext: string): ext is AllowedFileTypes =>
  (allowedFileTypes as readonly string[]).includes(ext);

export const _parseFileType = (file: string): AllowedFileTypes => {
  const fileName = path.basename(file);
  if (fileName.startsWith('.env')) return 'dotenv';
  const ext = path.extname(fileName).slice(1).toLowerCase();
  if (!_validateFileType(ext)) {
    throw new Error(`extension (.${ext}) not allowed`);
  }
  return ext;
};

/**
 * Parse a scalar string value into the most appropriate JS type.
 * Bug 9 fix: empty string is now returned as '' not null.
 */
export const _parseValue = (value: string): unknown => {
  if (value === 'null') return null;
  // Bug 9 fix: empty string is a valid env value
  if (value.length === 0) return '';
  if (value === 'true') return true;
  if (value === 'false') return false;

  const parsedNumber = Number(value);
  if (!isNaN(parsedNumber) && value.trim() !== '') return parsedNumber;

  try {
    const parsedObject: unknown = JSON.parse(value);
    if (typeof parsedObject === 'object' && parsedObject !== null) {
      return parsedObject;
    }
  } catch {
    /* not JSON — return as string */
  }
  return value;
};

export const _recursiveCoerce = (config: unknown): unknown => {
  if (Array.isArray(config)) {
    return config.map(_recursiveCoerce);
  }
  if (config !== null && typeof config === 'object') {
    return Object.fromEntries(
      Object.entries(config as Record<string, unknown>).map(([k, v]) => [k, _recursiveCoerce(v)])
    );
  }
  if (typeof config === 'string') {
    try {
      return JSON.parse(config);
    } catch {
      return config;
    }
  }
  return config;
};

/** Get dot-notation path from a nested object. */
export const _getByPath = (obj: Record<string, unknown>, dotPath: string): unknown =>
  dotPath.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === 'object' && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);

/** Set a value at a dot-notation path, creating intermediate objects as needed. */
export const _setByPath = (obj: Record<string, unknown>, dotPath: string, value: unknown): void => {
  const keys = dotPath.split('.');
  const last = keys.pop();
  if (!last) return;
  const target = keys.reduce<Record<string, unknown>>((acc, key) => {
    if (typeof acc[key] !== 'object' || acc[key] === null) {
      acc[key] = {};
    }
    return acc[key] as Record<string, unknown>;
  }, obj);
  target[last] = value;
};

/** Detect the line ending used in a string. */
export const _lineSep = (text: string): '\r\n' | '\n' =>
  text.includes('\r\n') ? '\r\n' : '\n';

/** Normalise line endings to LF for cross-platform parsing. */
export const _normaliseLF = (text: string): string => text.replace(/\r\n/g, '\n');
