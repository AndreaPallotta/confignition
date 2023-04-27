import assert from 'node:assert';
import test from 'node:test';
import confignition from '../index';

const dotenvConfigTest = {
  DATABASE_URL: 'postgres://username:password@localhost/mydatabase',
  SECRET_KEY: 'mysecretkey123',
  DEBUG: true,
  VERSION: 2,
  OBJECT: {
    DATA: 3,
  },
};

const configTest = {
  data: { object: { data: 3 }, version: 2 },
  database: { url: 'postgres://username:password@localhost/mydatabase' },
  security: { secret_key: 'mysecretkey123' },
  settings: { debug: true },
};

const configPath = 'src/tests/configs';

test('Parsing an invalid file type should throw an error', () => {
  assert.throws(() => {
    confignition.parse('config.xml', {
      name: 'Error',
      message: 'Error parsing config file: extension (.xml) now allowed',
    });
  });
});

test('Parsing an invalid file path should throw an error', () => {
  assert.throws(() => {
    confignition.parse('config.toml', {
      name: 'AssertionError',
      message:
        "Error parsing config file: ENOENT: no such file or directory, open 'config.toml'",
    });
  });
});

test('Parsing a valid .env should return the config object', () => {
  assert.doesNotThrow(() => {
    confignition.parse(`${configPath}/.env`);
  });

  const config = confignition.parse(`${configPath}/.env`);
  assert.deepStrictEqual(config, dotenvConfigTest);
});

test('Parsing a valid json file should return the config object', () => {
  assert.doesNotThrow(() => {
    confignition.parse(`${configPath}/config.json`);
  });

  const config = confignition.parse(`${configPath}/config.json`);
  assert.deepStrictEqual(config, configTest);
});

test('Parsing a valid toml file should return the config object', () => {
  assert.doesNotThrow(() => {
    confignition.parse(`${configPath}/config.toml`);
  });

  const config = confignition.parse(`${configPath}/config.toml`);
  assert.deepStrictEqual(config, configTest);
});

test('Parsing a valid ini file should return the config object', () => {
  assert.doesNotThrow(() => {
    confignition.parse(`${configPath}/config.ini`);
  });

  const config = confignition.parse(`${configPath}/config.ini`);
  assert.deepStrictEqual(config, configTest);
});
