// Sort/order helpers (ported from nuttiness). The ORDER BY SQL itself is
// built from the whitelist in lib/donations.js; this only parses the
// request params (server) and computes the next sort state (client).

const VALID_ORDERS = ['asc', 'desc'];

// columnDefaults: per-column direction used when switching to that column.
export function parseSortParams(url, { allowed, defaultSort, defaultOrder = 'desc', columnDefaults = {} }) {
  const errors = [];

  let sort = defaultSort;
  let sortProvided = false;
  const sortParam = url.searchParams.get('sort');
  if (sortParam !== null) {
    if (!allowed.includes(sortParam)) {
      errors.push({ field: 'sort', message: 'Orden inválido.' });
    } else {
      sort = sortParam;
      sortProvided = true;
    }
  }

  let order = sortProvided ? (columnDefaults[sort] || defaultOrder) : defaultOrder;
  const orderParam = url.searchParams.get('order');
  if (orderParam !== null) {
    const normalized = orderParam.toLowerCase();
    if (!VALID_ORDERS.includes(normalized)) {
      errors.push({ field: 'order', message: 'Dirección de orden inválida.' });
    } else {
      order = normalized;
    }
  }

  return { sort, order, errors: errors.length > 0 ? errors : null };
}

// Clicking the active column flips direction; a new column starts at its
// own default direction (from `columns[].defaultOrder`).
export function nextSortState(columns, { sort, order }, key) {
  if (key === sort) {
    return { sort, order: order === 'asc' ? 'desc' : 'asc' };
  }
  const column = columns.find((c) => c.sortKey === key);
  return { sort: key, order: column?.defaultOrder || 'asc' };
}
