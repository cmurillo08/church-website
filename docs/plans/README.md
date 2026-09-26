# Build Progress

One row per phase. Update **Status** as work lands — first thing to check in a new session.

| Phase | Doc | Status | Notes |
|---|---|---|---|
| 1 — Setup & health check | [phase-1-setup-health-check.md](phase-1-setup-health-check.md) | ✅ Done | Next.js + Tailwind scaffold, `/health` page and `/api/health` endpoint. |
| 2 — Foundation & data model | [phase-2-foundation-data-model.md](phase-2-foundation-data-model.md) | ✅ Done | Migration `20260924_create_donation_tables.sql`; shared helpers in `lib/donations.js` (counters, create/list donations, status changes, settings); `npm run seed` for local demo data. |
| 3 — Admin | [phase-3-admin.md](phase-3-admin.md) | ✅ Done | Donaciones (filters, server-side sort/pagination, newest first by default, no date column, cards on mobile), Artículos (create/edit/deactivate), Configuración; `/api/admin/{donations,items,settings}`; item helpers added to `lib/donations.js`; shared list components in `components/admin/`. Admin UI (login/logout too) fully Spanish. `next.config.mjs` allows LAN dev origins for phone testing. |
| 4 — Public donation page | [phase-4-public-donation-page.md](phase-4-public-donation-page.md) | ✅ Done | `/` = countdown tabs (big "Faltan" number, progress bar, polls `/api/public/items` every 10 s, paused while hidden) + pledge form (steppers, running total, honeypot) + confirmation with payment instructions/SINPE copy button. `GET /api/public/items` (aggregates only, `no-store`) via `getPublicSnapshot()`; `POST /api/public/donations` wraps `createDonation`. Double-tap guarded with refs (sync in-flight flag + reused token). Components in `components/public/`. Later addition: "Soy miembro de la iglesia" checkbox → `donations.is_member` (migration `20260925_…`), shown in the admin list and CSV. |
| 5 — CSV reports | [phase-5-csv-reports.md](phase-5-csv-reports.md) | ✅ Done | "Exportar CSV" on Donaciones → `GET /api/admin/donations/export` (same filters/order as the list, no pagination, one row per donation with its items in one cell). `listDonationsForExport` in `lib/donations.js`, `lib/csv.js` (BOM, quoting, formula guard, phone as `="…"` text). Sort options shared via `DONATION_SORT_OPTIONS`. |
| 6 — Manual testing | [phase-6-manual-testing.md](phase-6-manual-testing.md) | ✅ Done | Checklist run by hand as donor and admin (2026-09-25); 9 findings (M1–M9) logged in Phase 7. |
| 6a — Automated testing | [phase-6a-automated-testing.md](phase-6a-automated-testing.md) | ✅ Done | Two Claude-in-Chrome cycles over the Phase 6 checklist (2026-09-24): 11 findings (A1–A11, 2 annoying, 9 cosmetic) logged in Phase 7; list of manual-only checks. |
| 7 — Bug fixing | [phase-7-bug-fixing.md](phase-7-bug-fixing.md) | ✅ Done | All 20 findings (A1–A11, M1–M9) fixed and re-tested (2026-09-25). Rule change: only pending donations can be cancelled. Re-check "Copiar número" on a phone once deployed (https). |
| 8 — Deployment & polish | [phase-8-deployment.md](phase-8-deployment.md) | 🟡 In progress | Stage A done (2026-09-25): Neon `church_donations`, 3 migrations, direct (non-pooler) URL, no seed data. Stage B smoke test passed against Neon (search_path startup option works on the direct endpoint). Polish: `app/icon.svg` favicon, `app/opengraph-image.js` share card, Open Graph metadata; name/palette kept as placeholders. Pending: Vercel import + env vars, section D of Phase 6. |
| — | [deferred-whatsapp-reminders.md](deferred-whatsapp-reminders.md) | 🚫 Deferred | Automated WhatsApp reminders; manual via CSV for now. |

## Status legend
- ⬜ Not started
- 🟡 In progress
- ✅ Done
- 🚫 Deferred
