// Shared data access for items, donations and settings. Both the admin
// (Phase 3) and the public page (Phase 4) use these — the pledged/remaining
// counter must never be re-implemented anywhere else.
import db, { queryWith } from './db.js';

export const DONATION_STATUSES = ['pending', 'received', 'cancelled'];

// next status -> statuses it may come from. `cancelled` is final.
const ALLOWED_FROM = {
  received: ['pending'],
  cancelled: ['pending', 'received'],
};

export const SETTING_KEYS = ['welcome_message', 'payment_instructions', 'sinpe_number'];

const DONATION_SORTS = {
  created_at: 'd.created_at',
  donor_name: 'lower(d.donor_name)',
  total_crc: 'd.total_crc',
};

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
const MAX_LINES = 10;
const MAX_QUANTITY = 9999;
const MAX_SETTING_LENGTH = 2000;
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

// Strips spaces and dashes; returns the 8-digit phone or null if invalid.
export function normalizePhone(value) {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/[\s-]/g, '');
  return /^[0-9]{8}$/.test(digits) ? digits : null;
}

function isPositiveInt(value) {
  return Number.isInteger(value) && value > 0;
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export async function listItemsWithCounters({ activeOnly = false } = {}) {
  const result = await db.query({
    name: 'listItemsWithCounters',
    text: `
      SELECT i.id, i.name, i.unit_price_crc, i.goal_quantity, i.active, i.sort_order,
             COALESCE(SUM(di.quantity) FILTER (WHERE d.status IN ('pending','received')), 0)::int AS pledged
      FROM items i
      LEFT JOIN donation_items di ON di.item_id = i.id
      LEFT JOIN donations d ON d.id = di.donation_id
      WHERE ($1::boolean IS NOT TRUE OR i.active)
      GROUP BY i.id
      ORDER BY i.sort_order, i.id
    `,
    values: [activeOnly],
  });

  return result.rows.map((row) => ({
    ...row,
    remaining: computeRemaining(row.goal_quantity, row.pledged),
  }));
}

// ---------------------------------------------------------------------------
// Donations
// ---------------------------------------------------------------------------

function validateDonationInput({ clientToken, donorName, donorPhone, lines }) {
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

  return { clientToken: clientToken.toLowerCase(), name, phone, lines: cleanLines };
}

// Creates a pledge in one transaction. Prices and total are computed here
// from `items`, never taken from the client. Re-submitting the same
// `clientToken` returns the existing donation instead of creating another.
// Returns { id, total_crc, created }.
export async function createDonation(input) {
  const { clientToken, name, phone, lines } = validateDonationInput(input);

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
        throw new DomainError('Uno de los artículos ya no está disponible. Recargue la página.', { field: 'lines' });
      }
      total += item.unit_price_crc * line.quantity;
      return { ...line, unitPrice: item.unit_price_crc };
    });

    const inserted = await queryWith(client, {
      name: 'createDonation.insert',
      text: `
        INSERT INTO donations (client_token, donor_name, donor_phone, total_crc)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (client_token) DO NOTHING
        RETURNING id, total_crc
      `,
      values: [clientToken, name, phone, total],
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
        SELECT d.id, d.donor_name, d.donor_phone, d.total_crc, d.status,
               d.created_at, d.status_changed_at, l.lines
        FROM donations d
        CROSS JOIN LATERAL (
          SELECT COALESCE(json_agg(json_build_object(
                   'item_id', di.item_id,
                   'item_name', i.name,
                   'quantity', di.quantity,
                   'unit_price_crc', di.unit_price_crc
                 ) ORDER BY i.sort_order, i.id), '[]'::json) AS lines
          FROM donation_items di
          JOIN items i ON i.id = di.item_id
          WHERE di.donation_id = d.id
        ) l
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

// Atomic status change: the WHERE on the current status makes double clicks
// and invalid transitions (e.g. anything after cancelled) affect zero rows.
export async function setDonationStatus(id, next) {
  const allowedFrom = ALLOWED_FROM[next];
  if (!allowedFrom) {
    throw new DomainError('Estado inválido.', { field: 'status' });
  }
  if (!isPositiveInt(Number(id))) {
    throw new DomainError('Donación no encontrada.', { status: 404 });
  }

  const result = await db.query({
    name: 'setDonationStatus',
    text: `
      UPDATE donations SET status = $2, status_changed_at = now()
      WHERE id = $1 AND status = ANY($3::text[])
      RETURNING id, donor_name, donor_phone, total_crc, status, created_at, status_changed_at
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
