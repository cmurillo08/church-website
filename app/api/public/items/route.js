import { NextResponse } from 'next/server';
import { getPublicSnapshot } from '../../../../lib/donations.js';
import { errorResponse } from '../../../../lib/api.js';

export const dynamic = 'force-dynamic';

// GET /api/public/items — active items with counters + settings. Aggregates only.
export async function GET() {
  try {
    return NextResponse.json(await getPublicSnapshot(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
