'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import ItemForm from '../../../../../../components/admin/ItemForm.js'
import { adminFetch } from '../../../../../../lib/admin-fetch.js'

export default function EditarArticuloPage() {
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    adminFetch(`/api/admin/items/${id}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || 'No se pudo cargar el artículo.')
        setItem(body)
      })
      .catch((err) => setError(err.message))
  }, [id])

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold text-primary">Editar artículo</h1>
      {error ? (
        <div className="space-y-3">
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
          <Link href="/admin/articulos" className="text-sm font-medium text-primary underline">
            Volver a Artículos
          </Link>
        </div>
      ) : item ? (
        <ItemForm item={item} />
      ) : (
        <p className="py-8 text-center text-sm text-gray-500">Cargando…</p>
      )}
    </div>
  )
}
