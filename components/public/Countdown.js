'use client'

import { useState } from 'react'
import { formatNumber } from '../../lib/format.js'

// "Telethon" counter: one tab per active item (shown even for a single item,
// so the layout looks the same) with the big remaining number.
export default function Countdown({ items }) {
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? null)

  if (items.length === 0) return null

  // The selected item may disappear when the admin deactivates it.
  const selected = items.find((item) => item.id === selectedId) || items[0]

  return (
    <section aria-labelledby="countdown-title" className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:p-6">
      <h2 id="countdown-title" className="text-xl font-semibold text-primary">
        ¿Cuánto falta?
      </h2>

      <div role="tablist" aria-label="Artículos" className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => {
          const active = item.id === selected.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={active}
              aria-controls="countdown-panel"
              onClick={() => setSelectedId(item.id)}
              className={`min-h-12 min-w-[7rem] flex-1 rounded-xl px-3 py-2 text-base font-medium leading-tight transition ${
                active ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {item.name}
            </button>
          )
        })}
      </div>

      <div
        id="countdown-panel"
        role="tabpanel"
        aria-labelledby={`tab-${selected.id}`}
        className="mt-4"
      >
        <CounterPanel item={selected} />
      </div>
    </section>
  )
}

function CounterPanel({ item }) {
  const hasGoal = item.goal_quantity != null
  const reached = hasGoal && item.remaining === 0
  const percent = hasGoal ? Math.min(100, Math.round((item.pledged / item.goal_quantity) * 100)) : 0

  return (
    <div className="text-center">
      <p className="text-lg font-medium text-gray-800">{item.name}</p>

      {hasGoal ? (
        <>
          <p className="mt-2 text-base text-gray-600">{reached ? '¡Meta alcanzada!' : 'Faltan'}</p>
          <p
            key={item.remaining}
            aria-live="polite"
            className="animate-count text-7xl font-bold tabular-nums text-secondary sm:text-8xl"
          >
            {formatNumber(item.remaining)}
          </p>

          <div
            className="mt-4 h-4 w-full overflow-hidden rounded-full bg-gray-200"
            role="progressbar"
            aria-label="Avance hacia la meta"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${percent}%` }} />
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-2 text-base">
            <div className="rounded-lg bg-gray-50 p-2">
              <dt className="text-gray-600">Meta</dt>
              <dd className="text-xl font-semibold tabular-nums text-gray-900">{formatNumber(item.goal_quantity)}</dd>
            </div>
            <div className="rounded-lg bg-gray-50 p-2">
              <dt className="text-gray-600">Prometidos</dt>
              <dd className="text-xl font-semibold tabular-nums text-gray-900">{formatNumber(item.pledged)}</dd>
            </div>
          </dl>
        </>
      ) : (
        <>
          <p className="mt-2 text-base text-gray-600">Prometidos hasta ahora</p>
          <p
            key={item.pledged}
            aria-live="polite"
            className="animate-count text-7xl font-bold tabular-nums text-secondary sm:text-8xl"
          >
            {formatNumber(item.pledged)}
          </p>
        </>
      )}
    </div>
  )
}
