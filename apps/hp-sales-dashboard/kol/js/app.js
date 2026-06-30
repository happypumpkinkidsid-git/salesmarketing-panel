// ============================================================
// KOL Command Center — app logic
// Single-page, consolidated: Latest Update (top) → Glance → Juni →
// Tracker (decisions + rate card + negotiation in a drawer) → Pool.
// ============================================================

const BUDGET_CEILING = 15_000_000;        // Rp 15jt / month
const DECISIONS = ['', 'Approve', 'Hold', 'Defer', 'Disapprove'];
const STATUSES  = ['KANDIDAT','PENDING','HOLD','NEGOSIASI','DEAL','BARTER','SELESAI','CANCEL'];
const BRIEFS    = ['', 'Soft-selling', 'Mid-selling', 'Hard-selling'];
const CONTENT_STYLES = [['','— (auto)'],['Educational','Educational / tips'],['Fashion','Fashion / OOTD'],['Baby','Baby / Newborn'],['Sleep','Sleep / Bedtime'],['FamilyVlog','Family-Vlog'],['Mom','Mom / Lifestyle']];
const FAMILY_SIT     = ['', 'Solo', 'Sibling', 'Twins'];
const RATE_FORMATS = [
  ['reels','Reels'], ['vt','Video / VT'], ['story','Story'],
  ['owning','Owning / Mention'], ['keranjang','Keranjang Kuning'], ['taplink','Taplink'],
];
// Deal-rate approval pills (drive Status); reject reasons; scope content types.
const RATE_PILLS = [['DEAL','DEAL'], ['nego_awal','Nego Awal'], ['nego_ulang','Nego Ulang'], ['REJECT','Reject']];
const REJECT_REASONS = ['Terlalu Mahal', 'Tidak Lolos Tes Organik', 'Hold ke bulan depan'];
const PKS_TYPES = ['Tiktok Video', 'IG Reels', 'IG Story', 'Add on Taplink Story', 'IG Post', 'IG Carousel', 'Shopee Video', 'Collab Post', 'Content Owning'];
const BRIEF_TO_TIER = { 'Soft-selling': 'soft', 'Mid-selling': 'mid', 'Hard-selling': 'hard' };

// ── Workflow engine ───────────────────────────────────────────
const MONTHS_OPTS = ['', 'Juni 2026','Juli 2026','Agustus 2026','September 2026','Oktober 2026','November 2026','Desember 2026'];
const WF_OWNER = { Alex:{c:'#7a52cc',bg:'#f0ecfa'}, Hasna:{c:'#1f9d6b',bg:'#e6f6ef'}, Rahmi:{c:'#d98a00',bg:'#fff3df'} };
const WF_STAGES = [['source','Sourcing'],['nego','Nego'],['approval','Approval'],['brief','Brief Prep'],['send','Kirim'],['done','Selesai']];
// user product terms → KB collection id
const COLLECTION_ALIASES = {
  pureknit:['pureknit'], ultracool:['ultracool','ultra cool'], active:['activeknit','active knit'],
  knitfashion:['knitted fashion','knitfashion','fashion'], woven:['woven','kemeja','collared shirt'],
  play:['playwear'], basic:['basicwear','essential','basic'], denim:['denim','soft denim'],
  sleep:['sleepwear','wonder set','wonderset','piyama','pajama','sleep'], breathe:['breatheknit','breathe knit','pointelle'],
  softair:['softair','soft air','bamboo'], batik:['batik','kebaya'], raya:['raya','koko','gamis','lebaran','modest'],
};
function collectionOn(produk, cid) {
  const p = (produk || '').toLowerCase();
  return (COLLECTION_ALIASES[cid] || []).some(a => p.includes(a));
}
function nextStep(k) {
  const wf = k.workflow || {};
  const hasMonth = !!(k.campaign_month || '').trim();
  const hasProd  = !!(k.produk || '').trim();
  const s = k.status;
  if (s === 'CANCEL')    return { label:'Dibatalkan', owner:'', stage:'cancel' };
  if (s === 'HOLD')      return { label:'Parked — PR Pack / tinjau nanti', owner:'Hasna', stage:'hold' };
  if (s === 'KANDIDAT')  return { label:'Screening & mulai nego', owner:'Hasna', stage:'source' };
  if (s === 'NEGOSIASI') return { label:'Follow up tawaran ke KOL', owner:'Hasna', stage:'nego' };
  if (s === 'PENDING')   return { label:'Review & approve', owner:'Alex', stage:'approval' };
  if (s === 'DEAL' || s === 'BARTER') {
    if (!hasMonth)        return { label:'Pilih bulan campaign', owner:'Alex', stage:'brief' };
    if (!hasProd)         return { label:'Pilih produk / koleksi', owner:'Alex', stage:'brief' };
    if (!wf.brief_created)return { label:'Buat brief', owner:'Rahmi', stage:'brief' };
    if (!wf.brief_sent)   return { label:'Kirim brief ke KOL (WA)', owner:'Rahmi', stage:'send' };
    return { label:'Selesai diproses', owner:'', stage:'done' };
  }
  if (s === 'SELESAI')   return { label:'Selesai', owner:'', stage:'done' };
  return { label:'—', owner:'', stage:'' };
}
function nextStepTag(k) {
  const ns = nextStep(k);
  const o = WF_OWNER[ns.owner];
  return o ? `<span class="ns-pill" style="background:${o.bg};color:${o.c}">${ns.owner} · ${esc(ns.label)}</span>`
           : `<span class="ns-pill ns-muted">${esc(ns.label)}</span>`;
}
// advance buttons per status
function advanceBtns(id, k) {
  const s = k.status, b = [];
  const B = (st, lbl, cls='') => `<button class="wf-btn ${cls}" onclick="advanceStatus('${id}','${st}')">${lbl}</button>`;
  if (s === 'KANDIDAT')  b.push(B('NEGOSIASI','→ Mulai Nego'));
  if (s === 'NEGOSIASI') b.push(B('PENDING','→ Ajukan ke Alex'));
  if (s === 'PENDING') { b.push(`<button class="wf-btn ok" onclick="advanceStatus('${id}','DEAL','Approve')">✓ Approve</button>`); b.push(B('CANCEL','✗ Tolak','danger')); }
  if ((s === 'DEAL' || s === 'BARTER') && nextStep(k).stage === 'done') b.push(B('SELESAI','→ Tandai Selesai','ok'));
  return b.join('');
}

// ── helpers ───────────────────────────────────────────────────
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => (s == null ? '' : String(s)).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// safe single-quoted JS string literal for inline onclick="…" attributes (handles
// quotes/backslashes/newlines so custom values can't break the attribute)
const jsq = s => "'" + String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ') + "'";
const fmtRp = n => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');
const fmtRpShort = n => {
  n = Number(n) || 0;
  if (n >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0) + 'jt';
  if (n >= 1_000)     return 'Rp ' + Math.round(n / 1_000) + 'rb';
  return n ? 'Rp ' + n : '—';
};
const fmtDateTime = iso => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' }) +
         ' · ' + d.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
};
const today = () => new Date().toISOString().slice(0, 10);
const initials = h => (h || '?').replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();

