# Phase 6a: Automated testing (Claude in Chrome)

## Overview
Two automated passes over the Phase 6 checklist, run by Claude Code driving Chrome (Claude in Chrome extension) against the local dev server, **before** the manual pass. Goal: catch what a script can catch so the manual pass (Phase 6) can focus on what only a person can judge (real phones, Excel, feel of the wording).

- Problems found go to the **Findings** table in [phase-7-bug-fixing.md](phase-7-bug-fixing.md) (numbered `A1`, `A2`, … for automated; manual findings continue there as `M1`, `M2`, …).
- This doc records *how* the cycles run and *what* they covered, so they can be repeated after Phase 7 fixes and again after deployment.

## How the cycles run
1. Dev server already running on :3000 (don't start a second one or touch `.next` — see memory note). Chrome with the Claude extension connected.
2. **Phone viewport:** the Chrome window can't be resized below its minimum, so a temporary static page `public/qa-harness.html` loads `/` in a 390px-wide iframe next to `/admin` in a wide iframe. Static on purpose: a page injected with `document.write` gets wiped by Next's Fast Refresh. **Delete the harness after testing** (it's not committed).
3. **Hidden tab caveat:** when the Chrome window isn't in front, `document.visibilityState` is `hidden` and the public page correctly pauses polling. For the live-counter tests either bring Chrome to the front or override `visibilityState` in the frame.
4. **UI** is driven with real clicks/typing where it matters (happy path, double-tap, confirm dialogs) and with DOM events for bulk validation cases. **API** cases (validation, status transitions, auth, concurrency, idempotency) use `fetch` from the page. DB state is verified with a throwaway Node query script (`lib/db.js`), deleted afterwards.
5. Test data is prefixed `QA C1 …` / `QA C2 …` so it's easy to spot and clean up.
6. Claude never types the admin password into the browser (the existing session is reused). Login with correct credentials and the Back-after-logout check stay manual.

### Cycle 1 — full sweep
Every Phase 6 item in sections A, B, C, at 390px (harness) and desktop.

### Cycle 2 — regression + confirmation
Top-level pages at desktop with console + network capture on (Cycle 1's iframes hide console output), happy path again with real typing/clicks, Back/Forward/reload after a pledge, mark-received with real clicks, and a re-run of each Cycle 1 finding to confirm it reproduces.

## Results (2026-09-24, local)

Legend: ✅ pass · ❌ finding (see Phase 7) · 👤 manual only · ➖ partial, finish manually

### A. Donor
| Item | Result | Notes |
|---|---|---|
| A1 welcome, tabs, goal/pledged/remaining, no-goal item, no h-scroll at 390 | ✅ | No-goal item shows "Prometidos hasta ahora", no NaN. Inactive items hidden. |
| A2 steppers, subtotals, total, − stops at 0, thank-you, ₡ format | ✅ | Thousands separator is a space (`₡24 000`); decided: use a dot (`₡24.000`) → A11. |
| A2 SINPE number on thank-you | ✅ | Shown when set; hidden when empty (it was empty in local settings). Copy button → 👤 (clipboard blocked in iframe; see A6 finding). |
| A3 empty name / bad phone / no items | ✅ | Client and server both reject, in simple Spanish. Spaces and dashes stripped. |
| A3 99999 | ✅ | Clamped to 9999 client-side, rejected server-side; no layout break with ₡79 992 000. |
| A3 double-tap Confirmar | ✅ | Double-click + extra click → 1 donation. |
| A4 live drop / cancel returns units | ✅ | Drop seen in ~1 s (poll), cancel returned units in ~3 s. |
| A4 over-goal | ✅ | Allowed; shows "¡Meta alcanzada!" and 0, never negative. |
| A4 raise goal | ✅ | 60 → 100 reflected on public page. |
| A5 privacy | ✅ | `/api/public/items` and page HTML contain no names/phones; all `/api/admin/*` → 401 without session; `/admin/*` → redirect to login. |
| A6 reload keeps tab | ✅ | Resets to first tab — sensible. |
| A6 larger font | ❌ A2 | OK up to 150 %; horizontal scroll from 175 %. |
| A6 slow network | ✅ | Simulated 4 s latency: button disabled ("Enviando…"), 1 donation. Lost-response retry reuses token → still 1 donation. Real "Slow 3G" throttle → 👤. |

### B. Admin
| Item | Result | Notes |
|---|---|---|
| B1 redirect / 401 when logged out | ✅ | curl + cookie-less fetch. |
| B1 wrong password | ✅ | API 401; page maps it to "Usuario o contraseña incorrectos." |
| B1 correct login, logout, Back after logout | 👤 | Claude doesn't enter passwords. Logout endpoint clears the cookie (curl). |
| B1 session lost mid-use | ❌ A1 | English "Unauthorized", no redirect. |
| B2 table, create, validation, edit goal, deactivate, no delete | ✅ | No DELETE endpoint exists (405). Deactivate dialog clear; existing pledges untouched. |
| B2 price change keeps old pledge prices | ✅ | Verified in DB: old line ₡8 000, new line ₡9 000. |
| B2 numeric parsing | ❌ A5 | `1.5` / `2,5` saved as 15 / 25. |
| B3 filters, search (accent-insensitive, by phone), combine, page reset, sort both ways, pagination, empty message | ✅ | |
| B4 cards at 390, filters top, pagination bottom, no h-scroll, desktop table with sortable headers | ✅ | Card buttons 40 px tall → ❌ A7 (cosmetic). |
| B5 received / cancel with confirm / cancelled final / received→cancel / no edit | ✅ | API rejects cancelled→anything, field edits, bogus status. |
| B6 settings save + show, special chars, emoji, HTML escaped, long text, SINPE validation | ✅ | |
| B6 clearing fields | ❌ A3 | Empty "¿Cómo pagar?" heading. |
| B7 CSV filter, no pagination, BOM, phone as text, filename, login required | ✅ | Opening in Excel → 👤. |

### C. Cross-cutting
| Item | Result | Notes |
|---|---|---|
| Near-simultaneous pledges | ✅ | 3 parallel distinct → 3 saved, counter +13 exact. Same token ×3 in parallel → 1 saved. |
| Back/Forward/reload no duplicates | ✅ | |
| Console errors / failed requests | ✅ | Cycle 2, all pages. |
| `npm run lint` | ✅ | |
| `npm run build` | 👤 | Skipped: shares `.next` with the running dev server. Run it with the dev server stopped. |
| Safari iPhone / Chrome Android | 👤 | |

## Left for the manual pass (Phase 6)
1. Real phone(s) on Wi-Fi: iPhone Safari + Android Chrome, full donor flow, "Copiar número", large system font.
2. Correct login → logout → Back button doesn't show admin data.
3. Open an exported CSV in Excel (tildes, phones not reformatted).
4. DevTools "Slow 3G" throttle on the public page.
5. `npm run build` with the dev server stopped.
6. Wording read-through as an older donor would read it.

## Cleanup
- 16 `QA …` donations remain in the local DB, plus an inactive item "Bloque", cement price ₡9 000 and zinc goal 100 (changed during tests). Remove when convenient:
  ```sql
  DELETE FROM church_donations.donation_items WHERE donation_id IN (SELECT id FROM church_donations.donations WHERE donor_name LIKE 'QA %');
  DELETE FROM church_donations.donations WHERE donor_name LIKE 'QA %';
  ```
- Settings were restored to their pre-test values.

## Re-running
After Phase 7, re-run Cycle 2 (and the finding repros) the same way. After deployment, re-run section D of Phase 6 against the Vercel URL (no harness file there — use a real phone instead).
