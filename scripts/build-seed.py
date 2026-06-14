#!/usr/bin/env python3
"""
build-seed.py — Generate apps/kol-command-center/js/data.js

Single source → merged seed:
  • KOL Pool   : read from DEPLOY-KOL-Dashboard.xlsx  "🌊 KOL Pool" sheet (79 KOLs)
  • KOL Juni   : the 8 active June deals, enriched with full brief detail
                 (hooks, ref reels, products) pulled from Hasna's daily Google Sheet.

Output is the seed loaded into Supabase once (via the function's `seed` action)
and also used as the localStorage fallback dataset.
"""
import openpyxl, os, re, json
from datetime import date

HERE   = os.path.dirname(os.path.abspath(__file__))
ROOT   = os.path.dirname(HERE)                          # hp-dashboards/
EXCEL  = os.path.join(os.path.dirname(os.path.dirname(ROOT)), 'Projects', 'DEPLOY-KOL-Dashboard.xlsx')
# Projects/hp-dashboards/.. = Projects ; xlsx sits in Projects/
EXCEL  = '/Users/alexandergrant/Documents/Claude/Projects/DEPLOY-KOL-Dashboard.xlsx'
OUT    = os.path.join(ROOT, 'apps', 'hp-sales-dashboard', 'kol', 'js', 'data.js')
TODAY  = date.today().isoformat()

# ── rate parser ───────────────────────────────────────────────
UNIT = {'jt': 1_000_000, 'juta': 1_000_000, 'k': 1_000, 'rb': 1_000, 'ribu': 1_000}
def parse_amount(tok):
    tok = tok.strip().lower().replace('rp', '').replace(' ', '')
    m = re.match(r'([\d.,]+)\s*(jt|juta|k|rb|ribu)?', tok)
    if not m: return 0
    numstr, unit = m.group(1), m.group(2)
    if unit in UNIT:
        # numeric part uses . or , as DECIMAL here (e.g. 1.5jt, 500rb)
        num = float(numstr.replace(',', '.'))
        return int(num * UNIT[unit])
    # no unit → plain Indonesian integer with . / , as THOUSANDS sep
    digits = re.sub(r'[.,]', '', numstr)
    return int(digits) if digits else 0

def split_rate(text):
    """Return (cash, barter) from free-text ratecard."""
    if not text: return 0, 0
    t = str(text).lower()
    cash = barter = 0
    cm = re.search(r'cash\s*([\d.,]+\s*(?:jt|juta|k|rb|ribu)?)', t)
    if cm: cash = parse_amount(cm.group(1))
    bm = re.search(r'barter[^0-9]*([\d.,]+\s*(?:jt|juta|k|rb|ribu)?)', t)
    if bm: barter = parse_amount(bm.group(1))
    # bare "450.000 (...)" with no cash/barter keyword → treat as cash
    if not cm and not bm:
        nm = re.search(r'([\d.,]{3,}\s*(?:jt|juta|k|rb|ribu)?)', t)
        if nm: cash = parse_amount(nm.group(1))
    return cash, barter

def s(v): return ('' if v is None else str(v)).strip()

# ── read pool ─────────────────────────────────────────────────
wb = openpyxl.load_workbook(EXCEL, data_only=True)
ws = wb['🌊 KOL Pool']
rows = list(ws.iter_rows(values_only=True))
# header at row index 2 (0-based) per dump; data from index 3
data = rows[3:]
# cols: 0#,1 handle,2 tier,3 ig,4 wa,5 ratecard,6 scope,7 status,8 notes,
#       9 month,10 products,11 brief_type,12 angle,13 decision,14 internal
VALID = {'KANDIDAT','PENDING','HOLD','NEGOSIASI','DEAL','BARTER','SELESAI','CANCEL'}

