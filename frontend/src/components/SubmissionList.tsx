import type { Status, Submission } from '../api'
import { formatDate } from '../formatDate'
import StatusBadge from './StatusBadge'
import SubmissionDetail from './SubmissionDetail'

export type Filter = 'all' | Status

type Props = {
  reviewer: boolean
  submissions: Submission[]
  selectedId: string | null
  filter: Filter
  loading: boolean
  deciding: boolean
  onRefresh: () => void
  onFilterChange: (filter: Filter) => void
  onSelect: (id: string) => void
  onDecision: (decision: 'approved' | 'rejected') => void
}

const filters: Filter[] = ['all', 'pending', 'approved', 'rejected']

export default function SubmissionList({
  reviewer, submissions, selectedId, filter, loading, deciding,
  onRefresh, onFilterChange, onSelect, onDecision,
}: Props) {
  const selected = submissions.find(submission => submission.id === selectedId)

  return (
    <section className="submissions-section" aria-label="Submissions">
      <div className="list-heading">
        <div>
          <p className="eyebrow">{reviewer ? 'SUBMISSIONS' : 'TRACK PROGRESS'}</p>
          <h2>{reviewer ? 'Submitted documents' : 'Your submissions'}</h2>
        </div>
        <button className="text-button" onClick={onRefresh} disabled={loading || deciding}>Refresh ↻</button>
      </div>

      <div className="filters" role="group" aria-label="Filter by status">
        {filters.map(value => (
          <button
            key={value}
            className={`filter ${filter === value ? 'filter--active' : ''}`}
            onClick={() => onFilterChange(value)}
            aria-pressed={filter === value}
            disabled={deciding}
          >
            {value === 'all' ? 'All' : value[0].toUpperCase() + value.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty panel">Loading submissions…</div>
      ) : submissions.length === 0 ? (
        <div className="empty panel">
          <div className="empty-icon">▤</div>
          <h3>No submissions here yet</h3>
          <p>
            {reviewer
              ? 'There are no documents in this view.'
              : 'Your submissions will appear here once you send one for review.'}
          </p>
        </div>
      ) : (
        <div className="content-grid">
          <div className="submission-list panel">
            {submissions.map(submission => (
              <button
                key={submission.id}
                className={`submission-row ${selectedId === submission.id ? 'submission-row--selected' : ''}`}
                onClick={() => onSelect(submission.id)}
                disabled={deciding}
              >
                <span className="submission-title">{submission.title}</span>
                <StatusBadge status={submission.status} />
                <span className="submission-meta">
                  {reviewer ? `By ${submission.submitter} · ` : ''}
                  {formatDate(submission.created_at)}
                </span>
              </button>
            ))}
          </div>
          {selected && (
            <SubmissionDetail
              submission={selected}
              reviewer={reviewer}
              deciding={deciding}
              onDecision={onDecision}
            />
          )}
        </div>
      )}
    </section>
  )
}
