export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Estado del sistema',
}

export default function HealthPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-primary">Estado del sistema</h1>
        <p className="mt-2 text-green-700">✅ La aplicación está funcionando</p>
        <p className="mt-1 text-sm text-gray-500">{new Date().toISOString()}</p>
        <p className="mt-4 text-xs text-gray-400">
          Versión JSON: <code>/api/health</code>
        </p>
      </div>
    </main>
  )
}
