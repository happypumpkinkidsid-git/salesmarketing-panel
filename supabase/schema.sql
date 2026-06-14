-- ============================================================
-- KOL Command Center — Supabase schema
-- Run once in Supabase → SQL Editor.
-- The browser NEVER talks to these tables directly. Only the Netlify
-- function (holding the service-role key) does, so RLS is left disabled
-- and access is gated at the function layer.
-- ============================================================

-- ── KOL master ────────────────────────────────────────────────
create table if not exists kol (
  id            text primary key,
  handle        text not null,
  nama          text default '',
  platform      text default 'Instagram',
  tier          text default '',
  niche         text default '',
  followers     int  default 0,
  avg_views     int  default 0,
  er_persen     numeric default 0,
  ig_link       text default '',
  kontak_wa     text default '',
  ratecard_orig text default '',          -- free-text original ask, e.g. "Cash 2jt + barter 700k"
  scope         text default '',          -- deliverables
  -- Management decision layer
  status        text default 'KANDIDAT',  -- KANDIDAT/PENDING/HOLD/NEGOSIASI/DEAL/BARTER/SELESAI/CANCEL
  decision      text default '',          -- Approve / Disapprove / Hold / Defer
  decision_date date,
  campaign_month text default '',
  produk        text default '',
  brief_type    text default '',          -- Soft-selling / Mid-selling / Hard-selling
  angle         text default '',
  ref_link      text default '',
  -- Consideration layer (drives brief recommendation; see kol/js/intelligence.js)
  content_style    text default '',       -- Educational/Fashion/Baby/Sleep/FamilyVlog/Mom
  family_situation text default '',       -- Solo/Sibling/Twins
  audience         text default '',
  -- Money
  rate_cash     int default 0,
  rate_barter   int default 0,
  rate_card     jsonb default '{}'::jsonb, -- per-format input from Hasna: {reels, vt, story, owning, keranjang, taplink, package, terms}
  -- Notes
  notes_hasna     text default '',
  internal_notes  text default '',
  -- Flags / provenance
  in_pool       boolean default true,
  in_juni       boolean default false,
  source        text default 'Pool',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── Negotiation log (dated rounds) ────────────────────────────
create table if not exists negotiations (
  id         bigint generated always as identity primary key,
  kol_id     text references kol(id) on delete cascade,
  log_date   date default current_date,
  round      int  default 1,
  hp_cash    int  default 0,
  hp_barter  int  default 0,
  kol_cash   int  default 0,
  kol_barter int  default 0,
  agreed     boolean default false,
  items      text default '',
  notes      text default '',
  logged_by  text default '',
  next_step  text default '',
  created_at timestamptz default now()
);
create index if not exists negotiations_kol_id_idx on negotiations(kol_id);

-- ── Singleton app state (latest update banner, etc.) ──────────
create table if not exists app_state (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz default now()
);

-- keep updated_at fresh on kol
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists kol_touch on kol;
create trigger kol_touch before update on kol
  for each row execute function touch_updated_at();
