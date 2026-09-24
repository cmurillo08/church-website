'use client'

import { useEffect } from 'react'

// Modal confirm used for status changes and deactivation. `busy` disables
// both buttons while the request is in flight so a double tap can't resend.
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Volver',
  tone = 'primary',
  busy = false,
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape' && open && !busy) onCancel?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  if (!open) return null

  const confirmClass =
    tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:opacity-90'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <h2 id="confirm-dialog-title" className="mb-3 text-lg font-semibold text-primary">
          {title}
        </h2>
        <div className="mb-6 text-sm text-gray-700">{children}</div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-11 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`min-h-11 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60 ${confirmClass}`}
          >
            {busy ? 'Guardando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
