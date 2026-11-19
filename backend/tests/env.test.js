// Uji validasi env saat start, tanpa database.
const { test } = require('node:test');
const assert = require('node:assert');

const ENV_PATH = require.resolve('../src/config/env');
const VALID = {
  DATABASE_URL: 'postgres://uji@localhost/uji',
  JWT_SECRET: 'rahasia-uji-minimal-32-karakter-xx',
  TURNSTILE_SECRET_KEY: 'rahasia-uji',
  FRONTEND_ORIGIN: 'http://localhost:5173',
};

function loadEnv(overrides) {
  const saved = { ...process.env };
  Object.assign(process.env, VALID);
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  delete require.cache[ENV_PATH];
  try {
    return require(ENV_PATH);
  } finally {
    process.env = saved;
    delete require.cache[ENV_PATH];
  }
}

test('env lengkap lolos', () => {
  assert.strictEqual(loadEnv({}).frontendOrigin, 'http://localhost:5173');
});

test('FRONTEND_ORIGIN dan TURNSTILE_SECRET_KEY wajib', () => {
  assert.throws(() => loadEnv({ FRONTEND_ORIGIN: undefined }), /FRONTEND_ORIGIN/);
  assert.throws(() => loadEnv({ TURNSTILE_SECRET_KEY: undefined }), /TURNSTILE_SECRET_KEY/);
});
