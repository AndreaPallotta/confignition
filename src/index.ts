import { join, resolve, dirname } from 'path';
import { watchFile, Stats } from 'fs';
import { NextFunction, Request, Response } from 'express';
import { _getConfig, _getErrMsg, _parseFileType } from './utils';
import { Config, GlobalState, ParseOptions, UpdateOptions } from './types';
import parser from './parser';
import cloud from './cloud';
import converter from './converter';

const state: GlobalState = {
  filePath: '',
  type: null,
  config: {},
};

const _parseOptions: ParseOptions = {
  fromCloud: false,
  hotReload: false,
  hotReloadInterval: 1000,
  encryptFields: false,
};

const _updateOptions: UpdateOptions = {
  createNewFile: false,
};

const _reloadConfig = (content: string) => {
  switch (state.type) {
    case 'dotenv':
      state.config = parser.parseDotenv(content);
      break;
    case 'toml':
      state.config = parser.parseToml(content);
      break;
    case 'yaml':
    case 'yml':
      state.config = parser.parseYaml(content);
      break;
    case 'json':
      state.config = parser.parseJson(content);
      break;
    case 'ini':
      state.config = parser.parseIni(content);
      break;
    default:
      throw new Error('unknown file format');
  }
};

const _watchConfig = (interval = 1000) => {
  watchFile(state.filePath, { interval }, (curr: Stats, prev: Stats) => {
    if (curr.mtimeMs !== prev.mtimeMs) {
      _reloadConfig(_getConfig(state.filePath));
    }
  });
};

/**
 *
 * @param {string} file the path to evaluate.
 * @param {ParseOptions} options options for advanced parsing, such as encryption and cloud.
 * @returns {Config | null} parsed config.
 * @throws {Error} if file extension is not allowed.
 */
export const parse = (file: string, options: ParseOptions = _parseOptions): Config | null => {
  try {
    if (!options.type) {
      options.type = _parseFileType(file);
    }

    state.type = options.type;
    state.filePath = join(resolve(dirname('')), file);
    let content = '';

    if (options.cloudConfig?.aws) {
      const { s3Bucket, awsConfig } = options.cloudConfig.aws;
      cloud
        .getConfigFromS3(s3Bucket, file, awsConfig)
        .then((value: string) => {
          content = value;
        })
        .catch((err: unknown) => {
          throw new Error(`S3 request failed - ${_getErrMsg(err)}`);
        });
    } else if (options.cloudConfig?.azure) {
      const { connectionString, containerName } = options.cloudConfig.azure;
      cloud
        .getConfigFromAzure(connectionString, containerName, file)
        .then((value: string) => {
          content = value;
        })
        .catch((err: unknown) => {
          throw new Error(`Azure Blob request failed - ${_getErrMsg(err)}`);
        });
    } else {
      content = _getConfig(state.filePath);
    }

    _reloadConfig(content);

    if (options.hotReload) {
      _watchConfig(options.hotReloadInterval);
    }
    return state.config;
  } catch (err) {
    throw new Error(`Error parsing config file: ${_getErrMsg(err)}`);
  }
};

/**
 * Return the parsed configuration.
 * If this function is called before the file is parsed, it will return null.
 * @returns {Config | null} configuration content.
 */
export const getConfig = (): Config | null => {
  return state.config;
};

/**
 * Return the global state.
 * @returns {GlobalState} an object containing the parsed config, file path, and file type.
 */
export const getGlobalState = (): GlobalState => {
  return state;
};

/**
 * Function to update the parsed configuration and the config file.
 * @param {Config | (prev: Config) => void} newConfig the new configuration object or a callback function.
 * @returns {Config | null} the updated configuration.
 */
export const update = (newConfig: Config | ((prev: Config) => void), options: UpdateOptions = _updateOptions): Config | null => {
  try {
    if (typeof newConfig === 'function') {
      state.config = newConfig(state.config);
    } else {
      state.config = newConfig;
    }

    const { createNewFile, newFileOptions } = options;

    if (createNewFile && newFileOptions) {
      state.filePath = join(resolve(dirname('')), newFileOptions.path);
      state.type = newFileOptions.type ? newFileOptions.type : _parseFileType(state.filePath);
    }

    switch (state.type) {
      case 'dotenv':
        converter.toEnv(state);
        break;
      case 'toml':
        converter.toToml(state);
        break;
      case 'yaml':
      case 'yml':
        converter.toYaml(state);
        break;
      case 'json':
        converter.toJson(state);
        break;
      case 'ini':
        converter.toIni(state);
        break;
      default:
        throw new Error('unknown file format');
    }
    return getConfig();
  } catch (err) {
    throw new Error(`Error updating config: ${_getErrMsg(err)}`);
  }
};

/**
 * Express middleware to inject the config inside the request object.
 * @param {string | undefined} file the path to evaluate.
 * @param {ParseOptions} options options for advanced parsing, such as encryption and cloud.
 * @returns {((req: Request & { config: Config | null; }, _: Response, next: NextFunction) => void)} the Express middleware
 */
export const expressConfignition = (
  file?: string,
  options: ParseOptions = {}
): ((req: Request & { config: Config | null }, _: Response, next: NextFunction) => void) => {
  return (req: Request & { config: Config | null }, _: Response, next: NextFunction) => {
    try {
      if (file) {
        const parsedConfig = parse(file, options);
        req.config = parsedConfig;
      } else if (state.config) {
        req.config = getConfig();
      }
      return next();
    } catch (err) {
      return next();
    }
  };
};

const confignition = {
  parse,
  update,
  getConfig,
  getGlobalState,
  expressConfignition,
};

export default confignition;
