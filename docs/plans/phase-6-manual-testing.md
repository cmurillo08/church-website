# Phase 6: Manual testing guide

## Overview
A checklist for **you** to run by hand, first as a donor and then as the administrator, before deploying. Each scenario has steps and the expected result. Mark `[x]` when it passes; when it fails, add a row (`M1`, `M2`, …) to the **Findings** table in [phase-7-bug-fixing.md](phase-7-bug-fixing.md).

The automated cycles ([phase-6a-automated-testing.md](phase-6a-automated-testing.md)) already covered most of this list — its **Left for the manual pass** section is the priority; the rest is a quick confirmation.

## Setup
1. `nvm use` (Node 24), `npm run migrate`, `npm run dev` → http://localhost:3000
2. Local `.env` has `APP_USERNAME`/`APP_PASSWORD`; admin lives at `/admin`.
3. Create test data in the admin first: 3 items, e.g. *Saco de cemento* ₡8.000 (meta 100), *Lámina de zinc* ₡6.500 (meta 1000), *Bloque* ₡900 (sin meta).
4. Test on a phone-size viewport (~390px, browser dev tools) **and** on desktop. If possible, also on a real phone on the same Wi-Fi.
5. Use two browser windows for the live-counter tests (one public, one admin).

## A. Donor (public page)

### A1. Page loads
- [x] Welcome message/verse shows in the header (text from Configuración)
- [x] One tab per active item; inactive items don't appear
- [x] Each tab shows the goal, the pledged amount and the big "remaining" number
- [x] Item without a goal shows no countdown (no broken/NaN numbers)
- [x] No horizontal scroll at 390px; text and buttons are large and easy to tap

### A2. Pledge — happy path
- [x] Enter name and an 8-digit phone (e.g. 88887777)
- [x] Pick 3 sacos de cemento with the + button → line subtotal ₡24.000 and running total update
- [x] Add 2 láminas de zinc in the same pledge → total is the sum
- [x] The − button never goes below 0
- [x] Confirm → thank-you screen with the payment instructions and SINPE number from Configuración
- [x] Amounts are shown in colones with thousands separators

### A3. Validation
- [x] Empty name → clear error message, nothing saved
- [x] Phone with 7 or 9 digits, letters, spaces or dashes → clear error (or is handled sensibly, e.g. spaces/dashes stripped)
- [x] All quantities at 0 → cannot confirm
- [x] Very large quantity (e.g. 99999) → accepted or limited sensibly, no layout break
- [x] Double-tapping "Confirmar" creates only **one** donation
- [x] Error messages are in simple Spanish an older person understands

### A4. Live countdown
- [x] With the public page open, create a pledge from another window → the remaining number drops within ~10 s without reloading
- [x] Cancel that pledge in the admin → the number goes back up on the public page
- [x] Pledge more than the remaining units → allowed; remaining shows 0 (never negative) and the goal-reached state looks right
- [x] Raise the goal in the admin (e.g. 1000 → 1500) → public remaining increases accordingly

### A5. Privacy
- [x] Nowhere on the public page (or its network responses, check dev tools → Network) do donor names or phones appear
- [x] `/admin` and `/api/admin/*` are not reachable without logging in

### A6. Other
- [x] Reloading the page keeps the selected tab sensible
- [x] Works with the phone's larger font size / zoom
- [x] Slow network (throttle to "Slow 3G") → page still usable, no double submission

## B. Administrator

### B1. Login
- [x] `/admin` without a session redirects to `/admin/login`
- [x] Wrong password → inline error, no session
- [x] Correct credentials → lands on Donaciones
- [x] Log out → back to login; browser Back button doesn't show admin data
- [x] Opening `/api/admin/donations` directly while logged out returns 401

### B2. Artículos
- [x] Table shows name, price, goal, pledged, remaining, active
- [x] Create an item; it shows in the table and on the public page
- [x] Empty name, price 0 or negative, non-numeric goal → validation errors
- [x] Edit the goal → public remaining updates
- [x] Edit the price → **old** pledges keep their old price and total, **new** pledges use the new price
- [x] Deactivate an item → disappears from the public page; existing pledges are untouched and still visible in the admin
- [x] An item with pledges cannot be deleted (deactivate instead)

### B3. Donaciones list
- [x] Default view shows only **Pendiente**
- [x] Filter by status (Recibida, Cancelada, Todas)
- [x] Filter by item (e.g. only people who pledged *Lámina de zinc*)
- [x] Search by part of a name and by phone number
- [x] Combining filters works; changing a filter resets to page 1
- [x] Sorting by date, name and total works in both directions
- [x] Pagination: create > 25 pledges (or set per-page to 10) → Next/Previous, "Mostrando X a Y de Z" are correct; last page is correct
- [x] Empty result shows a friendly "no hay donaciones" message

### B4. Donaciones list — mobile
- [x] At 390px the list renders as **cards**, not a table
- [x] Filters are on top, pagination controls at the bottom, no horizontal scroll
- [x] Buttons (Marcar recibida / Cancelar) are big enough to tap comfortably
- [x] On desktop it's a table with sortable headers

### B5. Status changes
- [x] Marcar recibida → moves out of the Pendiente filter, shows as Recibida; public counter does **not** change
- [x] Cancelar asks for confirmation; after confirming, the pledge shows as Cancelada and its units return to the public counter
- [x] A cancelled pledge cannot be edited or reactivated
- [x] A received pledge can still be cancelled (if that's what we want) — confirm the behavior feels right
- [x] Nothing in the UI lets the admin edit a pledge's contents

### B6. Configuración
- [x] Change the welcome message → shows on the public page
- [x] Change the payment instructions and SINPE number → shown on the next thank-you screen
- [x] Very long text and special characters (tildes, ñ, quotes, emoji) save and display correctly
- [x] Clearing a field doesn't break the public page

### B7. CSV export (Phase 5)
- [x] With filters "Pendiente" + one item, the export contains only those people
- [x] Ignores pagination (exports all matching rows, not just page 1)
- [x] Opens in Excel with tildes intact; phone numbers not reformatted
- [x] Filename is descriptive; export requires login

## C. Cross-cutting
- [x] Two people pledging at nearly the same time both get saved and the counter reflects both
- [x] Browser Back/Forward and page reload never create duplicate pledges
- [x] Console has no errors on any page; no failed network requests
- [ ] `npm run lint` and `npm run build` pass
- [x] Works in Safari on iPhone and Chrome on Android (the two most likely donor browsers)

## D. After deployment (repeat quickly on the Vercel URL)
- [ ] Public page loads, pledge saves to Neon, countdown updates
- [ ] Admin login works, `/admin` blocked when logged out
- [ ] Env vars are set on Vercel (`DATABASE_URL`, `PGSCHEMA`, `PGSSLMODE`, `APP_*`, `SESSION_SECRET`)

## Findings
Recorded in [phase-7-bug-fixing.md](phase-7-bug-fixing.md#findings).
