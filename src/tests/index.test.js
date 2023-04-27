import assert from 'node:assert';
import test from 'node:test';
import confignition from '../index';

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

test('Parsing a valid file path should return the config object', () => {
  assert.doesNotThrow(() => {
    confignition.parse('src/tests/configs/.env');
  });
});
