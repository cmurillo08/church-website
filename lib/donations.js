// Shared data access for items, donations and settings. Both the admin
// (Phase 3) and the public page (Phase 4) use these — the pledged/remaining
// counter must never be re-implemented anywhere else.
import db, { queryWith } from './db.js';
import { normalizePhone } from './phone.js';

export const DONATION_STATUSES = ['pending', 'received', 'cancelled'];

// next status -> statuses it may come from. `received` and `cancelled` are final.
const ALLOWED_FROM = {
  received: ['pending'],
  cancelled: ['pending'],
};

export const SETTING_KEYS = ['welcome_message', 'payment_instructions', 'sinpe_number'];

const DONATION_SORTS = {
  created_at: 'd.created_at',
  donor_name: 'lower(d.donor_name)',
};
export const DONATION_SORT_KEYS = Object.keys(DONATION_SORTS);
// parseSortParams options shared by the list and the CSV export.
export const DONATION_SORT_OPTIONS = {
  allowed: DONATION_SORT_KEYS,
  defaultSort: 'created_at',
  defaultOrder: 'desc',
  columnDefaults: { created_at: 'desc', donor_name: 'asc' },
};

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;
const MAX_LINES = 10;
const MAX_QUANTITY = 9999;
const MAX_SETTING_LENGTH = 2000;
const MAX_PRICE_CRC = 100000000;
const MAX_GOAL = 1000000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Error with an HTTP status and user-facing (Spanish) message, so API routes
// can respond with `{ error, field }` without re-deciding the status code.
export class DomainError extends Error {
  constructor(message, { status = 400, field } = {}) {
    super(message);
    this.name = 'DomainError';
    this.status = status;
    this.field = field;
  }
}

export function computeRemaining(goal, pledged) {
  return goal == null ? null : Math.max(goal - pledged, 0);
}

