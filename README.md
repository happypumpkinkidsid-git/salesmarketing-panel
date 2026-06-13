# salesmarketing-panel — Happy Pumpkin Web Dashboards

Repo used for Claude Code to run Happy Pumpkin's sales & marketing panel, and to
store databases related to sales and marketing activities.

Monorepo for Happy Pumpkin's internal web tools.

```
apps/
  kol-command-center/   ← KOL & campaign management (Hasna-facing) — backend-wired
  hp-sales-dashboard/   ← internal sales network — migrated in
  hp-dashboard/         ← creative hub — migrated in
netlify/functions/      ← serverless API (talks to Supabase)
supabase/schema.sql     ← database schema
scripts/build-seed.py   ← regenerates KOL seed from Excel + Juni sheet
```

### Deploy topology (Netlify, one site per app)
`netlify.toml` defaults the primary site to `apps/kol-command-center`. To deploy the
other two, add them as **separate Netlify sites from the same repo**, each with its
**base directory** set (Site settings → Build & deploy → Base directory):
`apps/hp-sales-dashboard` and `apps/hp-dashboard`. Functions stay shared at
`netlify/functions` and are reachable at `/.netlify/functions/kol` from any site.

## KOL Command Center

A single-page working document that consolidates what used to be 7 Excel tabs:
**Latest Update (top)** → At a Glance → Active Juni campaign → KOL Tracker → KOL Pool.
Decisions, rate cards, and the negotiation log all live in one per-KOL drawer.

### Data model
- **Source of truth:** Supabase (3 tables — `kol`, `negotiations`, `app_state`).
- **The browser never touches Supabase.** It calls the Netlify function, which holds the
  service-role key. Anon key is never shipped to the client.
- **Fallback:** if the backend env isn't configured, the app runs entirely on
  `localStorage` seeded from `apps/kol-command-center/js/data.js` — so it works offline /
  pre-setup, then "lights up" as shared the moment Supabase env vars are set.

### Regenerating the seed (Pool + Juni)
```bash
/tmp/kol-venv/bin/python scripts/build-seed.py
```
Reads `../DEPLOY-KOL-Dashboard.xlsx` (🌊 KOL Pool) + the embedded Juni campaign,
writes `apps/kol-command-center/js/data.js` (79 KOLs, 8 active Juni).

---

## One-time setup (account steps)

### 1. GitHub — done ✓

### 2. Supabase
1. Create a project at supabase.com.
2. SQL Editor → paste `supabase/schema.sql` → Run.
3. Project Settings → API → copy **Project URL** and **service_role key**.

### 3. Netlify (git-connected)
1. netlify.com → Add new site → Import from GitHub → pick this repo.
2. Build settings are read from `netlify.toml` (publish `apps/kol-command-center`,
   functions `netlify/functions`). No build command needed.
3. Site settings → Environment variables → add:
   - `SUPABASE_URL` = your project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = your service-role key
4. Deploy. First page load auto-seeds Supabase from `data.js`. Badge flips to
   **● Shared (live)**.

### Local dev with the function
```bash
npm install
cp .env.example .env        # fill in SUPABASE_URL + SERVICE_ROLE_KEY
npm run dev                 # netlify dev — serves site + functions
```

---

## Notes
- Now on GitHub + (soon) git-connected Netlify, the old "zip the folder and open in
  Finder" workflow is retired — `git push` is the deploy.
- The loose `Projects/hp-sales-dashboard` and `Projects/hp-dashboard` folders are now
  mirrored under `apps/`; the repo copies are canonical.
