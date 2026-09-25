import DonationPage from '../components/public/DonationPage.js'
import { getPublicSnapshot } from '../lib/donations.js'

export const dynamic = 'force-dynamic'

export default async function Home() {
  let initial = null
  try {
    initial = await getPublicSnapshot()
  } catch (error) {
    // The client keeps polling and fills in once the database answers.
    console.error('[home] could not load snapshot', error)
  }
  return <DonationPage initial={initial} />
}
