# HP Sales Network Dashboard — Build Roadmap

> **Project:** Happy Pumpkin Sales Dashboard  
> **Stack:** Pure HTML / CSS / JS + Google Sheets CSV backend  
> **Goal:** Full sales ops & executive intelligence platform for the HP team

---

## Phase 1 — Live Data Foundation
*Connect the Google Sheet so the dashboard runs on real data, not mock data.*

### 1.1 Google Sheet Setup
- [ ] Create tab: `Brief` — daily KPIs (revenue today, leads contacted, follow-ups done)
- [ ] Create tab: `Channels` — Shopee Mall daily sales by SKU / category
- [ ] Create tab: `Distributors` — confirmed stockists, region, monthly order value, last order date
- [ ] Create tab: `Leads` — active pipeline with columns: name, type, city, province, contact WA, stage, assigned, last contact, potential monthly
- [ ] Create tab: `Targets` — monthly targets by channel and by sales rep
- [ ] Publish each tab as CSV (File → Share → Publish to web → CSV)
- [ ] Copy each tab's GID from the published URL
- [ ] Update `config.js` — replace all `'FILL_AFTER_CREATING_TAB'` with real GIDs
- [ ] Test CSV fetch in browser console — confirm data loads correctly
- [ ] Remove `sampleLeads` fallback from `config.js` once live data is stable

### 1.2 Data Hygiene
- [ ] Standardize province names in the sheet (match the 6-region mapping in `config.js`)
- [ ] Standardize WA numbers — all must be `628XXXXXXXXX` format (no spaces, no dashes, no leading 0)
- [ ] Add a `source` column to the Leads tab if not already present (Outbound / Harlow / etc.)
- [ ] Add an `assigned` column to the Leads tab (sales rep name)
- [ ] Confirm stage values match exactly: `Cold Lead`, `Contacted`, `Proposal Sent`, `Negotiating`, `Won`, `Rejected`

---

## Phase 2 — Operational Pages
*Build the locked preview pages into full working screens.*

### 2.1 Inventory & Stock (`section-inventory`)
- [ ] Design Google Sheet tab: `Inventory` — SKU, variant, current stock, reorder level, last restock date
- [ ] Build inventory table view — sortable by stock level, highlight low-stock rows in amber/red
- [ ] Add stock health summary bar — OK / Low / Critical counts
- [ ] Add "Last updated" timestamp from sheet
- [ ] Unlock the preview on the website once sheet tab is live

### 2.2 Live Sessions Tracker (`section-sessions`)
- [ ] Design Google Sheet tab: `LiveSessions` — date, platform (Shopee/TikTok), host, GMV, viewers, orders
- [ ] Build sessions table — chronological, show this week vs last week comparison
- [ ] Add weekly GMV total and session count KPIs at top
- [ ] Add per-host performance summary (if multiple hosts)
- [ ] Unlock the preview once sheet tab is live

### 2.3 Order Operations (`section-orders`)
- [ ] Design Google Sheet tab: `Orders` — date, order ID, channel, SKU, qty, fulfilment status, SLA breach flag
- [ ] Build daily orders view — filter by today / this week
- [ ] Add SLA breach counter (orders pending > 2 days)
- [ ] Add fulfilment rate KPI (shipped / total)
- [ ] Unlock the preview once sheet tab is live

### 2.4 Customer Analytics (`section-customers`)
- [ ] Decide data source — Shopee seller centre export or manual Google Sheet log
- [ ] Design sheet tab: `Customers` — new vs repeat buyer count, avg order value, top SKUs, return rate
- [ ] Build customer analytics view — new/repeat split, top SKU table, cohort repeat rate
- [ ] Unlock the preview once sheet tab is live

### 2.5 Campaign Calendar (`section-campaigns`)
- [ ] Design Google Sheet tab: `Campaigns` — campaign name, platform, start date, end date, budget, status, target KPI, actual result
- [ ] Build campaign calendar view — timeline or table grouped by month
- [ ] Highlight active campaigns in green, upcoming in blue, completed in gray
- [ ] Add campaign ROI column once post-campaign data is available
- [ ] Unlock the preview once sheet tab is live

---

## Phase 3 — Executive View
*A single-screen summary for the founder / GM — no clicking required.*

### 3.1 Executive Dashboard (`section-executive`)
- [ ] Define the 8–10 KPIs that matter most to leadership (GMV, new resellers, leads conversion rate, fulfilment SLA, campaign ROI, stock health)
- [ ] Build executive layout — 2-column grid: left = today's numbers, right = week-to-date vs target
- [ ] Add traffic-light status indicators (green / amber / red) for each KPI vs target
- [ ] Add a "biggest win this week" and "biggest risk this week" text block (manually updated from Brief sheet)
- [ ] Add a weekly summary section — pulls from the Brief tab
- [ ] Mobile-optimise this view so it reads well on phone
- [ ] Unlock the preview once Brief and Targets sheets are live

