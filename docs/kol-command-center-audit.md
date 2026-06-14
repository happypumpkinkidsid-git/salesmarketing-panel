# KOL Command Center — Functional Audit & Optimization

> Audit date: 2026-06-15 · Scope: the KOL Command Center tab (hpsalesadmin → KOL Command Center, served at `/kol`), its data model, and how it feeds (or fails to feed) creator-brief creation.

---

## 1. How information flows today

```
Hasna's Google Sheet (KOL DAILY)
   ├─ KOL-POOL (gid 0)     A:handle B:tier C:link D:contact E:ratecard F:scope G:status H:keterangan
   └─ KOL-JUNI (gid 529…)  A:handle B:tier C:link D:contact E:ratecard F:scope G:keterangan
        │  npm run sync  (scripts/sync-sheets.py — parses status/brief/ref/produk/month out of keterangan)
        ▼
   apps/hp-sales-dashboard/kol/js/data.js   →   Supabase (via function, on deploy)
        ▼
   KOL Command Center drawer  →  status · decision · brief_type · produk · angle · ref · rates · notes
```

**The Brief Generator tab is a separate brain that never touches this flow.** It holds the
actual creative intelligence (`kolGetNicheProfile`, `HP_PRODUCTS_DB`, `HP_TIERS_DB`,
`kolGetHookSuggestions`) but is fed by hand — you retype the handle, niche, products, tier.
None of the Command Center's decisions reach it, and none of its intelligence reaches the
Command Center.

**Verdict:** the Command Center is a competent *transaction ledger* (who, status, rate,
decision) bolted onto a *blob* (`keterangan` → `angle`). It captures **what we decided**
but almost nothing about **why this creator fits**, which is the input a brief actually needs.

---

## 2. Field-by-field audit

Every field, sorted by what it actually is:

### A. Decision / workflow fields — *working, keep*
`status` · `decision` · `decision_date` · `campaign_month` · `rate_cash` · `rate_barter`
· `rate_card{}` · `kontak_wa` · `ig_link` · negotiations[]
→ These are the ledger. They're well-modelled and the drawer handles them cleanly.

### B. Creative-brief fields — *present but thin / mis-shaped*
| Field | Problem |
|---|---|
| `brief_type` | Free dropdown (Soft/Mid/Hard) with **no logic** — a human guesses. Not linked to the creator's profile or the product's natural selling mode. |
| `produk` | **Free text** (`"SoftAir, BreatheKnit"`). Not tied to a product catalog, so no features/trust/range/hooks can be pulled. Drifts from `HP_PRODUCTS_DB` naming. |
| `angle` | **The dumping ground.** Holds the entire `keterangan` blob — mixing logistics, hook, products, ref, and creator situation in one cell. |
| `scope` | OK (deliverables), but free text. |
| `ref_link` | Good when present; only auto-extracted if the note literally says "Ref: http…". |

### C. The free-flow blob — *what `keterangan` actually contains*
A single `keterangan` cell routinely mixes **six different kinds of information**. Example
(bellatjahyadii): *"Bulan: Juni · Product: Wonder Set, UltraCool · Mid-selling: Storytelling
Inovasi · Hook: 'Tidak semua baju anak diciptakan sama' · Ref: https://…"*

| Buried inside keterangan | Categorizable? | Where it should live |
|---|---|---|
| Campaign month ("Bulan: Juni") | ✅ | `campaign_month` |
| Product assignment ("Wonder Set, UltraCool") | ✅ | `produk` (structured) |
| Brief mode ("Mid-selling") | ✅ | `brief_type` |
| Hook ("Tidak semua baju anak…") | ✅ | `angle` (the real one) |
| Reference reel (URL) | ✅ | `ref_link` |
| **Creator situation ("twinning content dgn adiknya")** | ✅ **but never captured** | → new **consideration layer** |
| Logistics ("brief dikirim saat barang ready") | ❌ genuinely free | → a real `notes` field |

The sync script already lifts the first five. **The sixth — the creator's situation — is the
exact thing the user flagged, and it's currently lost.** "twinning content dgn adiknya" tells
us this creator has a sibling/twin → unlocks *set/bundle* logic and *matching* content. That
signal never becomes structured data, so it can't drive product or brief recommendations.

