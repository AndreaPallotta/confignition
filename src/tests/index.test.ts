import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'node:fs';
import { Confignition, parse, parseSync, getConfig, reset } from '../index.js';
import { encrypt, decrypt, isEncrypted } from '../crypto.js';

const configPath = 'src/tests/configs';

// ─── Fixture snapshot ─────────────────────────────────────────────────────────
// Hardcoded so restoreJsonFixture() is always correct regardless of on-disk state.

const JSON_FIXTURE = `${configPath}/config.json`;
const ORIGINAL_JSON_CONTENT = JSON.stringify({
  data: { object: { data: 3 }, version: 2 },
  database: { url: 'postgres://username:password@localhost/mydatabase' },
  security: { secret_key: 'mysecretkey123' },
  settings: { debug: true },
}, null, 2);

// ─── Expected shapes ──────────────────────────────────────────────────────────

const expectedDotenv = {
  DATABASE_URL: 'postgres://username:password@localhost/mydatabase',
  SECRET_KEY: 'mysecretkey123',
  DEBUG: true,
  VERSION: 2,
  OBJECT: { DATA: 3 },
  EMPTY_VALUE: '',
  BASE64_TOKEN: 'dXNlcjpwYXNz=',
};

const expectedConfig = {
  data: { object: { data: 3 }, version: 2 },
  database: { url: 'postgres://username:password@localhost/mydatabase' },
  security: { secret_key: 'mysecretkey123' },
  settings: { debug: true },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const restoreJsonFixture = () => writeFileSync(JSON_FIXTURE, ORIGINAL_JSON_CONTENT, 'utf8');

// Temp file used by tests that need to write to disk without touching fixtures
const TMP_FILE = `${configPath}/_test_tmp.json`;
const createTmpJson = (content = ORIGINAL_JSON_CONTENT) => writeFileSync(TMP_FILE, content, 'utf8');
const cleanTmp = () => { if (existsSync(TMP_FILE)) unlinkSync(TMP_FILE); };

// ─── Confignition class ───────────────────────────────────────────────────────

describe('Confignition class', () => {
  let cfg: Confignition;

  beforeEach(() => { restoreJsonFixture(); cfg = new Confignition(); });
  afterEach(() => { cfg.dispose(); restoreJsonFixture(); });

  // ── Parsing ────────────────────────────────────────────────────────────────

  describe('parse()', () => {
    it('returns null before any parse call', () => {
      expect(cfg.getConfig()).toBeNull();
    });

    it('throws on unsupported file extension', async () => {
      await expect(cfg.parse(`${configPath}/config.xml`)).rejects.toThrow('not allowed');
    });

    it('throws on missing file', async () => {
      await expect(cfg.parse('nonexistent.json')).rejects.toThrow();
    });

    it('parses .env correctly (Bug 3 + Bug 9)', async () => {
      const config = await cfg.parse(`${configPath}/.env`);
      expect(config).toMatchObject(expectedDotenv);
      expect(config?.DATABASE_URL).toBe('postgres://username:password@localhost/mydatabase');
      expect(config?.BASE64_TOKEN).toBe('dXNlcjpwYXNz=');
      expect(config?.EMPTY_VALUE).toBe('');
    });

    it('parses .env fast (<5ms)', async () => {
      const start = performance.now();
      await cfg.parse(`${configPath}/.env`);
      expect(performance.now() - start).toBeLessThan(5);
    });

    it('parses JSON correctly', async () => {
      const config = await cfg.parse(`${configPath}/config.json`);
      expect(config).toMatchObject(expectedConfig);
    });

    it('parses JSON fast (<5ms)', async () => {
      const start = performance.now();
      await cfg.parse(`${configPath}/config.json`);
      expect(performance.now() - start).toBeLessThan(5);
    });

    it('parses YAML correctly', async () => {
      const config = await cfg.parse(`${configPath}/config.yaml`);
      expect(config).toMatchObject(expectedConfig);
    });

    it('parses TOML correctly (smol-toml)', async () => {
      const config = await cfg.parse(`${configPath}/config.toml`);
      expect(config).toBeDefined();
      expect(config?.database).toBeDefined();
    });

    it('parses INI correctly (Bug 7)', async () => {
      const config = await cfg.parse(`${configPath}/config.ini`);
      expect(config).toMatchObject(expectedConfig);
    });

    it('accepts explicit type override', async () => {
      const config = await cfg.parse(`${configPath}/.env`, { type: 'dotenv' });
      expect(config?.SECRET_KEY).toBe('mysecretkey123');
    });
  });

  // ── parseSync ──────────────────────────────────────────────────────────────

  describe('parseSync()', () => {
    it('parses a local JSON file synchronously', () => {
      const config = cfg.parseSync(`${configPath}/config.json`);
      expect(config).toMatchObject(expectedConfig);
    });

    it('parses a local .env synchronously (Bug 3)', () => {
      const config = cfg.parseSync(`${configPath}/.env`);
      expect(config?.DATABASE_URL).toBe('postgres://username:password@localhost/mydatabase');
    });

    it('throws on missing file', () => {
      expect(() => cfg.parseSync('nope.json')).toThrow();
    });
  });

  // ── customParse ────────────────────────────────────────────────────────────

  describe('customParse()', () => {
    it('uses a user-supplied parser and stores the result', async () => {
      const config = await cfg.customParse(
        `${configPath}/config.json`,
        (content) => ({ custom: true, raw: content.length }),
        { type: 'json' }
      );
      expect(config?.custom).toBe(true);
      expect(typeof config?.raw).toBe('number');
    });
  });

  // ── getConfig / getGlobalState ─────────────────────────────────────────────

  describe('getConfig()', () => {
    it('returns null before parsing', () => {
      expect(cfg.getConfig()).toBeNull();
    });

    it('returns the parsed config after parse()', async () => {
      await cfg.parse(`${configPath}/config.json`);
      expect(cfg.getConfig()).toMatchObject(expectedConfig);
    });
  });

  describe('getGlobalState()', () => {
    it('reflects type and filePath after parse()', async () => {
      await cfg.parse(`${configPath}/config.json`);
      const state = cfg.getGlobalState();
      expect(state.type).toBe('json');
      expect(state.filePath).toContain('config.json');
    });

    it('returns a snapshot — mutating it does not affect internal state', async () => {
      await cfg.parse(`${configPath}/config.json`);
      const state = cfg.getGlobalState();
      (state as Record<string, unknown>).type = 'hacked';
      expect(cfg.getGlobalState().type).toBe('json');
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────
  // All update tests use TMP_FILE to avoid corrupting fixtures.

  describe('update()', () => {
    beforeEach(() => createTmpJson());
    afterEach(() => cleanTmp());

    it('Bug 2: callback receives previous config and return value is applied', async () => {
      await cfg.parse(TMP_FILE);
      const updated = await cfg.update((prev) => ({ ...prev, injected: true }));
      expect(updated?.injected).toBe(true);
      expect(updated?.database).toBeDefined();
    });

    it('accepts a plain object override', async () => {
      await cfg.parse(TMP_FILE);
      const updated = await cfg.update({ replacement: 1 });
      expect(updated?.replacement).toBe(1);
    });

    it('throws if called before parse()', async () => {
      await expect(cfg.update({ x: 1 })).rejects.toThrow();
    });
  });

  // ── merge ──────────────────────────────────────────────────────────────────

  describe('merge()', () => {
    beforeEach(() => createTmpJson());
    afterEach(() => cleanTmp());

    it('deep-merges partial into existing config', async () => {
      await cfg.parse(TMP_FILE);
      const result = await cfg.merge({ extraKey: 'hello' });
      expect(result?.extraKey).toBe('hello');
      expect(result?.database).toBeDefined();
    });
  });

  // ── onChange ───────────────────────────────────────────────────────────────

  describe('onChange()', () => {
    it('returns an unsubscribe function', () => {
      const unsub = cfg.onChange(() => {});
      expect(typeof unsub).toBe('function');
      expect(() => unsub()).not.toThrow();
    });

    it('removes the callback after unsubscribing', () => {
      const unsub = cfg.onChange(() => {});
      unsub();
      const callbacks = (cfg as unknown as { _changeCallbacks: Set<unknown> })._changeCallbacks;
      expect(callbacks.size).toBe(0);
    });
  });

  // ── reset / dispose ────────────────────────────────────────────────────────

  describe('reset()', () => {
    it('clears config, type, and filePath', async () => {
      await cfg.parse(`${configPath}/config.json`);
      cfg.reset();
      expect(cfg.getConfig()).toBeNull();
      expect(cfg.getGlobalState().type).toBeNull();
      expect(cfg.getGlobalState().filePath).toBe('');
    });

    it('clears onChange subscribers', () => {
      cfg.onChange(() => {});
      cfg.reset();
      const callbacks = (cfg as unknown as { _changeCallbacks: Set<unknown> })._changeCallbacks;
      expect(callbacks.size).toBe(0);
    });
  });

  describe('dispose()', () => {
    it('does not throw if no watcher is active', () => {
      expect(() => cfg.dispose()).not.toThrow();
    });
  });

  // ── Multiple instances ─────────────────────────────────────────────────────

  describe('Multiple instances (Bug 8)', () => {
    it('two instances do not share state', async () => {
      const cfg1 = new Confignition();
      const cfg2 = new Confignition();

      await cfg1.parse(`${configPath}/config.json`);
      await cfg2.parse(`${configPath}/.env`);

      expect(cfg1.getGlobalState().type).toBe('json');
      expect(cfg2.getGlobalState().type).toBe('dotenv');
      expect(cfg1.getConfig()).not.toEqual(cfg2.getConfig());

      cfg1.dispose();
      cfg2.dispose();
    });

    it('resetting one instance does not affect another', async () => {
      const cfg1 = new Confignition();
      const cfg2 = new Confignition();

      await cfg1.parse(`${configPath}/config.json`);
      await cfg2.parse(`${configPath}/config.json`);

      cfg1.reset();
      expect(cfg1.getConfig()).toBeNull();
      expect(cfg2.getConfig()).toMatchObject(expectedConfig);

      cfg2.dispose();
    });
  });
});

// ─── Encryption ────────────────────────────────────────────────────────────────

describe('Encryption (crypto.ts)', () => {
  const SECRET = 'test-secret-key';
  const PLAINTEXT = 'supersecret';

  it('encrypt() produces an enc: prefixed string', () => {
    expect(encrypt(PLAINTEXT, SECRET).startsWith('enc:')).toBe(true);
  });

  it('decrypt() recovers the original plaintext', () => {
    expect(decrypt(encrypt(PLAINTEXT, SECRET), SECRET)).toBe(PLAINTEXT);
  });

  it('isEncrypted() correctly identifies encrypted values', () => {
    expect(isEncrypted(encrypt(PLAINTEXT, SECRET))).toBe(true);
    expect(isEncrypted(PLAINTEXT)).toBe(false);
  });

  it('decrypt() returns non-enc: values unchanged', () => {
    expect(decrypt('not-encrypted', SECRET)).toBe('not-encrypted');
  });

  it('two encryptions of the same value produce different ciphertexts (random IV)', () => {
    const a = encrypt(PLAINTEXT, SECRET);
    const b = encrypt(PLAINTEXT, SECRET);
    expect(a).not.toBe(b);
    expect(decrypt(a, SECRET)).toBe(PLAINTEXT);
    expect(decrypt(b, SECRET)).toBe(PLAINTEXT);
  });

  describe('field-level round-trip via parse()', () => {
    const ENC_TMP = `${configPath}/_enc_tmp.json`;

    beforeAll(() => writeFileSync(ENC_TMP, ORIGINAL_JSON_CONTENT, 'utf8'));
    afterAll(() => { if (existsSync(ENC_TMP)) unlinkSync(ENC_TMP); });

    it('transparently decrypts a pre-encrypted field on parse()', async () => {
      const raw = JSON.parse(readFileSync(ENC_TMP, 'utf8')) as Record<string, unknown>;
      const security = raw['security'] as Record<string, string>;
      security['secret_key'] = encrypt('mysecretkey123', SECRET);
      writeFileSync(ENC_TMP, JSON.stringify(raw, null, 2));

      // 2. Parse with decryption option
      const c = new Confignition();
      const decrypted = await c.parse(ENC_TMP, {
        encryptOptions: { fields: ['security.secret_key'], secretKey: SECRET },
      });
      expect((decrypted?.security as Record<string, unknown>)?.secret_key).toBe('mysecretkey123');
      c.dispose();
    });
  });
});

// ─── Default instance (named exports) ────────────────────────────────────────

describe('Named exports (default instance)', () => {
  beforeEach(() => reset());
  afterEach(() => reset());

  it('parse() works as a named export', async () => {
    const config = await parse(`${configPath}/config.json`);
    expect(config).toMatchObject(expectedConfig);
  });

  it('parseSync() works as a named export', () => {
    const config = parseSync(`${configPath}/config.json`);
    expect(config).toMatchObject(expectedConfig);
  });

  it('getConfig() returns the last parsed config', async () => {
    await parse(`${configPath}/config.json`);
    expect(getConfig()).toMatchObject(expectedConfig);
  });
});
