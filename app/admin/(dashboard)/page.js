'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import EntityTable from '../../../components/admin/EntityTable.js'
import Pagination, { PAGE_SIZES } from '../../../components/admin/Pagination.js'
import ConfirmDialog from '../../../components/admin/ConfirmDialog.js'
import StatusBadge from '../../../components/admin/StatusBadge.js'
import { inputClass, rowButton, secondaryButton } from '../../../components/admin/buttons.js'
import { formatCRC, formatNumber, formatPhone } from '../../../lib/format.js'
import { nextSortState } from '../../../lib/sorting.js'
import { adminFetch } from '../../../lib/admin-fetch.js'

const COLUMNS = [
  { key: 'donor_name', label: 'Nombre', sortKey: 'donor_name', defaultOrder: 'asc' },
  {
    key: 'donor_phone',
    label: 'Teléfono',
    render: (d) => (
      <a href={`tel:${d.donor_phone}`} className="whitespace-nowrap text-primary underline-offset-2 hover:underline">
        {formatPhone(d.donor_phone)}
      </a>
    ),
  },
  {
    key: 'is_member',
    label: 'Miembro',
    render: (d) => (d.is_member ? 'Sí' : 'No'),
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
    label: 'Total',
    align: 'right',
    render: (d) => <span className="whitespace-nowrap font-medium">{formatCRC(d.total_crc)}</span>,
  },
  { key: 'status', label: 'Estado', render: (d) => <StatusBadge status={d.status} /> },
]

// Default order; no date column is shown, so it's offered in the sort select.
const SORT_OPTIONS = [{ sortKey: 'created_at', label: 'Más recientes', defaultOrder: 'desc' }]

const STATUS_FILTERS = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'received', label: 'Recibidas' },
  { value: 'cancelled', label: 'Canceladas' },
  { value: '', label: 'Todas' },
]

// Filters, sort and page live in the query string so reload and Back keep
// them. Only non-default values are written; bad values fall back to defaults.
const DEFAULT_STATUS = 'pending'
const DEFAULT_LIMIT = 10

function readListState(params) {
  const statusParam = params.get('status')
  const status =
    statusParam === 'all' ? '' : STATUS_FILTERS.some((f) => f.value && f.value === statusParam) ? statusParam : DEFAULT_STATUS
  const sortParam = params.get('sort')
  const sortOption = [...SORT_OPTIONS, ...COLUMNS].find((c) => c.sortKey && c.sortKey === sortParam)
  const sort = sortOption ? sortParam : 'created_at'
  const orderParam = params.get('order')
  const order = orderParam === 'asc' || orderParam === 'desc' ? orderParam : sortOption?.defaultOrder || 'desc'
  const limitParam = Number(params.get('limit'))
  const limit = PAGE_SIZES.includes(limitParam) ? limitParam : DEFAULT_LIMIT
  const page = Number(params.get('page'))
  const offset = Number.isInteger(page) && page > 1 ? (page - 1) * limit : 0
  const itemParam = params.get('item')
  return {
    status,
    search: (params.get('search') || '').trim(),
    itemId: /^[0-9]+$/.test(itemParam || '') ? itemParam : '',
    sort,
    order,
    limit,
    offset,
  }
}

function listStateQuery({ status, search, itemId, sort, order, limit, offset }) {
  const qs = new URLSearchParams()
  if (status !== DEFAULT_STATUS) qs.set('status', status || 'all')
  if (search) qs.set('search', search)
  if (itemId) qs.set('item', itemId)
  if (sort !== 'created_at' || order !== 'desc') {
    qs.set('sort', sort)
    qs.set('order', order)
  }
  if (limit !== DEFAULT_LIMIT) qs.set('limit', String(limit))
  if (offset > 0) qs.set('page', String(Math.floor(offset / limit) + 1))
  return qs.toString()
}

