import { useEffect, useState } from 'react'
import { api, ApiError, errorMessage, type User } from './api'
import Dashboard from './Dashboard'
import Login from './components/Login'
import './styles.css'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [startupError, setStartupError] = useState('')

  async function loadSession() {
    setLoading(true)
    setStartupError('')
    try {
      setUser(await api.me())
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setUser(null)
      } else {
        setStartupError(errorMessage(cause))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSession()
  }, [])

  async function logout() {
    await api.logout()
    setUser(null)
  }

  if (loading) return <div className="boot-screen">Loading Clearflow…</div>
  if (startupError) {
    return (
      <main className="boot-screen boot-error" role="alert">
        <p>{startupError}</p>
        <button className="button button--primary" onClick={() => void loadSession()}>Retry</button>
      </main>
    )
  }
  return user ? <Dashboard user={user} onLogout={logout} /> : <Login onLogin={setUser} />
}
