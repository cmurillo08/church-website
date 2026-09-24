# Build Progress

One row per phase. Update **Status** as work lands — first thing to check in a new session.

| Phase | Doc | Status | Notes |
|---|---|---|---|
| 1 — Setup & health check | [phase-1-setup-health-check.md](phase-1-setup-health-check.md) | ✅ Done | Next.js + Tailwind scaffold, `/health` page and `/api/health` endpoint. |
| 2 — Foundation & data model | [phase-2-foundation-data-model.md](phase-2-foundation-data-model.md) | ✅ Done | Migration `20260924_create_donation_tables.sql`; shared helpers in `lib/donations.js` (counters, create/list donations, status changes, settings); `npm run seed` for local demo data. |
| 3 — Admin | [phase-3-admin.md](phase-3-admin.md) | ✅ Done | Donaciones (filters, server-side sort/pagination, newest first by default, no date column, cards on mobile), Artículos (create/edit/deactivate), Configuración; `/api/admin/{donations,items,settings}`; item helpers added to `lib/donations.js`; shared list components in `components/admin/`. Admin UI (login/logout too) fully Spanish. `next.config.mjs` allows LAN dev origins for phone testing. |
| 4 — Public donation page | [phase-4-public-donation-page.md](phase-4-public-donation-page.md) | ⬜ Planned | Pledge form + live countdown per item. Decisions confirmed. |
| 5 — CSV reports | [phase-5-csv-reports.md](phase-5-csv-reports.md) | ⬜ Planned | Export filtered donations (e.g. pending for one item) to CSV for manual reminders. |
| 6 — Manual testing | [phase-6-manual-testing.md](phase-6-manual-testing.md) | ⬜ Planned | Checklist to run by hand as donor and admin; record problems in its Findings table. |
| 7 — Bug fixing | [phase-7-bug-fixing.md](phase-7-bug-fixing.md) | ⬜ Planned | Fix what Phase 6 found, by severity. |
| 8 — Deployment & polish | [phase-8-deployment.md](phase-8-deployment.md) | ⬜ Planned | Neon DB, smoke test, Vercel deploy, env vars, final polish; re-test with section D of Phase 6. |
| — | [deferred-whatsapp-reminders.md](deferred-whatsapp-reminders.md) | 🚫 Deferred | Automated WhatsApp reminders; manual via CSV for now. |

## Status legend
- ⬜ Not started
- 🟡 In progress
- ✅ Done
- 🚫 Deferred
