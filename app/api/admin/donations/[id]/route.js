import { NextResponse } from 'next/server';
import { DomainError, setDonationStatus } from '../../../../../lib/donations.js';
import { errorResponse, readJson } from '../../../../../lib/api.js';

// PATCH /api/admin/donations/[id] — body { status: 'received' | 'cancelled' }.
// Only the status can change; pledges are never edited.
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await readJson(request);
    const keys = body && typeof body === 'object' ? Object.keys(body) : [];
    if (keys.length !== 1 || keys[0] !== 'status') {
      throw new DomainError('Solo se puede cambiar el estado de una donación.', { field: 'status' });
    }
    const donation = await setDonationStatus(id, body.status);
    return NextResponse.json(donation);
  } catch (error) {
    return errorResponse(error);
  }
}
