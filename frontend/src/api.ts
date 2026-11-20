export type Role = 'submitter' | 'reviewer'
export type Status = 'pending' | 'approved' | 'rejected'
export type User = { username: string; role: Role }
export type Submission = {
  id: string
  submitter: string
  title: string
  content: string
  status: Status
  created_at: string
  decided_by: string | null
  decided_at: string | null
}

type ApiErrorBody = {
  code?: string
  message?: string
  field_errors?: Record<string, string[]>
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors: Record<string, string[]> = {},
  ) {
    super(message)
  }
}

async function csrfToken(): Promise<string> {
  const response = await fetch('/api/csrf', { credentials: 'same-origin' })
  if (!response.ok) throw new Error('Could not initialize the secure session.')
  const data = (await response.json()) as { csrfToken: string }
  return data.csrfToken
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method?.toUpperCase() ?? 'GET'
  const headers = new Headers(options.headers)
  if (options.body) headers.set('Content-Type', 'application/json')
  if (method !== 'GET' && method !== 'HEAD') headers.set('X-CSRFToken', await csrfToken())

  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers,
      credentials: 'same-origin',
    })
  } catch {
    throw new Error('Cannot reach the server. Please try again.')
  }

  if (!response.ok) {
    let body: ApiErrorBody = {}
    try {
      body = (await response.json()) as ApiErrorBody
    } catch {
      // A proxy or server can return an HTML error page.
    }
    throw new ApiError(
      response.status,
      body.code ?? 'request_error',
      body.message ?? 'Something went wrong. Please try again.',
      body.field_errors ?? {},
    )
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export const api = {
  me: () => request<User>('/me'),
  login: (username: string, password: string) =>
    request<User>('/session', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request<void>('/session', { method: 'DELETE' }),
  list: (status?: Status) =>
    request<Submission[]>(`/submissions${status ? `?status=${status}` : ''}`),
  create: (title: string, content: string) =>
    request<Submission>('/submissions', {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    }),
  decide: (id: string, decision: 'approved' | 'rejected') =>
    request<Submission>(`/submissions/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    }),
}