function statusClass(s) { return 'st-' + (s || 'KANDIDAT').toLowerCase(); }
function decisionClass(d) { return 'dc-' + (d || 'none').toLowerCase(); }

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2200);
}

// committed cash = DEAL/BARTER/SELESAI rate_cash
function committedCash() {
  return KOLStore.kol
    .filter(k => ['DEAL','BARTER','SELESAI'].includes(k.status))
    .reduce((s, k) => s + (Number(k.rate_cash) || 0), 0);
}
function committedBarter() {
  return KOLStore.kol
    .filter(k => ['DEAL','BARTER','SELESAI'].includes(k.status))
    .reduce((s, k) => s + (Number(k.rate_barter) || 0), 0);
}

// ── INIT ──────────────────────────────────────────────────────
async function boot() {
  const mode = await KOLStore.init();
  const badge = $('#modeBadge');
  if (mode === 'backend') { badge.textContent = '● Shared (live)'; badge.className = 'mode-badge online'; }
  else { badge.textContent = '● Local (this device)'; badge.className = 'mode-badge local'; }
  renderAll();
}

function renderAll() {
  renderLatestUpdate();
  renderKPIs();
  renderJuni();
  renderTracker();
  renderPool();
}

// ── §1 LATEST UPDATE (top) ────────────────────────────────────
function renderLatestUpdate() {
  const lu = KOLStore.latestUpdate();
  const kol = KOLStore.kol;
  const deals = kol.filter(k => ['DEAL','BARTER'].includes(k.status)).length;
  const nego  = kol.filter(k => k.status === 'NEGOSIASI').length;
  const pend  = kol.filter(k => ['PENDING','HOLD'].includes(k.status)).length;
  const cash  = committedCash();

  const summary =
    `<b>${deals}</b> deal terkonfirmasi · <b>${nego}</b> negosiasi · <b>${pend}</b> menunggu keputusan · ` +
    `<b>${fmtRpShort(cash)}</b> cash committed dari ${fmtRpShort(BUDGET_CEILING)}`;

  $('#latestUpdate').innerHTML = `
    <div class="lu-head">
      <div>
        <div class="lu-kicker">Latest Update untuk Hasna</div>
        <div class="lu-summary">${summary}</div>
      </div>
      <div class="lu-stamp">${lu ? 'Diperbarui ' + fmtDateTime(lu.at) + (lu.by ? ' · ' + esc(lu.by) : '') : 'Belum ada catatan'}</div>
    </div>
    <div class="lu-note">${lu && lu.text ? esc(lu.text).replace(/\n/g,'<br>') : '<span class="muted">Tulis update terbaru untuk Hasna di sini…</span>'}</div>
    <div class="lu-edit">
      <textarea id="luText" rows="2" placeholder="Catatan / keputusan terbaru untuk Hasna…">${lu ? esc(lu.text) : ''}</textarea>
      <div class="lu-edit-row">
        <input id="luBy" type="text" placeholder="Nama kamu" value="${lu ? esc(lu.by || '') : ''}">
        <button class="btn btn-primary" onclick="saveLatestUpdate()">Simpan Update</button>
      </div>
    </div>`;
}

async function saveLatestUpdate() {
  const text = $('#luText').value.trim();
  const by   = $('#luBy').value.trim();
  await KOLStore.setLatestUpdate(text, by);
  toast('Latest Update tersimpan');
  renderLatestUpdate();
}

// ── §2 AT A GLANCE ────────────────────────────────────────────
function renderKPIs() {
  const kol = KOLStore.kol;
  const deals  = kol.filter(k => ['DEAL','BARTER'].includes(k.status)).length;
  const nego   = kol.filter(k => k.status === 'NEGOSIASI').length;
  const pend   = kol.filter(k => ['PENDING','HOLD'].includes(k.status)).length;
  const cands  = kol.filter(k => k.status === 'KANDIDAT').length;
  const cash   = committedCash();
  const barter = committedBarter();
  const pct    = Math.min(100, Math.round(cash / BUDGET_CEILING * 100));
  const over   = cash > BUDGET_CEILING;

  $('#kpis').innerHTML = `
    ${kpi('Deal aktif', deals, 'cash + barter', 'accent')}
    ${kpi('Negosiasi', nego, 'sedang berjalan', 'amber')}
    ${kpi('Menunggu keputusan', pend, 'pending + hold', 'blue')}
    ${kpi('Kandidat pool', cands, 'belum diproses', 'muted')}
    <div class="kpi kpi-budget ${over ? 'over' : ''}">
      <div class="kpi-label">Cash committed</div>
      <div class="kpi-num">${fmtRpShort(cash)}</div>
      <div class="kpi-bar"><span style="width:${pct}%"></span></div>
      <div class="kpi-sub">${pct}% dari ${fmtRpShort(BUDGET_CEILING)} · barter ${fmtRpShort(barter)}</div>
    </div>`;
}
function kpi(label, num, sub, tone) {
  return `<div class="kpi tone-${tone}">
    <div class="kpi-label">${label}</div>
    <div class="kpi-num">${num}</div>
    <div class="kpi-sub">${sub}</div></div>`;
}

// ── §3 ACTIVE CAMPAIGN — kanban board by workflow stage ───────
// Whole active pipeline (everyone except CANCEL), bucketed by nextStep().stage,
// each card colour-coded by whose job is next (Alex=purple, Hasna=green, Rahmi=amber).
function renderJuni() {
  const active = KOLStore.kol.filter(k => k.status !== 'CANCEL');
  $('#juniCount').textContent = active.length;
  const COLS = [...WF_STAGES, ['hold', 'Hold']];   // 6 stages + a muted Hold column
  const buckets = {}; COLS.forEach(([key]) => buckets[key] = []);
  active.forEach(k => {
    const st = nextStep(k).stage;
    (buckets[st] || buckets.source).push(k);
  });
  $('#juni').innerHTML = `<div class="kanban">${COLS.map(([key, label]) => {
    const items = (buckets[key] || []).sort((a, b) => (b.rate_cash || 0) - (a.rate_cash || 0));
    if (key === 'hold' && !items.length) return '';
    return `<div class="kb-col${key === 'hold' ? ' kb-col-hold' : ''}">
      <div class="kb-col-head"><span>${label}</span><span class="kb-col-n">${items.length}</span></div>
      <div class="kb-col-body">${items.map(kanbanCard).join('') || '<div class="kb-empty">—</div>'}</div>
    </div>`;
  }).join('')}</div>`;
}
function kanbanCard(k) {
  const ns = nextStep(k);
  const o = WF_OWNER[ns.owner];
  const accent = o ? o.c : '#9aa3b5';
  const bg = o ? o.bg : '#eef0f5';
  return `<div class="kb-card" style="border-left-color:${accent}" onclick="openDrawer('${k.id}')">
    <div class="kb-card-top">
      <span class="kb-card-handle">@${esc(k.handle)}</span>
      <span class="chip ${statusClass(k.status)}">${esc(k.status)}</span>
    </div>
    <div class="kb-card-tier">${esc(k.tier || '—')}${k.rate_cash ? ' · ' + fmtRpShort(k.rate_cash) : ''}</div>
    <div class="kb-card-next" style="background:${bg};color:${accent}">${ns.owner ? esc(ns.owner) + ' · ' : ''}${esc(ns.label)}</div>
  </div>`;
}

