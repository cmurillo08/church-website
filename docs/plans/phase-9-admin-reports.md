# Phase 9: Admin reports (progress charts)

## Overview
A **Reportes** page in the admin (`/admin/reportes`) that shows, for each item, how far along it is toward its goal: the goal, the pledges, and what was actually received (the money collected so far).

## Scope

### Included
- Nav link **Reportes** between Artículos and Configuración.
- Active items only. Filter **Artículo**: "Todos" (default) first, then each active item; picking one shows only its card (and the tiles total just that item). Done in the browser.
- Two summary cards for the items shown (colones): Meta + Prometido, and Recibido + Falta por recibir. Meta sums `goal × current price` of items that have a goal.
- One card per item with a ring chart (`components/admin/GoalRing.js`):
  - The full circle is the **goal**; it fills with **received** (darkest), then pledged-but-not-received (medium); the rest is the light track.
  - Center shows `% recibido` and `% prometido` of the goal. Hover (mouse) or tap (touch/keyboard) a ring segment or legend row → the center shows that layer's colones, units and %.
  - Legend under the ring with Meta / Promesas / Recibido in colones and units — this doubles as the table view.
  - Over-goal pledges: the ring is full, percentages go above 100%.
  - Items without a goal: no ring, just Promesas and Recibido numbers.
- Data: `GET /api/admin/items`, whose shared counter query (`queryItemsWithCounters` in `lib/donations.js`) now also returns `received`, `pledged_crc` and `received_crc`.

### Money rules
- Pledged/received colones use each line's own `unit_price_crc` (price at pledge time).
- Goal in colones = `goal_quantity × current unit_price_crc` — an estimate, labelled "al precio actual".
- Received = donations with status `received`; pledged = `pending` + `received` (same rule as the counter).

### Colors
Brand-blue ordinal ramp, validated with the dataviz palette validator on white: goal `#A2B6CF`, pledged `#5379A9`, received `#1E3A5F`.

### Not included
- Date ranges / charts over time, per-donor reports, export of the charts.

## Done when
- `/admin/reportes` shows one card per active item by default; picking an item shows only its card
- Hovering or tapping a segment shows its colones in the center
- Looks right at ~390px (one card per row) and on desktop (3 per row)
- `npm run lint` passes
