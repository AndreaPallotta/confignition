import type { S3ClientConfig } from '@aws-sdk/client-s3';

// ─── Config content ───────────────────────────────────────────────────────────

/**
 * The parsed content of a configuration file.
 * Use the generic `T extends Config` throughout the API for typed access.
 */
export interface Config {
  [key: string]: unknown;
}

// ─── File types ───────────────────────────────────────────────────────────────

export const allowedFileTypes = ['dotenv', 'toml', 'yaml', 'yml', 'json', 'ini'] as const;
export type AllowedFileTypes = (typeof allowedFileTypes)[number] | (string & {});

// ─── Cloud options ────────────────────────────────────────────────────────────

export interface AwsCloudOptions {
  s3Bucket: string;
  awsConfig: S3ClientConfig;
}

export interface AzureCloudOptions {
  connectionString: string;
  containerName: string;
}

/**
 * Cloud provider options. Pass exactly one provider.
 */
export interface ParseCloudOptions {
  aws?: AwsCloudOptions;
  azure?: AzureCloudOptions;
}

// ─── Encryption ───────────────────────────────────────────────────────────────

/**
 * Options for field-level AES-256-GCM encryption.
 */
export interface ParseEncryptionOptions {
  /** Dot-notation field paths to encrypt/decrypt, e.g. `['database.password', 'api.secret']` */
  fields: string[];
  /** 32-byte secret key (or any string — it will be SHA-256 hashed to 32 bytes). */
  secretKey: string;
}

// ─── Parse options ────────────────────────────────────────────────────────────

export interface ParseOptions {
  /** Explicitly set file type instead of inferring from extension. */
  type?: AllowedFileTypes;
  /** Retrieve file from a cloud provider instead of the local filesystem. */
  fromCloud?: boolean;
  /** Cloud provider configuration. Required when `fromCloud` is true. */
  cloudConfig?: ParseCloudOptions;
  /** Watch the file for changes and reload automatically. Does not work with cloud. */
  hotReload?: boolean;
  /** Debounce interval for hot reload in milliseconds. @default 50 */
  hotReloadInterval?: number;
  /** Field-level encryption options. */
  encryptOptions?: ParseEncryptionOptions;
}

// ─── Update options ───────────────────────────────────────────────────────────

export interface UpdateOptions {
  /** If true, write the config to a new file instead of the current one. */
  createNewFile?: boolean;
  newFileOptions?: {
    path: string;
    type?: AllowedFileTypes;
  };
  /** If provided, encrypt these fields before writing. */
  encryptOptions?: ParseEncryptionOptions;
}

// ─── Internal state ───────────────────────────────────────────────────────────

export interface GlobalState {
  config: Config;
  type: AllowedFileTypes | null;
  filePath: string;
}
