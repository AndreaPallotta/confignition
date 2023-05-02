/* eslint-disable @typescript-eslint/no-explicit-any */

import * as path from 'path';
import * as fs from 'fs';
import { AllowedFileTypes, allowedFileTypes } from './types';

export const _getErrMsg = (e: unknown, defMsg?: string) => {
  if (e instanceof Error) return e.message;
  return defMsg || String(e);
};

export const _validateFileType = (ext: string): ext is AllowedFileTypes => {
  return allowedFileTypes.includes(ext as any);
};

export const _parseFileType = (file: string): AllowedFileTypes => {
  const fileName = path.basename(file);
  if (fileName.startsWith('.env')) {
    return 'dotenv';
  }
  const ext = path.extname(fileName).slice(1);
  if (!_validateFileType(ext)) {
    throw new Error(`extension (${ext}) not allowed`);
  }

  return ext as AllowedFileTypes;
};

export const _getConfig = (filePath: string): string => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return data;
  } catch (err: unknown) {
    throw new Error(_getErrMsg(err));
  }
};

export const _parseValue = (value: string): any => {
  if (value === 'null' || value.length === 0) return null;
  if (value === 'true') return true;
  if (value === 'false') return false;

  const parsedNumber = Number(value);
  if (!isNaN(parsedNumber)) return parsedNumber;

  try {
    const parsedObject = JSON.parse(value);
    if (typeof parsedObject === 'object' && parsedObject !== null) {
      return parsedObject;
    }
  } catch (e) {
    /* empty */
  }
  return value;
};

export const _recursiveJsonParse = (config: any): any => {
  if (Array.isArray(config)) {
    for (let i = 0; i < config.length; i++) {
      config[i] = _recursiveJsonParse(config[i]);
    }
    return config;
  }

  if (config && typeof config === 'object') {
    for (const [key, value] of Object.entries(config)) {
      config[key] = _recursiveJsonParse(value);
    }
    return config;
  }

  if (typeof config === 'string') {
    try {
      return JSON.parse(config);
    } catch (error) {
      return config;
    }
  }
  return config;
};

export const streamToString = async (stream: any) => {
  return new Promise((resolve: (value: any) => void, reject: (reason?: any) => void) => {
    const chunks: Buffer[] = [];
    stream.on('data', (data: any) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    stream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    stream.on('error', reject);
  });
};