pool = {}
for i, r in enumerate(data):
    if not r or len(r) < 2: continue
    handle = s(r[1])
    if not handle or handle.startswith('#'): continue
    cash, barter = split_rate(r[5] if len(r) > 5 else '')
    raw_status = s(r[7]).upper() if len(r) > 7 else ''
    status = raw_status if raw_status in VALID else 'KANDIDAT'
    rec = {
        'id': 'k_' + re.sub(r'[^a-z0-9]', '', handle.lower())[:40],
        'handle': handle,
        'nama': '',
        'platform': 'Instagram',
        'tier': s(r[2]) if len(r) > 2 else '',
        'niche': '',
        'followers': 0, 'avg_views': 0, 'er_persen': 0,
        'ig_link': s(r[3]) if len(r) > 3 else '',
        'kontak_wa': s(r[4]) if len(r) > 4 else '',
        'ratecard_orig': s(r[5]) if len(r) > 5 else '',
        'scope': s(r[6]) if len(r) > 6 else '',
        'status': status,
        'decision': '', 'decision_date': None,
        'campaign_month': s(r[9]) if len(r) > 9 else '',
        'produk': s(r[10]) if len(r) > 10 else '',
        'brief_type': s(r[11]) if len(r) > 11 else '',
        'angle': s(r[12]) if len(r) > 12 else '',
        'ref_link': '',
        'content_style': '', 'family_situation': '', 'audience': '',
        'rate_cash': cash, 'rate_barter': barter,
        'rate_card': {},
        'notes_hasna': s(r[8]) if len(r) > 8 else '',
        'internal_notes': s(r[14]) if len(r) > 14 else '',
        'in_pool': True, 'in_juni': False, 'source': 'Pool',
    }
    pool[handle.lower()] = rec

# ── KOL Juni (active June campaign — rich brief detail) ───────
JUNI = [
  {'handle':'agnesqania','tier':'Nano','wa':'87823062535','ig':'https://www.instagram.com/agnesqania/',
   'rate':'Cash 1jt + barter value 500rb','scope':'Reels, Keranjang Kuning, Owning',
   'produk':'Breatheknit, SoftAir','brief':'Mid-selling','status':'DEAL',
   'angle':'Akhir Mei → Breatheknit & SoftAir. Brief dikirim saat barang ready (SoftAir varian baru sedang sample).','ref':''},
  {'handle':'dsboyaaaaa','tier':'Nano','wa':'82231311414','ig':'https://www.instagram.com/dsboyaaaaa/',
   'rate':'Cash 1jt + barter value 500rb','scope':'Reels, VT, Keranjang Kuning, Owning',
   'produk':'Breatheknit, SoftAir','brief':'Mid-selling','status':'DEAL',
   'angle':'Akhir Mei → Breatheknit & SoftAir. Brief dikirim saat barang ready (SoftAir varian baru sedang sample).','ref':''},
  {'handle':'babypheiphei','tier':'Macro KOL','wa':'85720273800','ig':'https://www.instagram.com/babypheiphei/',
   'rate':'Cash 2jt + barter value 700k','scope':'Reels, VT, Story + Taplink',
   'produk':'SoftAir, BreatheKnit','brief':'Mid-selling','status':'DEAL',
   'angle':'Brief Juni — SoftAir & BreatheKnit. Satu-satunya Macro deal aktif.','ref':''},
  {'handle':'celinemaverickharuvi','tier':'Nano','wa':'82213626040','ig':'https://www.instagram.com/celinemaverickharuvi/',
   'rate':'Cash 1jt + barter value 500k','scope':'Reels, Story',
   'produk':'SoftAir, UltraCool','brief':'Soft-selling','status':'DEAL',
   'angle':'JUNI — twinning content dengan adiknya. SoftAir, UltraCool.','ref':''},
  {'handle':'carolineliki_','tier':'Nano Supplementer','wa':'','ig':'https://www.instagram.com/carolineliki_/',
   'rate':'barter','scope':'Reels, VT, Story',
   'produk':'Sleepwear, Babywear, Wonder Set','brief':'Soft-selling','status':'DEAL',
   'angle':'JUNI — OK 5 pc produk (worth 500k). Sleepwear & Babywear & Wonder Set.','ref':''},
  {'handle':'kimoraceisya','tier':'Micro KOL','wa':'','ig':'https://www.instagram.com/kimoraceisya/',
   'rate':'Cash 500K + barter value 300K','scope':'Reels, VT, Story + Taplink',
   'produk':'UltraCool','brief':'Mid-selling','status':'DEAL',
   'angle':'JUNI — UltraCool. Hook: "Product adem bikin Kimora gak marah-marah."','ref':''},
  {'handle':'bellatjahyadii','tier':'Nano','wa':'818161092','ig':'https://www.instagram.com/bellatjahyadii/',
   'rate':'Cash 1jt + barter value 500k','scope':'Reels, VT, Story',
   'produk':'Wonder Set, UltraCool','brief':'Mid-selling','status':'DEAL',
   'angle':'JUNI — Storytelling inovasi baju berfungsi. Hook: "Tidak semua baju anak diciptakan sama" — Linen untuk Tidur (Wonder Set, Malam) & UltraCool (daily, paling adem).',
   'ref':'https://www.instagram.com/reel/DYWKLlbz7dK/'},
  {'handle':'bayi_savannah','nama':'Savannah Dan Selena','tier':'Nano Supplementer','wa':'08112951416','ig':'https://www.instagram.com/bayi_savannah/',
   'rate':'450.000 (reels+vt+story)','scope':'Reels, VT, Story',
   'produk':'Serena Dress, Jeans Lace Culotte','brief':'Hard-selling','status':'DEAL',
   'angle':'JUNI — Fashion Juni. Hardselling OOTD Anak.',
   'ref':'https://www.instagram.com/reel/DY54UyqyipV/'},
]

