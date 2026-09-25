'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { inputClass, primaryButton, secondaryButton } from './buttons.js'
import { formatNumber } from '../../lib/format.js'
import { adminFetch } from '../../lib/admin-fetch.js'

// Accepts "8000", "8 000", "8.000" or "8,000"; returns null when empty and
// NaN when it isn't a whole number. A dot/comma only counts as a thousands
// separator before a group of 3 digits, so "1.5" or "2,50" are rejected.
function parseWholeNumber(value) {
  const trimmed = String(value ?? '').trim()
  if (trimmed === '') return null
  if (!/^[0-9]{1,3}([\s.,]?[0-9]{3})*$/.test(trimmed)) return NaN
  return Number(trimmed.replace(/[\s.,]/g, ''))
}

function FieldError({ message }) {
  if (!message) return null
  return (
    <p className="text-sm text-red-700" role="alert">
      {message}
    </p>
  )
}

// Create form when `item` is omitted; edit form otherwise (adds active, and
// shows the current counters).
export default function ItemForm({ item }) {
  const router = useRouter()
  const isEdit = Boolean(item)

  const [name, setName] = useState(item?.name ?? '')
  const [price, setPrice] = useState(item ? String(item.unit_price_crc) : '')
  const [goal, setGoal] = useState(item?.goal_quantity != null ? String(item.goal_quantity) : '')
  const [active, setActive] = useState(item?.active ?? true)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setErrors({})
    setFormError('')

    const nextErrors = {}
    const priceValue = parseWholeNumber(price)
    const goalValue = parseWholeNumber(goal)
    if (!name.trim()) nextErrors.name = 'Escriba el nombre.'
    if (!Number.isInteger(priceValue) || priceValue <= 0) {
      nextErrors.unit_price_crc = 'El precio debe ser un número entero mayor que 0.'
    }
    if (goalValue !== null && (!Number.isInteger(goalValue) || goalValue <= 0)) {
      nextErrors.goal_quantity = 'La meta debe ser un número entero mayor que 0, o quedar vacía.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const payload = { name: name.trim(), unit_price_crc: priceValue, goal_quantity: goalValue }
    if (isEdit) {
      payload.active = active
    }

    setSaving(true)
    try {
      const res = await adminFetch(isEdit ? `/api/admin/items/${item.id}` : '/api/admin/items', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (body.field && body.field in payload) setErrors({ [body.field]: body.error })
        else setFormError(body.error || 'No se pudo guardar.')
        setSaving(false)
        return
      }
      router.push('/admin/articulos')
      router.refresh()
    } catch {
      setFormError('No se pudo guardar. Revise su conexión.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6" noValidate>
      {isEdit && (
        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3 text-sm">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Prometidas</dt>
            <dd className="text-lg font-semibold text-gray-900">{formatNumber(item.pledged)}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Faltan</dt>
            <dd className="text-lg font-semibold text-gray-900">
              {item.remaining == null ? 'Sin meta' : formatNumber(item.remaining)}
            </dd>
          </div>
        </dl>
      )}

      <div className="space-y-1.5">
        <label htmlFor="item-name" className="block text-sm font-medium text-gray-700">
          Nombre
        </label>
        <input
          id="item-name"
          type="text"
          value={name}
          maxLength={100}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ej.: Saco de cemento"
          className={inputClass}
          aria-invalid={Boolean(errors.name)}
        />
        <FieldError message={errors.name} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="item-price" className="block text-sm font-medium text-gray-700">
            Precio por unidad (₡)
          </label>
          <input
            id="item-price"
            type="text"
            inputMode="numeric"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="8000"
            className={inputClass}
            aria-invalid={Boolean(errors.unit_price_crc)}
            aria-describedby="item-price-help"
          />
          <p id="item-price-help" className="text-xs text-gray-500">
            {isEdit
              ? 'Cambiar el precio solo afecta las donaciones nuevas.'
              : 'Solo números, sin puntos ni comas.'}
          </p>
          <FieldError message={errors.unit_price_crc} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="item-goal" className="block text-sm font-medium text-gray-700">
            Meta (cantidad) <span className="font-normal text-gray-500">— opcional</span>
          </label>
          <input
            id="item-goal"
            type="text"
            inputMode="numeric"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            placeholder="100"
            className={inputClass}
            aria-invalid={Boolean(errors.goal_quantity)}
            aria-describedby="item-goal-help"
          />
          <p id="item-goal-help" className="text-xs text-gray-500">
            Déjela vacía si este artículo no tiene cuenta regresiva.
          </p>
          <FieldError message={errors.goal_quantity} />
        </div>
      </div>

      {isEdit && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-gray-700">Estado</span>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-gray-300 px-3">
              <input
                type="checkbox"
                checked={active}
                onChange={(event) => setActive(event.target.checked)}
                className="h-5 w-5 accent-primary"
              />
              <span className="text-sm text-gray-900">Activo (se muestra en la página de donaciones)</span>
            </label>
          </div>
        </div>
      )}

      {formError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {formError}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end sm:gap-3">
        <Link href="/admin/articulos" className={secondaryButton}>
          Volver
        </Link>
        <button type="submit" disabled={saving} className={primaryButton}>
          {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear artículo'}
        </button>
      </div>
    </form>
  )
}
