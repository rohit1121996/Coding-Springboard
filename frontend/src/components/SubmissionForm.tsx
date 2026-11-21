import { useState, type FormEvent } from 'react'
import { ApiError, errorMessage } from '../api'

type Props = {
  onCreate: (title: string, content: string) => Promise<void>
  onError: (message: string) => void
}

export default function SubmissionForm({ onCreate, onError }: Props) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setFieldErrors({})

    try {
      await onCreate(title, content)
      setTitle('')
      setContent('')
    } catch (cause) {
      if (cause instanceof ApiError) setFieldErrors(cause.fieldErrors)
      onError(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="compose panel" aria-label="Submit a document">
      <div className="section-heading">
        <div>
          <p className="eyebrow">NEW SUBMISSION</p>
          <h2>Submit a document</h2>
        </div>
        <span className="step-number">01</span>
      </div>

      <form onSubmit={submit}>
        <label htmlFor="title">Document title</label>
        <input
          id="title"
          maxLength={200}
          value={title}
          onChange={event => setTitle(event.target.value)}
          placeholder="e.g. Project proposal"
          required
        />
        {fieldErrors.title && <small className="field-error">{fieldErrors.title.join(' ')}</small>}

        <label htmlFor="content">Document content</label>
        <textarea
          id="content"
          maxLength={10000}
          value={content}
          onChange={event => setContent(event.target.value)}
          placeholder="Paste or write your document here…"
          rows={6}
          required
        />
        {fieldErrors.content && (
          <small className="field-error">{fieldErrors.content.join(' ')}</small>
        )}

        <div className="compose-bottom">
          <span>{content.length.toLocaleString()} / 10,000 characters</span>
          <button className="button button--primary" type="submit" disabled={busy}>
            {busy ? 'Submitting…' : 'Submit for review'} <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
    </section>
  )
}
