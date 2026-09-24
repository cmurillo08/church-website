# CLAUDE.md — church-website

## What this is
A donation-tracking web app for our church's building fund (new church building). Built one phase at a time with Claude Code, same workflow as `wife-website`.

## Stack
- Next.js (App Router), plain JavaScript, Tailwind CSS v4
- Sibling reference project: `../wife-website` (same setup and conventions)
- Backing store / auth / hosting: not decided yet — to be settled in later phases

## Where things live
- `docs/plans/README.md` — **progress tracker**. Check this first in any new session.
- `docs/plans/phase-N-*.md` — one self-contained doc per phase.

## Conventions
- No TypeScript, no Prettier.
- Mobile-first: design and test at ~390px before desktop.
- Build one phase at a time, in order; ask before inventing scope beyond the current phase doc.
