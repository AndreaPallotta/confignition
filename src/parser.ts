import { parse as parseToml } from 'smol-toml';
import YAML from 'yaml';
import type { Config, AllowedFileTypes } from './types';
import { _getErrMsg, _parseValue, _recursiveCoerce, _normaliseLF } from './utils';

// ─── .env ─────────────────────────────────────────────────────────────────────

const _parseDotenv = (content: string): Config => {
  const config: Config = {};
  // Bug 3 fix: normalise CRLF, split on /=(.+)?/ to handle values containing '='
  const lines = _normaliseLF(content).split('\n');

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Strip inline comments (only outside quoted values — simple heuristic)
    const withoutComment = trimmed.replace(/#.*$/, '').trim();

    // Bug 3 fix: use limit=2 split so DATABASE_URL=postgres://a:b@c/d parses correctly
    const eqIdx = withoutComment.indexOf('=');
    if (eqIdx === -1) continue;

    const key = withoutComment.slice(0, eqIdx).trim();
    const raw_value = withoutComment.slice(eqIdx + 1).trim();

    // Strip surrounding quotes
    const value = raw_value.replace(/^(['"`])(.*)\1$/, '$2');

    if (key) config[key] = _parseValue(value);
  }

  return config;
};

// ─── TOML ─────────────────────────────────────────────────────────────────────

const _parseToml = (content: string): Config => {
  try {
    // smol-toml handles all TOML 1.0 edge cases: arrays, inline tables, datetimes, multiline strings
    return parseToml(_normaliseLF(content)) as Config;
  } catch (err) {
    throw new Error(`parse failed (TOML): ${_getErrMsg(err)}`);
  }
};

// ─── YAML ─────────────────────────────────────────────────────────────────────

const _parseYaml = (content: string): Config => {
  try {
    const parsed: unknown = YAML.parse(_normaliseLF(content));
    return _recursiveCoerce(parsed) as Config;
  } catch (err) {
    throw new Error(`parse failed (YAML): ${_getErrMsg(err)}`);
  }
};

// ─── JSON ─────────────────────────────────────────────────────────────────────

const _parseJson = (content: string): Config => {
  try {
    return JSON.parse(content) as Config;
  } catch (err) {
    throw new Error(`parse failed (JSON): ${_getErrMsg(err)}`);
  }
};

// ─── INI ──────────────────────────────────────────────────────────────────────

const _parseIni = (content: string): Config => {
  const config: Config = {};
  let currentSection = '';

  const lines = _normaliseLF(content).split('\n');

  for (const raw of lines) {
    const trimmed = raw.trim();

    // Bug 7-adjacent: INI supports both '#' and ';' as comment delimiters
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;

    const sectionMatch = /^\[([^\]]+)\]$/.exec(trimmed);
    if (sectionMatch) {
      currentSection = sectionMatch[1]!.trim();
      if (!config[currentSection]) config[currentSection] = {};
      continue;
    }

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^(['"])(.*)\1$/, '$2');

    if (!key) continue;

    if (currentSection) {
      (config[currentSection] as Config)[key] = _parseValue(value);
    } else {
      config[key] = _parseValue(value);
    }
  }

  return config;
};

// ─── Unified entry point ──────────────────────────────────────────────────────

/**
 * Parse file content string into a Config object based on file type.
 */
export const parse = (content: string, type: AllowedFileTypes): Config => {
  switch (type) {
    case 'dotenv': return _parseDotenv(content);
    case 'toml':   return _parseToml(content);
    case 'yaml':
    case 'yml':    return _parseYaml(content);
    case 'json':   return _parseJson(content);
    case 'ini':    return _parseIni(content);
    default:       throw new Error(`Unsupported file type: ${type}`);
  }
};
