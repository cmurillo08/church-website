import './globals.css'

export const metadata = {
  title: 'Church Building Fund',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
