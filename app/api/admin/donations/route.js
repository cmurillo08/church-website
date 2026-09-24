import { NextResponse } from 'next/server';
import { DONATION_SORT_KEYS, listDonations } from '../../../../lib/donations.js';
import { parsePaginationParams } from '../../../../lib/pagination.js';
import { parseSortParams } from '../../../../lib/sorting.js';
import { errorResponse } from '../../../../lib/api.js';

export const dynamic = 'force-dynamic';

const SORT_OPTIONS = {
  allowed: DONATION_SORT_KEYS,
  defaultSort: 'created_at',
  defaultOrder: 'desc',
  columnDefaults: { created_at: 'desc', donor_name: 'asc', total_crc: 'desc' },
};

// GET /api/admin/donations?status=&itemId=&search=&sort=&order=&limit=&offset=
export async function GET(request) {
  const url = new URL(request.url);
  const page = parsePaginationParams(url);
  const sorting = parseSortParams(url, SORT_OPTIONS);
  const errors = [...(page.errors || []), ...(sorting.errors || [])];
  if (errors.length > 0) {
    return NextResponse.json({ error: errors[0].message, field: errors[0].field }, { status: 400 });
  }

  try {
    const result = await listDonations({
      status: url.searchParams.get('status') || undefined,
      itemId: url.searchParams.get('itemId') || undefined,
      search: url.searchParams.get('search') || undefined,
      sort: sorting.sort,
      order: sorting.order,
      limit: page.limit,
      offset: page.offset,
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
