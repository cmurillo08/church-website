import { NextResponse } from 'next/server';
import { createItem, listItemsWithCounters } from '../../../../lib/donations.js';
import { errorResponse, readJson } from '../../../../lib/api.js';

export const dynamic = 'force-dynamic';

// GET /api/admin/items — all items (active and inactive) with pledged/remaining.
export async function GET() {
  try {
    return NextResponse.json({ items: await listItemsWithCounters() });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/admin/items — { name, unit_price_crc, goal_quantity? }
export async function POST(request) {
  try {
    const item = await createItem(await readJson(request));
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
