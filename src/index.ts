import { join, resolve, dirname } from 'node:path';
import { readFileSync, watch, type FSWatcher } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import type { NextFunction, Request, Response } from 'express';
import { _getErrMsg, _parseFileType } from './utils';
import type { AllowedFileTypes, Config, GlobalState, ParseOptions, UpdateOptions } from './types';
import { parse as _parse } from './parser';
import { stringify as _stringify } from './converter';
import { encryptFields, decryptFields } from './crypto';
import cloud from './cloud';

// ─── Confignition class ───────────────────────────────────────────────────────

export class Confignition {
  private _state: GlobalState = { filePath: '', type: null, config: {} };
  private _watcher: FSWatcher | null = null;
  private _debounce: ReturnType<typeof setTimeout> | null = null;
  private _changeCallbacks = new Set<(config: Config) => void>();

  // ── Parse (async) ──────────────────────────────────────────────────────────

  /**
   * Parse a local or remote configuration file.
   * @param file Path to the config file (relative to cwd).
   * @param options Parsing options (type override, cloud, hot-reload, encryption).
   * @returns The parsed config typed as T, or null on empty file.
   * @throws If the file cannot be found/read or the format is unsupported.
   */
  async parse<T extends Config = Config>(
    file: string,
    options: ParseOptions = {}
  ): Promise<T | null> {
    try {
      const type = options.type ?? _parseFileType(file);
      this._state.type = type;
      this._state.filePath = join(resolve(dirname('')), file);

      let content: string;

      // Bug 1 fix: cloud calls are now properly awaited
      if (options.cloudConfig?.aws) {
        const { s3Bucket, awsConfig } = options.cloudConfig.aws;
        content = await cloud.getConfigFromS3(s3Bucket, file, awsConfig);
      } else if (options.cloudConfig?.azure) {
        const { connectionString, containerName } = options.cloudConfig.azure;
        content = await cloud.getConfigFromAzure(connectionString, containerName, file);
      } else {
        content = await readFile(this._state.filePath, 'utf8');
      }

      this._reload(content);
      this._applyDecryption(options);

      if (options.hotReload && !options.cloudConfig) {
        this._watch(options.hotReloadInterval);
      }

      return this._getOrNull<T>();
    } catch (err) {
      throw new Error(`Error parsing config file: ${_getErrMsg(err)}`);
    }
  }

  // ── ParseSync (local-only convenience) ────────────────────────────────────

  /**
   * Synchronously parse a local configuration file.
   * Cannot be used with cloud options — use `parse()` for that.
   * @throws If called with cloud options or file cannot be read.
   */
  parseSync<T extends Config = Config>(
    file: string,
    options: Omit<ParseOptions, 'fromCloud' | 'cloudConfig'> = {}
  ): T | null {
    try {
      const type = options.type ?? _parseFileType(file);
      this._state.type = type;
      this._state.filePath = join(resolve(dirname('')), file);

      const content = readFileSync(this._state.filePath, 'utf8');
      this._reload(content);
      this._applyDecryption(options);

      if (options.hotReload) {
        this._watch(options.hotReloadInterval);
      }

      return this._getOrNull<T>();
    } catch (err) {
      throw new Error(`Error parsing config file: ${_getErrMsg(err)}`);
    }
  }

  // ── Custom parse ───────────────────────────────────────────────────────────

  /**
   * Parse a file using a user-supplied parser function.
   * Useful for formats not natively supported by confignition.
   * @param parserFn Receives the raw file content, must return a Config object.
   * @param options Must include `type` since it cannot be inferred.
   */
  async customParse<T extends Config = Config>(
    file: string,
    parserFn: (content: string) => T | undefined,
    options: ParseOptions & { type: AllowedFileTypes }
  ): Promise<T | null> {
    try {
      const filePath = join(resolve(dirname('')), file);
      const content = await readFile(filePath, 'utf8');
      const parsed = parserFn(content);
      if (parsed) {
        this._state.filePath = filePath;
        this._state.type = options.type;
        this._state.config = parsed;
      }
      return this._getOrNull<T>();
    } catch (err) {
      throw new Error(`Error in customParse: ${_getErrMsg(err)}`);
    }
  }

  // ── Getters ────────────────────────────────────────────────────────────────

  /** Returns the parsed config, or null if nothing has been parsed yet. */
  getConfig<T extends Config = Config>(): T | null {
    return this._getOrNull<T>();
  }

