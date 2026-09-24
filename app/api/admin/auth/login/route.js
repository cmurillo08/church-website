import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, SESSION_TOKEN_PAYLOAD } from '../../../../../lib/auth-constants.js';

function safeString(value) {
  return typeof value === 'string' ? value : '';
}

function timingSafeEqualString(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  const maxLength = Math.max(leftBuffer.length, rightBuffer.length, 1);

  const leftPadded = Buffer.alloc(maxLength);
  const rightPadded = Buffer.alloc(maxLength);
  leftBuffer.copy(leftPadded);
  rightBuffer.copy(rightPadded);

  const sameBytes = crypto.timingSafeEqual(leftPadded, rightPadded);
  return sameBytes && leftBuffer.length === rightBuffer.length;
}

function buildSessionToken(secret) {
  const hmac = crypto.createHmac('sha256', secret).update(SESSION_TOKEN_PAYLOAD).digest('hex');
  return `${SESSION_TOKEN_PAYLOAD}.${hmac}`;
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const username = safeString(body?.username).trim();
  const password = safeString(body?.password);

  if (!username || !password) {
    return NextResponse.json({ error: 'username and password are required' }, { status: 400 });
  }

  const expectedUsername = safeString(process.env.APP_USERNAME);
  const expectedPassword = safeString(process.env.APP_PASSWORD);
  const sessionSecret = safeString(process.env.SESSION_SECRET);

  const usernameMatches = timingSafeEqualString(username, expectedUsername);
  const passwordMatches = timingSafeEqualString(password, expectedPassword);

  if (!usernameMatches || !passwordMatches) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  if (!sessionSecret) {
    return NextResponse.json({ error: 'SESSION_SECRET is not configured' }, { status: 500 });
  }

  const token = buildSessionToken(sessionSecret);
  const secure = process.env.NODE_ENV === 'production';

  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure,
  });
  return response;
}
