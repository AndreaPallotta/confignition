/* eslint-disable @typescript-eslint/no-explicit-any */
import { Config } from './types';
import { _getErrMsg, _parseValue, _recursiveJsonParse } from './utils';
import YAML from 'yaml';

const _parseDotenv = (content: string) => {
  const lines = content.split('\n');

  const config: Config = {};

  try {
    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();

      // if comment or empty line
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      const [record] = trimmedLine.split('#');
      const [key, value] = record.trim().split('=');

      config[key] = _parseValue(value.replace(/^['"]|['"]$/g, ''));
    }
    return config;
  } catch (err) {
    throw new Error(`parsed failed (.env): ${_getErrMsg(err)}`);
  }
};
const _parseToml = (content: string): Config => {
  const lines = content.split('\n');

  const config: Config = {};
  let currentSection = '';
  let currentSubSection: string[] = [];
  let finalSubSection: any;

  try {
    for (const line of lines) {
      const trimmedLine = line.trim();

      if (/^\s*#/.test(trimmedLine)) {
        continue;
      }

      // if beginning of section
      if (/^\s*\[([^\]]+)\]\s*$/.test(trimmedLine)) {
        currentSection = trimmedLine.replace(/[[\]]/g, '');
        config[currentSection] = {};
        continue;
      }

      // if beginning of subsection
      if (/\[\[([^\]]+)\]\]/g.test(trimmedLine)) {
        const [section, ...subsection] = trimmedLine.replace(/[[\]]/g, '').split('.');
        currentSection = section;
        currentSubSection = subsection;
        if (!config[currentSection]) {
          config[currentSection] = {};
        }
        const subSectionObj = config[currentSection] || (config[currentSection] = {});
        finalSubSection = currentSubSection.reduce((subSectionObj: any, key: string) => {
          return (subSectionObj[key] = subSectionObj[key] || {});
        }, subSectionObj);
        continue;
      }

      // key-value pair found
      if (/^\s*([\w.-]+)\s*=\s*(.*)$/.test(trimmedLine)) {
        const [key, value] = trimmedLine.split('=').map((str) => str.trim());
        const parsedValue = _parseValue(value.replace(/^['"]|['"]$/g, ''));
        if (currentSubSection.length === 0) {
          config[currentSection][key] = parsedValue;
        } else {
          finalSubSection[key] = parsedValue;
        }
      }
    }

    return config;
  } catch (err) {
    throw new Error(`parsed failed (TOML): ${_getErrMsg(err)}`);
  }
};
const _parseYaml = (content: string) => {
  try {
    let config: Config = YAML.parse(content);
    config = _recursiveJsonParse(config);
    return config;
  } catch (err) {
    throw new Error(`parsed failed (yaml): ${_getErrMsg(err)}`);
  }
};
const _parseJson = (content: string): Config => {
  try {
    return JSON.parse(content) as Config;
  } catch (err: unknown) {
    throw new Error(`parsed failed (JSON): ${_getErrMsg(err)}`);
  }
};
const _parseIni = (content: string): Config => {
  const lines = content.split('\n');

  const config: Config = {};
  let currentSection = '';

  try {
    for (const line of lines) {
      const trimmedLine = line.trim();

      if (/^\s*#/.test(trimmedLine)) {
        continue;
      }

      // if beginning of section
      if (/^\s*\[([^\]]+)\]\s*$/.test(trimmedLine)) {
        currentSection = trimmedLine.replace(/[[\]]/g, '');
        config[currentSection] = {};
        continue;
      }

      // key-value pair found
      if (/^\s*([\w.-]+)\s*=\s*(.*)$/.test(trimmedLine)) {
        const [key, value] = trimmedLine.split('=').map((str) => str.trim());
        (config[currentSection] as Config)[key] = _parseValue(value.replace(/^['"]|['"]$/g, ''));
      }
    }

    return config;
  } catch (err) {
    throw new Error(`parsed failed (yaml): ${_getErrMsg(err)}`);
  }
};

const parser = {
  parseDotenv: _parseDotenv,
  parseToml: _parseToml,
  parseYaml: _parseYaml,
  parseJson: _parseJson,
  parseIni: _parseIni,
};

export default parser;
