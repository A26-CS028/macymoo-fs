import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { api } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'

const HOME = '/dapur/beranda'

// Halaman login admin di rute tersembunyi /dapur (Figma: "Admin — Login").
export default function Login() {
  const { admin, setAdmin } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lockedUntil, setLockedUntil] = useState(0)
  const [now, setNow] = useState(Date.now())

  // Hitung mundur selama dikunci rate limit (429)
  useEffect(() => {
    if (lockedUntil <= Date.now()) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [lockedUntil])

  const secondsLeft = Math.max(0, Math.ceil((lockedUntil - now) / 1000))
  const locked = secondsLeft > 0

  if (admin) return <Navigate to={HOME} replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      setAdmin(await api('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }))
      navigate(HOME, { replace: true })
    } catch (err) {
      if (err.status === 429) {
        setNow(Date.now())
        setLockedUntil(Date.now() + (err.retryAfter || 15 * 60) * 1000)
      } else {
        setError(err.status ? err.message : 'Tidak bisa terhubung ke server. Coba lagi.')
      }
    } finally {
      setLoading(false)
    }
  }

  const mmss = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`
  const inputClass =
    'w-full rounded-lg bg-krem-field px-4 py-3 text-ungu-gelap outline-none focus:ring-2 focus:ring-ungu'

  return (
    <div className="flex min-h-screen flex-col bg-ungu-gelap text-ungu-gelap lg:flex-row lg:gap-8 lg:bg-krem-field lg:p-5">
      <meta name="robots" content="noindex, nofollow" />
      <title>Masuk Admin · Macyourmoo</title>

      <section className="bg-ungu-gelap px-6 pb-12 pt-10 text-white lg:flex lg:w-[54%] lg:flex-col lg:rounded-3xl lg:p-14">
        <p className="text-lg font-bold">Macyourmoo</p>
        <div className="mt-6 lg:my-auto">
          <h1 className="text-4xl font-bold lg:text-6xl">Dapur Nabila</h1>
          <p className="mt-3 text-sm text-white/75 lg:text-base">
            Kelola pre-order, tagihan, dan jadwal masak Macyourmoo dari satu dasbor
          </p>
        </div>
      </section>

      <div className="-mt-6 flex-1 rounded-t-3xl bg-white px-6 pb-10 pt-6 lg:mt-0 lg:flex lg:flex-col lg:justify-center lg:rounded-none lg:bg-transparent lg:px-0 lg:pb-0">
        <form
          onSubmit={handleSubmit}
          className="mx-auto w-full max-w-sm lg:rounded-3xl lg:bg-white lg:p-9 lg:shadow-sm"
          noValidate
        >
          <h2 className="text-2xl font-bold">Masuk Admin</h2>
          <p className="mt-1 text-sm text-abu">Khusus Nabila · sesi aman dengan cookie httpOnly</p>

          <label htmlFor="username" className="mt-6 block text-sm font-medium">Username</label>
          <input
            id="username"
            className={`${inputClass} mt-2`}
            autoComplete="username"
            maxLength={50}
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label htmlFor="password" className="mt-5 block text-sm font-medium">Kata sandi</label>
          <div className="relative mt-2">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className={`${inputClass} pr-20`}
              autoComplete="current-password"
              maxLength={200}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-describedby={error ? 'login-error' : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-3 flex items-center px-1 text-abu hover:text-ungu-gelap"
              aria-pressed={showPassword}
              aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
              title={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
            >
              {/* Mata = tampilkan; mata dicoret = sembunyikan lagi */}
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {showPassword
                  ? <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A9.8 9.8 0 0112 5c5 0 9 4.5 10 7a13 13 0 01-3.1 4.2M6.6 6.6C4.4 8 2.8 10.2 2 12c1 2.5 5 7 10 7 1.8 0 3.4-.6 4.8-1.4" />
                  : <path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z" />}
              </svg>
            </button>
          </div>

          <p id="login-error" role="alert" className="mt-2 min-h-5 text-sm text-red-600">
            {error && `⚠ ${error}`}
          </p>

          <button
            type="submit"
            disabled={loading || locked || !username || !password}
            className="mt-3 w-full rounded-lg bg-ungu py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Memeriksa…' : 'Masuk'}
          </button>

          {locked && (
            <div role="status" className="mt-5 rounded-lg bg-krem-field px-4 py-3 text-sm lg:bg-transparent lg:px-0">
              <p className="font-semibold">Terlalu banyak percobaan</p>
              <p>Coba lagi dalam {mmss}. Batas 5 percobaan per 15 menit.</p>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