// ── §4 KOL TRACKER (management decisions) ─────────────────────
let trackerFilter = 'working';
function trackerSet() {
  const all = KOLStore.kol;
  if (trackerFilter === 'all') return all;
  if (trackerFilter === 'working')
    return all.filter(k => k.in_juni || k.status !== 'KANDIDAT' || k.decision);
  return all.filter(k => k.status === trackerFilter);
}
function setTrackerFilter(f, btn) {
  trackerFilter = f;
  $$('.tk-filter').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderTracker();
}

function renderTracker() {
  const rows = trackerSet().sort((a, b) => {
    const order = { DEAL:0, BARTER:1, NEGOSIASI:2, PENDING:3, HOLD:4, SELESAI:5, CANCEL:6, KANDIDAT:7 };
    return (order[a.status] - order[b.status]) || (b.rate_cash - a.rate_cash);
  });
  $('#trackerCount').textContent = rows.length;
  $('#trackerBody').innerHTML = rows.map(k => `
    <tr onclick="openDrawer('${k.id}')">
      <td class="tk-kol">
        <div class="avatar sm">${initials(k.handle)}</div>
        <div><div class="tk-handle">@${esc(k.handle)}</div>
        <div class="tk-tier">${esc(k.tier || '—')}${k.in_juni ? ' · <span class="juni-dot">Juni</span>' : ''}</div></div>
      </td>
      <td><span class="chip ${statusClass(k.status)}">${esc(k.status)}</span></td>
      <td class="tk-next">${nextStepTag(k)}</td>
      <td>${k.decision ? `<span class="chip ${decisionClass(k.decision)}">${esc(k.decision)}</span>` : '<span class="muted">—</span>'}</td>
      <td>${k.brief_type ? `<span class="brief-tag brief-${k.brief_type.split('-')[0].toLowerCase()}">${esc(k.brief_type)}</span>` : '<span class="muted">—</span>'}</td>
      <td class="tk-prod">${esc(k.produk || '—')}</td>
      <td>${esc(k.campaign_month || '—')}</td>
      <td class="tk-num">${k.rate_cash ? fmtRpShort(k.rate_cash) : '—'}</td>
      <td class="tk-num">${k.rate_barter ? fmtRpShort(k.rate_barter) : '—'}</td>
      <td class="tk-date">${k.decision_date || '<span class="muted">—</span>'}</td>
      <td class="tk-go">›</td>
    </tr>`).join('') || `<tr><td colspan="11" class="muted" style="text-align:center;padding:24px">Tidak ada KOL di filter ini.</td></tr>`;
}

// ── §5 KOL POOL (sourcing) ────────────────────────────────────
let poolSearch = '', poolTier = '', poolStatus = '';
function renderPool() {
  let rows = KOLStore.kol.slice();
  if (poolSearch)  rows = rows.filter(k => (k.handle + ' ' + (k.nama||'') + ' ' + (k.niche||'')).toLowerCase().includes(poolSearch));
  if (poolTier)    rows = rows.filter(k => k.tier === poolTier);
  if (poolStatus)  rows = rows.filter(k => k.status === poolStatus);
  rows.sort((a, b) => a.handle.localeCompare(b.handle));

  $('#poolCount').textContent = rows.length;
  $('#poolBody').innerHTML = rows.map(k => `
    <tr onclick="openDrawer('${k.id}')">
      <td class="tk-kol"><div class="avatar sm">${initials(k.handle)}</div>
        <div><div class="tk-handle">@${esc(k.handle)}</div><div class="tk-tier">${esc(k.tier||'—')}</div></div></td>
      <td>${esc(k.platform)}</td>
      <td><span class="chip ${statusClass(k.status)}">${esc(k.status)}</span></td>
      <td class="tk-prod">${esc(k.ratecard_orig || '—')}</td>
      <td>${k.kontak_wa ? `<a href="https://wa.me/${esc(k.kontak_wa.replace(/[^0-9]/g,''))}" target="_blank" rel="noopener" onclick="event.stopPropagation()">WA ↗</a>` : '<span class="muted">—</span>'}</td>
      <td class="tk-go">›</td>
    </tr>`).join('');

  // populate tier filter once
  const tierSel = $('#poolTier');
  if (tierSel && tierSel.options.length <= 1) {
    const tiers = [...new Set(KOLStore.kol.map(k => k.tier).filter(Boolean))].sort();
    tierSel.innerHTML = '<option value="">Semua Tier</option>' + tiers.map(t => `<option>${esc(t)}</option>`).join('');
  }
}
function onPoolSearch(v) { poolSearch = v.toLowerCase().trim(); renderPool(); }
function onPoolTier(v)   { poolTier = v; renderPool(); }
function onPoolStatus(v) { poolStatus = v; renderPool(); }

