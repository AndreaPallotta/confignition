/**
 * The content of the configuration file.
 */
export interface Config {
    [key: string]: any;
}

/**
 * Interface containing options for the parse() function
 */
export interface ParseOptions {
    hotReload?: boolean,
    hotReloadInterval?: number;
    encryptFields?: boolean;
    encryptOptions?: {
        fields?: string[],
        secretKey?: string,
        secret?: string,
    }
}

/**
 * Array of  allowed extensions for the configuration file.
 */
export const allowedFileTypes = ['dotenv', 'toml', 'yaml', 'yml', 'json', 'ini'] as const;

/**
 * Type grouping the extensions allowed for the configuration file.
 */
export type AllowedFileTypes = typeof allowedFileTypes[number];