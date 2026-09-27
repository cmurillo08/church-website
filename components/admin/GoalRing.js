'use client'

import { useState } from 'react'
import { formatCRC, formatNumber } from '../../lib/format.js'

// One brand-blue ramp, light → dark (validated as an ordinal ramp on white).
export const RING_COLORS = {
  goal: '#A2B6CF',
  pledged: '#5379A9',
  received: '#1E3A5F',
}

const SIZE = 160
const STROKE = 18
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 2 // white gap between segments, in px along the ring

function percent(value, goal) {
  return Math.round((value / goal) * 100)
}

// Arc from `from` to `to` (fractions of the circle), minus a small gap at the end.
function Arc({ from, to, color, dimmed, onEnter, onLeave, onTap }) {
  const length = (to - from) * CIRCUMFERENCE - (to - from < 1 ? GAP : 0)
  if (length <= 0) return null
  return (
    <circle
      cx={SIZE / 2}
      cy={SIZE / 2}
      r={RADIUS}
      fill="none"
      stroke={color}
      strokeWidth={STROKE}
      strokeDasharray={`${length} ${CIRCUMFERENCE}`}
      strokeDashoffset={-from * CIRCUMFERENCE}
      opacity={dimmed ? 0.35 : 1}
      className="cursor-pointer transition-opacity"
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onClick={onTap}
    />
  )
}

// Ring per item: the full circle is the goal, filled first by what was
// received and then by what is still only promised. Hovering (or tapping) a
// layer shows its units and colones in the middle.
export default function GoalRing({ item }) {
  const [active, setActive] = useState(null) // 'goal' | 'pledged' | 'received'
  const goal = item.goal_quantity
  const goalCrc = goal * item.unit_price_crc

  const layers = {
    goal: { label: 'Meta', units: goal, crc: goalCrc, note: 'al precio actual' },
    pledged: { label: 'Promesas', units: item.pledged, crc: item.pledged_crc, note: 'incluye lo recibido' },
    received: { label: 'Recibido', units: item.received, crc: item.received_crc },
  }

  const receivedEnd = Math.min(item.received / goal, 1)
  const pledgedEnd = Math.min(item.pledged / goal, 1)

  // Which segments light up for each layer: layers are nested (received ⊂ pledged ⊂ goal).
  const lit = {
    received: true,
    pending: active == null || active === 'pledged' || active === 'goal',
    rest: active == null || active === 'goal',
  }

  const handlers = (key) => ({
    onEnter: (event) => event.pointerType === 'mouse' && setActive(key),
    onLeave: (event) => event.pointerType === 'mouse' && setActive(null),
    // Mouse already shows it on hover; taps and the keyboard toggle it.
    onTap: (event) => event.nativeEvent.pointerType !== 'mouse' && setActive((current) => (current === key ? null : key)),
  })

  const shown = active ? layers[active] : null

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={SIZE}
          height={SIZE}
          className="-rotate-90"
          role="img"
          aria-label={`${item.name}: ${percent(item.pledged, goal)}% prometido, ${percent(item.received, goal)}% recibido`}
        >
          <Arc from={pledgedEnd} to={1} color={RING_COLORS.goal} dimmed={!lit.rest} {...handlers('goal')} />
          <Arc from={receivedEnd} to={pledgedEnd} color={RING_COLORS.pledged} dimmed={!lit.pending} {...handlers('pledged')} />
          <Arc from={0} to={receivedEnd} color={RING_COLORS.received} dimmed={!lit.received} {...handlers('received')} />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          {shown ? (
            <>
              <span className="text-xs font-medium text-gray-600">{shown.label}</span>
              <span className="text-lg font-bold leading-tight text-gray-900">{formatCRC(shown.crc)}</span>
              <span className="text-xs text-gray-600">
                {formatNumber(shown.units)} · {percent(shown.units, goal)}%
              </span>
            </>
          ) : (
            <>
              <span className="text-3xl font-bold leading-none text-gray-900">{percent(item.received, goal)}%</span>
              <span className="mt-1 text-xs text-gray-600">recibido</span>
              <span className="text-xs text-gray-600">{percent(item.pledged, goal)}% prometido</span>
            </>
          )}
        </div>
      </div>

      <ul className="w-full space-y-1">
        {['goal', 'pledged', 'received'].map((key) => {
          const layer = layers[key]
          return (
            <li key={key}>
              <button
                type="button"
                onPointerEnter={handlers(key).onEnter}
                onPointerLeave={handlers(key).onLeave}
                onClick={handlers(key).onTap}
                aria-pressed={active === key}
                className={`flex min-h-11 w-full items-center gap-3 rounded-lg px-2 text-left text-sm transition ${
                  active === key ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}
              >
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: RING_COLORS[key] }} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-gray-900">{layer.label}</span>
                  {layer.note && <span className="block text-xs text-gray-500">{layer.note}</span>}
                </span>
                <span className="text-right">
                  <span className="block font-medium text-gray-900">{formatCRC(layer.crc)}</span>
                  <span className="block text-xs text-gray-500">
                    {key === 'goal' ? formatNumber(layer.units) : `${formatNumber(layer.units)} · ${percent(layer.units, goal)}%`}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