### D. Missing entirely — *the consideration layer*
There is no field for **who this creator is creatively**: content style (educational /
fashion / baby / sleep / family-vlog), family situation (solo / sibling / twins), audience,
or the natural selling mode that follows. `niche` exists in the schema but is **always empty**
(the Sheet has no niche column, so sync never fills it).

---

## 3. The two-brain problem (the biggest structural issue)

| | Command Center | Brief Generator |
|---|---|---|
| Knows the **deal** (status, rate, decision) | ✅ | ❌ |
| Knows the **creator profile** (niche → angle/audience/tone) | ❌ | ✅ `kolGetNicheProfile()` |
| Knows the **product catalog** (features/trust/range/hooks) | ❌ | ✅ `HP_PRODUCTS_DB` |
| Knows the **tier playbooks** (soft/mid/hard rules) | ❌ (free dropdown) | ✅ `HP_TIERS_DB` |
| Generates **hooks** from tier×product×niche | ❌ | ✅ `kolGetHookSuggestions()` |

Two systems, zero shared data. The decision you make in the Command Center (this creator,
these products, this brief type) should *be* the seed for the brief — but you retype it.
And the brief generator's intelligence (what fits this niche, what hook suits this product)
should *inform* the Command Center decision — but it can't.

**Plus product drift:** the live catalog in play (SoftAir, BreatheKnit, UltraCool, Wonder Set,
Sunny Days, Fashion lines) ≠ `HP_PRODUCTS_DB` (Sunny Days, ActiveKnit, PureKnit, UltraCool™,
Wonder Set™). **SoftAir and BreatheKnit — the two most-used Juni products — have no product
profile at all.** There is no single source of truth for products.

---

## 4. The Consideration Layer (the fix the user asked for)

A creator should carry a small, structured **profile** that drives everything downstream.
Three inputs, each a closed vocabulary, each inferable from the existing notes:

| Consideration field | Values | Signal it carries |
|---|---|---|
| **Content style** | Educational · Fashion/OOTD · Baby/Newborn · Sleep/Bedtime · Family-Vlog · Mom/Lifestyle | What the audience comes for → tone & angle |
| **Family situation** | Solo · Has sibling · Twins | Unlocks set/bundle & matching ("twinning") content |
| **Audience depth** | Researcher (reads before buying) · Impulse (visual buyer) | Whether explanation (soft/mid) or desire (hard) converts |

These map 1:1 onto the **6 profiles already coded in `kolGetNicheProfile()`** — so the engine
exists; it just isn't connected to the Command Center or stored per-creator.

### Why this drives brief type
- **Researcher / Educational / Baby** → their audience *wants the reasoning*. Functional
  storytelling lands; a hard-sell feels cheap. → **Soft / Mid**, products whose value is
  *invisible and needs telling*.
- **Impulse / Fashion / OOTD** → desire is immediate and visual. Explanation is wasted; a
  clean OOTD + "link in bio" converts. → **Hard** (with Soft for first-touch awareness).
- **Sibling / Twins** → matching sets photograph themselves; bundle = value. → set products,
  **Mid/Hard** via the *"one decision, two looks"* angle.

---

## 5. Product × Selling-Mode matrix

The rule: **the harder a product's value is to *see*, the softer you must sell it** (explain
first); **the more immediate its appeal, the harder you can sell it** (convert now).

| Product | Core story | Natural **lead** mode | Also works | Avoid | Psychology trigger |
|---|---|---|---|---|---|
| **UltraCool™** | Patented cooling, 1yr R&D | **Mid** (storytelling the R&D) | Soft (awareness), Hard (after proof) | Cold Hard-sell — value is invisible without the story | Functional innovation |
| **PureKnit** | Seamless, zero irritation | **Mid** | Soft (baby/skin) | Hard-sell first touch | Functional safety |
| **BreatheKnit** | Breathable functional knit | **Mid** | Soft | Pure fashion framing | Functional comfort |
| **SoftAir** | Soft/airy comfort | **Soft** | Mid | Spec-heavy hard-sell | Sensory / emotional |
| **ActiveKnit** | 4-way stretch, sweat-wicking | **Mid** | Hard ("anak minta dipakai tiap hari") | Static/sleepy framing | Performance / real-kids |
| **Wonder Set™** | Day-to-night, community relaunch | **Hard** (restock urgency) | Mid (day-to-night story), Gifting | Slow awareness-only | Scarcity + gifting |
| **Sunny Days** | Fashion basic, bundle, wash-tested | **Hard** (bundle/OOTD) | Soft (lifestyle) | Over-explaining | Emotional impulse + value |
| **Fashion (seasonal)** | Serena Dress, Culotte — OOTD | **Hard** (OOTD) | — | Educational framing | Lifestyle aspiration |