function isPositiveInt(value) {
  return Number.isInteger(value) && value > 0;
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

// The one pledged/remaining counter query. `id` narrows it to a single item.
async function queryItemsWithCounters({ activeOnly = false, id = null } = {}) {
  const result = await db.query({
    name: 'listItemsWithCounters',
    text: `
      SELECT i.id, i.name, i.unit_price_crc, i.goal_quantity, i.active, i.created_at,
             COALESCE(SUM(di.quantity) FILTER (WHERE d.status IN ('pending','received')), 0)::int AS pledged
      FROM items i
      LEFT JOIN donation_items di ON di.item_id = i.id
      LEFT JOIN donations d ON d.id = di.donation_id
      WHERE ($1::boolean IS NOT TRUE OR i.active)
        AND ($2::int IS NULL OR i.id = $2)
      GROUP BY i.id
      ORDER BY i.created_at, i.id
    `,
    values: [activeOnly, id],
  });

  return result.rows.map((row) => ({
    ...row,
    remaining: computeRemaining(row.goal_quantity, row.pledged),
  }));
}

export async function listItemsWithCounters({ activeOnly = false } = {}) {
  return queryItemsWithCounters({ activeOnly });
}

// Public page data: active items with counters plus the settings. Only the
// fields listed here leave the server — never donor names or phones.
export async function getPublicSnapshot() {
  const [items, settings] = await Promise.all([
    listItemsWithCounters({ activeOnly: true }),
    getSettings(),
  ]);
  return {
    items: items.map(({ id, name, unit_price_crc, goal_quantity, pledged, remaining }) => ({
      id, name, unit_price_crc, goal_quantity, pledged, remaining,
    })),
    settings,
  };
}

function parseItemId(id) {
  const n = Number(id);
  if (!isPositiveInt(n) || n > 2147483647) {
    throw new DomainError('Artículo no encontrado.', { status: 404 });
  }
  return n;
}

export async function getItemWithCounters(id) {
  const rows = await queryItemsWithCounters({ id: parseItemId(id) });
  if (rows.length === 0) {
    throw new DomainError('Artículo no encontrado.', { status: 404 });
  }
  return rows[0];
}

// Validates the editable item fields present in `input`. With `partial`,
// missing fields are skipped (PATCH); otherwise name and price are required.
function validateItemInput(input, { partial = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new DomainError('Datos inválidos.');
  }

  const allowed = ['name', 'unit_price_crc', 'goal_quantity', 'active'];
  for (const key of Object.keys(input)) {
    if (!allowed.includes(key)) {
      throw new DomainError('Campo desconocido.', { field: key });
    }
  }

  const fields = {};
  const has = (key) => input[key] !== undefined;

  if (has('name') || !partial) {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (name.length < 1 || name.length > 100) {
      throw new DomainError('Escriba el nombre (máximo 100 letras).', { field: 'name' });
    }
    fields.name = name;
  }

  if (has('unit_price_crc') || !partial) {
    const price = input.unit_price_crc;
    if (!isPositiveInt(price) || price > MAX_PRICE_CRC) {
      throw new DomainError('El precio debe ser un número entero mayor que 0.', { field: 'unit_price_crc' });
    }
    fields.unit_price_crc = price;
  }

  if (has('goal_quantity')) {
    const goal = input.goal_quantity;
    if (goal !== null && (!isPositiveInt(goal) || goal > MAX_GOAL)) {
      throw new DomainError('La meta debe ser un número entero mayor que 0, o quedar vacía.', { field: 'goal_quantity' });
    }
    fields.goal_quantity = goal;
  }

  if (has('active')) {
    if (typeof input.active !== 'boolean') {
      throw new DomainError('Valor inválido.', { field: 'active' });
    }
    fields.active = input.active;
  }

  return fields;
}

// Items are listed oldest first (created_at), so new ones go to the end.
export async function createItem(input) {
  const fields = validateItemInput(input);
  const result = await db.query({
    name: 'createItem',
    text: `
      INSERT INTO items (name, unit_price_crc, goal_quantity, active)
      VALUES ($1, $2, $3, COALESCE($4, true))
      RETURNING id
    `,
    values: [
      fields.name,
      fields.unit_price_crc,
      fields.goal_quantity ?? null,
      fields.active ?? null,
    ],
  });
  return getItemWithCounters(result.rows[0].id);
}

// Price changes only affect new pledges: existing lines keep their own
// unit_price_crc. Returns the item with fresh counters.
export async function updateItem(id, input) {
  const itemId = parseItemId(id);
  const fields = validateItemInput(input, { partial: true });
  const keys = Object.keys(fields);

  if (keys.length > 0) {
    const sets = keys.map((key, i) => `${key} = $${i + 2}`);
    const result = await db.query({
      name: 'updateItem',
      text: `UPDATE items SET ${sets.join(', ')}, updated_at = now() WHERE id = $1 RETURNING id`,
      values: [itemId, ...keys.map((key) => fields[key])],
    });
    if (result.rows.length === 0) {
      throw new DomainError('Artículo no encontrado.', { status: 404 });
    }
  }

  return getItemWithCounters(itemId);
}

// ---------------------------------------------------------------------------
// Donations
// ---------------------------------------------------------------------------

function validateDonationInput({ clientToken, donorName, donorPhone, isMember = false, lines }) {
  if (typeof clientToken !== 'string' || !UUID_RE.test(clientToken)) {
    throw new DomainError('Formulario inválido. Recargue la página e intente de nuevo.', { field: 'client_token' });
  }

  const name = typeof donorName === 'string' ? donorName.trim() : '';
  if (name.length < 1 || name.length > 100) {
    throw new DomainError('Escriba su nombre (máximo 100 letras).', { field: 'donor_name' });
  }

  const phone = normalizePhone(donorPhone);
  if (!phone) {
    throw new DomainError('El teléfono debe tener 8 números.', { field: 'donor_phone' });
  }

  if (typeof isMember !== 'boolean') {
    throw new DomainError('Valor inválido.', { field: 'is_member' });
  }

  if (!Array.isArray(lines) || lines.length === 0) {
    throw new DomainError('Elija al menos un artículo.', { field: 'lines' });
  }
  if (lines.length > MAX_LINES) {
    throw new DomainError('Demasiados artículos en una sola donación.', { field: 'lines' });
  }

  const seen = new Set();
  const cleanLines = lines.map((line) => {
    const itemId = line?.item_id;
    const quantity = line?.quantity;
    if (!isPositiveInt(itemId)) {
      throw new DomainError('Artículo inválido.', { field: 'lines' });
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw new DomainError(`La cantidad debe estar entre 1 y ${MAX_QUANTITY}.`, { field: 'lines' });
    }
    if (seen.has(itemId)) {
      throw new DomainError('Un artículo aparece repetido.', { field: 'lines' });
    }
    seen.add(itemId);
    return { itemId, quantity };
  });

  return { clientToken: clientToken.toLowerCase(), name, phone, isMember, lines: cleanLines };
}

// Creates a pledge in one transaction. Prices and total are computed here
// from `items`, never taken from the client. Re-submitting the same
// `clientToken` returns the existing donation instead of creating another.
// Returns { id, total_crc, created }.
export async function createDonation(input) {
  const { clientToken, name, phone, isMember, lines } = validateDonationInput(input);

  return db.runTransaction(async (client) => {
    const itemIds = lines.map((line) => line.itemId);
    const itemsResult = await queryWith(client, {
      name: 'createDonation.items',
      text: 'SELECT id, unit_price_crc, active FROM items WHERE id = ANY($1::int[])',
      values: [itemIds],
    });
    const itemsById = new Map(itemsResult.rows.map((row) => [row.id, row]));

    let total = 0;
    const priced = lines.map((line) => {
      const item = itemsById.get(line.itemId);
      if (!item || !item.active) {
        throw new DomainError('Uno de los artículos ya no está disponible. Revise su promesa y envíela de nuevo.', { field: 'lines' });
      }
      total += item.unit_price_crc * line.quantity;
      return { ...line, unitPrice: item.unit_price_crc };
    });

    const inserted = await queryWith(client, {
      name: 'createDonation.insert',
      text: `
        INSERT INTO donations (client_token, donor_name, donor_phone, is_member, total_crc)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (client_token) DO NOTHING
        RETURNING id, total_crc
      `,
      values: [clientToken, name, phone, isMember, total],
    });

    if (inserted.rows.length === 0) {
      const existing = await queryWith(client, {
        name: 'createDonation.existing',
        text: 'SELECT id, total_crc FROM donations WHERE client_token = $1',
        values: [clientToken],
      });
      return { ...existing.rows[0], created: false };
    }

    const donation = inserted.rows[0];
    await queryWith(client, {
      name: 'createDonation.lines',
      text: `
        INSERT INTO donation_items (donation_id, item_id, quantity, unit_price_crc)
        SELECT $1::int, * FROM unnest($2::int[], $3::int[], $4::int[])
      `,
      values: [
        donation.id,
        priced.map((line) => line.itemId),
        priced.map((line) => line.quantity),
        priced.map((line) => line.unitPrice),
      ],
    });

    return { ...donation, created: true };
  });
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

// Lowercases and strips Spanish accents so "maria" matches "María" without
// needing the unaccent extension.
const UNACCENT_SQL = (expr) => `translate(lower(${expr}), 'áéíóúüñ', 'aeiouun')`;

function stripAccents(value) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Builds the WHERE clause shared by the paginated list (and later the CSV
// export) so both select exactly the same donations.
export function buildDonationFilters({ status, itemId, search } = {}) {
  const clauses = [];
  const values = [];

  if (status != null && status !== '') {
    if (!DONATION_STATUSES.includes(status)) {
      throw new DomainError('Estado inválido.', { field: 'status' });
    }
    values.push(status);
    clauses.push(`d.status = $${values.length}`);
  }

  if (itemId != null && itemId !== '') {
    const id = Number(itemId);
    if (!isPositiveInt(id)) {
      throw new DomainError('Artículo inválido.', { field: 'itemId' });
    }
    values.push(id);
    clauses.push(`EXISTS (SELECT 1 FROM donation_items f WHERE f.donation_id = d.id AND f.item_id = $${values.length})`);
  }

  const term = typeof search === 'string' ? search.trim() : '';
  if (term) {
    values.push(`%${escapeLike(stripAccents(term))}%`);
    const nameParam = values.length;
    const digits = term.replace(/[\s-]/g, '');
    if (/^[0-9]+$/.test(digits)) {
      values.push(`%${digits}%`);
      clauses.push(`(${UNACCENT_SQL('d.donor_name')} LIKE $${nameParam} OR d.donor_phone LIKE $${values.length})`);
    } else {
      clauses.push(`${UNACCENT_SQL('d.donor_name')} LIKE $${nameParam}`);
    }
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
}

function clampInt(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isInteger(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

// Donations with their lines as a JSON array; shared by the list and the
// CSV export so both show the same data.
const DONATION_WITH_LINES_SQL = `
  SELECT d.id, d.donor_name, d.donor_phone, d.is_member, d.total_crc, d.status,
         d.created_at, d.status_changed_at, l.lines
  FROM donations d
  CROSS JOIN LATERAL (
    SELECT COALESCE(json_agg(json_build_object(
             'item_id', di.item_id,
             'item_name', i.name,
             'quantity', di.quantity,
             'unit_price_crc', di.unit_price_crc
           ) ORDER BY i.created_at, i.id), '[]'::json) AS lines
    FROM donation_items di
    JOIN items i ON i.id = di.item_id
    WHERE di.donation_id = d.id
  ) l
`;

// Paginated donation list with each donation's lines. Returns
// { items, total, limit, offset }.
export async function listDonations({ status, itemId, search, sort, order, limit, offset } = {}) {
  const { where, values } = buildDonationFilters({ status, itemId, search });
  const sortExpr = DONATION_SORTS[sort] || DONATION_SORTS.created_at;
  const direction = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const pageSize = clampInt(limit, DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const pageOffset = clampInt(offset, 0, 0, Number.MAX_SAFE_INTEGER);

  const [rowsResult, countResult] = await Promise.all([
    db.query({
      name: 'listDonations',
      text: `
        ${DONATION_WITH_LINES_SQL}
        ${where}
        ORDER BY ${sortExpr} ${direction}, d.id ${direction}
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}
      `,
      values: [...values, pageSize, pageOffset],
    }),
    db.query({
      name: 'listDonations.count',
      text: `SELECT COUNT(*)::int AS total FROM donations d ${where}`,
      values,
    }),
  ]);

  return {
    items: rowsResult.rows,
    total: countResult.rows[0].total,
    limit: pageSize,
    offset: pageOffset,
  };
}

// CSV export: every donation matching the same filters as the list (no
// pagination), one row per donation with all its lines. Returns
// { rows, itemName } — itemName is the filtered item's name, for the file name.
export async function listDonationsForExport({ status, itemId, search, sort, order } = {}) {
  const { where, values } = buildDonationFilters({ status, itemId, search });
  const sortExpr = DONATION_SORTS[sort] || DONATION_SORTS.created_at;
  const direction = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const [rowsResult, itemResult] = await Promise.all([
    db.query({
      name: 'listDonationsForExport',
      text: `
        ${DONATION_WITH_LINES_SQL}
        ${where}
        ORDER BY ${sortExpr} ${direction}, d.id ${direction}
      `,
      values,
    }),
    itemId ? db.query('SELECT name FROM items WHERE id = $1', [Number(itemId)]) : null,
  ]);

  return { rows: rowsResult.rows, itemName: itemResult?.rows[0]?.name ?? null };
}

// Atomic status change: the WHERE on the current status makes double clicks
// and invalid transitions (e.g. anything after cancelled) affect zero rows.
export async function setDonationStatus(id, next) {
  const allowedFrom = ALLOWED_FROM[next];
  if (!allowedFrom) {
    throw new DomainError('Estado inválido.', { field: 'status' });
  }
  if (!isPositiveInt(Number(id)) || Number(id) > 2147483647) {
    throw new DomainError('Donación no encontrada.', { status: 404 });
  }

  const result = await db.query({
    name: 'setDonationStatus',
    text: `
      UPDATE donations SET status = $2, status_changed_at = now()
      WHERE id = $1 AND status = ANY($3::text[])
      RETURNING id, donor_name, donor_phone, is_member, total_crc, status, created_at, status_changed_at
    `,
    values: [Number(id), next, allowedFrom],
  });

  if (result.rows.length > 0) return result.rows[0];

  const exists = await db.query('SELECT 1 FROM donations WHERE id = $1', [Number(id)]);
  if (exists.rows.length === 0) {
    throw new DomainError('Donación no encontrada.', { status: 404 });
  }
  throw new DomainError('La donación ya no está en un estado que permita este cambio.', { status: 409 });
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getSettings() {
  const result = await db.query({
    name: 'getSettings',
    text: 'SELECT key, value FROM site_settings WHERE key = ANY($1::text[])',
    values: [SETTING_KEYS],
  });
  const settings = Object.fromEntries(SETTING_KEYS.map((key) => [key, '']));
  for (const row of result.rows) settings[row.key] = row.value;
  return settings;
}

// Updates any subset of the known keys; unknown keys are rejected.
// Returns the full settings object after the update.
export async function updateSettings(values) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    throw new DomainError('Datos inválidos.');
  }

  const entries = Object.entries(values).map(([key, raw]) => {
    if (!SETTING_KEYS.includes(key)) {
      throw new DomainError('Configuración desconocida.', { field: key });
    }
    if (typeof raw !== 'string') {
      throw new DomainError('Valor inválido.', { field: key });
    }
    let value = raw.trim();
    if (value.length > MAX_SETTING_LENGTH) {
      throw new DomainError(`El texto es muy largo (máximo ${MAX_SETTING_LENGTH} letras).`, { field: key });
    }
    if (key === 'sinpe_number' && value !== '') {
      value = normalizePhone(value);
      if (!value) {
        throw new DomainError('El número de SINPE debe tener 8 números.', { field: key });
      }
    }
    return [key, value];
  });

  if (entries.length > 0) {
    await db.runTransaction(async (client) => {
      for (const [key, value] of entries) {
        await queryWith(client, {
          name: 'updateSettings',
          text: `
            INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2, now())
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
          `,
          values: [key, value],
        });
      }
    });
  }

  return getSettings();
}
