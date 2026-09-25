'use client'

import { useRef, useState } from 'react'
import { formatCRC } from '../../lib/format.js'

const MAX_QUANTITY = 9999

const inputClass =
  'min-h-12 w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-lg text-gray-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'

const stepButton =
  'flex size-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-2xl font-semibold text-primary transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40'

// randomUUID only exists on secure origins; phones testing over the LAN use
// plain http, so build a v4 UUID from getRandomValues there.
function newToken() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function onlyDigits(value) {
  return value.replace(/[\s-]/g, '')
}

// Pledge form: name, phone, a quantity stepper per active item and a running
// total. Totals shown here are a preview; the server computes the real one.
export default function PledgeForm({ items, onSuccess, onStale }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [isMember, setIsMember] = useState(false)
  const [website, setWebsite] = useState('')
  const [quantities, setQuantities] = useState({})
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Refs, not state: a double tap fires twice before React re-renders, so
  // the in-flight guard and the token must be readable synchronously. The
  // token is reused for retries; the form remounts (new token) after success.
  const inFlight = useRef(false)
  const token = useRef(null)

  const lines = items
    .map((item) => ({ item, quantity: quantities[item.id] || 0 }))
    .filter((line) => line.quantity > 0)
  const total = lines.reduce((sum, line) => sum + line.item.unit_price_crc * line.quantity, 0)

  // `next` is a number or a function of the current quantity (so fast
  // repeated taps on − / + each count).
  function setQuantity(itemId, next) {
    setQuantities((prev) => {
      const value = typeof next === 'function' ? next(prev[itemId] || 0) : next
      const n = Math.min(Math.max(Number(value) || 0, 0), MAX_QUANTITY)
      return { ...prev, [itemId]: n }
    })
    setErrors((prev) => ({ ...prev, lines: undefined }))
  }

  function validate() {
    const next = {}
    if (!name.trim()) next.donor_name = 'Escriba su nombre.'
    if (!/^[0-9]{8}$/.test(onlyDigits(phone))) next.donor_phone = 'El teléfono debe tener 8 números.'
    if (lines.length === 0) next.lines = 'Elija al menos un artículo.'
    return next
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (inFlight.current) return
    setFormError('')

    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    token.current ??= newToken()
    inFlight.current = true
    setSubmitting(true)
    try {
      const res = await fetch('/api/public/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_token: token.current,
          donor_name: name.trim(),
          donor_phone: onlyDigits(phone),
          is_member: isMember,
          lines: lines.map((line) => ({ item_id: line.item.id, quantity: line.quantity })),
          website,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message = body.error || 'No se pudo registrar su donación. Intente de nuevo.'
        if (body.field === 'lines') onStale?.()
        if (['donor_name', 'donor_phone', 'lines'].includes(body.field)) setErrors({ [body.field]: message })
        else setFormError(message)
        return
      }

      onSuccess({
        name: name.trim(),
        total: body.total_crc,
        lines: lines.map((line) => ({ name: line.item.name, quantity: line.quantity })),
      })
    } catch {
      setFormError('No se pudo enviar. Revise su conexión e intente de nuevo.')
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby="pledge-title"
      className="space-y-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-6"
    >
      <div>
        <h2 id="pledge-title" className="text-xl font-semibold text-primary">
          Quiero donar
        </h2>
        <p className="mt-1 text-base text-gray-600">
          Hoy solo hace la promesa. El pago se hace después, en efectivo o por SINPE Móvil.
        </p>
      </div>

      <div>
        <label htmlFor="donor_name" className="block text-lg font-medium text-gray-800">
          Su nombre
        </label>
        <input
          id="donor_name"
          type="text"
          autoComplete="name"
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(errors.donor_name)}
          aria-describedby={errors.donor_name ? 'donor_name-error' : undefined}
          className={`mt-1 ${inputClass}`}
        />
        {errors.donor_name && (
          <p id="donor_name-error" className="mt-1 text-base text-red-700">
            {errors.donor_name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="donor_phone" className="block text-lg font-medium text-gray-800">
          Su teléfono
        </label>
        <input
          id="donor_phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="8888-8888"
          maxLength={10}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          aria-invalid={Boolean(errors.donor_phone)}
          aria-describedby={errors.donor_phone ? 'donor_phone-error' : 'donor_phone-help'}
          className={`mt-1 ${inputClass}`}
        />
        {errors.donor_phone ? (
          <p id="donor_phone-error" className="mt-1 text-base text-red-700">
            {errors.donor_phone}
          </p>
        ) : (
          <p id="donor_phone-help" className="mt-1 text-sm text-gray-500">
            8 números, sin código de país.
          </p>
        )}
      </div>

      <label htmlFor="is_member" className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl p-3 ring-1 ring-gray-200">
        <input
          id="is_member"
          type="checkbox"
          checked={isMember}
          onChange={(e) => setIsMember(e.target.checked)}
          className="size-6 shrink-0 accent-primary"
        />
        <span className="text-lg text-gray-800">Soy miembro de la iglesia</span>
      </label>

      {/* Honeypot: hidden from people, bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">No llenar</label>
        <input id="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      <fieldset aria-describedby={errors.lines ? 'lines-error' : undefined}>
        <legend className="text-lg font-medium text-gray-800">¿Qué desea donar?</legend>
        <ul className="mt-2 space-y-3">
          {items.map((item) => {
            const quantity = quantities[item.id] || 0
            return (
              <li key={item.id} className={`rounded-xl p-3 ring-1 transition ${quantity > 0 ? 'bg-primary/5 ring-primary/40' : 'ring-gray-200'}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="min-w-0 text-lg font-medium text-gray-900">{item.name}</span>
                  <span className="text-base text-gray-600">{formatCRC(item.unit_price_crc)} c/u</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    className={stepButton}
                    onClick={() => setQuantity(item.id, (q) => q - 1)}
                    disabled={quantity <= 0}
                    aria-label={`Quitar uno: ${item.name}`}
                  >
                    −
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={quantity}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setQuantity(item.id, e.target.value.replace(/\D/g, ''))}
                    aria-label={`Cantidad: ${item.name}`}
                    className="min-h-12 w-20 min-w-0 rounded-xl border border-gray-300 bg-white text-center text-xl font-semibold tabular-nums text-gray-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    className={stepButton}
                    onClick={() => setQuantity(item.id, (q) => q + 1)}
                    disabled={quantity >= MAX_QUANTITY}
                    aria-label={`Agregar uno: ${item.name}`}
                  >
                    +
                  </button>
                  <span className="ml-auto text-right text-lg font-semibold tabular-nums text-gray-900">
                    {quantity > 0 ? formatCRC(item.unit_price_crc * quantity) : ''}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
        {errors.lines && (
          <p id="lines-error" className="mt-2 text-base text-red-700">
            {errors.lines}
          </p>
        )}
      </fieldset>

      <div className="flex items-center justify-between rounded-xl bg-gray-50 p-4">
        <span className="text-lg font-medium text-gray-700">Total</span>
        <span className="text-2xl font-bold tabular-nums text-primary">{formatCRC(total)}</span>
      </div>

      {formError && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-base text-red-800">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex min-h-14 w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-lg font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Enviando…' : 'Hacer mi promesa'}
      </button>
    </form>
  )
}