> Gaps to close: **SoftAir & BreatheKnit need real product profiles** (features, trust, range,
> hashtags) added to the catalog — they're the active Juni heroes with no entry.

---

## 6. Creator-Profile × Product × Brief — the recommendation table

This is the "consideration layer" operationalized — given a creator profile, what to push and how:

| Creator profile | Best brief | Lead products | Angle logic | White-space note |
|---|---|---|---|---|
| **Educational / detail-conscious** (tips & tricks about babies) | Soft → Mid | PureKnit, BreatheKnit, UltraCool, SoftAir | "Detail you'd miss" — functional reasoning | Strongest fit for HP's innovation story |
| **Fashion / OOTD / aesthetic** | Hard (+Soft awareness) | Sunny Days, Fashion lines, UltraCool (style) | Visual desire → "link in bio" | Don't waste on education |
| **Baby / Newborn** | Mid / Soft (trust) | PureKnit, SoftAir, BreatheKnit, Wonder Set (sleep) | Skin-safety, SNI, gentle | Anxious-parent trust |
| **Sleep / Bedtime** | Soft / Mid | Wonder Set, SoftAir | Night-routine comfort | Underused angle |
| **Family-Vlog + sibling/twins** | Mid / Hard | Sets, Wonder Set, matching | "Twinning" / sibling set = bundle value | **White space** (per competitor map) |
| **Mom / Lifestyle (default)** | Mid | UltraCool, ActiveKnit, Sunny Days | Everyday value, relatable | Safe default |

---

## 7. Proposed Google Sheet reformat — *suggestion only, do not apply yet*

The Sheet stays Hasna's surface, so it should carry the consideration layer in **closed-list
columns** instead of burying it in `keterangan`. Proposed KOL-POOL / KOL-JUNI layout:

| Col | Current | Proposed | Type |
|---|---|---|---|
| A | Nama Instagram | Handle | text |
| B | Tier KOL | Tier | list |
| C | Link | Link | url |
| D | contact | WA | text |
| E | ratecard | Ratecard (asli) | text |
| F | SCOPE | Scope | text |
| G | status | Status | list |
| **H** | — | **Content Style** | list: Educational/Fashion/Baby/Sleep/Family-Vlog/Mom |
| **I** | — | **Family** | list: Solo/Sibling/Twins |
| **J** | — | **Produk** | list (from catalog, multi) |
| **K** | — | **Brief Type** | list: Soft/Mid/Hard |
| **L** | — | **Angle / Hook** | text (one hook) |
| **M** | — | **Ref Link** | url |
| **N** | — | **Bulan** | list |
| **O** | keterangan | **Catatan bebas** | text (genuinely free notes only) |

Net effect: the blob splits into typed columns the sync reads losslessly, `keterangan`
shrinks to *real* free notes, and Content Style + Family become the consideration layer.
Data-validation dropdowns keep Hasna fast and the vocabulary clean.

---

## 8. What to do next — execution roadmap

1. **[shipped in this pass]** `kol/js/intelligence.js` — single source of truth for the
   product→selling-mode matrix + creator-profile rules + a `recommendFor(profile)` function.
2. **[shipped in this pass]** "Creative Fit" panel in the Command Center drawer — reads the
   creator's notes/niche, infers content style + family situation, and recommends brief type
   + products + angle + psychology trigger. Read-only suggestion; humans still decide.
3. **[needs your OK]** Add `content_style`, `family_situation`, `audience` to the data model +
   Supabase schema + drawer selects (and wire `recommendFor` to auto-suggest).
4. **[needs your OK — Sheet change]** Apply the §7 reformat to KOL DAILY with dropdowns; update
   `sync-sheets.py` to read the new columns; backfill the 6 SoftAir/BreatheKnit/etc. profiles.
5. **[bigger]** Unify the two brains: feed the Command Center decision (creator + products +
   brief type) directly into the Brief Generator as a pre-filled seed (one-click "Generate
   brief"), and reconcile the product catalog into one shared `PRODUCT_DB`.
