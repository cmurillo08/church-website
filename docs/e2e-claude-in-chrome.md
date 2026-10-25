# E2E testing with Claude in Chrome

A reusable recipe for having Claude Code drive a real Chrome browser to test a web app. First used for church-website Phase 6a (`docs/plans/phase-6a-automated-testing.md`). Copy this file into a new project and adapt the project-specific bits (port, routes, test-data prefix).

## What it is
**Claude in Chrome** is a Chrome extension that lets Claude Code control your own Chrome: open tabs, click, type, take screenshots, read the DOM, console and network requests, and run JS in the page. It uses your real browser profile, so existing logins work.

## One-time setup (per machine)
1. Install the **Claude** extension (Claude in Chrome) from the Chrome Web Store and sign in with the same claude.ai account Claude Code uses.
2. In Claude Code, run `/chrome` to check the connection and enable it (or start a session with `claude --chrome`). Once it's enabled, every project can use it.
3. **Site permissions:** the extension asks for permission per site. Allow `localhost:<port>` for local dev, and the production domain if you'll test there.
4. Keep Chrome open with the extension connected during the session.

If something doesn't connect, `/chrome` shows what's missing. Menu names may change between versions.

## How to ask Claude
Plain language is enough. Name the tool, the target and where to record results:

> "Use Claude in Chrome to test the checkout flow on localhost:3000 at 390px. Log bugs in docs/plans/phase-N-bug-fixing.md."

Works best when there is a **written checklist** (e.g. a manual-testing phase doc). Claude runs it item by item, marks each one, and the cycle can be repeated later.

## Recommended structure
- **Checklist doc** (`phase-N-manual-testing.md`): what to verify, grouped by area (public, admin, API, edge cases).
- **Automated-testing doc** (`phase-Na-automated-testing.md`): how the cycles run, what each one covered, results table (✅ / ❌ / 👤 = left for manual).
- **Findings table** in the bug-fixing doc: automated findings as `A1, A2, …`, manual ones as `M1, M2, …`.
- **Cycles:**
  1. Full sweep of every checklist item at phone width and desktop.
  2. After fixes: regression and confirmation of each `A*` finding.
  3. Optional: a smoke pass against production after deployment.

## How the testing is done
- **UI:** real clicks/typing for things that matter (happy path, double-tap, confirm dialogs); DOM events for bulk validation cases.
- **API:** `fetch` from the page for validation, status transitions, auth, concurrency, idempotency.
- **DB state:** verified with a throwaway Node query script using the project's DB helper, deleted afterwards.
- **Test data:** prefix everything (e.g. `QA C1 …`, `QA C2 …`) so it's easy to find and clean up. Record leftover test data in a Cleanup section.

## Gotchas (learned the hard way)
- **Phone viewport:** the Chrome window can't be resized below its minimum width. Use a temporary **static** page, e.g. `public/qa-harness.html`, with the public page in a 390px `<iframe>` next to the admin in a wide one. It must be a static file: a page built with `document.write` gets wiped by Next.js Fast Refresh. **Delete the harness afterwards** and don't commit it.
- **Hidden tab:** when Chrome isn't the front window, `document.visibilityState` is `hidden`. Pages that pause polling on hidden tabs will look "frozen". Bring Chrome to the front or override `visibilityState` in the frame for live-update tests.
- **Blocked JS output:** `javascript_tool` results are replaced with `[BLOCKED: Cookie/query string data]` when they contain URLs with query strings or headers like `content-disposition`. Keep outputs short, or verify with `curl` / the DB instead.
- **Passwords:** Claude doesn't type passwords into the browser. Log in yourself first and Claude reuses the session. Correct-credential login and "Back after logout" stay manual.
- **Browser dialogs:** native `alert`/`confirm` block the extension until dismissed by hand. Warn before clicking buttons that trigger them; prefer custom in-page dialogs.
- **Dev server:** if you already run the dev server, tell Claude not to start a second one or delete/build `.next` (they share the cache). `npm run build` is run later with the dev server stopped.
- **Don't let it loop:** if a browser action fails 2–3 times, Claude should stop and ask rather than keep retrying.

## What stays manual
Automated browser passes don't replace:
- Real phones (iPhone Safari, Android Chrome), large system font, copy-to-clipboard.
- Opening exported files in their real app (e.g. CSV in Excel: accents, phone numbers not reformatted).
- Network throttling (DevTools "Slow 3G").
- Login/logout with real credentials and the Back button.
- A wording read-through as the real audience would read it.

## Checklist for a new project
- [ ] Extension installed, signed in, `/chrome` shows connected
- [ ] `localhost:<port>` allowed in the extension
- [ ] Checklist doc written
- [ ] Logged into the admin in Chrome (if any)
- [ ] Test-data prefix chosen
- [ ] Note in memory/CLAUDE.md: dev-server and `.next` constraints
- [ ] After testing: harness deleted, test data cleaned or listed
