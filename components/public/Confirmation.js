'use client'

import { useEffect, useRef, useState } from 'react'
import { formatCRC, formatNumber, formatPhone } from '../../lib/format.js'

// Shown after a successful pledge: thanks, summary and how to pay.
export default function Confirmation({ pledge, settings, onAgain }) {
  const headingRef = useRef(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  async function copySinpe() {
    try {
      await navigator.clipboard.writeText(settings.sinpe_number)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked (e.g. plain http); the number stays visible.
    }
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
        {settings.payment_instructions && (
          <p className="whitespace-pre-line text-lg text-gray-800">{settings.payment_instructions}</p>
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
              {copied ? 'Número copiado' : 'Copiar número'}
            </button>
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
