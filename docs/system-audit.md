# HP Sales Panel — Full System Audit

> Audit 2026-06-17 · scope: the whole `salesmarketing-panel` (hpsalesadmin.netlify.app) — systems, process flows, security, logic. Visual pass done on the live site.

## 1. Systems map

| Layer | What | Where |
|---|---|---|
| **Hosting / CI** | GitHub Actions → `netlify deploy --prod` on push to `main` | `.github/workflows/deploy.yml`, site `hpsalesadmin` |
| **Frontend** | Vanilla JS SPA, hash-router (`navigate()` → `renderX()`), no framework/build | `apps/hp-sales-dashboard/` |
| **KOL mini-app** | Separate vanilla app, embedded via `<iframe>`; also standalone `/kol/` | `apps/hp-sales-dashboard/kol/` |
| **Backend** | One Netlify function (Supabase CRUD proxy, service-role key, server-side only) | `netlify/functions/kol.js` |
| **DB** | Supabase: `kol`, `negotiations`, `app_state` (KOL live state) | project `onoetbbbrgxqqjssomdi` |
| **Reference data** | JS modules: `HP_PRODUCT_DB` (KB, 13 collections), `HP_PRODUCTS_DB`/`HP_TIERS_DB` (legacy), `intelligence.js` | committed, regenerated upstream |
| **Sheet data** | Daily Brief / channels / distributors / leads read Google-Sheets CSV at runtime; KOL pool/Juni synced via `scripts/sync-sheets.py` | `js/config.js` |

## 2. Process flows (verified)

- **KOL lifecycle:** Hasna's Sheet → `sync-sheets.py` → `data.js` seed → Supabase (on deploy) → Command Center (status/decision/rate/negotiation) → **Creative Fit** infers content-style/family/brief/products/**KB collection** → **handoff** pre-fills the Brief Generator → 4-page brief (now sourcing material/say/show/avoid/hooks from `HP_PRODUCT_DB`).
- **Shared state:** browser → Netlify function → Supabase; write-back verified (read-after-write). localStorage fallback when backend env absent.
- **Single source of truth:** `HP_PRODUCT_DB` read by all three (Product Database tab, Brief Generator, Command Center).

## 3. Findings (severity · status)

| # | Finding | Sev | Status |
|---|---|---|---|
| 1 | **Function CORS was `*`** — any website could browser-call the endpoint | High | ✅ **fixed** — locked to site origin + deploy-preview + localhost allowlist |
| 2 | **Function has no authentication** — anyone with the URL can read/write all KOL data directly (CORS only stops *browser* cross-origin, not server-side calls) | High | ⏳ **needs login layer** (see §5) — gate the function on a verified session |
| 3 | **No output escaping in the dashboard** — `app.js` sets `innerHTML` from Sheet/Supabase/KB text with no `esc()` (kol app *does* escape). Stored-XSS surface if a teammate puts markup in a sheet cell or note | Med (insider data) | ⏳ prepared — add `escHtml()` + wrap free-text fields; do alongside login (multi-user raises the stakes) |
| 4 | **Product taxonomy drift** — legacy `HP_PRODUCTS_DB` (7) vs `HP_PRODUCT_DB` (13 collections); Block 03 shows both | Low | ⏳ #4 remainder — collapse legacy chips into KB collections |
| 5 | **Dead code** — `renderKOLProgram()` (old in-dashboard KOL tab) superseded by the iframe Command Center | Low | ⏳ remove |
| 6 | **Auto-zip hook** still fires on `hp-sales-dashboard` edits (redundant on git) | Low | ⏳ remove on your OK (config edit) |
| 7 | **Daily Brief shows "Sample data active"** — never wired to a real Brief sheet | Low | ⏳ connect a sheet or hide the banner |
| 8 | **Supabase access token** (`sbp_…`) you pasted may still be live | Med | ⏳ **revoke** (service key in Netlify is separate) |

## 4. Visual pass (live)
- ✅ Product Database tab: collection rail, EN/ID toggle, material block, say/show/avoid/hooks, keyword cloud, articles — all clean.
- ✅ Deep-links (`/#section`) work; tabs directly linkable.
- ✅ Command Center `/kol/` reads Supabase (badge "Shared (live)").
- ✅ Brief Generator Block 03 multi-select collections.

## 5. Login layer — design (pending your roster)

Goal: one sign-in per member (not per tab), each member sees only their company tools.

**Recommended:** Supabase Auth (we already run Supabase) — email + password or magic-link. A `members` table maps `email → role`; the app shows only that role's tabs; the function verifies the JWT before returning data (closes finding #2 for real). Session persists → "ask once."

**Proposed role → tools** (confirm/adjust):
- **Owner/Admin** → everything
- **Sales** → Daily Brief, Performance, Online Channels, Distributor Network, Distributor Intel, Leads Pipeline, Executive
- **Content/KOL** (e.g. Hasna, Rahmi) → KOL Brief Generator, KOL Command Center, Product Database (+ Performance read)

Need from you: member name + email + role for each person.

## 6. What to do next (prepared, ordered)
1. **Login** — build Supabase Auth gate + `members` table + role-based tab visibility + function JWT check (closes #2). *(blocked on roster)*
2. **XSS hardening** (#3) — `escHtml()` pass on free-text render paths.
3. **#4 remainder** — collapse legacy `HP_PRODUCTS_DB` into `HP_PRODUCT_DB`; remove dead `renderKOLProgram()`.
4. **Housekeeping** — revoke Supabase token (#8); remove auto-zip hook (#6); wire/hide Daily Brief banner (#7).
