// ============================================================
// Shared reporting layer for the scheduled email digests.
// Reads the same Supabase `kol` table the Command Center uses, and mirrors
// the Command Center's workflow logic (nextStep) so emails match the UI.
// ============================================================
const { createClient } = require('@supabase/supabase-js');

const BUDGET_CEILING = 15000000;
const ID_MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function client() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
async function fetchKOL() {
  const sb = client();
  if (!sb) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
  const { data, error } = await sb.from('kol').select('*');
  if (error) throw error;
  return data || [];
}

// WIB (Asia/Jakarta) date helpers — the team works on Jakarta time.
const wibDay = (d = new Date()) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); // YYYY-MM-DD
function wibMonthLabel(d = new Date()) {
  const [y, m] = wibDay(d).split('-');
  return `${ID_MONTHS[+m - 1]} ${y}`;
}
const fmtRp = n => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');
const fmtRpShort = n => {
  n = Number(n) || 0;
  if (n >= 1e6) return 'Rp ' + (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + 'jt';
  if (n >= 1e3) return 'Rp ' + Math.round(n / 1e3) + 'rb';
  return n ? 'Rp ' + n : 'Rp 0';
};
const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// Mirror of the Command Center's nextStep() — who does what next.
function nextStep(k) {
  const wf = k.workflow || {};
  const hasMonth = !!(k.campaign_month || '').trim();
  const hasProd = !!(k.produk || '').trim();
  const s = k.status;
  if (s === 'CANCEL')    return { label: 'Dibatalkan', owner: '', stage: 'cancel' };
  if (s === 'HOLD')      return { label: 'Parked — tinjau bulan depan', owner: 'Hasna', stage: 'hold' };
  if (s === 'KANDIDAT')  return { label: 'Screening & mulai nego', owner: 'Hasna', stage: 'source' };
  if (s === 'NEGOSIASI') return { label: 'Follow up tawaran ke KOL', owner: 'Hasna', stage: 'nego' };
  if (s === 'PENDING')   return { label: 'Review & approve', owner: 'Alex', stage: 'approval' };
  if (s === 'DEAL' || s === 'BARTER') {
    if (!hasMonth)         return { label: 'Pilih bulan campaign', owner: 'Alex', stage: 'brief' };
    if (!hasProd)          return { label: 'Pilih produk / koleksi', owner: 'Alex', stage: 'brief' };
    if (!wf.brief_created) return { label: 'Buat brief', owner: 'Rahmi', stage: 'brief' };
    if (!wf.brief_sent)    return { label: 'Kirim brief ke KOL (WA)', owner: 'Rahmi', stage: 'send' };
    return { label: 'Selesai diproses', owner: '', stage: 'done' };
  }
  if (s === 'SELESAI')   return { label: 'Selesai', owner: '', stage: 'done' };
  return { label: '—', owner: '', stage: '' };
}

// Shared HTML shell (email-client-safe inline styles).
function shell(title, kicker, bodyHtml) {
  return `<!DOCTYPE html><html><body style="margin:0;background:#eef0f4;font-family:Arial,Helvetica,sans-serif;color:#22262e">
    <div style="max-width:640px;margin:0 auto;padding:24px 16px">
      <div style="background:#16233f;border-radius:14px 14px 0 0;padding:20px 24px">
        <div style="color:#ff7a1a;font-weight:800;font-size:18px;letter-spacing:-.3px">happy<span style="color:#fff">pumpkin</span></div>
        <div style="color:#9fb0d0;font-size:12px;margin-top:3px">${esc(kicker)}</div>
      </div>
      <div style="background:#fff;border-radius:0 0 14px 14px;padding:22px 24px">
        <div style="font-size:19px;font-weight:800;margin-bottom:14px">${esc(title)}</div>
        ${bodyHtml}
        <div style="margin-top:22px;padding-top:14px;border-top:1px solid #e6e9ef;font-size:11px;color:#8a929e">
          Otomatis dari KOL Command Center · <a href="https://hpsalesadmin.netlify.app/kol/index.html" style="color:#ff7a1a;text-decoration:none">Buka dashboard →</a>
        </div>
      </div>
    </div></body></html>`;
}
const row = (a, b) => `<tr><td style="padding:7px 0;border-bottom:1px solid #f1f3f7;font-size:13px">${a}</td><td style="padding:7px 0;border-bottom:1px solid #f1f3f7;font-size:13px;text-align:right;color:#5a6472">${b}</td></tr>`;
const pill = (t, c) => `<span style="display:inline-block;font-size:11px;font-weight:700;color:${c};background:${c}1a;border-radius:20px;padding:2px 9px">${esc(t)}</span>`;

// ── EOD daily digest (includes new KOLs added today) ──────────
function buildDailyDigest(kol) {
  const today = wibDay();
  const newToday = kol.filter(k => {
    const a = (k.workflow || {}).added_at;               // only manually-added rows carry this
    return a && wibDay(a) === today;                      // guard: don't default undefined → now
  });
  const count = st => kol.filter(k => (Array.isArray(st) ? st.includes(k.status) : k.status === st)).length;
  const curMo = wibMonthLabel();
  const cash = kol.filter(k => ['DEAL', 'BARTER', 'SELESAI'].includes(k.status) && (k.campaign_month || '').trim() === curMo)
    .reduce((s, k) => s + (Number(k.rate_cash) || 0), 0);
  const pct = Math.min(100, Math.round(cash / BUDGET_CEILING * 100));

  const newBlock = newToday.length ? `
    <div style="font-size:13px;font-weight:800;color:#1f9d6b;margin:6px 0 8px">➕ KOL baru hari ini (${newToday.length})</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
      ${newToday.map(k => row(
        `<b>@${esc(k.handle)}</b> ${k.nama ? '· ' + esc(k.nama) : ''} ${pill(k.status || 'KANDIDAT', '#7a52cc')}`,
        `${esc(k.tier || '—')}${k.niche ? ' · ' + esc(k.niche) : ''}${(k.workflow || {}).added_by ? '<br><span style="font-size:11px">oleh ' + esc(k.workflow.added_by) + '</span>' : ''}`
      )).join('')}
    </table>` : `<div style="font-size:13px;color:#8a929e;margin-bottom:18px">Tidak ada KOL baru ditambahkan hari ini.</div>`;

  const snapshot = `
    <div style="font-size:13px;font-weight:800;margin:6px 0 8px">📊 Snapshot pipeline</div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:18px">
      ${row('Deal aktif (DEAL + BARTER)', '<b>' + count(['DEAL', 'BARTER']) + '</b>')}
      ${row('Negosiasi', '<b>' + count('NEGOSIASI') + '</b>')}
      ${row('Menunggu keputusan (PENDING + HOLD)', '<b>' + count(['PENDING', 'HOLD']) + '</b>')}
      ${row('Kandidat pool', '<b>' + count('KANDIDAT') + '</b>')}
    </table>
    <div style="font-size:13px;font-weight:800;margin:6px 0 8px">💰 Budget ${esc(curMo)}</div>
    <table style="width:100%;border-collapse:collapse">
      ${row('Cash committed', `<b>${fmtRpShort(cash)}</b> / ${fmtRpShort(BUDGET_CEILING)} (${pct}%)`)}
    </table>`;

  const html = shell(`Ringkasan Harian — ${today}`, 'Laporan End-of-Day', newBlock + snapshot);
  const text = `Ringkasan Harian ${today}\nKOL baru hari ini: ${newToday.length}\nDeal aktif: ${count(['DEAL', 'BARTER'])} | Negosiasi: ${count('NEGOSIASI')} | Pending+Hold: ${count(['PENDING', 'HOLD'])} | Kandidat: ${count('KANDIDAT')}\nBudget ${curMo}: ${fmtRpShort(cash)} / ${fmtRpShort(BUDGET_CEILING)} (${pct}%)`;
  return { subject: `HP KOL · Ringkasan Harian ${today}`, html, text };
}

// ── Every-3-days action nudge (who needs to do what) ──────────
function buildActionsDigest(kol) {
  const active = kol.filter(k => k.status !== 'CANCEL');
  const OWNERS = { Alex: '#7a52cc', Hasna: '#1f9d6b', Rahmi: '#d98a00' };
  const groups = { Alex: [], Hasna: [], Rahmi: [] };
  active.forEach(k => {
    const ns = nextStep(k);
    if (ns.owner && groups[ns.owner]) groups[ns.owner].push({ k, label: ns.label });
  });
  const total = Object.values(groups).reduce((s, a) => s + a.length, 0);

  const body = total ? Object.keys(groups).map(owner => {
    const items = groups[owner];
    if (!items.length) return '';
    return `<div style="font-size:13px;font-weight:800;color:${OWNERS[owner]};margin:12px 0 8px">${owner} — ${items.length} tugas</div>
      <table style="width:100%;border-collapse:collapse">
        ${items.map(it => row(`<b>@${esc(it.k.handle)}</b> ${pill(it.k.status, OWNERS[owner])}`, esc(it.label))).join('')}
      </table>`;
  }).join('') : `<div style="font-size:14px;color:#1f9d6b;font-weight:700">✓ Semua bersih — tidak ada tindak lanjut tertunda.</div>`;

  const html = shell('Aksi Diperlukan', 'Pengingat tiap 3 hari', body);
  const lines = Object.keys(groups).flatMap(o => groups[o].map(it => `[${o}] @${it.k.handle} — ${it.label}`));
  const text = `Aksi Diperlukan (tiap 3 hari) — ${total} tugas\n` + (lines.join('\n') || 'Semua bersih.');
  return { subject: `HP KOL · Aksi Diperlukan (${total} tugas)`, html, text };
}

module.exports = { fetchKOL, buildDailyDigest, buildActionsDigest, wibDay };
