import { NextResponse } from 'next/server';
import { markDonationReminded } from '../../../../../../lib/donations.js';
import { errorResponse } from '../../../../../../lib/api.js';

export const dynamic = 'force-dynamic';

// POST /api/admin/donations/[id]/reminder — the admin opened a WhatsApp
// reminder for this pending donation; stores the time.
export async function POST(_request, { params }) {
  try {
    const { id } = await params;
    return NextResponse.json(await markDonationReminded(id));
  } catch (error) {
    return errorResponse(error);
  }
}
