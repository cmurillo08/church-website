import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, SESSION_TOKEN_PAYLOAD, LOGIN_PATH } from './lib/auth-constants.js';

async function computeExpectedToken(secret) {
  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(SESSION_TOKEN_PAYLOAD));
  const hex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${SESSION_TOKEN_PAYLOAD}.${hex}`;
}

async function isAuthenticated(request) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? '';
  const secret = process.env.SESSION_SECRET || '';
  if (!token || !secret) return false;
  const expected = await computeExpectedToken(secret);
  return token === expected;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Login/logout endpoints must stay reachable while unauthenticated.
  if (pathname === '/api/admin/auth/login' || pathname === '/api/admin/auth/logout') {
    return NextResponse.next();
  }

  const authenticated = await isAuthenticated(request);

  if (pathname === LOGIN_PATH) {
    if (authenticated) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  if (!authenticated) {
    if (pathname.startsWith('/api/admin/')) {
      return NextResponse.json({ error: 'Su sesión terminó. Inicie sesión de nuevo.' }, { status: 401 });
    }
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
