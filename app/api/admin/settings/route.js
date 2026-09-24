import { NextResponse } from 'next/server';
import { getSettings, updateSettings } from '../../../../lib/donations.js';
import { errorResponse, readJson } from '../../../../lib/api.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await getSettings());
  } catch (error) {
    return errorResponse(error);
  }
}

// PUT /api/admin/settings — any subset of the known keys; unknown keys → 400.
export async function PUT(request) {
  try {
    return NextResponse.json(await updateSettings(await readJson(request)));
  } catch (error) {
    return errorResponse(error);
  }
}
