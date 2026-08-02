import { stringify as stringifyYaml } from 'yaml';
import type { Config, AllowedFileTypes } from './types';

// ─── .env ─────────────────────────────────────────────────────────────────────

const _stringifyEnv = (config: Config, prefix = ''): string => {
  let content = '';
  for (const [key, value] of Object.entries(config)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') {
      content += _stringifyEnv(value as Config, fullKey);
    } else {
      content += `${fullKey}=${String(value)}\n`;
    }
  }
  return content;
};

// ─── TOML ─────────────────────────────────────────────────────────────────────

const _stringifyToml = (config: Config, header = ''): string => {
  let scalars = '';
  let sections = '';

  for (const [key, value] of Object.entries(config)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        const fullHeader = header ? `${header}.${key}` : key;
        sections += `[[${fullHeader}]]\n${_stringifyToml(item as Config, fullHeader)}\n`;
      }
    } else if (value !== null && typeof value === 'object') {
      const fullHeader = header ? `${header}.${key}` : key;
      sections += `[${fullHeader}]\n${_stringifyToml(value as Config, fullHeader)}\n`;
    } else {
      scalars += `${key} = ${JSON.stringify(value)}\n`;
    }
  }

  return scalars + sections;
};

// ─── INI ──────────────────────────────────────────────────────────────────────

const _stringifyIni = (config: Config, header = ''): string => {
  let content = '';
  for (const [key, value] of Object.entries(config)) {
    if (value !== null && typeof value === 'object') {
      const fullHeader = header ? `${header}.${key}` : key;
      content += `\n[${fullHeader}]\n${_stringifyIni(value as Config, fullHeader)}`;
    } else {
      content += `${key}=${JSON.stringify(value)}\n`;
    }
  }
  return content;
};

// ─── Unified entry point ──────────────────────────────────────────────────────

/**
 * Serialise a Config object to a string in the given format.
 */
export const stringify = (config: Config, type: AllowedFileTypes): string => {
  switch (type) {
    case 'dotenv': return _stringifyEnv(config);
    case 'toml':   return _stringifyToml(config);
    case 'yaml':
    case 'yml':    return stringifyYaml(config);
    case 'json':   return JSON.stringify(config, null, 2);
    case 'ini':    return _stringifyIni(config).trimStart();
    default:       throw new Error(`Unsupported file type: ${type}`);
  }
};
