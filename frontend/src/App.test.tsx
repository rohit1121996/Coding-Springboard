import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'
import { api, ApiError, type Submission } from './api'

vi.mock('./api', async importOriginal => ({
  ...await importOriginal<typeof import('./api')>(),
  api: {
    me: vi.fn(), login: vi.fn(), logout: vi.fn(), list: vi.fn(),
    create: vi.fn(), decide: vi.fn(),
  },
}))

const pending: Submission = {
  id: 'test-id', submitter: 'alice', title: 'Budget proposal', content: 'Please review this plan.',
  status: 'pending', created_at: '2026-11-20T10:00:00Z', decided_by: null, decided_at: null,
}

beforeEach(() => {
  vi.resetAllMocks()
})
afterEach(cleanup)

describe('document workflow', () => {
  it('shows a retry when the initial session check fails', async () => {
    vi.mocked(api.me)
      .mockRejectedValueOnce(new Error('Cannot reach the server. Please try again.'))
      .mockResolvedValueOnce({ username: 'alice', role: 'submitter' })
    vi.mocked(api.list).mockResolvedValue([])
    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server')
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('heading', { name: 'My documents' })).toBeInTheDocument()
  })

  it('lets a submitter create a document and see its pending status', async () => {
    vi.mocked(api.me).mockResolvedValue({ username: 'alice', role: 'submitter' })
    vi.mocked(api.list).mockResolvedValue([])
    vi.mocked(api.create).mockResolvedValue(pending)
    render(<App />)

    fireEvent.change(await screen.findByLabelText('Document title'), { target: { value: 'Budget proposal' } })
    fireEvent.change(screen.getByLabelText('Document content'), { target: { value: 'Please review this plan.' } })
    fireEvent.click(screen.getByRole('button', { name: /Submit for review/ }))

    await waitFor(() => expect(api.create).toHaveBeenCalledWith('Budget proposal', 'Please review this plan.'))
    expect(await screen.findByText('Document submitted for review.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Budget proposal/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Submission details')).toHaveTextContent('pending')
  })

  it('shows server validation errors on the submission form', async () => {
    vi.mocked(api.me).mockResolvedValue({ username: 'alice', role: 'submitter' })
    vi.mocked(api.list).mockResolvedValue([])
    vi.mocked(api.create).mockRejectedValue(new ApiError(
      400, 'validation_error', 'Please correct the highlighted fields.',
      { title: ['This title is not allowed.'] },
    ))
    render(<App />)

    fireEvent.change(await screen.findByLabelText('Document title'), { target: { value: 'Proposal' } })
    fireEvent.change(screen.getByLabelText('Document content'), { target: { value: 'Content' } })
    fireEvent.click(screen.getByRole('button', { name: /Submit for review/ }))

    expect(await screen.findByText('This title is not allowed.')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Please correct the highlighted fields.')
  })

  it('lets a reviewer approve a pending submission', async () => {
    vi.mocked(api.me).mockResolvedValue({ username: 'reviewer', role: 'reviewer' })
    vi.mocked(api.list).mockResolvedValue([pending])
    vi.mocked(api.decide).mockResolvedValue({ ...pending, status: 'approved', decided_by: 'reviewer', decided_at: '2026-11-20T11:00:00Z' })
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(api.decide).toHaveBeenCalledWith('test-id', 'approved'))
    expect(await screen.findByText('Submission approved.')).toBeInTheDocument()
    expect(screen.getByText('No submissions here yet')).toBeInTheDocument()
  })

  it('explains a decision conflict after refreshing the queue', async () => {
    vi.mocked(api.me).mockResolvedValue({ username: 'reviewer', role: 'reviewer' })
    vi.mocked(api.list).mockResolvedValueOnce([pending]).mockResolvedValueOnce([])
    vi.mocked(api.decide).mockRejectedValue(new ApiError(409, 'conflict', 'Already decided.'))
    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: /^Approve$/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('already decided')
    expect(screen.getByText('No submissions here yet')).toBeInTheDocument()
  })
})
