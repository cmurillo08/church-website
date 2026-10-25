import { NextResponse } from 'next/server';
import { listPendingForReminders } from '../../../../lib/donations.js';
import { errorResponse } from '../../../../lib/api.js';

export const dynamic = 'force-dynamic';

// GET /api/admin/reminders?itemId=&reminded=all|no|yes
// Pending donations to remind (oldest first) and the message template.
export async function GET(request) {
  const url = new URL(request.url);
  try {
    const result = await listPendingForReminders({
      itemId: url.searchParams.get('itemId') || undefined,
      reminded: url.searchParams.get('reminded') || undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