// ── DRAWER (consolidated edit: decision + rate card + negotiation) ──
let drawerId = null;
function openDrawer(id) {
  const k = KOLStore.kolById(id); if (!k) return;
  drawerId = id;
  const rc = k.rate_card || {};
  const pkg = RATE_FORMATS.reduce((s, [key]) => s + (Number(rc[key]) || 0), 0);
  const negs = KOLStore.negotiationsFor(id);
  const rec = (window.KOL_INTEL) ? KOL_INTEL.recommendFor(k) : null;

  // ── workflow panel ──
  const ns = nextStep(k);
  const curIdx = WF_STAGES.findIndex(s => s[0] === ns.stage);
  const isDeal = (k.status === 'DEAL' || k.status === 'BARTER');
  const wf = k.workflow || {};
  const pks = wf.pks || [];
  const ratePill = activeRatePill(k);
  const tick = (on, label, who) => `<div class="wf-item ${on?'done':''}"><span class="wf-tick">${on?'☑':'☐'}</span>${label}<span class="wf-who">${who}</span></div>`;
  const tickBox = (key, label, who) => `<label class="wf-item ${wf[key]?'done':''}"><input type="checkbox" ${wf[key]?'checked':''} onchange="toggleWf('${id}','${key}',this.checked)"><span></span>${label}<span class="wf-who">${who}</span></label>`;
  const wfChecklist = isDeal ? `<div class="wf-check">
      ${tick(!!(k.campaign_month||'').trim(),'Bulan campaign','Alex')}
      ${tick(!!(k.produk||'').trim(),'Produk / koleksi','Alex')}
      ${tickBox('brief_created','Brief dibuat','Rahmi')}
      ${tickBox('brief_sent','Brief dikirim ke KOL','Rahmi')}
    </div>` : '';
  // ── brief attach (DEAL/BARTER): upload generated brief → auto hands to Rahmi ──
  const briefUrl = wf.brief_url || '';
  const briefBox = isDeal ? `
    <div class="dr-brief ${briefUrl ? 'has' : ''}">
      <div class="dr-brief-lbl">📄 Brief PDF <span class="dr-hint">unggah hasil brief → otomatis diteruskan ke Rahmi</span></div>
      ${briefUrl ? `
        <div class="dr-brief-row">
          <a class="dr-brief-link" href="${esc(briefUrl)}" target="_blank" rel="noopener">📄 Lihat / unduh brief ↗</a>
          <label class="dr-brief-replace">Ganti<input type="file" accept="application/pdf,text/html,image/*" onchange="briefAttach('${id}',this)"></label>
        </div>
        <div class="dr-brief-note">Tersimpan${wf.brief_at ? ` · ${fmtDateTime(wf.brief_at)}` : ''}. Next: <b>Rahmi</b> kirim ke KOL (WA), lalu centang "Brief dikirim".</div>
      ` : `
        <label class="dr-brief-up">
          <input type="file" accept="application/pdf,text/html,image/*" onchange="briefAttach('${id}',this)">
          <span class="dr-brief-cta">📎 Lampirkan Brief PDF</span>
        </label>
        <div class="dr-brief-note">Setelah dilampirkan, "Brief dibuat" otomatis tercentang & langkah berikutnya jadi <b>Rahmi · kirim ke KOL</b>.</div>
      `}
    </div>` : '';
  const offramp = (ns.stage === 'cancel' || ns.stage === 'hold');
  const wfHtml = `
    <div class="wf-card ${offramp?'wf-off':''}">
      ${offramp ? '' : `<div class="wf-track">${WF_STAGES.map((s,i)=>`<div class="wf-step ${i<=curIdx?'on':''} ${s[0]===ns.stage?'cur':''}"><span class="wf-dot"></span><span class="wf-lbl">${s[1]}</span></div>`).join('')}</div>`}
      <div class="wf-next"><span class="wf-next-k">Next</span> ${nextStepTag(k)}</div>
      ${wfChecklist}
      ${advanceBtns(id,k) ? `<div class="wf-actions">${advanceBtns(id,k)}</div>` : ''}
    </div>`;

  // ── products / collections checklist ──
  const prodHtml = `
    <div class="dr-prodsel">
      <div class="dr-prodsel-lbl">Produk / Koleksi <span class="dr-hint">untuk brief</span></div>
      <div class="dr-prodsel-chips">
        ${(window.HP_PRODUCT_DB && HP_PRODUCT_DB.collections || []).map(c => {
          const on = collectionOn(k.produk, c.id);
          return `<label class="prodchip ${on?'on':''}"><input type="checkbox" ${on?'checked':''} onchange="toggleCollection('${id}','${c.id}',this.checked)">${esc(c.name)}</label>`;
        }).join('')}
      </div>
      ${(k.produk||'').trim() ? `<div class="dr-prodsel-cur">Terpilih: ${esc(k.produk)}</div>` : ''}
    </div>`;

  $('#drawer').innerHTML = `
    <div class="dr-head">
      <div class="dr-id">
        <div class="avatar lg">${initials(k.handle)}</div>
        <div>
          <div class="dr-handle">@${esc(k.handle)}</div>
          <div class="dr-sub">${esc(k.tier || '—')} · ${esc(k.platform)}${k.in_juni ? ' · <span class="juni-dot">Juni</span>' : ''}</div>
        </div>
      </div>
      <button class="dr-close" onclick="closeDrawer()">✕</button>
    </div>
    <div class="dr-body">

      ${wfHtml}
      ${briefBox}

      <div class="dr-grid">
        <label>Status
          <select onchange="patchField('${id}','status',this.value)">
            ${STATUSES.map(s => `<option ${s===k.status?'selected':''}>${s}</option>`).join('')}
          </select></label>
        <label>Bulan Campaign
          <select onchange="patchField('${id}','campaign_month',this.value)">
            ${MONTHS_OPTS.map(m => `<option value="${m}" ${m===(k.campaign_month||'')?'selected':''}>${m||'— pilih bulan'}</option>`).join('')}
          </select></label>
        <label>Tipe Brief
          <select onchange="patchField('${id}','brief_type',this.value)">
            ${BRIEFS.map(b => `<option value="${b}" ${b===(k.brief_type||'')?'selected':''}>${b||'—'}</option>`).join('')}
          </select></label>
        <label>Tgl Keputusan
          <input type="date" value="${k.decision_date||''}" onchange="patchField('${id}','decision_date',this.value)"></label>
      </div>

      ${prodHtml}

      <div class="dr-grid" style="margin-top:11px">
        <label>Content Style <span class="dr-hint">consideration</span>
          <select onchange="patchConsideration('${id}','content_style',this.value)">
            ${CONTENT_STYLES.map(([v,l]) => `<option value="${v}" ${v===(k.content_style||'')?'selected':''}>${l}</option>`).join('')}
          </select></label>
        <label>Family
          <select onchange="patchConsideration('${id}','family_situation',this.value)">
            ${FAMILY_SIT.map(v => `<option value="${v}" ${v===(k.family_situation||'')?'selected':''}>${v||'— (auto)'}</option>`).join('')}
          </select></label>
      </div>

      <!-- DEAL RATE -->
      <div class="dr-section">💰 Deal Rate</div>
      <div class="dr-deal-rate">
        <label>Cash Value
          <div class="rp-inp"><span>Rp</span><input type="number" min="0" step="50000" value="${k.rate_cash||''}" placeholder="0" onchange="patchField('${id}','rate_cash',+this.value)"></div></label>
        <label>Barter Value
          <div class="rp-inp"><span>Rp</span><input type="number" min="0" step="50000" value="${k.rate_barter||''}" placeholder="0" onchange="patchField('${id}','rate_barter',+this.value)"></div></label>
      </div>
      ${k.ratecard_orig ? `<div class="dr-rate-src">📋 Dari sheet: <b>${esc(k.ratecard_orig)}</b></div>` : ''}
      <div class="dr-rate-pills">
        ${RATE_PILLS.map(([key,lbl]) => `<button class="rate-pill rp-${key.replace('_','-')} ${ratePill===key?'on':''}" onclick="setRatePill('${id}','${key}')">${lbl}</button>`).join('')}
      </div>
      ${(k.status === 'CANCEL' || ratePill === 'REJECT') ? `
      <div class="dr-reject">
        <div class="dr-reject-lbl">Alasan Reject</div>
        <div class="dr-reject-pills">
          ${REJECT_REASONS.map(r => `<button class="reject-pill ${wf.reject_reason===r?'on':''}" onclick="setRejectReason('${id}',${jsq(r)})">${esc(r)}</button>`).join('')}
        </div>
        ${wf.reject_reason==='Hold ke bulan depan' ? `<div class="dr-reject-note">→ dipindah ke HOLD &amp; bulan berikutnya; kamu akan diingatkan.</div>` : ''}
      </div>` : ''}

      <!-- SCOPE KERJASAMA (PKS) -->
      <div class="dr-section">📋 Scope Kerjasama (PKS) <span class="dr-section-sub">jenis konten + jumlah</span></div>
      <div class="dr-pks">
        ${pks.length ? pks.map(p => `
          <div class="pks-item">
            <span class="pks-type">${esc(p.type)}</span>
            <input class="pks-qty" type="number" min="0" value="${p.qty}" onchange="pksQty('${id}',${jsq(p.type)},this.value)">
            <button class="pks-x" onclick="pksRemove('${id}',${jsq(p.type)})">✕</button>
          </div>`).join('') : '<div class="muted" style="font-size:12px;padding:4px 0">Belum ada scope.</div>'}
        <div class="pks-add">
          <select id="pksSel_${id}">
            <option value="">+ Tambah jenis konten…</option>
            ${PKS_TYPES.filter(t => !pks.some(p => p.type === t)).map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}
            <option value="__custom__">✏️ Ketik sendiri…</option>
          </select>
          <button class="pks-add-btn" onclick="pksAdd('${id}', document.getElementById('pksSel_${id}').value)">Tambah</button>
        </div>
      </div>

      <label class="dr-full">📦 Produk Dikirim <span class="dr-hint">dari Google Sheet</span>
        <input type="text" value="${esc(wf.produk_dikirim || '')}" placeholder="produk yang dikirim ke KOL…" onchange="patchDikirim('${id}',this.value)"></label>

      <label class="dr-full">Angle / Tema Utama <span class="dr-hint">kosong = Diserahkan ke creator</span>
        <textarea rows="2" placeholder="Kosongkan untuk beri kebebasan kreator…" onchange="patchField('${id}','angle',this.value)">${esc(k.angle||'')}</textarea></label>
      <label class="dr-full">Reference Content Link
        <input type="text" value="${esc(k.ref_link||'')}" placeholder="https://instagram.com/reel/…" onchange="patchField('${id}','ref_link',this.value)"></label>

      ${rec ? `
      <details class="fit-details">
        <summary><span class="fit-kicker">✦ Creative Fit</span> <span class="fit-sub">panduan — tidak otomatis ke brief</span></summary>
        <div class="fit-card-inner">
          <div class="fit-tags">
            <span class="fit-tag">${esc(rec.contentLabel)}</span>
            ${rec.family !== 'Solo' ? `<span class="fit-tag fit-fam">${rec.family === 'Twins' ? '👯 Twins' : '👫 Sibling'}</span>` : ''}
            <span class="fit-tag fit-trig">${esc(rec.trigger)}</span>
          </div>
          <div class="fit-row"><span class="fit-k">Brief disarankan</span><span class="fit-v"><b>${esc(rec.briefType)}</b> <span class="muted">· ${esc(rec.briefBasis)}</span></span></div>
          <div class="fit-row"><span class="fit-k">Produk klop</span><span class="fit-v">${rec.products.slice(0,4).map(p => `<span class="fit-prod">${esc(p)}</span>`).join('')}</span></div>
          <div class="fit-row"><span class="fit-k">Arah angle</span><span class="fit-v">${esc(rec.angle)}</span></div>
          ${rec.collection ? `<div class="fit-row"><span class="fit-k">Koleksi KB</span><span class="fit-v"><b>${esc(rec.collection.name)}</b></span></div>` : ''}
          <details class="fit-why"><summary>kenapa?</summary><ul>${rec.rationale.map(r => `<li>${r.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')}</li>`).join('')}</ul></details>
        </div>
      </details>` : ''}

      <!-- NOTES -->
      <div class="dr-section">📝 Catatan <span class="dr-section-sub">internal — tidak masuk brief</span></div>
      <label class="dr-full">Notes untuk Hasna
        <textarea rows="2" onchange="patchField('${id}','notes_hasna',this.value)">${esc(k.notes_hasna||'')}</textarea></label>
      <label class="dr-full">Internal notes
        <textarea rows="2" onchange="patchField('${id}','internal_notes',this.value)">${esc(k.internal_notes||'')}</textarea></label>

      <div class="dr-contact">
        ${k.ig_link ? `<a href="${esc(k.ig_link)}" target="_blank" rel="noopener">Instagram ↗</a>` : ''}
        ${k.kontak_wa ? `<a href="https://wa.me/${esc(k.kontak_wa.replace(/[^0-9]/g,''))}" target="_blank" rel="noopener">WhatsApp ↗</a>` : ''}
      </div>

      <button class="dr-brief-cta ${isDeal && (k.campaign_month||'').trim() && (k.produk||'').trim() ? 'ready' : 'wait'}" onclick="openBriefHandoff('${id}')">
        ✦ Buat Brief di Generator →
      </button>
      ${isDeal && (k.campaign_month||'').trim() && (k.produk||'').trim()
        ? `<div class="dr-brief-cta-hint ok">Semua kotak penting terisi — siap dibuatkan brief.</div>`
        : `<div class="dr-brief-cta-hint">Lengkapi <b>Status DEAL</b>, <b>Bulan</b>, &amp; <b>Produk</b> agar konteks ter-map penuh ke generator.</div>`}
    </div>`;
  $('#drawerWrap').classList.add('open');
}
function closeDrawer() { $('#drawerWrap').classList.remove('open'); drawerId = null; }

