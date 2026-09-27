'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Countdown from './Countdown.js'
import PledgeForm from './PledgeForm.js'
import Confirmation from './Confirmation.js'

// Public page shell: shows the snapshot loaded with the page (no polling),
// reloads it after a pledge, and switches between the form and the confirmation.
export default function DonationPage({ initial }) {
  const [snapshot, setSnapshot] = useState(initial)
  const [pledge, setPledge] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/public/items', { cache: 'no-store' })
      if (res.ok) setSnapshot(await res.json())
    } catch {
      // Keep showing the last numbers.
    }
  }, [])

  // Server render failed: fetch once from the client instead.
  useEffect(() => {
    if (initial) return
    const retry = setTimeout(refresh, 0)
    return () => clearTimeout(retry)
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
        {/* White JPEG background; multiply blends it into the page color. */}
        <Image
          src="/logo.jpg"
          alt="Dios es Fiel, Ministerio Cristiano"
          width={850}
          height={379}
          priority
          sizes="(min-width: 640px) 384px, 288px"
          className="mx-auto mb-4 h-auto w-72 mix-blend-multiply sm:w-96"
        />
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
