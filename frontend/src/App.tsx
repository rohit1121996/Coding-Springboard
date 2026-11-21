import { useEffect, useState } from 'react'
import { api, type User } from './api'
import Dashboard from './Dashboard'
import Login from './components/Login'
import './styles.css'

export default function App() {
  const [user, setUser] = useState<User | null | undefined>()

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null))
  }, [])

  async function logout() {
    await api.logout()
    setUser(null)
  }

  if (user === undefined) return <div className="boot-screen">Loading Clearflow…</div>
  return user ? <Dashboard user={user} onLogout={logout} /> : <Login onLogin={setUser} />
}
