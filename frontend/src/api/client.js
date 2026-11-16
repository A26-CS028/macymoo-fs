// Semua pemanggilan API lewat sini. credentials: 'include' supaya cookie JWT admin ikut terkirim.
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');

export async function api(path, options = {}) {
  // Mock hanya saat development; di build produksi import.meta.env.DEV = false sehingga blok ini dibuang.
  if (import.meta.env.DEV && import.meta.env.VITE_MOCK !== 'false') {
    const { mockApi } = await import('./mock.js');
    const data = await mockApi(path, options);
    if (data !== undefined) return data;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    // Format error kontrak: { error: { code, message, details } }
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error?.message || `Permintaan gagal (${res.status})`);
    err.status = res.status;
    err.code = body.error?.code;
    err.details = body.error?.details;
    err.retryAfter = Number(res.headers.get('Retry-After')) || null; // detik, untuk 429
    throw err;
  }
  return res.status === 204 ? null : res.json();
}
