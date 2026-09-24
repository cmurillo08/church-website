'use client'

import { useEffect, useState } from 'react'
import { inputClass, primaryButton } from '../../../../components/admin/buttons.js'

const FIELDS = [
  {
    key: 'welcome_message',
    label: 'Mensaje de bienvenida',
    help: 'Aparece arriba en la página de donaciones.',
    multiline: true,
  },
  {
    key: 'payment_instructions',
    label: 'Instrucciones de pago',
    help: 'Se muestran después de que alguien hace su promesa.',
    multiline: true,
  },
  {
    key: 'sinpe_number',
    label: 'Número de SINPE Móvil',
    help: '8 números. Déjelo vacío para no mostrarlo.',
    multiline: false,
  },
]

export default function ConfiguracionPage() {
  const [values, setValues] = useState(null)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || 'No se pudo cargar la configuración.')
        setValues(body)
      })
      .catch((err) => setFormError(err.message))
  }, [])

  function update(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrors({})
    setFormError('')
    setSaved(false)
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (body.field) setErrors({ [body.field]: body.error })
        else setFormError(body.error || 'No se pudo guardar.')
        return
      }
      setValues(body)
      setSaved(true)
    } catch {
      setFormError('No se pudo guardar. Revise su conexión.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold text-primary">Configuración</h1>

      {!values ? (
        formError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {formError}
          </p>
        ) : (
          <p className="py-8 text-center text-sm text-gray-500">Cargando…</p>
        )
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6" noValidate>
          {FIELDS.map((field) => {
            const id = `setting-${field.key}`
            const common = {
              id,
              value: values[field.key] ?? '',
              onChange: (event) => update(field.key, event.target.value),
              'aria-invalid': Boolean(errors[field.key]),
              'aria-describedby': `${id}-help`,
            }
            return (
              <div key={field.key} className="space-y-1.5">
                <label htmlFor={id} className="block text-sm font-medium text-gray-700">
                  {field.label}
                </label>
                {field.multiline ? (
                  <textarea {...common} rows={4} maxLength={2000} className={`${inputClass} min-h-28`} />
                ) : (
                  <input {...common} type="text" inputMode="numeric" maxLength={9} placeholder="88887777" className={inputClass} />
                )}
                <p id={`${id}-help`} className="text-xs text-gray-500">
                  {field.help}
                </p>
                {errors[field.key] && (
                  <p className="text-sm text-red-700" role="alert">
                    {errors[field.key]}
                  </p>
                )}
              </div>
            )
          })}

          {formError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {formError}
            </p>
          )}
          {saved && (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
              Cambios guardados.
            </p>
          )}

          <div className="flex flex-col border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
            <button type="submit" disabled={saving} className={primaryButton}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