function renderNegList(negs) {
  if (!negs.length) return '<div class="muted" style="padding:8px 0">Belum ada negosiasi.</div>';
  return negs.map(n => `
    <div class="neg-item ${n.agreed ? 'agreed' : ''}">
      <div class="neg-item-head">
        <b>Ronde ${n.round || '—'}</b> · ${esc(n.log_date || '')}
        ${n.agreed ? '<span class="chip st-deal">DEAL</span>' : ''}
        ${n.logged_by ? `<span class="muted">· ${esc(n.logged_by)}</span>` : ''}
      </div>
      <div class="neg-item-money">
        HP: ${fmtRpShort(n.hp_cash)}${n.hp_barter ? ' + ' + fmtRpShort(n.hp_barter) : ''}
        &nbsp;↔&nbsp; KOL: ${fmtRpShort(n.kol_cash)}${n.kol_barter ? ' + ' + fmtRpShort(n.kol_barter) : ''}
      </div>
      ${n.notes ? `<div class="neg-item-notes">${esc(n.notes)}</div>` : ''}
      ${n.next_step ? `<div class="neg-item-next">→ ${esc(n.next_step)}</div>` : ''}
    </div>`).join('');
}

// ── drawer actions ────────────────────────────────────────────
async function patchField(id, field, val) {
  await KOLStore.patchKOL(id, { [field]: val });
  renderKPIs(); renderLatestUpdate(); renderJuni(); renderTracker(); renderPool();
}
// set a consideration field (content_style / family_situation) → recompute Creative Fit
async function patchConsideration(id, field, val) {
  await KOLStore.patchKOL(id, { [field]: val });
  openDrawer(id); renderTracker();
}
// ── workflow handlers ──
async function advanceStatus(id, status, decision) {
  const patch = { status };
  if (decision) { patch.decision = decision; patch.decision_date = new Date().toISOString().slice(0, 10); }
  await KOLStore.patchKOL(id, patch);
  openDrawer(id); renderTracker(); renderJuni(); renderKPIs(); renderLatestUpdate(); renderPool();
  toast('Status → ' + status);
}
async function toggleWf(id, key, val) {
  const k = KOLStore.kolById(id); if (!k) return;
  const wf = Object.assign({}, k.workflow || {}); wf[key] = val;
  await KOLStore.patchKOL(id, { workflow: wf });
  openDrawer(id); renderTracker();
}
async function toggleCollection(id, cid, on) {
  const k = KOLStore.kolById(id); const db = window.HP_PRODUCT_DB; if (!k || !db) return;
  const names = [];
  db.collections.forEach(c => {
    const sel = (c.id === cid) ? on : collectionOn(k.produk, c.id);
    if (sel) names.push(c.name);
  });
  await KOLStore.patchKOL(id, { produk: names.join(', ') });
  openDrawer(id); renderTracker(); renderJuni();
}

