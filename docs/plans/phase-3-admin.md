# Phase 3: Admin

## Overview
The admin area at `/admin`, behind the existing shared-credential login (same as `wife-website`). Built to be as simple as possible for the administrator/pastor. Spanish UI, mobile-friendly.

## Scope

### Included
- **Navigation** (after login): Donaciones · Artículos · Configuración · Cerrar sesión
- **Donaciones** (`/admin`, landing page): one row per person's pledge — name, phone, items and quantities, total ₡, date, status. Actions per row: **Marcar recibida** / **Cancelar** (with a confirm dialog). Pledges are **never editable** — to fix a mistake, cancel and the donor pledges again. See "List pattern" below for filters, pagination and the mobile layout.
- **Artículos** (`/admin/articulos`): table with name, current unit price, goal, pledged, remaining, active. Create/edit form with name, price, goal (goal optional). Deactivate instead of delete.
- **Configuración** (`/admin/configuracion`): edit `welcome_message`, `payment_instructions`, `sinpe_number`.
- Admin API routes under `/api/admin/*` (already covered by the middleware matcher)

### Not included
- Multiple users/roles, audit log, CSV export (could be added later)
- Editing a donation after it's created — the only allowed changes are its status

## List pattern (Donaciones) — reused from `nuttiness`
Same approach as `nuttiness/app/sales/page.js`, `components/EntityTable.jsx`, `components/Pagination.jsx`, `lib/pagination.js`, `lib/sorting.js`; port them into `lib/` and `components/` here, translated to Spanish.
- **Server-side** pagination via `limit`/`offset` (default 25, max 100) on `GET /api/admin/donations`, returning `{ items, total, limit, offset }`. Sort keys are whitelisted; ORDER BY includes a tiebreaker so pages are stable.
- **Filters at the top** of the page, above the list; changing any filter resets to the first page. Filters: **status** (Pendiente / Recibida / Cancelada / Todas; default Pendiente), **search** by donor name or phone, **item** (donations containing that article).
- **Mobile (< lg): card view**, not a table — one card per donation with label/value rows and the action buttons at the bottom of the card; sort by control is a select + direction toggle. **Desktop (≥ lg): table** with sortable headers (date, name, total).
- **Pagination**: "Mostrando X a Y de Z" plus Anterior / Siguiente and the per-page selector, below the list (as in `nuttiness`). On mobile the buttons are full width and the per-page selector is hidden.
- The same card/table + pagination components are reused for the **Artículos** list, so both screens behave identically.

## Routes and endpoints
All under the existing auth (`middleware.js` matcher covers `/admin/*` and `/api/admin/*`). Validate every body server-side; return `{ error }` with 400 (validation), 404, 409 (invalid transition) as appropriate.

| Page | Purpose |
|---|---|
| `/admin` | Donaciones list |
| `/admin/articulos`, `/admin/articulos/nuevo`, `/admin/articulos/[id]/editar` | Artículos list, create, edit |
| `/admin/configuracion` | Settings form |

| Endpoint | Behavior |
|---|---|
| `GET /api/admin/donations?status=&itemId=&search=&sort=&order=&limit=&offset=` | Paginated list → `{ items, total, limit, offset }`. `status` ∈ pending/received/cancelled (omit = all). `search` matches name (case-insensitive, unaccented if easy) or phone. `sort` ∈ created_at, donor_name, total_crc. Each row includes its lines. |
| `PATCH /api/admin/donations/[id]` | Body `{ status: 'received' \| 'cancelled' }`. Nothing else is editable. |
| `GET /api/admin/items` · `POST /api/admin/items` | List with counters (`pledged`, `remaining`) · create `{ name, unit_price_crc, goal_quantity? }` |
| `PATCH /api/admin/items/[id]` | Edit name, price, goal, active, sort_order. No DELETE endpoint. |
| `GET /api/admin/settings` · `PUT /api/admin/settings` | Read / update the three keys; unknown keys are rejected. |

**Status transitions** are enforced atomically in SQL so two clicks can't corrupt state:
```sql
UPDATE donations SET status = $2, status_changed_at = now()
WHERE id = $1 AND status = ANY($3)   -- $3: ['pending'] for received; ['pending','received'] for cancelled
RETURNING *;
```
Zero rows returned → respond 409 "La donación ya no está en un estado que permita este cambio" (covers cancelled-is-final and double clicks).

## Behavior notes
- Changing an item's price only affects new pledges (see Phase 2).
- Raising an item's goal immediately raises the public "remaining" number.
- Marking cancelled returns the units to the counter.
- Admin sees donor names and phones; the public page never does.

## Done when
- Admin can create/edit items and see pledged/remaining update as donations are added
- Admin can mark a donation received or cancelled, and counters react correctly
- Filters, sorting and pagination work server-side; on a ~390px viewport the list renders as cards with filters on top and no horizontal scroll
- Settings changes are saved and readable by the public page (Phase 4)
- Unauthenticated access to `/admin/**` and `/api/admin/**` is blocked
- `npm run lint` and `npm run build` pass
