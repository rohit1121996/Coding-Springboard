import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'
import { api, type Submission } from './api'

vi.mock('./api', () => ({
  api: {
    me: vi.fn(), login: vi.fn(), logout: vi.fn(), list: vi.fn(),
    create: vi.fn(), decide: vi.fn(),
  },
  ApiError: class ApiError extends Error {},
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
})
