# Phase 4: Public donation page

## Overview
Mobile-first public page where members pledge items for the new church building, plus a live "telethon" countdown per item. Donations are **promises**: no online payment. Payment happens afterwards in cash (to a church member) or by SINPE Móvil to the church's number. All donations are shown anonymously.

## Scope

### Included
- Public page `/` (Spanish, colones ₡, ~390px first, large text and buttons for older users)
- **Countdown section**: one tab per active item (expected ≤ 3 at a time). Each tab shows name, goal, pledged, and the big **remaining** number (goal − pledged) that counts down as people donate. Progress bar. Refreshes itself by polling (~10 s); no websockets (Vercel serverless).
- **Pledge form**: name, phone (exactly 8 digits, Costa Rica, no country code or postal code), a "Soy miembro de la iglesia" checkbox (unchecked by default; anyone may donate, this just tells members apart — added after the phase landed, migration `20260925_add_donations_is_member.sql`), then one quantity stepper (− / +) per active item showing unit price and line subtotal, and a running total in ₡. Multiple items per pledge.
- Confirmation screen: thanks + payment instructions (SINPE number and "cash to a church member"), editable text.
- Public APIs return **aggregates only** — never names or phones.

### Not included (later phases)
- Admin screens (items, goals, pledges, statuses, payment settings) — Phase 3
- Online payment, receipts, notifications, English

## Data model
Defined in Phase 2 (`items`, `donations`, `donation_items`, `site_settings`). This phase only reads items/settings and inserts donations.

Also reads `welcome_message` for the page header (motivational phrase / verse), editable in the admin.

## API contract (public, no auth)

### `GET /api/public/items`
Returns only active items, **aggregates only**:
```json
{ "items": [ { "id": 1, "name": "Saco de cemento", "unit_price_crc": 8000, "goal_quantity": 100, "pledged": 37, "remaining": 63 } ],
  "settings": { "welcome_message": "...", "payment_instructions": "...", "sinpe_number": "..." } }
```
`remaining` is `null` when the item has no goal. Send `Cache-Control: no-store` (or a very short `s-maxage`) so the countdown is fresh. The page polls this every ~10 s and pauses polling while the tab is hidden (`document.visibilityState`).

### `POST /api/public/donations`
Request:
```json
{ "client_token": "<uuid generated when the form loads>", "donor_name": "María Pérez", "donor_phone": "88887777", "is_member": true,
  "lines": [ { "item_id": 1, "quantity": 3 }, { "item_id": 2, "quantity": 2 } ] }
```
Server rules (never trust the client for money):
- Trim name (1–100 chars); phone: strip spaces/dashes, must then match `^[0-9]{8}$`; `is_member` must be a boolean if sent (defaults to `false`)
- 1–10 lines; each `quantity` an integer 1–9999; no duplicate `item_id`; every item must exist and be **active**
- `unit_price_crc` and `total_crc` are **computed on the server** from `items` at insert time, inside one transaction (`runTransaction`) that inserts `donations` then `donation_items`
- Response `201 { "ok": true, "total_crc": 40000 }`; validation failures `400 { "error": "..." , "field": "donor_phone" }` in plain Spanish

### Double-submit protection
1. The browser generates `client_token` (`crypto.randomUUID()`) when the form mounts and reuses it for retries; a new token is generated only after a successful pledge.
2. The button is disabled while the request is in flight.
3. `INSERT ... ON CONFLICT (client_token) DO NOTHING`: if the token already exists, return the same `201` for the existing donation instead of creating a second one.

### Abuse limits (public endpoint)
Keep it light: the limits above, a hidden honeypot field (reject if filled), and a simple per-IP rate limit if spam shows up during testing (Phase 6). No captcha for now — it would hurt older users.

## Decisions (confirmed)
1. The counter drops when the donor **reports the pledge**, not when payment arrives.
2. Over-goal donations are **allowed**. Quantity is not capped; if pledged exceeds the goal, remaining shows 0 (and the UI can say the goal was reached). The admin can raise `goal_quantity` later (e.g. 1000 → 1500) and the counter picks it up.
3. Payment instructions text **and** the SINPE number are separate `site_settings` keys, both editable by the admin (admin UI is Phase 3; the migration itself belongs to Phase 2).

## Done when
- Pledging on a phone-size viewport writes `donations` + `donation_items` and the countdown updates on other open devices within ~10 s
- Validation rejects phones that are not 8 digits and empty pledges
- No endpoint exposes donor names or phones
- `npm run lint` and `npm run build` pass