// ── Deal Rate approval pills (drive Status) ──
function activeRatePill(k) {
  const wf = k.workflow || {};
  if (k.status === 'DEAL' || k.status === 'BARTER') return 'DEAL';
  if (k.status === 'CANCEL') return 'REJECT';
  if (k.status === 'NEGOSIASI') return wf.rate_stage === 'ulang' ? 'nego_ulang' : 'nego_awal';
  return '';
}
function nextMonthOf(m) {
  const i = MONTHS_OPTS.indexOf(m);
  if (i > 0 && i < MONTHS_OPTS.length - 1) return MONTHS_OPTS[i + 1];
  if (i <= 0) return MONTHS_OPTS[1];          // blank/first → first real month
  return MONTHS_OPTS[MONTHS_OPTS.length - 1]; // already last → stay
}
async function setRatePill(id, pill) {
  const k = KOLStore.kolById(id); if (!k) return;
  const wf = Object.assign({}, k.workflow || {});
  let patch;
  if (pill === 'DEAL')            patch = { status: 'DEAL',   decision: 'Approve',    decision_date: today() };
  else if (pill === 'REJECT')     patch = { status: 'CANCEL', decision: 'Disapprove', decision_date: today() };
  else if (pill === 'nego_awal')  { wf.rate_stage = 'awal';  patch = { status: 'NEGOSIASI', workflow: wf }; }
  else if (pill === 'nego_ulang') { wf.rate_stage = 'ulang'; patch = { status: 'NEGOSIASI', workflow: wf }; }
  else return;
  await KOLStore.patchKOL(id, patch);
  openDrawer(id); renderTracker(); renderJuni(); renderKPIs(); renderLatestUpdate(); renderPool();
  toast('Rate: ' + (RATE_PILLS.find(p => p[0] === pill)?.[1] || pill));
}
async function setRejectReason(id, reason) {
  const k = KOLStore.kolById(id); if (!k) return;
  const wf = Object.assign({}, k.workflow || {}); wf.reject_reason = reason;
  if (reason === 'Hold ke bulan depan') {
    const nm = nextMonthOf(k.campaign_month);
    wf.hold_remind = true;
    await KOLStore.patchKOL(id, { status: 'HOLD', campaign_month: nm, workflow: wf });
    try { await KOLStore.setLatestUpdate(`⏰ @${k.handle} di-hold ke ${nm || 'bulan depan'} — ingatkan lagi.`, aiByName()); } catch (e) {}
    openDrawer(id); renderTracker(); renderJuni(); renderKPIs(); renderLatestUpdate(); renderPool();
    toast(`Hold → ${nm || 'bulan depan'}, diingatkan`);
    return;
  }
  await KOLStore.patchKOL(id, { workflow: wf });
  openDrawer(id); renderTracker();
  toast('Alasan reject: ' + reason);
}

// ── Scope Kerjasama (PKS) — stored in workflow.pks + readable summary in scope ──
function pksSummary(pks) { return (pks || []).filter(p => +p.qty > 0).map(p => `${p.type} x${p.qty}`).join(', '); }
async function pksSet(id, pks) {
  const k = KOLStore.kolById(id); if (!k) return;
  const wf = Object.assign({}, k.workflow || {}); wf.pks = pks;
  await KOLStore.patchKOL(id, { workflow: wf, scope: pksSummary(pks) });
}
async function pksAdd(id, type) {
  if (!type) return;
  if (type === '__custom__') {                       // free-text custom scope (e.g. "bundle carousel threads")
    type = (prompt('Jenis konten (ketik sendiri):') || '').trim();
    if (!type) return;
  }
  const k = KOLStore.kolById(id); const pks = ((k.workflow || {}).pks || []).slice();
  if (pks.some(p => p.type === type)) { toast('Sudah ada'); return; }
  pks.push({ type, qty: 1 });
  await pksSet(id, pks); openDrawer(id); renderTracker();
}
async function pksQty(id, type, qty) {
  const k = KOLStore.kolById(id);
  const pks = ((k.workflow || {}).pks || []).map(p => p.type === type ? { type, qty: Math.max(0, +qty || 0) } : p);
  await pksSet(id, pks); renderTracker();   // don't reopen — keep focus in the qty field
}
async function pksRemove(id, type) {
  const k = KOLStore.kolById(id);
  const pks = ((k.workflow || {}).pks || []).filter(p => p.type !== type);
  await pksSet(id, pks); openDrawer(id); renderTracker();
}
// Produk Dikirim (what was actually shipped) — stored in workflow.produk_dikirim
async function patchDikirim(id, val) {
  const k = KOLStore.kolById(id); if (!k) return;
  const wf = Object.assign({}, k.workflow || {}); wf.produk_dikirim = val;
  await KOLStore.patchKOL(id, { workflow: wf });
}

