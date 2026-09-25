# Phase 7: Bug fixing

## Overview
Resolve the issues found while testing. Scope is the **Findings** table below: `A#` rows come from the automated cycles ([phase-6a-automated-testing.md](phase-6a-automated-testing.md)), `M#` rows from the manual pass ([phase-6-manual-testing.md](phase-6-manual-testing.md)) — add manual findings here directly.

## Scope
- Fix findings ordered by severity: blockers first, then annoying, then cosmetic
- Re-run the failing scenario(s) after each fix and tick them
- Add a row per fix to the Fix log (finding # → cause → fix)

## Not included
- New features — anything new goes into its own phase or a deferred doc

## Findings
| # | Scenario | What happened | Expected | Severity | Where / hint |
|---|---|---|---|---|---|
| A1 | B1 — session lost while using admin (logged out in another tab, cookie expired/cleared) | Any admin action or filter change shows a red **"Unauthorized"** (English) and stays on the page; the list keeps showing old rows under the new filter | Spanish message and redirect to `/admin/login` | annoying | `middleware.js` returns `{ error: 'Unauthorized' }`; admin pages show `body.error` as-is (`app/admin/(dashboard)/page.js:140,191`, `articulos/page.js`, `configuracion/page.js`, `ItemForm.js`). Handle `401` in one place → redirect to login. |
| A2 | A6 — phone with larger text | At 175 % text size and above the public page scrolls sideways (390 px → 448/512 px); "Construyamos" is cut at the edge | No horizontal scroll at any text size | annoying | The "¿Qué desea donar?" `<fieldset>` has the browser default `min-width: min-content` → add `min-w-0`; heading needs `break-words`/`hyphens-auto` (`components/public/PledgeForm.js`, page header). |
| A3 | B6 — clear payment instructions and SINPE | Thank-you screen shows the "¿Cómo pagar?" heading with nothing under it | Hide the section, or show a default line (e.g. "Le contactaremos para coordinar el pago.") | cosmetic | `components/public/Confirmation.js` |
| A4 | B2 — item deactivated while a donor has it selected | Form correctly drops the item and keeps name/phone, but the message says "Recargue la página", which isn't needed (resubmitting works) | Wording like "Uno de los artículos ya no está disponible. Revise su promesa y envíela de nuevo." | cosmetic | `lib/donations.js` DomainError text for unknown/inactive item |
| A5 | B2 — item goal/price with decimals | Goal `1.5` saved as **15**, `2,5` as **25** (dots/commas stripped as thousands separators). `8.000` → 8000 is fine | Reject decimals (only strip `.`/`,` when followed by groups of 3 digits) | cosmetic | `parseWholeNumber` in `components/admin/ItemForm.js` |
| A6 | A2 — "Copiar número" when clipboard is blocked (plain http over LAN, some in-app browsers) | Nothing happens, no feedback (error is swallowed) | Short message like "No se pudo copiar; anote el número" | cosmetic | `copySinpe` in `components/public/Confirmation.js`. Confirm on a real phone in the manual pass. |
| A7 | B4 — admin cards on 390 px | "Marcar recibida" / "Cancelar" are 40 px tall | ~44 px per the responsive skill | cosmetic | card action buttons in `components/admin/` |
| A8 | Language rule | `/health` page is in English ("Health Check", "Application is running") | Spanish, or accept as internal-only page | cosmetic | `app/health/page.js` |
| A9 | B3 — admin list state | Filters, sort and page aren't in the URL: reload or Back resets to Pendientes, page 1 | Keep state in query string (like `nuttiness`) | cosmetic | `app/admin/(dashboard)/page.js` |
| A10 | A3 — phone typed with country code | `maxLength=10` cuts "+506 8888-7777" while typing; error just says "8 números" | Strip a leading `+506`/`506`, or raise maxLength and let validation explain | cosmetic | `components/public/PledgeForm.js`, `normalizePhone` in `lib/donations.js` |
| A11 | A2 — amount/number format (decision 2026-09-24) | Amounts and counts show a space as thousands separator (`₡24 000`, es-CR `Intl` output) | Dot as thousands separator on screen: `₡24.000`, `1.000` | cosmetic | `formatCRC` / `formatNumber` in `lib/format.js` — build the grouping explicitly (e.g. `es-CR` digits with `.` joiner, or `de-DE`-style grouping) instead of relying on the locale's space. Display only: CSV `Total (₡)` stays a plain integer so Excel treats it as a number. |
| M1 | B3/B4 — scrolling admin pages | The admin header (title, menu, "Cerrar sesión") scrolls away with the content | Header stays fixed at the top; only the main content scrolls | annoying | `app/admin/(dashboard)/layout.js`: make `<header>` `sticky top-0 z-10` (keeps page scroll; check it doesn't cover dialogs/card view on 390 px) |
| M2 | B3 — admin list pagination | Default page size is 25 | Default 10 per page | cosmetic | `DEFAULT_PAGE_SIZE` in `lib/donations.js` (used by `lib/pagination.js`); check any page-size selector options in `components/admin/Pagination.js` include 10 |
| M3 | A2 — "Copiar número" on a phone | Tapping the copy button on mobile does nothing (works on desktop Chrome on Mac) | Number is copied (with the "copiado" feedback), or a clear message if it can't be | annoying | Same root as **A6**: `navigator.clipboard` is missing on non-HTTPS (LAN dev) and some in-app browsers. `copySinpe` in `components/public/Confirmation.js`: add a fallback (hidden textarea + `document.execCommand('copy')`) and the error message; re-test on a real phone over HTTPS (Vercel preview) too |
| M4 | B2 — Artículos form/list | "Orden en la lista" field isn't needed | Remove the field; items ordered by creation date (oldest first) in admin and on the public tabs | cosmetic | `ItemForm.js` (field + validation), `lib/donations.js` (`ORDER BY i.sort_order, i.id` → `i.created_at, i.id`, incl. the pledge-lines `json_agg`; drop `sort_order` from `allowed`/validation). Keep the DB column (no migration needed) or drop it in a new migration. Decided 2026-09-25: oldest first |
| M5 | B2 — Artículos list | "Inactivo" badge is gray; the "Desactivar" button is red | Red "Inactivo" badge | cosmetic | badge classes in `app/admin/(dashboard)/articulos/page.js:38` → `bg-red-50 text-red-700 ring-red-200` |
| M6 | B2 — Artículos list | No way to filter by status | Status filter (Todos / Activos / Inactivos) like on Donaciones | annoying | `app/admin/(dashboard)/articulos/page.js` — reuse the Donaciones status filter pattern; filtering client-side is fine (few items), or add `?active=` to `GET /api/admin/items` |
| M7 | B3 — Donaciones list | "Cancelada" badge is gray; the "Cancelar" button is red | Red "Cancelada" badge | cosmetic | `cancelled` style in `components/admin/StatusBadge.js` |
| M8 | B5 — status changes | "Cancelar" is offered on received donations | Only pending donations can be cancelled; received shows no actions | annoying | **Domain rule change** (approved 2026-09-25): drop `received → cancelled` in `lib/donations.js` (`TRANSITIONS.cancelled: ['pending']`, so the API rejects it too), `canCancel` in `app/admin/(dashboard)/page.js:210`, and update the Status rule in `CLAUDE.md` + phase-2 doc |
| M9 | B3 — Donaciones sort | "Ordenar por Total" isn't needed | Remove the Total sort option (column stays) | cosmetic | drop `sortKey` on the `total_crc` column in `app/admin/(dashboard)/page.js:44` and `total_crc` from the sort whitelist/`columnDefaults` in `lib/donations.js` |

### Notes (not bugs, decide if wanted)
- Admin session cookie is a fixed HMAC of a constant (same as `wife-website`): no expiry and logout can't revoke a copied cookie. Fine for this scale; revisit if the admin is shared more widely.

## Fix log
| Finding # | Cause | Fix | Re-tested |
|---|---|---|---|
| A1 | `middleware.js` returned English `Unauthorized`; admin pages showed `body.error` and kept stale rows | Spanish 401 message ("Su sesión terminó…"); new `lib/admin-fetch.js` (`adminFetch`) redirects to `/admin/login` on 401 — used by every admin page/form | ✅ curl: Spanish 401; redirect checked manually by the user |
| A2 | `<fieldset>` default `min-width: min-content`; long heading word | `min-w-0` on the fieldset, `break-words hyphens-auto` on the `<h1>` | ✅ 390 px frame at 100/175/200 % text: no sideways scroll |
| M1 | Header was in normal flow | `sticky top-0 z-30` on the admin header (dialogs are `z-50`) | ✅ header stays at top after scrolling |
| M3 + A6 | `navigator.clipboard` is missing on plain http (phone → Mac LAN IP) and some in-app browsers; error swallowed | `copyText` in `Confirmation.js`: Clipboard API when available, else hidden-textarea + `execCommand('copy')`; on failure shows "No se pudo copiar. Por favor anote el número." | ✅ user checked on a real phone over LAN http; re-check once on Vercel https |
| M6 | No filter | Estado filter (Todos / Activos / Inactivos) on Artículos, client-side; page clamps when a deactivation empties it | ✅ 6 → 3 active / 3 inactive / 6 |
| M8 | Rule allowed `received → cancelled` | `ALLOWED_FROM.cancelled = ['pending']` in `lib/donations.js`; received rows show "Sin acciones"; `CLAUDE.md`, phase-2 and phase-3 docs updated | ✅ API returns 409 for received → cancelled; no Cancelar on Recibidas |
| A3 | "¿Cómo pagar?" rendered even with no instructions and no SINPE | Shows "Le contactaremos para coordinar el pago." when both are empty | ✅ code review (needs empty settings to see live) |
| A4 | Message asked to reload | "Uno de los artículos ya no está disponible. Revise su promesa y envíela de nuevo." | ✅ code review |
| A5 | `parseWholeNumber` stripped every `.`/`,` | A separator only counts before groups of 3 digits: `8.000` ✓, `1.5`/`2,5` rejected | ✅ new item form: goal `1.5` → error, price `8.000` accepted, nothing saved |
| A7 | `rowButton` was `min-h-10` | `min-h-11` (44 px) | ✅ |
| A8 | English text | `/health` title/text in Spanish ("Estado del sistema") | ✅ |
| A9 | List state only in React state | Donaciones reads status/search/item/sort/order/limit/page from the query string and mirrors changes with `router.replace` (non-defaults only; invalid values fall back) | ✅ opening `?status=all&sort=donor_name&order=asc&page=2` restores Todas, A–Z, page 2 |
| A10 | Only spaces/dashes stripped; `maxLength=10` | New `lib/phone.js` `normalizePhone` (client + server, also SINPE setting): ignores spaces, dashes, dots, brackets and a leading `+506`/`506`/`00506`; `maxLength=16` | ✅ `+506 8888-7777` accepted, 7 digits still rejected |
| A11 | `es-CR` locale groups with a space | `formatCRC`/`formatNumber` group with `.` by hand; CSV untouched | ✅ `₡24.000`, `₡1.234.567` |
| M2 | Default 25 | `DEFAULT_PAGE_SIZE = 10` (API) and both admin lists | ✅ API `limit` 10 |
| M4 | Manual `sort_order` | Field removed from the form and API (`Campo desconocido`); items, public tabs and pledge lines ordered by `created_at, id`. column dropped in `migrations/20260925_drop_items_sort_order.sql`; seed updated | ✅ admin list and public tabs oldest first |
| M5 | Gray badge | `Inactivo` badge red | ✅ |
| M7 | Gray badge | `Cancelada` badge red (`StatusBadge`) | ✅ |
| M9 | Not needed | Total column no longer sortable; `total_crc` removed from the API sort whitelist | ✅ sort select shows Más recientes / Nombre; `?sort=total_crc` → "Orden inválido." |
