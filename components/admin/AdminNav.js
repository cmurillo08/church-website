'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/admin', label: 'Donaciones' },
  { href: '/admin/articulos', label: 'Artículos' },
  { href: '/admin/configuracion', label: 'Configuración' },
]

function isActive(pathname, href) {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Administración" className="flex flex-wrap gap-1">
      {LINKS.map((link) => {
        const active = isActive(pathname, link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-medium transition ${
              active ? 'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