// produk is stored as collection NAMES → resolve back to KB collection ids for the handoff
function collectionIdsFromProduk(produk) {
  const db = window.HP_PRODUCT_DB; if (!db) return [];
  const names = (produk || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return (db.collections || []).filter(c => names.includes((c.name || '').toLowerCase())).map(c => c.id);
}

// Ensure we're on the live backend (login token may have arrived after boot).
async function ensureBackend() {
  if (KOLStore.mode === 'backend') return true;
  if (!aiToken()) return false;            // genuinely not logged in
  try { await KOLStore.init(); } catch (e) {}   // re-attempt now that the token is present
  return KOLStore.mode === 'backend';
}

// upload a generated brief file → stored + workflow.brief_created set → hands to Rahmi
async function briefAttach(id, inp) {
  const f = inp && inp.files && inp.files[0];
  if (!f) return;
  if (f.size > 10 * 1024 * 1024) { toast('File terlalu besar (maks 10MB)'); return; }
  if (!(await ensureBackend())) { toast('Belum tersambung ke server — login di dashboard lalu refresh tab ini.'); return; }
  toast('Mengunggah brief…');
  try {
    const url = await KOLStore.uploadBrief(id, f);
    if (!url) { toast('Gagal mengunggah brief'); return; }
    toast('✓ Brief terlampir → diteruskan ke Rahmi');
    openDrawer(id); renderTracker(); renderJuni();
  } catch (e) { toast('Gagal mengunggah brief'); }
}

// hand off to the dashboard's Brief Generator with the full decision context mapped
function openBriefHandoff(id) {
  const k = KOLStore.kolById(id); if (!k) return;
  const collections = collectionIdsFromProduk(k.produk);
  const payload = {
    handle: k.handle,
    niche: k.niche || '',
    notes: [k.notes_hasna, k.internal_notes].filter(Boolean).join(' — '), // internal, for personalization (not printed in brief)
    angle: (k.angle || '').trim(),                                          // blank → brief shows "Diserahkan ke creator"
    briefType: k.brief_type || '',
    tier: BRIEF_TO_TIER[k.brief_type] || '',
    month: k.campaign_month || '',
    cash: k.rate_cash || '',
    barter: k.rate_barter || '',
    collections,                                                            // array of KB collection ids
    collection: collections[0] || '',                                      // back-compat single
    pks: (k.workflow || {}).pks || [],                                     // scope kerjasama
    dikirim: (k.workflow || {}).produk_dikirim || '',                      // produk dikirim (from sheet)
  };
  let handed = false;
  try {
    if (window.parent && window.parent !== window && typeof window.parent.hpOpenBrief === 'function') {
      window.parent.hpOpenBrief(payload);
      handed = true;
    }
  } catch (e) {}
  if (!handed) {
    // Full-tab Command Center: stash for the dashboard tab (localStorage = cross-tab) + redirect.
    try { localStorage.setItem('hp_brief_payload', JSON.stringify({ ...payload, _ts: Date.now() })); } catch (e) {}
    window.location.href = '../index.html#kol';
  }
}

// apply a Creative Fit suggestion into a field
async function applyFit(id, field, val) {
  await KOLStore.patchKOL(id, { [field]: val });
  toast(`✦ ${field === 'brief_type' ? 'Brief' : 'Produk'} diterapkan: ${val}`);
  openDrawer(id); renderTracker(); renderJuni();
}
async function patchDecision(id, val) {
  const patch = { decision: val };
  if (val && !KOLStore.kolById(id).decision_date) patch.decision_date = today();
  await KOLStore.patchKOL(id, patch);
  openDrawer(id);                       // refresh date field
  renderTracker(); renderKPIs();
  toast(val ? `Keputusan: ${val} (${today()})` : 'Keputusan dihapus');
}
function updateRateCard(id) {
  const rc = {};
  $$('#drawer [data-rc]').forEach(inp => { rc[inp.dataset.rc] = +inp.value || 0; });
  const pkg = Object.values(rc).reduce((s, v) => s + v, 0);
  $('#rcPkg').textContent = fmtRp(pkg);
  KOLStore.patchKOL(id, { rate_card: rc });
}
async function addNeg(id) {
  const entry = {
    kol_id: id,
    log_date: $('#ng_date').value || today(),
    round: +$('#ng_round').value || 1,
    hp_cash: +$('#ng_hpc').value || 0,
    hp_barter: +$('#ng_hpb').value || 0,
    kol_cash: +$('#ng_kc').value || 0,
    kol_barter: +$('#ng_kb').value || 0,
    agreed: $('#ng_agreed').value === 'true',
    items: $('#ng_items').value || '',
    notes: $('#ng_notes').value || '',
    next_step: $('#ng_next').value || '',
    logged_by: $('#ng_by').value || '',
  };
  await KOLStore.addNegotiation(entry);
  toast('Ronde negosiasi tersimpan');
  openDrawer(id);
}

// ── export ────────────────────────────────────────────────────
function exportData() {
  const blob = new Blob([KOLStore.exportJSON()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `kol-command-center-${today()}.json`;
  a.click();
  toast('Export JSON diunduh');
}

// ── §1b AI DECISION ASSISTANT ─────────────────────────────────
// Alex types plain language → ai.js (Claude) proposes structured actions →
// shown here → Alex confirms → applied via the same handlers as manual edits.
const AI_API = '/.netlify/functions/ai';
let _aiActions = [];                       // current proposal

function aiAutoGrow(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 160) + 'px'; }
function aiKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); aiAsk(); } }
function aiByName() { return (window.HP_MEMBER && window.HP_MEMBER.name) || 'AI'; }
function aiToken() { try { return window.HP_TOKEN || (window.parent && window.parent.HP_TOKEN) || ''; } catch (e) { return ''; } }
function aiResolve(handle) {
  const h = (handle || '').trim().toLowerCase().replace(/^@/, '');
  if (!h) return null;
  return KOLStore.kol.find(k => (k.handle || '').trim().toLowerCase().replace(/^@/, '') === h) || null;
}

async function aiAsk() {
  const input = $('#aiInput');
  const instruction = (input.value || '').trim();
  const out = $('#aiResult');
  if (!instruction) { input.focus(); return; }
  if (!(await ensureBackend())) {
    out.innerHTML = `<div class="ai-err">Asisten AI butuh mode <b>Shared (live)</b> — login dulu di dashboard utama, lalu refresh tab ini.</div>`;
    return;
  }
  const btn = $('#aiSend');
  btn.disabled = true; _aiActions = [];
  out.innerHTML = `<div class="ai-thinking">Menafsirkan instruksi & membaca pipeline…</div>`;

  // Compact context — only fields the model needs.
  const kol = KOLStore.kol.map(k => ({
    handle: k.handle, status: k.status, decision: k.decision || '',
    campaign_month: k.campaign_month || '', produk: k.produk || '',
    rate_cash: Number(k.rate_cash) || 0, rate_barter: Number(k.rate_barter) || 0,
    tier: k.tier || '', niche: k.niche || '',
    angle: k.angle || '', notes_hasna: k.notes_hasna || '', last_offer: k.last_offer || '',
  }));

  try {
    const r = await fetch(AI_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + aiToken() },
      body: JSON.stringify({ instruction, kol }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) { out.innerHTML = `<div class="ai-err">${esc(aiErrText(data))}</div>`; return; }
    aiRenderProposal(data);
  } catch (e) {
    out.innerHTML = `<div class="ai-err">Gagal menghubungi asisten. Cek koneksi & coba lagi.</div>`;
  } finally { btn.disabled = false; }
}

