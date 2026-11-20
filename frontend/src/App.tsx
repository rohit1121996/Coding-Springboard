import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api, ApiError, type Status, type Submission, type User } from './api'
import './styles.css'

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function StatusBadge({ status }: { status: Status }) {
  return <span className={`status status--${status}`}>{status}</span>
}

function Login({ onLogin }: { onLogin: (user: User) => void }) {
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
        <div className="brand brand--light"><span className="brand-mark">✓</span> clearflow</div>
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
            <input id="username" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required />
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
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

function SubmissionDetail({ submission, reviewer, onDecision, deciding }: {
  submission: Submission
  reviewer: boolean
  onDecision: (decision: 'approved' | 'rejected') => void
  deciding: boolean
}) {
  return (
    <section className="detail panel" aria-label="Submission details">
      <div className="detail-top">
        <div>
          <p className="eyebrow">DOCUMENT DETAILS</p>
          <h2>{submission.title}</h2>
        </div>
        <StatusBadge status={submission.status} />
      </div>
      <div className="metadata">
        <div><span>Submitted by</span><strong>{submission.submitter}</strong></div>
        <div><span>Submitted</span><strong>{formatDate(submission.created_at)}</strong></div>
        {submission.decided_by && <div><span>Decided by</span><strong>{submission.decided_by}</strong></div>}
        {submission.decided_at && <div><span>Decision date</span><strong>{formatDate(submission.decided_at)}</strong></div>}
      </div>
      <div className="document-content">
        <p className="eyebrow">CONTENT</p>
        <p>{submission.content}</p>
      </div>
      {reviewer && submission.status === 'pending' && (
        <div className="decision-bar">
          <div><strong>Ready to decide?</strong><span>This decision cannot be changed.</span></div>
          <div className="button-row">
            <button className="button button--danger" disabled={deciding} onClick={() => onDecision('rejected')}>Reject</button>
            <button className="button button--primary" disabled={deciding} onClick={() => onDecision('approved')}>Approve</button>
          </div>
        </div>
      )}
    </section>
  )
}

function Dashboard({ user, onLogout }: { user: User; onLogout: () => Promise<void> }) {
  const reviewer = user.role === 'reviewer'
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | Status>(reviewer ? 'pending' : 'all')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await api.list(filter === 'all' ? undefined : filter)
      setSubmissions(result)
      setSelectedId(current => result.some(item => item.id === current) ? current : result[0]?.id ?? null)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { void refresh() }, [refresh])

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    setFieldErrors({})
    try {
      const created = await api.create(title, content)
      setTitle('')
      setContent('')
      setFilter('all')
      setSubmissions(current => [created, ...current])
      setSelectedId(created.id)
      setNotice('Document submitted for review.')
    } catch (cause) {
      if (cause instanceof ApiError) setFieldErrors(cause.fieldErrors)
      setError(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  async function decide(decision: 'approved' | 'rejected') {
    if (!selectedId) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const updated = await api.decide(selectedId, decision)
      const remaining = filter === 'pending'
        ? submissions.filter(item => item.id !== updated.id)
        : submissions.map(item => item.id === updated.id ? updated : item)
      setSubmissions(remaining)
      setSelectedId(remaining[0]?.id ?? null)
      setNotice(`Submission ${decision}.`)
    } catch (cause) {
      setError(errorMessage(cause))
      if (cause instanceof ApiError && cause.status === 409) void refresh()
    } finally {
      setBusy(false)
    }
  }

  async function logout() {
    setError('')
    try {
      await onLogout()
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  const selected = submissions.find(item => item.id === selectedId) ?? null

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">✓</span> clearflow</div>
        <div className="user-controls">
          <span className="role-pill">{reviewer ? 'Reviewer' : 'Submitter'}</span>
          <span className="username">{user.username}</span>
          <button className="text-button" onClick={() => void logout()}>Sign out</button>
        </div>
      </header>
      <main className="workspace">
        <div className="page-heading">
          <div>
            <p className="eyebrow">{reviewer ? 'REVIEW WORKSPACE' : 'YOUR WORKSPACE'}</p>
            <h1>{reviewer ? 'Review queue' : 'My documents'}</h1>
            <p className="muted">{reviewer ? 'Consider each submission and record your decision.' : 'Submit a document and follow its progress.'}</p>
          </div>
          <div className="heading-icon" aria-hidden="true">{reviewer ? '☑' : '▤'}</div>
        </div>

        {notice && <div className="success" role="status">{notice}</div>}
        {error && <div className="alert" role="alert">{error}</div>}

        {!reviewer && (
          <section className="compose panel" aria-label="Submit a document">
            <div className="section-heading"><div><p className="eyebrow">NEW SUBMISSION</p><h2>Submit a document</h2></div><span className="step-number">01</span></div>
            <form onSubmit={create}>
              <label htmlFor="title">Document title</label>
              <input id="title" maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Project proposal" required />
              {fieldErrors.title && <small className="field-error">{fieldErrors.title.join(' ')}</small>}
              <label htmlFor="content">Document content</label>
              <textarea id="content" maxLength={10000} value={content} onChange={e => setContent(e.target.value)} placeholder="Paste or write your document here…" rows={6} required />
              {fieldErrors.content && <small className="field-error">{fieldErrors.content.join(' ')}</small>}
              <div className="compose-bottom"><span>{content.length.toLocaleString()} / 10,000 characters</span><button className="button button--primary" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit for review'} <span aria-hidden="true">→</span></button></div>
            </form>
          </section>
        )}

        <section className="submissions-section" aria-label="Submissions">
          <div className="list-heading"><div><p className="eyebrow">{reviewer ? 'SUBMISSIONS' : 'TRACK PROGRESS'}</p><h2>{reviewer ? 'Submitted documents' : 'Your submissions'}</h2></div><button className="text-button" onClick={() => void refresh()} disabled={loading}>Refresh ↻</button></div>
          <div className="filters" role="group" aria-label="Filter by status">
            {(['all', 'pending', 'approved', 'rejected'] as const).map(value => (
              <button key={value} className={`filter ${filter === value ? 'filter--active' : ''}`} onClick={() => setFilter(value)} aria-pressed={filter === value}>{value === 'all' ? 'All' : value[0].toUpperCase() + value.slice(1)}</button>
            ))}
          </div>
          {loading ? <div className="empty panel">Loading submissions…</div> : submissions.length === 0 ? (
            <div className="empty panel"><div className="empty-icon">▤</div><h3>No submissions here yet</h3><p>{reviewer ? 'There are no documents in this view.' : 'Your submissions will appear here once you send one for review.'}</p></div>
          ) : (
            <div className="content-grid">
              <div className="submission-list panel">
                {submissions.map(item => <button key={item.id} className={`submission-row ${selectedId === item.id ? 'submission-row--selected' : ''}`} onClick={() => setSelectedId(item.id)}>
                  <span className="submission-title">{item.title}</span><StatusBadge status={item.status} />
                  <span className="submission-meta">{reviewer ? `By ${item.submitter} · ` : ''}{formatDate(item.created_at)}</span>
                </button>)}
              </div>
              {selected && <SubmissionDetail submission={selected} reviewer={reviewer} onDecision={decide} deciding={busy} />}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

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
