import { Config, GlobalState } from './types';
import { writeFileSync } from 'fs';
import { stringify } from 'yaml';

const _writeToFile = (content: string, filePath: string) => {
  writeFileSync(filePath, content);
};

const _stringifyEnv = (config: Config, prefix = ''): string => {
  let content = '';
  for (const [key, value] of Object.entries(config)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object') {
      content += _stringifyEnv(value, fullKey);
    } else {
      content += `${fullKey}=${value}\n`;
    }
  }
  return content;
};

const _stringifyToml = (config: Config, header = '') => {
  let content = '';
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'object') {
      const fullHeader = header ? `${header}.${key}` : `${key}`;
      if (header) {
        content += `[[${fullHeader}]]\n${_stringifyToml(value, fullHeader)}`;
      } else {
        content += `[${fullHeader}]\n${_stringifyToml(value, fullHeader)}\n`;
      }
    } else {
      content += `${key} = ${JSON.stringify(value)}\n`;
    }
  }
  return content;
};

const _stringifyIni = (config: Config, header = '') => {
  let content = '';
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'object') {
      const fullHeader = header ? `${header}.${key}` : `${key}`;
      content += `\n[${fullHeader}]\n${_stringifyIni(value, fullHeader)}`;
    } else {
      content += `${key}=${JSON.stringify(value)}\n`;
    }
  }
  return content;
};

const _toEnv = (state: GlobalState) => {
  const content = _stringifyEnv(state.config || {});
  _writeToFile(content, state.filePath);
};
const _toToml = (state: GlobalState) => {
  const content = _stringifyToml(state.config || {});
  _writeToFile(content, state.filePath);
};
const _toYaml = (state: GlobalState) => {
  const content = stringify(state.config || {});
  _writeToFile(content, state.filePath);
};
const _toJson = (state: GlobalState) => {
  const content = JSON.stringify(state.config || {}, null, 2);
  _writeToFile(content, state.filePath);
};
const _toIni = (state: GlobalState) => {
  const content = _stringifyIni(state.config || {});
  _writeToFile(content, state.filePath);
};

const converter = {
  toEnv: _toEnv,
  toToml: _toToml,
  toYaml: _toYaml,
  toJson: _toJson,
  toIni: _toIni,
};

export default converter;
