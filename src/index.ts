import { join, resolve, dirname } from 'path';
import { watchFile, Stats, readFileSync } from 'fs';
import { NextFunction, Request, Response } from 'express';
import { _getConfig, _getErrMsg, _parseFileType } from './utils';
import { AllowedFileTypes, Config, GlobalState, ParseOptions, UpdateOptions } from './types';
import parser from './parser';
import cloud from './cloud';
import converter from './converter';

let state: GlobalState = {
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

const _reloadConfig = (content: string, fromEnv?: boolean | string[]) => {
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

  if (Array.isArray(fromEnv)) {
    for (const key of fromEnv) {
      const value = process.env[key];
      if (value) {
        state.config[key] = value;
      }
    }
  } else if (fromEnv === true) {
    state.config = {
      ...state.config,
      ...process.env,
    };
  }
};

const _watchConfig = (interval = 1000, fromEnv?: boolean | string[]) => {
  watchFile(state.filePath, { interval }, (curr: Stats, prev: Stats) => {
    if (curr.mtimeMs !== prev.mtimeMs) {
      _reloadConfig(_getConfig(state.filePath), fromEnv);
    }
  });
};

/**
 * Function to parse a local or remote configuration file with different options.
 * @param {string} file the path to evaluate.
 * @param {ParseOptions} options options for advanced parsing, such as cloud configs.
 * @returns {Config | null} parsed config.
 * @throws {Error} if file extension is not allowed.
 */
export const parse = (file: string, options: ParseOptions = _parseOptions): Config | null => {
  try {
    if (!options.type) {
      console.log('here', file);
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

    _reloadConfig(content, options.fromEnv);

    if (options.hotReload) {
      _watchConfig(options.hotReloadInterval, options.fromEnv);
    }
    return state.config;
  } catch (err) {
    throw new Error(`Error parsing config file: ${_getErrMsg(err)}`);
  }
};

/**
 * Function to parse a configuration file with a custom parser.
 * @param {string} file the path to evaluate.
 * @param {AllowedFileTypes} type the config file format.
 * @param {(content: string) => Config | undefined} parser the custom parser. The content of the file is passed as a parameter.
 * @throws {Error} if file extension is not specified or the parsing fails.
 */
export const customParse = (file: string, type: AllowedFileTypes | string, parser: (content: string) => Config | undefined) => {
  try {
    if (!type) {
      throw new Error('type not specified');
    }
    const filePath = join(resolve(dirname('')), file);
    const content = readFileSync(filePath, 'utf8');
    const parsedConfig = parser(content);

    if (parsedConfig) {
      state.filePath = filePath;
      state.type = type as AllowedFileTypes;
      state.config = parsedConfig;
    }

    return state.config;
  } catch (err) {
    throw new Error(`Error parsing custom config file: ${_getErrMsg(err)}`);
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
 * Reset the global state to its initial value.
 */
export const resetGlobalState = () => {
  state = {
    filePath: '',
    type: null,
    config: {},
  };
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
  customParse,
  resetGlobalState,
};

export default confignition;
