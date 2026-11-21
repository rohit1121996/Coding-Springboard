import { useState, type FormEvent } from 'react'
import { api, errorMessage, type User } from '../api'

type Props = {
  onLogin: (user: User) => void
}

export default function Login({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      onLogin(await api.login(username, password))
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-intro">
        <div className="brand brand--light">
          <span className="brand-mark">✓</span> clearflow
        </div>
        <div className="auth-intro-copy">
          <p className="eyebrow eyebrow--light">DOCUMENT APPROVAL</p>
          <h1>Make every decision clear.</h1>
          <p>Submit documents, review requests, and follow each decision in one simple place.</p>
        </div>
        <p className="auth-footnote">A focused workflow for teams that move thoughtfully.</p>
      </div>

      <main className="auth-main">
        <div className="login-card">
          <p className="eyebrow">WELCOME BACK</p>
          <h2>Sign in to continue</h2>
          <p className="muted">Use your submitter or reviewer account.</p>
          <form onSubmit={submit}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              autoComplete="username"
              value={username}
              onChange={event => setUsername(event.target.value)}
              required
            />
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
            />
            {error && <div className="alert" role="alert">{error}</div>}
            <button className="button button--primary button--full" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'} <span aria-hidden="true">→</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
