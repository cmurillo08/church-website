import AdminNav from '../../../components/admin/AdminNav.js'
import LogoutButton from '../../../components/admin/LogoutButton.js'

export const metadata = {
  title: 'Administración · Donaciones',
}

export default function AdminDashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-primary">Donaciones · Admin</span>
            <div className="sm:hidden">
              <LogoutButton />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AdminNav />
            <div className="hidden sm:block">
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">{children}</main>
    </div>
  )
}