### 3.2 Sales Rep Scoreboard
- [ ] Add per-rep metrics to Leads sheet: leads assigned, leads contacted this week, conversions this month
- [ ] Build scoreboard table inside Executive view — rep name, leads worked, follow-up rate, conversions
- [ ] Add weekly rank (auto-sorted by follow-up rate)

---

## Phase 4 — Team Operations & Automation
*Reduce manual work, add accountability systems.*

### 4.1 Daily Brief Automation
- [ ] Build the Brief tab in Google Sheets as a form-fillable daily log (date, who filled it, each KPI)
- [ ] Add a Google Apps Script to auto-populate today's row from other tabs (Shopee export, Leads sheet)
- [ ] Brief section in dashboard auto-pulls today's row on load
- [ ] Add a "Brief not submitted" warning banner if today's row is empty past 9am

### 4.2 Follow-up Accountability
- [ ] Add a weekly follow-up log tab to the sheet — date, rep name, lead name, outcome
- [ ] Dashboard Leads page writes back to this sheet when a rep checks off a follow-up (requires Google Apps Script endpoint or Airtable migration)
- [ ] Weekly auto-reset of follow-up checkboxes every Monday at 00:00 (already implemented in localStorage — confirm it works cross-device)

### 4.3 WhatsApp Broadcast Integration
- [ ] Identify a WA Business API provider (e.g. Wablas, Fonnte, Twilio) — get API key
- [ ] Build a "Send WA" button on the lead detail modal — pre-fills a message template
- [ ] Add message templates: First contact, Proposal follow-up, Re-contact after 30 days
- [ ] Log outbound WA sends in the Leads sheet (sent_at column)

### 4.4 Shopee Data Integration
- [ ] Set up scheduled Shopee Seller Centre export (daily CSV)
- [ ] Upload to a Google Drive folder or directly to the Channels Google Sheet
- [ ] Build a Google Apps Script to parse the Shopee CSV and update the Channels tab automatically
- [ ] Dashboard Channels section reads from the updated tab

### 4.5 TikTok Shop Integration (if applicable)
- [ ] Confirm if TikTok Shop is active for HP
- [ ] Set up TikTok Shop analytics export (daily or weekly)
- [ ] Add TikTok row to Channels sheet + dashboard card

---

## Phase 5 — Intelligence Layer
*Competitive and market awareness built into the daily workflow.*

### 5.1 Competitor Ad Tracker
- [ ] Create a `CompetitorAds` sheet tab — competitor, ad format, hook, start date, still running (Y/N)
- [ ] Build competitor ad view in dashboard — sortable table with longest-running ads at top
- [ ] Tag each ad against the Buying Psychology Framework (emotional, safety, gifting, etc.)
- [ ] Add a weekly "ad of the week" highlight card — best performing competitor creative

### 5.2 Market Signals
- [ ] Set up a Google Alert or RSS feed for: "baju anak Indonesia", "kids fashion Shopee", competitor brand names
- [ ] Create a `MarketSignals` sheet tab — manually logged weekly signals (trend, platform, source, relevance)
- [ ] Build a signals feed widget in the Executive view

---

## Deployment Checklist (each release)
- [ ] Test all CSV fetches locally (Python http.server, port 8091)
- [ ] Check localStorage state is clean (no stale test data)
- [ ] Zip the project folder (html, css, js only — no `.DS_Store`, no `.git`)
- [ ] Drop ZIP to Netlify Deploys tab for existing site
- [ ] Confirm deploy URL loads and all sections render
- [ ] Share updated link with team

---

## Decision Points (requires founder input before building)
- [ ] **Data ownership:** Keep everything in Google Sheets, or migrate to Airtable / Notion for better API access?
- [ ] **Multi-user CRM:** localStorage is per-device. If 2+ reps use the same leads page, use a shared sheet or Airtable as the write-back store.
- [ ] **WA API provider:** Which vendor to use for WhatsApp broadcast? (Fonnte is cheapest for ID market)
- [ ] **Shopee data access:** Does the team have Seller Centre API access, or export-only?
- [ ] **TikTok Shop:** Is it active, and does it need to be tracked?
- [ ] **Executive access:** Should the Executive view be password-protected or open to all?

---

*Last updated: May 2026*
