# Phase 1: Setup & Health Check

## Scope
### Included
- Next.js (App Router, JS), Tailwind v4, ESLint flat config, `.nvmrc` 24 — mirrors `wife-website`
- `/` placeholder home page
- `/health` page and `/api/health` JSON endpoint

### Not included
- Database, auth, donations, admin, deployment — later phases

## Done when
- `npm run lint` and `npm run build` pass
- `npm run dev` serves `/health` and `/api/health` (`{"status":"ok",...}`)