function aiErrText(d) {
  const map = {
    ai_unconfigured: 'Asisten belum aktif: tambahkan ANTHROPIC_API_KEY di Netlify (Environment variables) lalu redeploy.',
    ai_auth_failed: 'API key Anthropic tidak valid — periksa di Netlify.',
    ai_rate_limited: 'Sedang sibuk, coba lagi sebentar.',
    auth_required: 'Sesi login berakhir — refresh halaman.',
    forbidden: 'Akun ini tidak punya akses ke asisten.',
  };
  return map[d && d.error] || (d && d.hint) || (d && d.detail) || 'Asisten tidak tersedia saat ini.';
}

function aiRenderProposal(data) {
  const out = $('#aiResult');
  const raw = Array.isArray(data.actions) ? data.actions : [];
  // Keep only actions that resolve to a real KOL (or need no handle).
  _aiActions = raw.map(a => {
    const noHandle = a.op === 'set_latest_update' || a.op === 'none';
    const k = noHandle ? null : aiResolve(a.handle);
    return { ...a, _id: k ? k.id : null, _ok: noHandle || !!k, _applied: false };
  }).filter(a => a.op !== 'none');

  let html = '';
  if (data.summary) html += `<div class="ai-summary">${esc(data.summary)}</div>`;
  if (data.clarify) html += `<div class="ai-clarify">❓ ${esc(data.clarify)}</div>`;

  if (_aiActions.length) {
    html += '<div class="ai-actions">';
    _aiActions.forEach((a, i) => {
      const bad = !a._ok;
      html += `<div class="ai-act" id="aiAct${i}">
        <div class="ai-act-main">
          <div class="ai-act-line">${aiActionLine(a, bad)}</div>
          ${a.reason ? `<div class="ai-act-reason">${esc(a.reason)}</div>` : ''}
        </div>
        ${bad
          ? `<button class="ai-act-skip" disabled>tak ditemukan</button>`
          : `<button class="ai-act-apply" onclick="aiApplyOne(${i})">Terapkan</button>`}
      </div>`;
    });
    html += '</div>';
    const anyOk = _aiActions.some(a => a._ok);
    html += `<div class="ai-bar">
      ${anyOk ? `<button class="ai-apply-all" onclick="aiApplyAll()">✓ Terapkan semua (${_aiActions.filter(a => a._ok).length})</button>` : ''}
      <button class="ai-dismiss" onclick="aiDismiss()">Tutup</button>
    </div>`;
  } else if (!data.clarify) {
    html += `<div class="ai-bar"><button class="ai-dismiss" onclick="aiDismiss()">Tutup</button></div>`;
  }
  out.innerHTML = html;
}

function aiActionLine(a, bad) {
  const h = a.handle ? `<span class="h">@${esc(a.handle)}</span>` : '';
  const v = esc(a.value || '');
  switch (a.op) {
    case 'set_status':       return `${h} → status <b>${esc(a.value)}</b>${a.decision ? ` · ${esc(a.decision)}` : ''}`;
    case 'set_month':        return `${h} → bulan <b>${v}</b>`;
    case 'set_products':     return `${h} → produk <b>${v}</b>`;
    case 'set_cash':         return `${h} → cash <b>${fmtRp(Number(a.value) || 0)}</b>`;
    case 'set_barter':       return `${h} → barter <b>${fmtRp(Number(a.value) || 0)}</b>`;
    case 'add_note':         return `${h} → catatan: ${v}`;
    case 'set_latest_update':return `Latest Update → "${v}"`;
    default:                 return `${h} ${esc(a.op)} ${v}`;
  }
}

async function aiApplyOne(i) {
  const a = _aiActions[i];
  if (!a || !a._ok || a._applied) return;
  const ok = await aiExec(a);
  if (ok) {
    a._applied = true;
    const el = $('#aiAct' + i);
    if (el) { el.classList.add('applied'); const b = el.querySelector('.ai-act-apply'); if (b) { b.disabled = true; b.textContent = '✓ Diterapkan'; } }
    renderAll();
  }
}

async function aiApplyAll() {
  const bar = $('#aiResult .ai-apply-all'); if (bar) bar.disabled = true;
  let n = 0;
  for (let i = 0; i < _aiActions.length; i++) {
    const a = _aiActions[i];
    if (!a._ok || a._applied) continue;
    if (await aiExec(a)) {
      a._applied = true; n++;
      const el = $('#aiAct' + i);
      if (el) { el.classList.add('applied'); const b = el.querySelector('.ai-act-apply'); if (b) { b.disabled = true; b.textContent = '✓ Diterapkan'; } }
    }
  }
  closeDrawer(); renderAll();
  toast(`${n} keputusan diterapkan`);
}

// Map one proposed action to the real handlers. Mirrors advanceStatus/patchField
// but without opening the drawer (so apply-all doesn't flicker).
async function aiExec(a) {
  const id = a._id;
  try {
    switch (a.op) {
      case 'set_status': {
        if (!STATUSES.includes(a.value)) return false;
        const patch = { status: a.value };
        if (a.decision) { patch.decision = a.decision; patch.decision_date = today(); }
        await KOLStore.patchKOL(id, patch);
        return true;
      }
      case 'set_month':    await KOLStore.patchKOL(id, { campaign_month: a.value }); return true;
      case 'set_products': await KOLStore.patchKOL(id, { produk: a.value }); return true;
      case 'set_cash':     await KOLStore.patchKOL(id, { rate_cash: Number(a.value) || 0 }); return true;
      case 'set_barter':   await KOLStore.patchKOL(id, { rate_barter: Number(a.value) || 0 }); return true;
      case 'add_note': {
        const prev = KOLStore.negotiationsFor(id)[0];
        await KOLStore.addNegotiation({ kol_id: id, log_date: today(), round: ((prev && prev.round) || 0) + 1, notes: a.value, logged_by: aiByName() });
        return true;
      }
      case 'set_latest_update': await KOLStore.setLatestUpdate(a.value, aiByName()); return true;
      default: return false;
    }
  } catch (e) { return false; }
}

function aiDismiss() { _aiActions = []; $('#aiResult').innerHTML = ''; $('#aiInput').value = ''; aiAutoGrow($('#aiInput')); }

// ── Live sync across team / devices ───────────────────────────
// Re-pull the shared backend on tab focus + every 90s so a change one teammate
// makes appears for everyone without a manual reload. Skips while a drawer is
// open or an AI proposal is pending, so it never disrupts an in-progress edit.
async function kolRefresh() {
  if (drawerId || (typeof _aiActions !== 'undefined' && _aiActions.length)) return;
  if (KOLStore.mode !== 'backend') return;
  try { await KOLStore.init(); renderAll(); } catch (e) {}
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) kolRefresh(); });
window.addEventListener('focus', kolRefresh);
setInterval(() => { if (!document.hidden) kolRefresh(); }, 90000);

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
// Defer boot to DOMContentLoaded so auth.js has set the login token first
// (it registers its handler earlier, in <head>), avoiding a false "local" mode.
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  if (document.readyState === 'complete') boot();
  else document.addEventListener('DOMContentLoaded', boot);
} else {
  document.addEventListener('DOMContentLoaded', boot);
}
