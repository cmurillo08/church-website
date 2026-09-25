import { NextResponse } from 'next/server';
import { createDonation, DomainError } from '../../../../lib/donations.js';
import { errorResponse, readJson } from '../../../../lib/api.js';

export const dynamic = 'force-dynamic';

// POST /api/public/donations — creates a pledge. Prices and total are computed
// server-side; re-sending the same client_token returns the same 201.
export async function POST(request) {
  try {
    const body = await readJson(request);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new DomainError('Datos inválidos.');
    }
    // Honeypot: hidden field real people never fill.
    if (body.website) {
      throw new DomainError('No se pudo registrar la donación.');
    }

    const donation = await createDonation({
      clientToken: body.client_token,
      donorName: body.donor_name,
      donorPhone: body.donor_phone,
      isMember: body.is_member,
      lines: body.lines,
    });
    return NextResponse.json({ ok: true, total_crc: donation.total_crc }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
