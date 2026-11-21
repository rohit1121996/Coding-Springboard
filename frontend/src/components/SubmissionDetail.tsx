import type { Submission } from '../api'
import { formatDate } from '../formatDate'
import StatusBadge from './StatusBadge'

type Props = {
  submission: Submission
  reviewer: boolean
  deciding: boolean
  onDecision: (decision: 'approved' | 'rejected') => void
}

export default function SubmissionDetail({ submission, reviewer, deciding, onDecision }: Props) {
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
        {submission.decided_by && (
          <div><span>Decided by</span><strong>{submission.decided_by}</strong></div>
        )}
        {submission.decided_at && (
          <div><span>Decision date</span><strong>{formatDate(submission.decided_at)}</strong></div>
        )}
      </div>

      <div className="document-content">
        <p className="eyebrow">CONTENT</p>
        <p>{submission.content}</p>
      </div>

      {reviewer && submission.status === 'pending' && (
        <div className="decision-bar">
          <div>
            <strong>Ready to decide?</strong>
            <span>This decision cannot be changed.</span>
          </div>
          <div className="button-row">
            <button
              className="button button--danger"
              disabled={deciding}
              onClick={() => onDecision('rejected')}
            >
              Reject
            </button>
            <button
              className="button button--primary"
              disabled={deciding}
              onClick={() => onDecision('approved')}
            >
              Approve
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
