import { S3ClientConfig } from '@aws-sdk/client-s3';

/**
 * The content of the configuration file.
 */
export interface Config {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Interface containing options for the parse() function.
 */
export interface ParseOptions {
  fromCloud?: boolean;
  cloudConfig?: ParseCloudOptions;
  hotReload?: boolean;
  hotReloadInterval?: number;
  encryptFields?: boolean;
  encryptOptions?: ParseEncryptionOptions;
}

/**
 * Options to encrypt parse fields.
 */
export interface ParseEncryptionOptions {
  fields: string[];
  secretKey?: string;
  secret?: string;
}

/**
 * Options to parse file from cloud platforms.
 */
export interface ParseCloudOptions {
  aws: {
    s3Bucket: string;
    awsConfig: S3ClientConfig;
  };
  azure: {
    connectionString: string;
    containerName: string;
  };
}

/**
 * Array of  allowed extensions for the configuration file.
 */
export const allowedFileTypes = ['dotenv', 'toml', 'yaml', 'yml', 'json', 'ini'] as const;

/**
 * Type grouping the extensions allowed for the configuration file.
 */
export type AllowedFileTypes = (typeof allowedFileTypes)[number];
