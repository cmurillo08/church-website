// Shared between middleware.js (Edge runtime, Web Crypto) and the
// app/api/admin/auth/* routes (Node runtime, Node crypto) — kept crypto-free
// so both runtimes can import it without pulling in the wrong crypto API.
export const SESSION_COOKIE_NAME = 'churchsite_admin_session';
export const SESSION_TOKEN_PAYLOAD = 'authenticated';
export const LOGIN_PATH = '/admin/login';
