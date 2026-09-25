import { DONATION_SORT_OPTIONS, listDonationsForExport } from '../../../../../lib/donations.js';
import { parseSortParams } from '../../../../../lib/sorting.js';
import { errorResponse } from '../../../../../lib/api.js';
import { asText, slugify, toCsv } from '../../../../../lib/csv.js';
import { formatDateIso, STATUS_LABELS } from '../../../../../lib/format.js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const HEADERS = ['Nombre', 'Teléfono', 'Miembro', 'Artículos', 'Total (₡)', 'Estado', 'Fecha'];

// "3 × Saco de cemento, 2 × Lámina de zinc"
function describeLines(lines) {
  return lines.map((line) => `${line.quantity} × ${line.item_name}`).join(', ');
}

const STATUS_FILE_LABELS = { pending: 'pendientes', received: 'recibidas', cancelled: 'canceladas' };

function fileName({ status, itemName }) {
  const date = formatDateIso(new Date()).slice(0, 10);
  const parts = ['donaciones', STATUS_FILE_LABELS[status], itemName && slugify(itemName), date];
  return `${parts.filter(Boolean).join('-')}.csv`;
}

// GET /api/admin/donations/export?status=&itemId=&search=&sort=&order=
// Same filters as the list, all matching donations (no pagination), as CSV,
// one row per donation.
export async function GET(request) {
  const url = new URL(request.url);
  const sorting = parseSortParams(url, DONATION_SORT_OPTIONS);
  if (sorting.errors) {
    const [first] = sorting.errors;
    return NextResponse.json({ error: first.message, field: first.field }, { status: 400 });
  }

  try {
    const status = url.searchParams.get('status') || undefined;
    const { rows, itemName } = await listDonationsForExport({
      status,
      itemId: url.searchParams.get('itemId') || undefined,
      search: url.searchParams.get('search') || undefined,
      sort: sorting.sort,
      order: sorting.order,
    });

    const csv = toCsv(
      HEADERS,
      rows.map((d) => [
        d.donor_name,
        asText(d.donor_phone),
        d.is_member ? 'Sí' : 'No',
        describeLines(d.lines),
        d.total_crc,
        STATUS_LABELS[d.status] || d.status,
        formatDateIso(d.created_at),
      ])
    );

    const name = fileName({ status, itemName });
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
