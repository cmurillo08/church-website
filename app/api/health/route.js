export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({
    status: 'ok',
    service: 'church-website',
    timestamp: new Date().toISOString(),
  })
}
