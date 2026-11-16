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
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Permintaan gagal (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}
