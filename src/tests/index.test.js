import assert from 'node:assert';
import test, { after, describe } from 'node:test';
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
const times = {};

const parseExecTime = (hrtime, format = 1e6) => {
  const seconds = (hrtime[0] + hrtime[1] / format).toFixed(3);
  return +seconds;
};

describe('Parsing tests', () => {
  after(() => {
    console.table(times);
  });

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
        message: "Error parsing config file: ENOENT: no such file or directory, open 'config.toml'",
      });
    });
  });

  test('Parsing a valid .env should return the config object', () => {
    assert.doesNotThrow(() => {
      confignition.parse(`${configPath}/.env`);
    });

    const start = process.hrtime();
    const config = confignition.parse(`${configPath}/.env`);
    const elapse = parseExecTime(process.hrtime(start));

    times.dotenv = { elapse };
    assert.deepStrictEqual(config, dotenvConfigTest);
    assert.ok(elapse < 0.5);
  });

  test('Parsing a valid json file should return the config object', () => {
    assert.doesNotThrow(() => {
      confignition.parse(`${configPath}/config.json`);
    });

    const start = process.hrtime();
    const config = confignition.parse(`${configPath}/config.json`);
    const elapse = parseExecTime(process.hrtime(start));

    times.json = { elapse };
    assert.deepStrictEqual(config, configTest);
    assert.ok(elapse < 0.5);
  });

  test('Parsing a valid toml file should return the config object', () => {
    assert.doesNotThrow(() => {
      confignition.parse(`${configPath}/config.toml`);
    });

    const start = process.hrtime();
    const config = confignition.parse(`${configPath}/config.toml`);
    const elapse = parseExecTime(process.hrtime(start));

    times.toml = { elapse };
    assert.deepStrictEqual(config, configTest);
    assert.ok(elapse < 0.5);
  });

  test('Parsing a valid ini file should return the config object', () => {
    assert.doesNotThrow(() => {
      confignition.parse(`${configPath}/config.ini`);
    });

    const start = process.hrtime();
    const config = confignition.parse(`${configPath}/config.ini`);
    const elapse = parseExecTime(process.hrtime(start));

    times.ini = { elapse };
    assert.deepStrictEqual(config, configTest);
    assert.ok(elapse < 0.5);
  });

  test('Parsing a valid yaml file should return the config object', () => {
    assert.doesNotThrow(() => {
      confignition.parse(`${configPath}/config.yaml`);
    });

    const start = process.hrtime();
    const config = confignition.parse(`${configPath}/config.yaml`);
    const elapse = parseExecTime(process.hrtime(start));

    times.yaml = { elapse };
    assert.deepStrictEqual(config, configTest);
    assert.ok(elapse < 100);
  });
});
