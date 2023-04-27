/**
 * The content of the configuration file.
 */
export interface Config {
    [key: string]: any;
}

/**
 * Array of  allowed extensions for the configuration file.
 */
export const allowedFileTypes = ['dotenv', 'toml', 'yaml', 'yml', 'json', 'ini'] as const;

/**
 * Type grouping the extensions allowed for the configuration file.
 */
export type AllowedFileTypes = typeof allowedFileTypes[number];