import * as path from 'path';
import * as fs from 'fs';
import parser from './parser';
import { _getConfig, _getErrMsg, _parseFileType } from './utils';
import { AllowedFileTypes, Config, ParseOptions } from './types';

let config: Config | null = null;

const _defaultConfig: ParseOptions = {
    hotReload: false,
    hotReloadInterval: undefined,
    encrypt: undefined,
}

const _reloadConfig = (content: string, type: AllowedFileTypes) => {
    switch (type) {
        case 'dotenv':
            config = parser.parseDotenv(content);
            break;
        case 'toml':
            config = parser.parseToml(content);
            break;
        case 'yaml':
        case 'yml':
            config = parser.parseYaml(content);
            break;
        case 'json':
            config = parser.parseJson(content);
            break;
        case 'ini':
            config = parser.parseIni(content);
            break;
        default:
            throw new Error('unknown file format');
    }
}

const _watchConfig = (filePath: string, type: AllowedFileTypes, content: string, interval: number = 1000) => {
    fs.watchFile(filePath, { interval }, (curr: fs.Stats, prev: fs.Stats) => {
        if (curr.mtimeMs !== prev.mtimeMs) {
            _reloadConfig(content, type);
            console.log(config);
        }
    })
}

/**
 *
 * @param {string} filePath the path to evaluate.
 * @param {AllowedFileTypes} type the optional file type. If not provided, it will be inferred from the extension.
 * @returns {Config} parsed config.
 * @throws {Error} if file extension is not allowed.
 */
export const parse = (file: string, type?: AllowedFileTypes, options: ParseOptions = _defaultConfig): Config | null => {
    try {
        if (!type) {
            type = _parseFileType(file);
        }

        const filePath = path.join(path.resolve(path.dirname('')), file);
        const content = _getConfig(filePath);

        _reloadConfig(content, type);

        if (options.hotReload) {
            _watchConfig(filePath, type, content, options.hotReloadInterval);
        }
        return config;
    } catch (err) {
        throw new Error(`Error parsing config file: ${_getErrMsg(err)}`);
    }
};

/**
 * Return the parsed configuration.
 * If this function is called before the file is parsed, it will return null.
 * @returns {Config} configuration content.
 */
export const getConfig = (): Config | null => {
    return config;
}

const confignition = {
    parse,
    getConfig,
};

export default confignition;