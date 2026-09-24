// Parses `limit`/`offset` from a request URL (ported from nuttiness).
// Errors are Spanish because they can surface in the admin UI.
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './donations.js';

export function parsePaginationParams(url) {
  const errors = [];

  let limit = DEFAULT_PAGE_SIZE;
  const limitParam = url.searchParams.get('limit');
  if (limitParam !== null) {
    const parsed = Number(limitParam);
    if (!Number.isInteger(parsed) || parsed <= 0 || parsed > MAX_PAGE_SIZE) {
      errors.push({ field: 'limit', message: `La cantidad por página debe estar entre 1 y ${MAX_PAGE_SIZE}.` });
    } else {
      limit = parsed;
    }
  }

  let offset = 0;
  const offsetParam = url.searchParams.get('offset');
  if (offsetParam !== null) {
    const parsed = Number(offsetParam);
    if (!Number.isInteger(parsed) || parsed < 0) {
      errors.push({ field: 'offset', message: 'Página inválida.' });
    } else {
      offset = parsed;
    }
  }

  return { limit, offset, errors: errors.length > 0 ? errors : null };
}
