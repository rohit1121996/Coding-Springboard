import { useCallback, useEffect, useState } from 'react'
import { api, ApiError, errorMessage, type Submission, type User } from './api'
import SubmissionForm from './components/SubmissionForm'
import SubmissionList, { type Filter } from './components/SubmissionList'

type Props = {
  user: User
  onLogout: () => Promise<void>
}

export default function Dashboard({ user, onLogout }: Props) {
  const reviewer = user.role === 'reviewer'
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>(reviewer ? 'pending' : 'all')
  const [loading, setLoading] = useState(true)
  const [deciding, setDeciding] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

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

  async function create(title: string, content: string) {
    setError('')
    setNotice('')
    const created = await api.create(title, content)
    setFilter('all')
    setSubmissions(current => [created, ...current])
    setSelectedId(created.id)
    setNotice('Document submitted for review.')
  }

  async function decide(decision: 'approved' | 'rejected') {
    if (!selectedId) return
    setDeciding(true)
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
      setDeciding(false)
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
            <p className="muted">
              {reviewer
                ? 'Consider each submission and record your decision.'
                : 'Submit a document and follow its progress.'}
            </p>
          </div>
          <div className="heading-icon" aria-hidden="true">{reviewer ? '☑' : '▤'}</div>
        </div>

        {notice && <div className="success" role="status">{notice}</div>}
        {error && <div className="alert" role="alert">{error}</div>}

        {!reviewer && (
          <SubmissionForm onCreate={create} onError={setError} />
        )}

        <SubmissionList
          reviewer={reviewer}
          submissions={submissions}
          selectedId={selectedId}
          filter={filter}
          loading={loading}
          deciding={deciding}
          onRefresh={() => void refresh()}
          onFilterChange={setFilter}
          onSelect={setSelectedId}
          onDecision={decide}
        />
      </main>
    </div>
  )
}
