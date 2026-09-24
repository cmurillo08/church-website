'use client'

// Cards on mobile, table on lg (ported from nuttiness). Columns:
// { key, label, sortKey?, defaultOrder?, render?(item), align? }.
// Row actions come from `renderActions(item)` so each screen decides them.
// `extraSortOptions` ({ sortKey, label }) are orders with no column of their
// own (e.g. newest first); when present the sort select also shows on lg,
// since there is no header to click for them.
export default function EntityTable({
  columns,
  items,
  extraSortOptions = [],
  sort,
  order,
  onSortChange,
  renderActions,
  emptyMessage = 'No hay resultados.',
}) {
  const sortableColumns = columns.filter((c) => c.sortKey)
  const sortOptions = [...extraSortOptions, ...sortableColumns]
  const canSort = sortOptions.length > 0 && typeof onSortChange === 'function'

  function renderCell(item, column) {
    if (column.render) return column.render(item)
    return String(item[column.key] ?? '')
  }

  function sortIndicator(column) {
    if (column.sortKey !== sort) return null
    return <span aria-hidden="true">{order === 'desc' ? '▼' : '▲'}</span>
  }

  function ariaSortFor(column) {
    if (!column.sortKey) return undefined
    if (column.sortKey !== sort) return 'none'
    return order === 'desc' ? 'descending' : 'ascending'
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {canSort && (
        <div className={`flex items-center gap-2 ${extraSortOptions.length > 0 ? 'lg:max-w-sm' : 'lg:hidden'}`}>
          <label htmlFor="entity-table-sort" className="shrink-0 text-sm font-medium text-gray-700">
            Ordenar por
          </label>
          <select
            id="entity-table-sort"
            value={sort}
            onChange={(event) => onSortChange(event.target.value)}
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {sortOptions.map((c) => (
              <option key={c.sortKey} value={c.sortKey}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onSortChange(sort)}
            aria-label={order === 'desc' ? 'Orden descendente; cambiar a ascendente' : 'Orden ascendente; cambiar a descendente'}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-gray-300 bg-white text-base"
          >
            {order === 'desc' ? '▼' : '▲'}
          </button>
        </div>
      )}

      <ul className="space-y-3 lg:hidden">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <dl className="space-y-2">
              {columns.map((c) => (
                <div key={c.key} className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-gray-500">{c.label}</dt>
                  <dd className="min-w-0 break-words text-right text-sm text-gray-900">{renderCell(item, c)}</dd>
                </div>
              ))}
            </dl>
            {renderActions ? (
              <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:flex-wrap">
                {renderActions(item)}
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white lg:block">
        <table className="w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={canSort ? ariaSortFor(c) : undefined}
                  className={`px-4 py-3 text-sm font-medium text-primary ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {canSort && c.sortKey ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(c.sortKey)}
                      className="inline-flex items-center gap-1 font-medium hover:text-primary/80"
                    >
                      {c.label}
                      {sortIndicator(c)}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
              {renderActions ? (
                <th scope="col" className="px-4 py-3 text-right text-sm font-medium text-primary">
                  Acciones
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={`px-4 py-3 align-top text-sm text-gray-900 ${c.align === 'right' ? 'text-right' : ''}`}
                  >
                    {renderCell(item, c)}
                  </td>
                ))}
                {renderActions ? (
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap justify-end gap-2">{renderActions(item)}</div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
