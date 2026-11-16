// Default same-origin: di Vercel /api di-rewrite ke backend, di lokal lewat proxy Vite.
const BASE_URL = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/$/, '');

export async function api(path, { headers, ...options } = {}) {
  const isJson = options.body !== undefined && !(options.body instanceof FormData);
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { ...(isJson && { 'Content-Type': 'application/json' }), ...headers },
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
