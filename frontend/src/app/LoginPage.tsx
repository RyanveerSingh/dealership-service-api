import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../api/client'

const DEMO = [
  { email: 'advisor@dms.local', role: 'Service advisor', can: 'books bays, opens orders' },
  { email: 'tech@dms.local', role: 'Technician', can: 'works orders, cannot book' },
  { email: 'admin@dms.local', role: 'Admin', can: 'everything' },
]

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('advisor@dms.local')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(email, password)
    } catch (err) {
      // The server answers identically for an unknown address and a wrong
      // password, so this cannot be used to discover which emails exist.
      setError(err instanceof ApiError ? err.message : 'Could not sign in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-svh place-items-center bg-ink px-6 py-16">
      <div className="w-full max-w-sm">
        <Link to="/" className="label no-underline transition-colors hover:text-chalk">
          ← Back to the site
        </Link>

        <h1 className="display mt-6 text-[2rem]">Sign in</h1>
        <p className="mt-2 text-[0.88rem] text-chalk-dim">
          The service lane console.
        </p>

        {error && (
          <div className="notice notice-error mt-6">
            <strong>Sign-in failed</strong>
            {error}
          </div>
        )}

        <form onSubmit={submit} className="mt-7">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              autoComplete="username"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button className="btn w-full justify-center" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-8 border-t pt-5" style={{ borderColor: 'var(--hairline)' }}>
          <p className="label mb-3">Demo accounts · password123</p>
          <div className="grid gap-2">
            {DEMO.map((d) => (
              <button
                key={d.email}
                type="button"
                className="btn btn-ghost btn-sm justify-between"
                onClick={() => {
                  setEmail(d.email)
                  setPassword('password123')
                }}
              >
                <span className="text-chalk">{d.role}</span>
                <span className="label">{d.can}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
