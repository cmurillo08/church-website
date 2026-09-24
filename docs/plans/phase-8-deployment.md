# Phase 8: Deployment (Neon + Vercel) & polish

## Overview
Put the app online: a Neon Postgres database holding schema `church_donations`, and the Next.js app on Vercel at the default `*.vercel.app` URL. Adapted from `nuttiness/docs/plans/phase-11-vercel-deployment.md` and the setup used for `wife-website`. Do this **after** Phases 6–7 pass locally.

Three stages, validated in order — don't start Vercel until Stage B passes.

## Stage A — Neon database
1. Create a Neon project (or reuse the account used for `wife-website`; this project gets **its own** project/database). Pick the region closest to Costa Rica users (e.g. `us-east`).
2. Copy the connection string. Neon offers two: **direct** and **pooled** (`-pooler` in the host).
   - ⚠️ `lib/db.js` selects the schema through the connection startup option `-c search_path=church_donations,public`. Neon's pooled (PgBouncer) endpoint **does not support startup options** — use the **direct** connection string, or, if pooling is needed, change `lib/db.js` to run `SET search_path` per client instead. Verify in Stage B rather than assuming.
3. Create the schema once (the migrate script does not create it):
   ```sql
   CREATE SCHEMA IF NOT EXISTS church_donations;
   ```
   (Neon SQL editor or `psql "$DATABASE_URL" -c 'CREATE SCHEMA IF NOT EXISTS church_donations;'`)
4. Apply migrations against Neon from your machine:
   ```bash
   DATABASE_URL="postgresql://…?sslmode=require" PGSCHEMA=church_donations PGSSLMODE=require npm run migrate
   ```
5. Verify tables exist: `\dt church_donations.*`, and that `site_settings` has the 3 seeded keys.
6. Do **not** run `npm run seed` on Neon (dev-only demo data). Real items are created from the admin.

## Stage B — Local app → Neon smoke test
Point the local `.env` at Neon (keep a copy of the local values) and run `npm run dev`.
- [ ] `/health` and the public page load; items created from the admin appear
- [ ] Admin login works; create an item, make a pledge, change its status
- [ ] No `localhost`/local-only assumptions; SSL connects (`PGSSLMODE=require`)
- [ ] Re-running `npm run migrate` says "No pending migrations"
- [ ] Schema resolves correctly (queries hit `church_donations`, not `public`) — this is the pooled-vs-direct check from Stage A
Then restore the local `.env`.

## Stage C — Vercel
Pre-deploy checklist:
- [ ] `npm run lint` and `npm run build` pass locally
- [ ] `.env` is git-ignored; no secrets in the repo (`git log -p` check)
- [ ] `.nvmrc`/`engines` say Node 24 (Vercel picks it up from `engines`)
- [ ] Repo pushed to GitHub

Steps:
1. Vercel → **Add New Project** → import the `church-website` repo (Framework: Next.js, auto-detected).
2. Set environment variables (Production, and Preview if you use previews):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon connection string (direct, includes `sslmode=require`) |
| `PGSCHEMA` | `church_donations` |
| `PGSSLMODE` | `require` |
| `APP_USERNAME` | admin username |
| `APP_PASSWORD` | admin password (compared as plain text with `timingSafeEqual`, **not** a bcrypt hash — unlike the `nuttiness` doc) |
| `SESSION_SECRET` | new value from `openssl rand -hex 32`, different from local |
| `NODE_ENV` | (Vercel sets it) |

3. Deploy (Vercel runs `npm run build`).
4. Run the "D. After deployment" section of `phase-6-manual-testing.md` on the production URL.
5. Share the URL with the pastor/admin; give them the admin credentials over a private channel.

## Polish (final pass)
- Real church name/colors: swap the placeholder palette in `tailwind.config.mjs`, and the `<title>`/metadata in `app/layout.js`
- Favicon and a share preview (Open Graph title/description) so the link looks good when sent by WhatsApp
- Replace the placeholder welcome message and payment text with the real ones via Configuración, and fill in the SINPE number
- Custom domain: optional, later (Vercel → Domains)
- Backups: Neon keeps point-in-time history on the free tier for a short window; optionally export the `church_donations` schema with `pg_dump` before the campaign starts

## Potential issues
- **Cold starts / connections:** one shared `pg` Pool in `lib/db.js` (already the case); keep the pool small on serverless.
- **Polling load:** the public countdown polls every ~10 s per open tab; if traffic grows, add a short `s-maxage` cache on `GET /api/public/items`.
- **Cookie:** `secure` is set when `NODE_ENV=production`, which Vercel provides — same-domain, so no other changes.
- **Rotating credentials:** changing `APP_PASSWORD` or `SESSION_SECRET` in Vercel requires a redeploy; changing `SESSION_SECRET` logs everyone out.

## Done when
- Neon has the `church_donations` schema with all migrations applied and no demo data
- The Vercel URL serves the public page; a real pledge from a phone lands in Neon and the countdown moves
- Admin login works in production and `/admin` is blocked when logged out
- Section D of the Phase 6 checklist passes
- No credentials or secrets are committed
