import { NextResponse } from 'next/server';
import { getItemWithCounters, updateItem } from '../../../../../lib/donations.js';
import { errorResponse, readJson } from '../../../../../lib/api.js';

export const dynamic = 'force-dynamic';

// GET /api/admin/items/[id] — used by the edit form.
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    return NextResponse.json(await getItemWithCounters(id));
  } catch (error) {
    return errorResponse(error);
  }
}

// PATCH /api/admin/items/[id] — any of name, unit_price_crc, goal_quantity,
// active. There is no DELETE: items are deactivated instead.
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    return NextResponse.json(await updateItem(id, await readJson(request)));
  } catch (error) {
    return errorResponse(error);
  }
}
