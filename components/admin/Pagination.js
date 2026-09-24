'use client'

export const PAGE_SIZES = [10, 25, 50, 100]

export default function Pagination({ total, limit, offset, onLimitChange, onOffsetChange }) {
  if (total === 0) return null

  const currentStart = offset + 1
  const currentEnd = Math.min(offset + limit, total)
  const hasNextPage = offset + limit < total
  const hasPrevPage = offset > 0

  const buttonClass =
    'min-h-11 flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 lg:flex-none'

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-4">
        <div className="min-w-0 text-sm text-gray-700">
          Mostrando <span className="font-medium">{currentStart}</span> a{' '}
          <span className="font-medium">{currentEnd}</span> de <span className="font-medium">{total}</span>
        </div>

        <div className="flex w-full items-center gap-2 lg:justify-center">
          <button
            type="button"
            onClick={() => onOffsetChange(Math.max(0, offset - limit))}
            disabled={!hasPrevPage}
            className={buttonClass}
          >
            Anterior
          </button>
          <span className="min-w-max shrink-0 px-2 text-center text-sm text-gray-600">
            Página {Math.floor(offset / limit) + 1}
          </span>
          <button
            type="button"
            onClick={() => onOffsetChange(offset + limit)}
            disabled={!hasNextPage}
            className={buttonClass}
          >
            Siguiente
          </button>
        </div>

        <div className="hidden items-center justify-start gap-2 sm:flex lg:justify-end">
          <label htmlFor="limit-select" className="whitespace-nowrap text-sm font-medium text-gray-700">
            Por página:
          </label>
          <select
            id="limit-select"
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            className="min-h-11 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
