export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Health Check',
}

export default function HealthPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-primary">Health Check</h1>
        <p className="mt-2 text-green-700">✅ Application is running</p>
        <p className="mt-1 text-sm text-gray-500">{new Date().toISOString()}</p>
        <p className="mt-4 text-xs text-gray-400">
          JSON endpoint: <code>/api/health</code>
        </p>
      </div>
    </main>
  )
}
