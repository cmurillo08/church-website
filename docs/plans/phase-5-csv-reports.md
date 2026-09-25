# Phase 5: CSV reports

## Overview
Let the administrator export a list of donations as a CSV file that opens in Excel — mainly to get the names and phone numbers of people with **pending** pledges for a given item and remind them manually (e.g. "everyone pending for sacos de cemento").

## Scope

### Included
- **Exportar CSV** button on the admin Donaciones list (Phase 3). It exports exactly what the current filters select — status, item, search — across **all** matching rows, not just the current page.
- `GET /api/admin/donations/export` — same filter params as the list endpoint, no `limit`/`offset`; responds with `text/csv` and a `Content-Disposition` filename such as `donaciones-pendientes-saco-de-cemento-2026-09-24.csv`. Behind the existing admin auth.
- Columns: nombre, teléfono, miembro (Sí/No), artículos, total, estado, fecha.
  - **One row per donation**, like the admin list: a pledge with several items is one row, with its items in one cell ("3 × Saco de cemento, 2 × Lámina de zinc") and the donation total. A person who made two separate pledges appears twice.
  - The item filter selects donations that include that item; the row still lists all of the donation's items, since the total to remind about covers all of them.
- Excel compatibility: UTF-8 with BOM (accents like "láminas" display correctly), comma separator, proper quoting, phone written as text so nothing is reformatted or loses leading digits, CSV-injection guard (prefix `'` to cells starting with `=`, `+`, `-`, `@`).

### Not included
- Sending messages (see `deferred-whatsapp-reminders.md`)
- PDF or native .xlsx export, scheduled reports, charts

## Done when
- With filters "pendiente" + "saco de cemento", the downloaded file lists only those people and phones, opens correctly in Excel with accents intact
- The export ignores pagination and returns every matching row
- Unauthenticated requests to the export endpoint are rejected
- `npm run lint` and `npm run build` pass
