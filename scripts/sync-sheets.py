#!/usr/bin/env python3
"""
sync-sheets.py — Live sync from Hasna's Google Sheet → KOL seed.

Hasna's Sheet is the upstream source. She edits it; you run this; it regenerates
apps/kol-command-center/js/data.js (and can push the seed to a deployed Supabase
function). No auth needed — the Sheet is shared "anyone with link can view".

  POOL  (gid=0)          : full roster (79+)
  JUNI  (gid=529779299)  : active month, rich brief notes (hook / ref / product)

Usage:
  /tmp/kol-venv/bin/python scripts/sync-sheets.py
  /tmp/kol-venv/bin/python scripts/sync-sheets.py --push https://SITE/.netlify/functions/kol
"""
import urllib.request, csv, io, re, json, os, argparse
from datetime import date

SHEET = '1TmZCS13JMxhknhfMPt0FF4c3RE7I_PVGnAoB1ndn3Yc'
GID_POOL, GID_JUNI = '0', '529779299'
HERE  = os.path.dirname(os.path.abspath(__file__))
ROOT  = os.path.dirname(HERE)
OUT   = os.path.join(ROOT, 'apps', 'hp-sales-dashboard', 'kol', 'js', 'data.js')
TODAY = date.today().isoformat()
VALID_STATUS = {'KANDIDAT','PENDING','HOLD','NEGOSIASI','DEAL','BARTER','SELESAI','CANCEL'}
MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus',
             'September','Oktober','November','Desember']

# ── fetch ─────────────────────────────────────────────────────
def fetch(gid):
    url = f'https://docs.google.com/spreadsheets/d/{SHEET}/export?format=csv&gid={gid}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return list(csv.reader(io.StringIO(r.read().decode('utf-8', 'replace'))))

# ── parsers ───────────────────────────────────────────────────
UNIT = {'jt':1_000_000,'juta':1_000_000,'k':1_000,'rb':1_000,'ribu':1_000}
def parse_amount(tok):
    tok = tok.strip().lower().replace('rp','').replace(' ','')
    m = re.match(r'([\d.,]+)\s*(jt|juta|k|rb|ribu)?', tok)
    if not m: return 0
    numstr, unit = m.group(1), m.group(2)
    if unit in UNIT: return int(float(numstr.replace(',','.')) * UNIT[unit])
    return int(re.sub(r'[.,]','',numstr) or 0)

def split_rate(text):
    if not text: return 0, 0
    t = str(text).lower(); cash = barter = 0
    cm = re.search(r'cash\s*([\d.,]+\s*(?:jt|juta|k|rb|ribu)?)', t)
    if cm: cash = parse_amount(cm.group(1))
    bm = re.search(r'barter[^0-9]*([\d.,]+\s*(?:jt|juta|k|rb|ribu)?)', t)
    if bm: barter = parse_amount(bm.group(1))
    if not cm and not bm:
        nm = re.search(r'([\d.,]{3,}\s*(?:jt|juta|k|rb|ribu)?)', t)
        if nm: cash = parse_amount(nm.group(1))
    return cash, barter

def clean_scope(s):
    if not s: return ''
    parts = [p.strip(' -•\t') for p in re.split(r'[\n,]', s) if p.strip(' -•\t')]
    fix = {'vt':'VT','reels':'Reels','reel':'Reels','story':'Story','owning':'Owning',
           'keranjang kuning':'Keranjang Kuning','taplink':'Taplink','shopee video':'Shopee Video'}
    out = []
    for p in parts:
        out.append(fix.get(p.lower(), p[:1].upper()+p[1:]))
    return ', '.join(out)

def parse_brief(t):
    m = re.search(r'(soft|mid|hard)[\s-]*selling', t, re.I)
    return {'soft':'Soft-selling','mid':'Mid-selling','hard':'Hard-selling'}[m.group(1).lower()] if m else ''

def parse_ref(t):
    m = re.search(r'(https?://[^\s,)]+)', t)
    return m.group(1) if m else ''

def parse_produk(t):
    m = re.search(r'product\s*:\s*([^\n]+)', t, re.I)
    return m.group(1).strip() if m else ''

def parse_month(t):
    m = re.search(r'bulan\s*:?\s*([A-Za-z]+)', t, re.I)
    if m:
        mon = m.group(1).capitalize()
        if mon in MONTHS_ID: return f'{mon} 2026'
    for mon in MONTHS_ID:
        if re.search(rf'\b{mon}\b', t, re.I): return f'{mon} 2026'
    return ''

