'use client'

import { useEffect, useState } from 'react'
import GoalRing from '../../../../components/admin/GoalRing.js'
import { inputClass } from '../../../../components/admin/buttons.js'
import { formatCRC, formatNumber } from '../../../../lib/format.js'
import { adminFetch } from '../../../../lib/admin-fetch.js'

// A card with two figures side by side.
function Tile({ figures }) {
  return (
    <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 ring-1 ring-gray-200">
      {figures.map(({ label, value, hint }) => (
        <div key={label} className="min-w-0">
          <dt className="text-sm text-gray-600">{label}</dt>
          <dd className="mt-0.5 break-words text-xl font-bold text-gray-900">{value}</dd>
          {hint && <dd className="text-xs text-gray-500">{hint}</dd>}
        </div>
      ))}
    </dl>
  )
}

// Per-item progress toward the goal: goal, pledges and money received, for
// active items only. Reuses /api/admin/items, which already carries the counters.
export default function ReportesPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [itemId, setItemId] = useState('') // '' = all active items

  useEffect(() => {
    adminFetch('/api/admin/items')
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || 'No se pudieron cargar los reportes.')
        setItems(body.items.filter((it) => it.active))
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const shown = itemId ? items.filter((it) => String(it.id) === itemId) : items
  // Items without a goal add nothing to it.
  const goalCrc = shown.reduce((sum, it) => sum + (it.goal_quantity ?? 0) * it.unit_price_crc, 0)
  const pledgedCrc = shown.reduce((sum, it) => sum + it.pledged_crc, 0)
  const receivedCrc = shown.reduce((sum, it) => sum + it.received_crc, 0)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-primary">Reportes</h1>

      <div className="flex flex-col gap-1.5 sm:w-64">
        <label htmlFor="filter-item" className="text-sm font-medium text-gray-700">
          Artículo
        </label>
        <select id="filter-item" value={itemId} onChange={(event) => setItemId(event.target.value)} className={inputClass}>
          <option value="">Todos</option>
          {items.map((it) => (
            <option key={it.id} value={String(it.id)}>
              {it.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-gray-500">Cargando…</p>
      ) : shown.length === 0 ? (
        !error && (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-600 ring-1 ring-gray-200">
            No hay artículos activos.
          </p>
        )
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Tile
              figures={[
                { label: 'Meta', value: formatCRC(goalCrc), hint: 'Al precio actual' },
                { label: 'Prometido', value: formatCRC(pledgedCrc), hint: 'Pendiente y recibido' },
              ]}
            />
            <Tile
              figures={[
                { label: 'Recibido', value: formatCRC(receivedCrc), hint: 'Dinero ya entregado' },
                { label: 'Falta por recibir', value: formatCRC(pledgedCrc - receivedCrc), hint: 'Promesas pendientes' },
              ]}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((item) => (
              <section key={item.id} className="rounded-2xl bg-white p-4 ring-1 ring-gray-200">
                <h2 className="mb-4 break-words text-lg font-semibold text-gray-900">{item.name}</h2>
                {item.goal_quantity == null ? (
                  <div className="space-y-2 text-sm">
                    <p className="rounded-lg bg-gray-50 px-3 py-2 text-gray-600">Sin meta: no hay gráfico.</p>
                    <dl className="space-y-2">
                      <div className="flex justify-between gap-3">
                        <dt className="text-gray-600">Promesas</dt>
                        <dd className="text-right font-medium text-gray-900">
                          {formatCRC(item.pledged_crc)} · {formatNumber(item.pledged)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-gray-600">Recibido</dt>
                        <dd className="text-right font-medium text-gray-900">
                          {formatCRC(item.received_crc)} · {formatNumber(item.received)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                ) : (
                  <GoalRing item={item} />
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