for j in JUNI:
    key = j['handle'].lower()
    cash, barter = split_rate(j['rate'])
    base = pool.get(key, {
        'id': 'k_' + re.sub(r'[^a-z0-9]', '', key)[:40],
        'handle': j['handle'], 'platform':'Instagram', 'niche':'',
        'followers':0,'avg_views':0,'er_persen':0,'rate_card':{},
        'decision':'','decision_date':None,'internal_notes':'','in_pool':False,
    })
    base.update({
        'nama': j.get('nama', base.get('nama','')),
        'tier': j['tier'],
        'ig_link': j['ig'] or base.get('ig_link',''),
        'kontak_wa': j['wa'] or base.get('kontak_wa',''),
        'ratecard_orig': j['rate'],
        'scope': j['scope'] or base.get('scope',''),
        'status': j['status'],
        'campaign_month': 'Juni 2026',
        'produk': j['produk'],
        'brief_type': j['brief'],
        'angle': j['angle'],
        'ref_link': j['ref'],
        'rate_cash': cash, 'rate_barter': barter,
        'in_juni': True, 'source': 'Juni',
    })
    pool[key] = base

records = list(pool.values())
records.sort(key=lambda r: (not r['in_juni'], r['handle'].lower()))  # Juni first

# ── write data.js ─────────────────────────────────────────────
header = f"""// ============================================================
// KOL SEED DATA — auto-generated by scripts/build-seed.py
// Pool (Excel) + Juni active campaign (Hasna's daily Sheet).
// Loaded into Supabase once via the `seed` action; also the
// localStorage fallback dataset. DO NOT edit by hand.
// Generated: {TODAY}  |  {len(records)} KOLs ({sum(1 for r in records if r['in_juni'])} active Juni)
// ============================================================
window.KOL_SEED = """
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(header)
    f.write(json.dumps(records, ensure_ascii=False, indent=2))
    f.write(";\n")
print(f"Wrote {len(records)} KOLs → {OUT}")
print(f"  Juni active: {sum(1 for r in records if r['in_juni'])}")
print(f"  Deals: {sum(1 for r in records if r['status']=='DEAL')}")
