// Semua pemanggilan API lewat sini. credentials: 'include' supaya cookie JWT admin ikut terkirim.
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');

export async function api(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Permintaan gagal (${res.status})`);
  }
  return res.json();
}