const ACTIONS = {
  received: {
    title: 'Marcar como recibida',
    confirmLabel: 'Sí, marcar recibida',
    tone: 'primary',
    question: '¿Ya se recibió el aporte de',
  },
  cancelled: {
    title: 'Cancelar donación',
    confirmLabel: 'Sí, cancelar',
    tone: 'danger',
    question: '¿Cancelar la donación de',
    note: 'Las cantidades vuelven a quedar disponibles. Esto no se puede deshacer.',
  },
}

// useSearchParams needs a Suspense boundary so the page can still prerender.
export default function DonacionesPage() {
  return (
    <Suspense fallback={<p className="py-8 text-center text-sm text-gray-500">Cargando…</p>}>
      <DonacionesList />
    </Suspense>
  )
}

function DonacionesList() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [initial] = useState(() => readListState(searchParams))

  // `key` identifies which request the data belongs to; while it differs
  // from the current request key the list is loading.
  const [result, setResult] = useState({ key: null, items: [], total: 0, error: '' })
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [status, setStatus] = useState(initial.status)
  const [searchInput, setSearchInput] = useState(initial.search)
  const [search, setSearch] = useState(initial.search)
  const [itemId, setItemId] = useState(initial.itemId)
  const [sort, setSort] = useState(initial.sort)
  const [order, setOrder] = useState(initial.order)
  const [limit, setLimit] = useState(initial.limit)
  const [offset, setOffset] = useState(initial.offset)
  const [reloadKey, setReloadKey] = useState(0)

  const [articleOptions, setArticleOptions] = useState([])
  const [confirm, setConfirm] = useState(null) // { donation, next }
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    adminFetch('/api/admin/items')
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((body) => setArticleOptions(body.items || []))
      .catch(() => setArticleOptions([]))
  }, [])

  // Mirror the list state into the URL (replace, so filters don't pile up in history).
  useEffect(() => {
    const next = listStateQuery({ status, search, itemId, sort, order, limit, offset })
    if (next !== window.location.search.replace(/^\?/, '')) {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
    }
  }, [status, search, itemId, sort, order, limit, offset, router, pathname])

  // Debounce typing so each keystroke doesn't hit the server.
  useEffect(() => {
    const next = searchInput.trim()
    if (next === search) return
    const timer = setTimeout(() => {
      setSearch(next)
      setOffset(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, search])

  const query = useMemo(() => {
    const qs = new URLSearchParams({ sort, order, limit: String(limit), offset: String(offset) })
    if (status) qs.set('status', status)
    if (search) qs.set('search', search)
    if (itemId) qs.set('itemId', itemId)
    return qs.toString()
  }, [status, search, itemId, sort, order, limit, offset])
  const requestKey = `${query}#${reloadKey}`

  // Same filters and order as the list, without pagination.
  const exportHref = useMemo(() => {
    const qs = new URLSearchParams({ sort, order })
    if (status) qs.set('status', status)
    if (search) qs.set('search', search)
    if (itemId) qs.set('itemId', itemId)
    return `/api/admin/donations/export?${qs}`
  }, [status, search, itemId, sort, order])

  useEffect(() => {
    const controller = new AbortController()
    adminFetch(`/api/admin/donations?${query}`, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || 'No se pudieron cargar las donaciones.')
        // The page emptied (e.g. its last row changed status) — step back.
        if (body.items.length === 0 && body.offset > 0 && body.total > 0) {
          setOffset(Math.floor((body.total - 1) / body.limit) * body.limit)
          return
        }
        setResult({ key: requestKey, items: body.items, total: body.total, error: '' })
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setResult((prev) => ({ ...prev, key: requestKey, error: err.message || 'No se pudieron cargar las donaciones.' }))
      })
    return () => controller.abort()
  }, [query, requestKey])

  const { items, total } = result
  const loading = result.key !== requestKey
  const shownError = error || (loading ? '' : result.error)

  function changeFilter(setter) {
    return (event) => {
      setter(event.target.value)
      setOffset(0)
      setNotice('')
      setError('')
    }
  }

  function handleSortChange(key) {
    const next = nextSortState([...SORT_OPTIONS, ...COLUMNS], { sort, order }, key)
    setSort(next.sort)
    setOrder(next.order)
    setOffset(0)
  }

  const closeConfirm = useCallback(() => setConfirm(null), [])

  async function applyStatus() {
    if (!confirm) return
    const { donation, next } = confirm
    setBusy(true)
    setNotice('')
    setError('')
    try {
      const res = await adminFetch(`/api/admin/donations/${donation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.error || 'No se pudo cambiar el estado.')
      } else {
        setNotice(
          next === 'received'
            ? `Donación de ${donation.donor_name} marcada como recibida.`
            : `Donación de ${donation.donor_name} cancelada.`
        )
      }
    } catch {
      setError('No se pudo cambiar el estado. Revise su conexión.')
    } finally {
      setBusy(false)
      setConfirm(null)
      setReloadKey((k) => k + 1)
    }
  }

  function renderActions(donation) {
    if (donation.status !== 'pending') {
      return <span className="text-sm text-gray-400">Sin acciones</span>
    }
    return (
      <>
        <button
          type="button"
          onClick={() => setConfirm({ donation, next: 'received' })}
          className={`${rowButton} border-green-300 bg-green-50 text-green-800 hover:bg-green-100`}
        >
          Marcar recibida
        </button>
        <button
          type="button"
          onClick={() => setConfirm({ donation, next: 'cancelled' })}
          className={`${rowButton} border-red-200 bg-white text-red-600 hover:bg-red-50`}
        >
          Cancelar
        </button>
      </>
    )
  }

  const action = confirm ? ACTIONS[confirm.next] : null
  const hasFilters = Boolean(search || itemId)

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-primary">Donaciones</h1>
        <a href={exportHref} download className={`${secondaryButton} w-full sm:w-auto`}>
          Exportar CSV
        </a>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[12rem_1fr_16rem]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-status" className="text-sm font-medium text-gray-700">
            Estado
          </label>
          <select id="filter-status" value={status} onChange={changeFilter(setStatus)} className={inputClass}>
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 sm:order-last sm:col-span-2 lg:order-none lg:col-span-1">
          <label htmlFor="filter-search" className="text-sm font-medium text-gray-700">
            Buscar
          </label>
          <input
            id="filter-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Nombre o teléfono"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="filter-item" className="text-sm font-medium text-gray-700">
            Artículo
          </label>
          <select id="filter-item" value={itemId} onChange={changeFilter(setItemId)} className={inputClass}>
            <option value="">Todos los artículos</option>
            {articleOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.active ? '' : ' (inactivo)'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {notice && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
          {notice}
        </p>
      )}
      {shownError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {shownError}
        </p>
      )}

      {loading && items.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">Cargando…</p>
      ) : (
        <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <EntityTable
            columns={COLUMNS}
            items={items}
            extraSortOptions={SORT_OPTIONS}
            sort={sort}
            order={order}
            onSortChange={handleSortChange}
            renderActions={renderActions}
            emptyMessage={hasFilters ? 'No hay donaciones que coincidan con la búsqueda.' : 'No hay donaciones en este estado.'}
          />
        </div>
      )}

      <Pagination
        total={total}
        limit={limit}
        offset={offset}
        onLimitChange={(newLimit) => {
          setLimit(newLimit)
          setOffset(0)
        }}
        onOffsetChange={setOffset}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={action?.title}
        confirmLabel={action?.confirmLabel}
        tone={action?.tone}
        busy={busy}
        onCancel={closeConfirm}
        onConfirm={applyStatus}
      >
        {confirm && (
          <>
            <p>
              {action.question} <strong>{confirm.donation.donor_name}</strong>?
            </p>
            <p className="mt-2 text-gray-600">Total: {formatCRC(confirm.donation.total_crc)}</p>
            {action.note && <p className="mt-2 text-gray-600">{action.note}</p>}
          </>
        )}
      </ConfirmDialog>
    </div>
  )
}
