import type { Status } from '../api'

export default function StatusBadge({ status }: { status: Status }) {
  return <span className={`status status--${status}`}>{status}</span>
}
