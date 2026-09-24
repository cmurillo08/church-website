# CLAUDE.md — church-website

## What this is
A donation-pledge web app for our church's building fund (new church building). Donors (mostly on phones, from young people to older adults) pledge items — e.g. sacks of cement, zinc sheets — and a live "telethon" countdown shows how many units remain toward each item's goal. Pledges are **promises**: payment happens later, in cash to a church member or by SINPE Móvil. Built one phase at a time with Claude Code, same workflow as `wife-website`.

## Stack
- Next.js (App Router), plain JavaScript, Tailwind CSS v4
- **Neon (Postgres) is the only backing store**, schema `church_donations` (local dev shares the `personal_projects` database with sibling projects, same schema name for parity)
- Deployed on Vercel
- Admin at `/admin` behind a shared-credential login (`APP_USERNAME`/`APP_PASSWORD`, HMAC-signed cookie, `middleware.js`) — same as `wife-website`. The public page needs no login.
- Sibling reference projects: `../wife-website` (auth, `lib/db.js`, migrations) and `../nuttiness` (list pages: pagination, filters, sorting, card view on mobile — `components/EntityTable.jsx`, `components/Pagination.jsx`, `lib/pagination.js`, `lib/sorting.js`)

## Where things live
- `docs/plans/README.md` — **progress tracker**. Check this first in any new session, then read the current phase doc; each is self-contained (SQL, endpoint contracts, done-when).
- `docs/plans/phase-N-*.md` — one doc per phase (2 data model → 3 admin → 4 public page → 5 CSV reports → 6 manual testing → 7 bug fixing → 8 deployment). `deferred-*.md` = designed but not scheduled.
- `migrations/` — timestamped `.sql` files, one per schema change; apply with `npm run migrate` (`scripts/migrate.js`).
- `lib/db.js` — Postgres pool + query helpers; `lib/auth-constants.js` + `middleware.js` — admin auth.
- `.env` — local config (git-ignored); `.env.example` documents every variable.
- `.claude/skills/responsive-tailwind-design/` — mobile-first Tailwind rules; follow it for every page/component.

## Domain rules (do not re-derive differently in another place)
- Counter: `pledged` = units in donations with status `pending` or `received`; `remaining = max(goal − pledged, 0)`; goal `NULL` = no countdown. It drops when a pledge is **reported**, and cancelling returns the units. Over-goal pledges are allowed. One shared query in `lib/donations.js`.
- Status is on the whole donation: `pending → received`, `pending → cancelled`, `received → cancelled`; `cancelled` is final. Pledges are never editable, only their status changes.
- Each pledge line stores its own `unit_price_crc` at pledge time; price edits only affect new pledges. Totals are always computed server-side.
- Donations are anonymous **publicly** — public endpoints return aggregates only, never names or phones. Admin sees them.
- Currency is colones (₡), integers. Phone is 8 digits (Costa Rica). UI is Spanish, with simple wording.

## Conventions
- No TypeScript, no Prettier.
- Mobile-first: design and test at ~390px before desktop; admin lists are cards on mobile, tables on `lg`.
- Build one phase at a time, in order; ask before inventing scope beyond the current phase doc. Update the tracker when a phase lands.
- Local Node is pinned to 24 via `.nvmrc` (`nvm use`).

## If something is missing
- No phase doc for what you're being asked to build → check `docs/plans/` for a deferred doc first; if genuinely absent, ask before inventing scope.
- `DATABASE_URL` empty locally is normal (falls back to `PG*` vars); on Vercel it must be the Neon connection string with `PGSSLMODE=require` and `PGSCHEMA=church_donations`.
