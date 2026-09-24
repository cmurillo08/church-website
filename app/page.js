import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-primary">Church Building Fund</h1>
        <p className="mt-2 text-secondary">Phase 1 scaffold — features coming in later phases.</p>
        <Link href="/health" className="mt-4 inline-block text-sm text-primary underline">
          Health check
        </Link>
      </div>
    </main>
  )
}
