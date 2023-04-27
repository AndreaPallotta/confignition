import * as path from 'path';
import * as fs from 'fs';
import parser from './parser';

const _getErrMsg = (e: unknown, defMsg?: string) => {
    if (e instanceof Error) return e.message;
    return defMsg || String(e);
}

const _validateFileType = (ext: string): ext is AllowedFileTypes => {
    return allowedFileTypes.includes(ext as AllowedFileTypes);
}

const _parseFileType = (file: string): AllowedFileTypes => {
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

const _getConfig = (filePath: string): string => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return data;
    } catch (err: unknown) {
        throw new Error(_getErrMsg(err));
    }
};

/**
 * The content of the configuration file.
 */
export interface Config {
    [key: string]: unknown;
}

let config: Config;

const allowedFileTypes = ['dotenv', 'toml', 'yaml', 'yml', 'json', 'ini'] as const;

/**
 * Extensions allowed for configuration file.
 */
type AllowedFileTypes = typeof allowedFileTypes[number];

/**
 *
 * @param {string} filePath the path to evaluate.
 * @param {AllowedFileTypes} type the optional file type. If not provided, it will be inferred from the extension.
 * @throws {Error} if file extension is not allowed.
 */
export const parse = (file: string, type?: AllowedFileTypes) => {
    try {
        if (!type) {
            type = _parseFileType(file);
        }

        const filePath = path.join(path.resolve(path.dirname('')), file);
        const content = _getConfig(filePath);

        switch (type) {
            case 'dotenv':
                config = parser.parseDotenv(content);
                break;
            case 'toml':
                parser.parseToml(content);
                break;
            case 'yaml':
            case 'yml':
                parser.parseYaml(content);
                break;
            case 'json':
                parser.parseJson(content);
                break;
            case 'ini':
                parser.parseIni(content);
                break;
        }
    } catch (err) {
        throw new Error(`Error parsing config file: ${_getErrMsg(err)}`);
    }
};

/**
 * Return the parsed configuration.
 * If this function is called before the file is parsed, it will return null.
 * @returns {Config} configuration content.
 */
export const getConfig = (): Config => {
    return config;
}

const confignition = {
    parse,
    getConfig,
};

export default confignition;