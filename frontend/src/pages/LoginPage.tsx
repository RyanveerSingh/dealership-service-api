import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../api/client'

const DEMO_USERS = [
  { email: 'advisor@dms.local', role: 'Service Advisor', note: 'books bays, opens repair orders' },
  { email: 'tech@dms.local', role: 'Technician', note: 'works orders, cannot book' },
  { email: 'admin@dms.local', role: 'Admin', note: 'full access' },
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
      // The server returns the same message for an unknown address and a wrong
      // password, so this cannot be used to discover which emails are registered.
      setError(err instanceof ApiError ? err.message : 'Could not sign in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <h1>Dealership Service</h1>
        <p className="sub">Service lane management</p>

        {error && <div className="alert error">{error}</div>}

        <form onSubmit={submit}>
          <label>
            <span>Email</span>
            <input
              type="email" value={email} autoComplete="username"
              onChange={(e) => setEmail(e.target.value)} required
            />
          </label>
          <label>
            <span>Password</span>
            <input
              type="password" value={password} autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)} required
            />
          </label>
          <button type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="demo-users">
          <p>Demo accounts (password123)</p>
          {DEMO_USERS.map((u) => (
            <button
              key={u.email} type="button" className="secondary small"
              onClick={() => { setEmail(u.email); setPassword('password123') }}
            >
              <strong>{u.role}</strong>
              <span className="muted"> — {u.note}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
