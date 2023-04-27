import * as path from 'path';
import parser from './parser';
import { _getConfig, _getErrMsg, _parseFileType } from './utils';
import { AllowedFileTypes, Config } from './types';

let config: Config;

/**
 *
 * @param {string} filePath the path to evaluate.
 * @param {AllowedFileTypes} type the optional file type. If not provided, it will be inferred from the extension.
 * @returns {Config} parsed config.
 * @throws {Error} if file extension is not allowed.
 */
export const parse = (file: string, type?: AllowedFileTypes): Config => {
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
                config = parser.parseToml(content);
                break;
            case 'yaml':
            case 'yml':
                parser.parseYaml(content);
                break;
            case 'json':
                config = parser.parseJson(content);
                break;
            case 'ini':
                config = parser.parseIni(content);
                break;
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
export const getConfig = (): Config => {
    return config;
}

const confignition = {
    parse,
    getConfig,
};

export default confignition;