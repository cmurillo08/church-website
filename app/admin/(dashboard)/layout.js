import LogoutButton from '../../../components/admin/LogoutButton.js'

export default function AdminDashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <span className="text-sm font-semibold text-primary">Donaciones · Admin</span>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  )
}
