'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import EntityTable from '../../../../components/admin/EntityTable.js'
import Pagination from '../../../../components/admin/Pagination.js'
import ConfirmDialog from '../../../../components/admin/ConfirmDialog.js'
import { inputClass, primaryButton, rowButton } from '../../../../components/admin/buttons.js'
import { formatCRC, formatNumber } from '../../../../lib/format.js'
import { adminFetch } from '../../../../lib/admin-fetch.js'

const COLUMNS = [
  { key: 'name', label: 'Nombre', render: (it) => <span className="font-medium">{it.name}</span> },
  {
    key: 'unit_price_crc',
    label: 'Precio',
    align: 'right',
    render: (it) => <span className="whitespace-nowrap">{formatCRC(it.unit_price_crc)}</span>,
  },
  {
    key: 'goal_quantity',
    label: 'Meta',
    align: 'right',
    render: (it) => (it.goal_quantity == null ? <span className="text-gray-500">Sin meta</span> : formatNumber(it.goal_quantity)),
  },
  { key: 'pledged', label: 'Prometidas', align: 'right', render: (it) => formatNumber(it.pledged) },
  {
    key: 'remaining',
    label: 'Faltan',
    align: 'right',
    render: (it) => (it.remaining == null ? <span className="text-gray-500">—</span> : formatNumber(it.remaining)),
  },
  {
    key: 'active',
    label: 'Estado',
    render: (it) => (
      <span
        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
          it.active ? 'bg-green-50 text-green-800 ring-green-200' : 'bg-red-50 text-red-700 ring-red-200'
        }`}
      >
        {it.active ? 'Activo' : 'Inactivo'}
      </span>
    ),
  },
]

const STATUS_FILTERS = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'inactive', label: 'Inactivos' },
]

// Items are few, so the list is loaded once and paginated in the browser
// with the same components as Donaciones.
export default function ArticulosPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [limit, setLimit] = useState(10)
  const [offset, setOffset] = useState(0)
  const [confirm, setConfirm] = useState(null) // item to deactivate
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    adminFetch('/api/admin/items')
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || 'No se pudieron cargar los artículos.')
        setItems(body.items)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function setActive(item, active) {
    setBusy(true)
    setError('')
    try {
      const res = await adminFetch(`/api/admin/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'No se pudo guardar.')
      setItems((list) => list.map((it) => (it.id === body.id ? body : it)))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }

  const closeConfirm = useCallback(() => setConfirm(null), [])

  function renderActions(item) {
    return (
      <>
        <Link
          href={`/admin/articulos/${item.id}/editar`}
          className={`${rowButton} border-primary/30 bg-white text-primary hover:bg-primary/5`}
        >
          Editar
        </Link>
        {item.active ? (
          <button
            type="button"
            onClick={() => setConfirm(item)}
            className={`${rowButton} border-red-200 bg-white text-red-600 hover:bg-red-50`}
          >
            Desactivar
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => setActive(item, true)}
            className={`${rowButton} border-green-300 bg-green-50 text-green-800 hover:bg-green-100`}
          >
            Activar
          </button>
        )}
      </>
    )
  }

  const filteredItems = status ? items.filter((it) => it.active === (status === 'active')) : items
  // Deactivating the last row of a filtered page empties it — show the last page instead.
  const pageOffset =
    offset > 0 && offset >= filteredItems.length ? Math.max(0, Math.floor((filteredItems.length - 1) / limit) * limit) : offset
  const pageItems = filteredItems.slice(pageOffset, pageOffset + limit)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-primary">Artículos</h1>
        <Link href="/admin/articulos/nuevo" className={primaryButton}>
          Nuevo artículo
        </Link>
      </div>

      <div className="flex flex-col gap-1.5 sm:w-48">
        <label htmlFor="filter-status" className="text-sm font-medium text-gray-700">
          Estado
        </label>
        <select
          id="filter-status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setOffset(0)
          }}
          className={inputClass}
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
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
      ) : (
        <EntityTable
          columns={COLUMNS}
          items={pageItems}
          renderActions={renderActions}
          emptyMessage={
            items.length === 0
              ? 'Todavía no hay artículos. Cree el primero con «Nuevo artículo».'
              : 'No hay artículos en este estado.'
          }
        />
      )}

      <Pagination
        total={filteredItems.length}
        limit={limit}
        offset={pageOffset}
        onLimitChange={(newLimit) => {
          setLimit(newLimit)
          setOffset(0)
        }}
        onOffsetChange={setOffset}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Desactivar artículo"
        confirmLabel="Sí, desactivar"
        tone="danger"
        busy={busy}
        onCancel={closeConfirm}
        onConfirm={() => setActive(confirm, false)}
      >
        {confirm && (
          <p>
            <strong>{confirm.name}</strong> dejará de aparecer en la página de donaciones. Las donaciones que ya lo
            incluyen no cambian. Puede activarlo de nuevo cuando quiera.
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}
