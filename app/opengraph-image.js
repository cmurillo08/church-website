import { ImageResponse } from 'next/og'

// Share preview card (WhatsApp, Facebook…). Next serves it at /opengraph-image
// and adds the og:image tags automatically.
export const alt = 'Donaciones para el nuevo templo'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: 80,
          background: '#1E3A5F',
          color: '#FAFAF7',
        }}
      >
        <div style={{ fontSize: 40, color: '#E0B84A' }}>Construyamos juntos</div>
        <div style={{ fontSize: 96, fontWeight: 700, marginTop: 16 }}>Nuevo templo</div>
        <div style={{ fontSize: 40, marginTop: 32 }}>
          Prometa cemento, láminas y más materiales para la construcción.
        </div>
      </div>
    ),
    size
  )
}
