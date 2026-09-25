import './globals.css'

export const metadata = {
  title: 'Donaciones · Nuevo templo',
  description: 'Prometa materiales para la construcción del nuevo templo.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
