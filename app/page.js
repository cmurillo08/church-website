import DonationPage from '../components/public/DonationPage.js'
import { getPublicSnapshot } from '../lib/donations.js'

export const dynamic = 'force-dynamic'

export default async function Home() {
  let initial = null
  try {
    initial = await getPublicSnapshot()
  } catch (error) {
    // The client retries once on mount.
    console.error('[home] could not load snapshot', error)
  }
  return <DonationPage initial={initial} />
}
