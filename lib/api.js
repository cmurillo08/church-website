// Small helpers shared by the /api/admin/* route handlers.
import { NextResponse } from 'next/server';
import { DomainError } from './donations.js';

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new DomainError('Datos inválidos.');
  }
}

// DomainError → its own status and Spanish message; anything else → 500.
export function errorResponse(error) {
  if (error instanceof DomainError) {
    const body = { error: error.message };
    if (error.field) body.field = error.field;
    return NextResponse.json(body, { status: error.status });
  }
  console.error('[api] unexpected error', error);
  return NextResponse.json({ error: 'Ocurrió un error. Intente de nuevo.' }, { status: 500 });
}
