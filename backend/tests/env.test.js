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

// Salah konfigurasi AI tidak boleh menghentikan backend (hotfix 26 Nov: production 500 di semua route).
// AI dimatikan: aiServiceUrl kosong, jadi catatan dan secret tidak pernah dikirim ke URL yang salah.
test('AI_SERVICE_URL bukan https (kecuali lokal) atau tanpa AI_INTERNAL_SECRET: backend tetap start, AI dimatikan', (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const S = 'x'.repeat(32);
  const cases = [
    [{ AI_SERVICE_URL: 'http://ai.contoh.com', AI_INTERNAL_SECRET: S }, /https/],
    [{ AI_SERVICE_URL: 'http://localhost.contoh.com', AI_INTERNAL_SECRET: S }, /https/],
    [{ AI_SERVICE_URL: 'ai.contoh.com', AI_INTERNAL_SECRET: S }, /https/],
    // diawali 'http://localhost:' tetapi host sebenarnya contoh.com (bagian sebelum @ = nama pengguna)
    [{ AI_SERVICE_URL: 'http://localhost:80@ai.contoh.com', AI_INTERNAL_SECRET: S }, /https/],
    [{ AI_SERVICE_URL: 'http://127.0.0.1.contoh.com', AI_INTERNAL_SECRET: S }, /https/],
    [{ AI_SERVICE_URL: 'ftp://ai.contoh.com', AI_INTERNAL_SECRET: S }, /https/],
    [{ AI_SERVICE_URL: 'https://ai.contoh.com', AI_INTERNAL_SECRET: undefined }, /AI_INTERNAL_SECRET/],
    [{ AI_SERVICE_URL: 'https://ai.contoh.com', AI_INTERNAL_SECRET: '   ' }, /AI_INTERNAL_SECRET/],
  ];
  for (const [overrides, reason] of cases) {
    const env = loadEnv(overrides);
    assert.strictEqual(env.aiServiceUrl, undefined);
    assert.match(env.aiProblems.join(), reason);
  }
  assert.strictEqual(warn.mock.callCount(), cases.length);
  // pesan peringatan tidak memuat nilai env (secret maupun URL)
  for (const call of warn.mock.calls) assert.ok(!call.arguments.join(' ').includes(S) && !call.arguments.join(' ').includes('contoh.com'));
});

test('konfigurasi AI benar atau AI tidak dipakai: aktif sesuai env, tanpa peringatan', (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const S = 'x'.repeat(32);
  assert.strictEqual(loadEnv({ AI_SERVICE_URL: 'https://ai.contoh.com', AI_INTERNAL_SECRET: S }).aiServiceUrl, 'https://ai.contoh.com');
  assert.strictEqual(loadEnv({ AI_SERVICE_URL: ' https://ai.contoh.com\n', AI_INTERNAL_SECRET: S }).aiServiceUrl, 'https://ai.contoh.com');
  assert.strictEqual(loadEnv({ AI_SERVICE_URL: 'http://localhost:8000', AI_INTERNAL_SECRET: S }).aiServiceUrl, 'http://localhost:8000');
  assert.strictEqual(loadEnv({ AI_SERVICE_URL: 'http://127.0.0.1:8000/', AI_INTERNAL_SECRET: S }).aiServiceUrl, 'http://127.0.0.1:8000/');
  assert.strictEqual(loadEnv({ AI_SERVICE_URL: undefined, AI_INTERNAL_SECRET: undefined }).aiServiceUrl, undefined);
  assert.strictEqual(warn.mock.callCount(), 0);
});