  /** Returns a read-only snapshot of the internal state. */
  getGlobalState(): Readonly<GlobalState> {
    return { ...this._state };
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  /**
   * Update the config in memory and write it back to the file.
   * Bug 2 fix: callback is now properly typed as `(prev: T) => T`.
   * @param newConfig New config object or a function `(prev) => next`.
   */
  async update<T extends Config = Config>(
    newConfig: T | ((prev: T) => T),
    options: UpdateOptions = {}
  ): Promise<T | null> {
    try {
      if (typeof newConfig === 'function') {
        this._state.config = (newConfig as (prev: T) => T)(this._state.config as T);
      } else {
        this._state.config = newConfig;
      }

      if (options.createNewFile && options.newFileOptions) {
        this._state.filePath = join(resolve(dirname('')), options.newFileOptions.path);
        this._state.type = options.newFileOptions.type ?? _parseFileType(this._state.filePath);
      }

      if (!this._state.type) {
        throw new Error('No file type set — call parse() first or use newFileOptions.');
      }

      let configToWrite = this._state.config;
      if (options.encryptOptions) {
        configToWrite = encryptFields(configToWrite, options.encryptOptions.fields, options.encryptOptions.secretKey);
      }

      const content = _stringify(configToWrite, this._state.type);
      await writeFile(this._state.filePath, content, 'utf8');

      return this._getOrNull<T>();
    } catch (err) {
      throw new Error(`Error updating config: ${_getErrMsg(err)}`);
    }
  }

  /**
   * Deep-merge a partial object into the current config and write back.
   */
  async merge<T extends Config = Config>(partial: Partial<T>): Promise<T | null> {
    return this.update<T>((prev) => ({ ...prev, ...partial }) as T);
  }

  // ── Hot reload ─────────────────────────────────────────────────────────────

  /**
   * Subscribe to config changes triggered by hot reload.
   * @returns An unsubscribe function. Call it to stop receiving updates.
   * @example
   * const unsub = cfg.onChange((config) => console.log('reloaded', config));
   * // later:
   * unsub();
   */
  onChange(callback: (config: Config) => void): () => void {
    this._changeCallbacks.add(callback);
    return () => this._changeCallbacks.delete(callback);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /** Clear all state and stop any running file watcher. Subscribers are removed. */
  reset(): void {
    this.dispose();
    this._state = { filePath: '', type: null, config: {} };
    this._changeCallbacks.clear();
  }

  /** Stop the hot-reload file watcher (if running) without clearing state. */
  dispose(): void {
    if (this._debounce) {
      clearTimeout(this._debounce);
      this._debounce = null;
    }
    if (this._watcher) {
      this._watcher.close();
      this._watcher = null;
    }
  }

  // ── Express middleware ──────────────────────────────────────────────────────

  /**
   * Express middleware that injects the parsed config into `req.config`.
   * If `file` is provided, the file is parsed on each request.
   * If omitted, the already-parsed config from `getConfig()` is used.
   */
  expressMiddleware(
    file?: string,
    options: ParseOptions = {}
  ): (req: Request & { config: Config | null }, _res: Response, next: NextFunction) => void {
    return (req: Request & { config: Config | null }, _res: Response, next: NextFunction) => {
      const done = (config: Config | null) => {
        req.config = config;
        next();
      };
      if (file) {
        this.parse(file, options).then(done).catch(() => done(null));
      } else {
        done(this.getConfig());
      }
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private _reload(content: string): void {
    this._state.config = _parse(content, this._state.type!);
  }

  private _applyDecryption(options: Pick<ParseOptions, 'encryptOptions'>): void {
    if (options.encryptOptions) {
      this._state.config = decryptFields(
        this._state.config,
        options.encryptOptions.fields,
        options.encryptOptions.secretKey
      );
    }
  }

  private _watch(debounceMs = 50): void {
    this.dispose(); // clean up any existing watcher first
    try {
      this._watcher = watch(this._state.filePath, () => {
        if (this._debounce) clearTimeout(this._debounce);
        this._debounce = setTimeout(() => {
          readFile(this._state.filePath, 'utf8')
            .then((content) => {
              this._reload(content);
              const snapshot = { ...this._state.config };
              for (const cb of this._changeCallbacks) cb(snapshot);
            })
            .catch(() => {
              /* file temporarily unavailable during write — skip this tick */
            });
        }, debounceMs);
      });
      this._watcher.on('error', () => this.dispose());
    } catch {
      // fs.watch unavailable on some network/virtual filesystems — silently degrade
    }
  }

  private _getOrNull<T extends Config>(): T | null {
    return Object.keys(this._state.config).length > 0
      ? (this._state.config as T)
      : null;
  }
}

// ─── Default instance (backward-compatible named exports) ─────────────────────

const _default = new Confignition();

/**
 * Parse a config file using the default shared instance.
 * @see Confignition.parse
 */
export const parse = <T extends Config = Config>(file: string, options?: ParseOptions) =>
  _default.parse<T>(file, options);

/**
 * Synchronously parse a local config file using the default shared instance.
 * @see Confignition.parseSync
 */
export const parseSync = <T extends Config = Config>(
  file: string,
  options?: Omit<ParseOptions, 'fromCloud' | 'cloudConfig'>
) => _default.parseSync<T>(file, options);

/**
 * Parse a file with a custom parser using the default shared instance.
 * @see Confignition.customParse
 */
export const customParse = <T extends Config = Config>(
  file: string,
  parserFn: (content: string) => T | undefined,
  options: ParseOptions & { type: AllowedFileTypes }
) => _default.customParse<T>(file, parserFn, options);

/** Get the config from the default shared instance. */
export const getConfig = <T extends Config = Config>() => _default.getConfig<T>();

/** Get the global state from the default shared instance. */
export const getGlobalState = () => _default.getGlobalState();

/**
 * Update the config via the default shared instance.
 * @see Confignition.update
 */
export const update = <T extends Config = Config>(
  newConfig: T | ((prev: T) => T),
  options?: UpdateOptions
) => _default.update<T>(newConfig, options);

/**
 * Subscribe to config changes on the default shared instance.
 * @see Confignition.onChange
 */
export const onChange = (callback: (config: Config) => void) => _default.onChange(callback);

/** Reset the default shared instance. */
export const reset = () => _default.reset();

/** Dispose the default shared instance watcher. */
export const dispose = () => _default.dispose();

/**
 * Express middleware using the default shared instance.
 * @deprecated Prefer creating a `new Confignition()` instance for better isolation.
 * @see Confignition.expressMiddleware
 */
export const expressConfignition = (file?: string, options?: ParseOptions) =>
  _default.expressMiddleware(file, options);

export default _default;

// ─── Re-exports ────────────────────────────────────────────────────────────────
export type { Config, AllowedFileTypes, ParseOptions, UpdateOptions, GlobalState, ParseCloudOptions, ParseEncryptionOptions } from './types';
export { encrypt, decrypt, isEncrypted, encryptFields, decryptFields } from './crypto';
