// fetch() for the admin pages. A 401 means the session is gone (logged out in
// another tab, cookie cleared), so go to the login page instead of showing
// the error under stale data. The response is still returned so callers
// behave as usual until the navigation happens.
import { LOGIN_PATH } from './auth-constants.js';

export async function adminFetch(url, options) {
  const res = await fetch(url, options);
  if (res.status === 401 && typeof window !== 'undefined') {
    window.location.assign(LOGIN_PATH);
  }
  return res;
}