def s(v): return ('' if v is None else str(v)).strip()
def mkid(h): return 'k_' + re.sub(r'[^a-z0-9]','', h.lower())[:40]

# ── build records ─────────────────────────────────────────────
def row_to_record(r, *, juni=False):
    handle = s(r[0]) if len(r) > 0 else ''
    if not handle or handle.lower().startswith('nama'): return None
    keter = s(r[6]) if juni else (s(r[7]) if len(r) > 7 else '')
    status_raw = '' if juni else (s(r[6]).upper() if len(r) > 6 else '')
    status = status_raw if status_raw in VALID_STATUS else ('DEAL' if juni else 'KANDIDAT')
    cash, barter = split_rate(s(r[4]) if len(r) > 4 else '')
    rec = {
        'id': mkid(handle), 'handle': handle, 'nama': '', 'platform': 'Instagram',
        'tier': s(r[1]) if len(r) > 1 else '', 'niche': '',
        'followers': 0, 'avg_views': 0, 'er_persen': 0,
        'ig_link': s(r[2]) if len(r) > 2 else '',
        'kontak_wa': s(r[3]) if len(r) > 3 else '',
        'ratecard_orig': s(r[4]) if len(r) > 4 else '',
        'scope': clean_scope(s(r[5]) if len(r) > 5 else ''),
        'status': status, 'decision': '', 'decision_date': None,
        'campaign_month': parse_month(keter) or ('Juni 2026' if juni else ''),
        'produk': parse_produk(keter), 'brief_type': parse_brief(keter),
        'angle': keter.replace('\n', ' ').strip(), 'ref_link': parse_ref(keter),
        # consideration layer — empty here; inferred live by intelligence.js, human-overridable
        'content_style': '', 'family_situation': '', 'audience': '',
        'rate_cash': cash, 'rate_barter': barter, 'rate_card': {},
        'notes_hasna': keter if not juni else '', 'internal_notes': '',
        'in_pool': not juni, 'in_juni': juni, 'source': 'Juni' if juni else 'Pool',
    }
    return rec

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--push', help='Deployed function URL to re-seed Supabase')
    args = ap.parse_args()

    pool_rows = fetch(GID_POOL)[1:]
    juni_rows = fetch(GID_JUNI)[1:]

    by_handle = {}
    for r in pool_rows:
        rec = row_to_record(r, juni=False)
        if rec: by_handle[rec['handle'].lower()] = rec
    juni_n = 0
    for r in juni_rows:
        rec = row_to_record(r, juni=True)
        if not rec: continue
        juni_n += 1
        key = rec['handle'].lower()
        if key in by_handle:                        # enrich existing pool entry
            base = by_handle[key]
            base.update({k: v for k, v in rec.items()
                         if k in ('tier','scope','ratecard_orig','rate_cash','rate_barter',
                                  'produk','brief_type','angle','ref_link','campaign_month',
                                  'status','in_juni','source') and v not in ('', 0, None) or k in ('in_juni','source')})
        else:
            by_handle[key] = rec

    records = list(by_handle.values())
    records.sort(key=lambda r: (not r['in_juni'], r['handle'].lower()))

    header = (
        "// ============================================================\n"
        "// KOL SEED DATA — auto-generated by scripts/sync-sheets.py\n"
        "// LIVE from Hasna's Google Sheet (Pool gid=0 + Juni gid=529779299).\n"
        "// Loaded into Supabase via `seed`; also the localStorage fallback.\n"
        "// DO NOT edit by hand — re-run the sync.\n"
        f"// Synced: {TODAY}  |  {len(records)} KOLs ({juni_n} active Juni)\n"
        "// ============================================================\n"
        "window.KOL_SEED = "
    )
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(header); f.write(json.dumps(records, ensure_ascii=False, indent=2)); f.write(";\n")
    print(f"Synced {len(records)} KOLs ({juni_n} Juni) → {OUT}")

    if args.push:
        data = json.dumps({'action': 'seed', 'kol': records}).encode()
        req = urllib.request.Request(args.push, data=data,
            headers={'Content-Type': 'application/json'}, method='POST')
        with urllib.request.urlopen(req, timeout=30) as r:
            print('Push:', r.read().decode())

if __name__ == '__main__':
    main()
