import { STATUS_LABELS } from '../../lib/format.js'

const STYLES = {
  pending: 'bg-amber-50 text-amber-800 ring-amber-200',
  received: 'bg-green-50 text-green-800 ring-green-200',
  cancelled: 'bg-red-50 text-red-700 ring-red-200',
}

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[status] || STYLES.cancelled}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}
