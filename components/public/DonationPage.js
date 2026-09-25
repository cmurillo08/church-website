'use client'

import { useCallback, useEffect, useState } from 'react'
import Countdown from './Countdown.js'
import PledgeForm from './PledgeForm.js'
import Confirmation from './Confirmation.js'

const POLL_MS = 10000

// Public page shell: keeps the snapshot fresh by polling while the tab is
// visible, and switches between the pledge form and the confirmation.
export default function DonationPage({ initial }) {
  const [snapshot, setSnapshot] = useState(initial)
  const [pledge, setPledge] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/public/items', { cache: 'no-store' })
      if (res.ok) setSnapshot(await res.json())
    } catch {
      // Keep showing the last numbers; the next poll will retry.
    }
  }, [])

  useEffect(() => {
    let timer = null
    const start = () => {
      if (timer == null) timer = setInterval(refresh, POLL_MS)
    }
    const stop = () => {
      clearInterval(timer)
      timer = null
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh()
        start()
      } else {
        stop()
      }
    }

    // Server render failed: retry right away instead of waiting a full poll.
    const retry = initial ? null : setTimeout(refresh, 0)
    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearTimeout(retry)
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [initial, refresh])

  function handleSuccess(result) {
    setPledge(result)
    refresh()
  }

  const items = snapshot?.items ?? []
  const settings = snapshot?.settings ?? {}

  return (
    <main className="mx-auto w-full max-w-xl space-y-4 px-4 py-6 sm:space-y-6 sm:px-6 sm:py-10">
      <header className="text-center">
        <h1 className="hyphens-auto break-words text-3xl font-bold text-primary sm:text-4xl">Construyamos juntos el nuevo templo</h1>
        {settings.welcome_message && (
          <p className="mt-3 whitespace-pre-line text-lg text-gray-700">{settings.welcome_message}</p>
        )}
      </header>

      {!snapshot ? (
        <p className="rounded-2xl bg-white p-6 text-center text-lg text-gray-600 ring-1 ring-gray-200">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-lg text-gray-600 ring-1 ring-gray-200">
          En este momento no hay artículos para donar. Vuelva pronto.
        </p>
      ) : (
        pledge ? (
          <>
            <Confirmation pledge={pledge} settings={settings} onAgain={() => setPledge(null)} />
            <Countdown items={items} />
          </>
        ) : (
          <>
            <Countdown items={items} />
            <PledgeForm items={items} onSuccess={handleSuccess} onStale={refresh} />
          </>
        )
      )}
    </main>
  )
}
