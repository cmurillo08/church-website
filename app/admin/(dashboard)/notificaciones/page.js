'use client'

import { useCallback, useEffect, useState } from 'react'
import EntityTable from '../../../../components/admin/EntityTable.js'
import { inputClass, primaryButton } from '../../../../components/admin/buttons.js'
import { formatCRC, formatDate, formatNumber, formatPhone } from '../../../../lib/format.js'
import { renderReminder, whatsappUrl } from '../../../../lib/reminders.js'
import { adminFetch } from '../../../../lib/admin-fetch.js'

const REMINDED_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'no', label: 'Sin recordar' },
  { value: 'yes', label: 'Ya recordadas' },
]

const COLUMNS = [
  { key: 'donor_name', label: 'Nombre' },
  {
    key: 'donor_phone',
    label: 'Teléfono',
    render: (d) => <span className="whitespace-nowrap">{formatPhone(d.donor_phone)}</span>,
  },
  {
    key: 'lines',
    label: 'Artículos',
    render: (d) => (
      <ul className="space-y-0.5">
        {d.lines.map((line) => (
          <li key={line.item_id}>
            {formatNumber(line.quantity)} × {line.item_name}
          </li>
        ))}
      </ul>
    ),
  },
  {
    key: 'total_crc',
    label: 'Monto',
    align: 'right',
    render: (d) => <span className="whitespace-nowrap font-medium">{formatCRC(d.total_crc)}</span>,
  },
  {
    key: 'reminded_at',
    label: 'Recordatorio',
    render: (d) =>
      d.reminded_at ? (
        <span className="text-green-800">Recordada el {formatDate(d.reminded_at)}</span>
      ) : (
        <span className="text-gray-500">Sin recordar</span>
      ),
  },
]

// Pending pledges with a WhatsApp link per person. The message comes from the
// template in Configuración; opening the link stores when it was reminded.
export default function NotificacionesPage() {
  const [articleOptions, setArticleOptions] = useState([])
  const [itemId, setItemId] = useState('')
  const [reminded, setReminded] = useState('all')

  const [generated, setGenerated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])
  const [template, setTemplate] = useState('')

  useEffect(() => {
    adminFetch('/api/admin/items')
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((body) => setArticleOptions(body.items || []))
      .catch(() => setArticleOptions([]))
  }, [])

  const load = useCallback(async (filters) => {
    setLoading(true)
    setError('')
    try {
      const qs = new URLSearchParams({ reminded: filters.reminded })
      if (filters.itemId) qs.set('itemId', filters.itemId)
      const res = await adminFetch(`/api/admin/reminders?${qs}`)
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'No se pudo generar el listado.')
      setRows(body.rows)
      setTemplate(body.template || '')
    } catch (err) {
      setError(err.message || 'No se pudo generar el listado. Revise su conexión.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Once generated, changing a filter refreshes the list.
  function changeFilter(setter, key) {
    return (event) => {
      const value = event.target.value
      setter(value)
      if (generated) load({ itemId, reminded, [key]: value })
    }
  }

  function handleGenerate() {
    setGenerated(true)
    load({ itemId, reminded })
  }

  // Fire and forget: the WhatsApp tab opens right away; the row updates once
  // the server confirms. A failure only means the "Recordada" mark is missing.
  function markReminded(donation) {
    adminFetch(`/api/admin/donations/${donation.id}/reminder`, { method: 'POST' })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (!body) return
        setRows((prev) => prev.map((row) => (row.id === donation.id ? { ...row, reminded_at: body.reminded_at } : row)))
      })
      .catch(() => {})
  }

  function renderActions(donation) {
    const message = renderReminder(template, {
      name: donation.donor_name,
      totalCrc: donation.total_crc,
      lines: donation.lines,
    })
    return (
      <a
        href={whatsappUrl(donation.donor_phone, message)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => markReminded(donation)}
        className={`${primaryButton} w-full sm:w-auto`}
      >
        {donation.reminded_at ? 'Enviar de nuevo' : 'Enviar por WhatsApp'}
      </a>
    )
  }

  const totalCrc = rows.reduce((sum, row) => sum + row.total_crc, 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-primary">Notificaciones</h1>
        <button type="button" onClick={handleGenerate} disabled={loading} className={`${primaryButton} w-full sm:w-auto`}>
          {loading ? 'Generando…' : generated ? 'Actualizar listado' : 'Generar listado'}
        </button>
      </div>

      <p className="text-sm text-gray-600">
        Lista de promesas pendientes. Cada botón abre WhatsApp con un mensaje listo para esa persona. El mensaje se cambia en
        Configuración.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-2xl">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-item" className="text-sm font-medium text-gray-700">
            Artículo
          </label>
          <select id="filter-item" value={itemId} onChange={changeFilter(setItemId, 'itemId')} className={inputClass}>
            <option value="">Todos los artículos</option>
            {articleOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.active ? '' : ' (inactivo)'}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-reminded" className="text-sm font-medium text-gray-700">
            Mostrar
          </label>
          <select id="filter-reminded" value={reminded} onChange={changeFilter(setReminded, 'reminded')} className={inputClass}>
            {REMINDED_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {!generated ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
          Toque «Generar listado» para ver las promesas pendientes.
        </p>
      ) : loading && rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">Cargando…</p>
      ) : (
        <>
          <p className="text-sm font-medium text-gray-700" role="status">
            {rows.length === 1 ? '1 promesa pendiente' : `${formatNumber(rows.length)} promesas pendientes`}
            {rows.length > 0 && ` · ${formatCRC(totalCrc)} en total`}
          </p>
          <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <EntityTable
              columns={COLUMNS}
              items={rows}
              renderActions={renderActions}
              emptyMessage="No hay promesas pendientes con estos filtros."
            />
          </div>
        </>
      )}
    </div>
  )
}
