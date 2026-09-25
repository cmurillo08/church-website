'use client'

import { useEffect, useRef, useState } from 'react'
import { formatCRC, formatNumber, formatPhone } from '../../lib/format.js'

// navigator.clipboard only exists on https (and localhost); phones opening
// the site over plain http or in some in-app browsers need the old
// select-and-copy way. Returns whether the text was copied.
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Blocked; try the fallback below.
  }
  const previousFocus = document.activeElement
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  // Off-screen, and 16px so iOS doesn't zoom in on focus.
  textarea.style.cssText = 'position:fixed;top:0;left:-9999px;font-size:16px'
  document.body.appendChild(textarea)
  try {
    textarea.select()
    textarea.setSelectionRange(0, text.length) // iOS ignores select()
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    textarea.remove()
    previousFocus?.focus?.()
  }
}

// Shown after a successful pledge: thanks, summary and how to pay.
export default function Confirmation({ pledge, settings, onAgain }) {
  const headingRef = useRef(null)
  const [copyState, setCopyState] = useState('') // '' | 'copied' | 'failed'

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  async function copySinpe() {
    const ok = await copyText(settings.sinpe_number)
    setCopyState(ok ? 'copied' : 'failed')
    if (ok) setTimeout(() => setCopyState(''), 2000)
  }

  return (
    <section className="space-y-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-6">
      <div className="text-center">
        <p className="text-5xl" aria-hidden="true">🙏</p>
        <h2 ref={headingRef} tabIndex={-1} className="mt-2 text-2xl font-bold text-primary outline-none">
          ¡Gracias, {pledge.name}!
        </h2>
        <p className="mt-1 text-lg text-gray-700">Su promesa quedó registrada.</p>
      </div>

      <div className="rounded-xl bg-gray-50 p-4">
        <ul className="space-y-1 text-lg text-gray-800">
          {pledge.lines.map((line) => (
            <li key={line.name} className="flex justify-between gap-3">
              <span className="min-w-0">{line.name}</span>
              <span className="font-semibold tabular-nums">× {formatNumber(line.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">
          <span className="text-lg font-medium text-gray-700">Total a pagar</span>
          <span className="text-2xl font-bold tabular-nums text-primary">{formatCRC(pledge.total)}</span>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xl font-semibold text-primary">¿Cómo pagar?</h3>
        {settings.payment_instructions ? (
          <p className="whitespace-pre-line text-lg text-gray-800">{settings.payment_instructions}</p>
        ) : (
          !settings.sinpe_number && <p className="text-lg text-gray-800">Le contactaremos para coordinar el pago.</p>
        )}
        {settings.sinpe_number && (
          <div className="rounded-xl bg-secondary/10 p-4 text-center">
            <p className="text-base text-gray-700">SINPE Móvil</p>
            <p className="text-3xl font-bold tabular-nums tracking-wide text-gray-900">{formatPhone(settings.sinpe_number)}</p>
            <button
              type="button"
              onClick={copySinpe}
              className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-base font-medium text-gray-700 transition hover:bg-gray-50"
            >
              {copyState === 'copied' ? 'Número copiado' : 'Copiar número'}
            </button>
            {copyState === 'failed' && (
              <p className="mt-2 text-base text-gray-700" role="status">
                No se pudo copiar. Por favor anote el número.
              </p>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onAgain}
        className="flex min-h-14 w-full items-center justify-center rounded-xl border-2 border-primary bg-white px-4 py-3 text-lg font-semibold text-primary transition hover:bg-primary/5"
      >
        Hacer otra promesa
      </button>
    </section>
  )
}
