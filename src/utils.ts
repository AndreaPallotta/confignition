import * as path from 'path';
import * as fs from 'fs';
import { AllowedFileTypes, allowedFileTypes } from './types';

export const _getErrMsg = (e: unknown, defMsg?: string) => {
    if (e instanceof Error) return e.message;
    return defMsg || String(e);
}

export const _validateFileType = (ext: string): ext is AllowedFileTypes => {
    return allowedFileTypes.includes(ext as AllowedFileTypes);
}

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
}

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
    } catch (e) { }
    return value;
};