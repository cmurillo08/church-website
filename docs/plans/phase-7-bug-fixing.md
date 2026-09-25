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

### Notes (not bugs, decide if wanted)
- Admin session cookie is a fixed HMAC of a constant (same as `wife-website`): no expiry and logout can't revoke a copied cookie. Fine for this scale; revisit if the admin is shared more widely.

## Fix log
| Finding # | Cause | Fix | Re-tested |
|---|---|---|---|
|   |   |   |   |
