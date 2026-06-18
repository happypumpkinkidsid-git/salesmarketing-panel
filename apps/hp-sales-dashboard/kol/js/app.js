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

// ── §3 ACTIVE CAMPAIGN — JUNI ─────────────────────────────────
function renderJuni() {
  const juni = KOLStore.kol.filter(k => k.in_juni)
    .sort((a, b) => (b.rate_cash || 0) - (a.rate_cash || 0));
  $('#juniCount').textContent = juni.length;
  $('#juni').innerHTML = juni.map(k => `
    <div class="jcard" onclick="openDrawer('${k.id}')">
      <div class="jcard-top">
        <div class="avatar">${initials(k.handle)}</div>
        <div class="jcard-id">
          <div class="jcard-handle">@${esc(k.handle)}</div>
          <div class="jcard-tier">${esc(k.tier || '—')}</div>
        </div>
        <span class="chip ${statusClass(k.status)}">${esc(k.status)}</span>
      </div>
      ${k.brief_type ? `<span class="brief-tag brief-${k.brief_type.split('-')[0].toLowerCase()}">${esc(k.brief_type)}</span>` : ''}
      ${k.produk ? `<div class="jcard-prod">📦 ${esc(k.produk)}</div>` : ''}
      <div class="jcard-angle">${esc(k.angle || '—')}</div>
      <div class="jcard-foot">
        <span>${k.rate_cash ? '💵 ' + fmtRpShort(k.rate_cash) : '🎁 barter'}${k.rate_barter ? ' + ' + fmtRpShort(k.rate_barter) : ''}</span>
        ${k.ref_link ? `<a href="${esc(k.ref_link)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">ref ↗</a>` : ''}
      </div>
    </div>`).join('');
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
  const tick = (on, label, who) => `<div class="wf-item ${on?'done':''}"><span class="wf-tick">${on?'☑':'☐'}</span>${label}<span class="wf-who">${who}</span></div>`;
  const tickBox = (key, label, who) => `<label class="wf-item ${wf[key]?'done':''}"><input type="checkbox" ${wf[key]?'checked':''} onchange="toggleWf('${id}','${key}',this.checked)"><span></span>${label}<span class="wf-who">${who}</span></label>`;
  const wfChecklist = isDeal ? `<div class="wf-check">
      ${tick(!!(k.campaign_month||'').trim(),'Bulan campaign','Alex')}
      ${tick(!!(k.produk||'').trim(),'Produk / koleksi','Alex')}
      ${tickBox('brief_created','Brief dibuat','Rahmi')}
      ${tickBox('brief_sent','Brief dikirim ke KOL','Rahmi')}
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

      <div class="dr-grid">
        <label>Status
          <select onchange="patchField('${id}','status',this.value)">
            ${STATUSES.map(s => `<option ${s===k.status?'selected':''}>${s}</option>`).join('')}
          </select></label>
        <label>Keputusan Manajemen
          <select onchange="patchDecision('${id}',this.value)">
            ${DECISIONS.map(d => `<option value="${d}" ${d===(k.decision||'')?'selected':''}>${d||'—'}</option>`).join('')}
          </select></label>
        <label>Tgl Keputusan
          <input type="date" value="${k.decision_date||''}" onchange="patchField('${id}','decision_date',this.value)"></label>
        <label>Bulan Campaign
          <select onchange="patchField('${id}','campaign_month',this.value)">
            ${MONTHS_OPTS.map(m => `<option value="${m}" ${m===(k.campaign_month||'')?'selected':''}>${m||'— pilih bulan'}</option>`).join('')}
          </select></label>
        <label>Tipe Brief
          <select onchange="patchField('${id}','brief_type',this.value)">
            ${BRIEFS.map(b => `<option value="${b}" ${b===(k.brief_type||'')?'selected':''}>${b||'—'}</option>`).join('')}
          </select></label>
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

      ${rec ? `
      <div class="fit-card">
        <div class="fit-head">
          <span class="fit-kicker">✦ Creative Fit</span>
          <span class="fit-sub">inferensi dari profil — kamu tetap yang putuskan</span>
        </div>
        <div class="fit-tags">
          <span class="fit-tag">${esc(rec.contentLabel)}${rec.styleInferred ? ' <span class="fit-auto">auto</span>' : ' <span class="fit-set">set</span>'}</span>
          ${rec.family !== 'Solo' ? `<span class="fit-tag fit-fam">${rec.family === 'Twins' ? '👯 Twins' : '👫 Sibling'}${rec.familyInferred ? ' <span class="fit-auto">auto</span>' : ''}</span>` : ''}
          <span class="fit-tag fit-trig">${esc(rec.trigger)}</span>
        </div>
        <div class="fit-row">
          <span class="fit-k">Brief disarankan</span>
          <span class="fit-v"><b>${esc(rec.briefType)}</b> <span class="muted">· ${esc(rec.briefBasis)}</span>
            ${rec.briefType !== k.brief_type ? `<button class="fit-apply" onclick="applyFit('${id}','brief_type','${esc(rec.briefType)}')">pakai</button>` : '<span class="fit-ok">✓ cocok</span>'}</span>
        </div>
        <div class="fit-row">
          <span class="fit-k">Produk paling klop</span>
          <span class="fit-v">${rec.products.slice(0,4).map(p => `<span class="fit-prod">${esc(p)}</span>`).join('')}
            <button class="fit-apply" onclick="applyFit('${id}','produk',${JSON.stringify(rec.products.slice(0,4).join(', '))})">pakai</button></span>
        </div>
        <div class="fit-row">
          <span class="fit-k">Arah angle</span>
          <span class="fit-v">${esc(rec.angle)}</span>
        </div>
        ${rec.collection ? `
        <div class="fit-row">
          <span class="fit-k">Koleksi KB</span>
          <span class="fit-v"><b>${esc(rec.collection.name)}</b>
            ${rec.collection.hookEn ? `<span class="fit-kbhook">“${esc(rec.collection.hookEn)}”</span>` : ''}</span>
        </div>` : ''}
        <details class="fit-why"><summary>kenapa?</summary>
          <ul>${rec.rationale.map(r => `<li>${r.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>')}</li>`).join('')}</ul>
        </details>
        <button class="fit-brief-btn" onclick="openBriefHandoff('${id}')">✦ Buat Brief di Generator →</button>
      </div>` : ''}

      <label class="dr-full">Angle / Tema Utama
        <textarea rows="2" onchange="patchField('${id}','angle',this.value)">${esc(k.angle||'')}</textarea></label>
      <label class="dr-full">Reference Content Link
        <input type="text" value="${esc(k.ref_link||'')}" placeholder="https://instagram.com/reel/…" onchange="patchField('${id}','ref_link',this.value)"></label>
      <label class="dr-full">Scope / Deliverables
        <input type="text" value="${esc(k.scope||'')}" onchange="patchField('${id}','scope',this.value)"></label>

      <!-- RATE CARD (Hasna) -->
      <div class="dr-section">💰 Rate Card <span class="dr-section-sub">Hasna isi per format</span></div>
      <div class="dr-rates">
        ${RATE_FORMATS.map(([key,lbl]) => `
          <label>${lbl}
            <input type="number" min="0" step="50000" value="${rc[key]||''}" placeholder="0"
              oninput="updateRateCard('${id}')" data-rc="${key}"></label>`).join('')}
      </div>
      <div class="dr-rate-foot">
        <div>Package total: <b id="rcPkg">${fmtRp(pkg)}</b></div>
        <label class="inline">Cash deal <input type="number" min="0" step="50000" value="${k.rate_cash||''}" onchange="patchField('${id}','rate_cash',+this.value)" style="width:120px"></label>
        <label class="inline">Barter <input type="number" min="0" step="50000" value="${k.rate_barter||''}" onchange="patchField('${id}','rate_barter',+this.value)" style="width:120px"></label>
      </div>
      <label class="dr-full">Original ratecard (catatan)
        <input type="text" value="${esc(k.ratecard_orig||'')}" onchange="patchField('${id}','ratecard_orig',this.value)"></label>

      <!-- NEGOTIATION LOG -->
      <div class="dr-section">🤝 Negotiation Log <span class="dr-section-sub">tiap baris di-stamp tanggal</span></div>
      <div id="negList" class="dr-neg-list">${renderNegList(negs)}</div>
      <details class="dr-neg-add">
        <summary>+ Tambah ronde negosiasi</summary>
        <div class="dr-neg-form">
          <div class="neg-row">
            <label>Tanggal<input type="date" id="ng_date" value="${today()}"></label>
            <label>Ronde<input type="number" id="ng_round" value="${negs.length+1}" min="1" style="width:64px"></label>
            <label>Setuju?<select id="ng_agreed"><option value="false">Belum</option><option value="true">Ya</option></select></label>
          </div>
          <div class="neg-row">
            <label>HP cash<input type="number" id="ng_hpc" placeholder="0"></label>
            <label>HP barter<input type="number" id="ng_hpb" placeholder="0"></label>
            <label>KOL minta cash<input type="number" id="ng_kc" placeholder="0"></label>
            <label>KOL minta barter<input type="number" id="ng_kb" placeholder="0"></label>
          </div>
          <textarea id="ng_notes" rows="2" placeholder="Catatan / konteks negosiasi…"></textarea>
          <div class="neg-row">
            <label>Items<input type="text" id="ng_items" placeholder="produk yang dikonfirmasi"></label>
            <label>Next step<input type="text" id="ng_next" placeholder="langkah berikutnya"></label>
            <label>Oleh<input type="text" id="ng_by" placeholder="nama"></label>
          </div>
          <button class="btn btn-primary" onclick="addNeg('${id}')">Simpan ronde</button>
        </div>
      </details>

      <!-- NOTES -->
      <div class="dr-section">📝 Catatan</div>
      <label class="dr-full">Notes untuk Hasna
        <textarea rows="2" onchange="patchField('${id}','notes_hasna',this.value)">${esc(k.notes_hasna||'')}</textarea></label>
      <label class="dr-full">Internal notes
        <textarea rows="2" onchange="patchField('${id}','internal_notes',this.value)">${esc(k.internal_notes||'')}</textarea></label>

      <div class="dr-contact">
        ${k.ig_link ? `<a href="${esc(k.ig_link)}" target="_blank" rel="noopener">Instagram ↗</a>` : ''}
        ${k.kontak_wa ? `<a href="https://wa.me/${esc(k.kontak_wa.replace(/[^0-9]/g,''))}" target="_blank" rel="noopener">WhatsApp ↗</a>` : ''}
      </div>
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
// hand off to the dashboard's Brief Generator, pre-filled
function openBriefHandoff(id) {
  const k = KOLStore.kolById(id); if (!k) return;
  const rec = (window.KOL_INTEL) ? KOL_INTEL.recommendFor(k) : {};
  const payload = {
    handle: k.handle,
    niche: k.niche || (rec.contentLabel || ''),
    notes: [k.angle, k.notes_hasna].filter(Boolean).join(' — '),
    briefType: k.brief_type || rec.briefType || '',
    collection: rec.collection ? rec.collection.id : '',
  };
  if (window.parent && window.parent !== window && typeof window.parent.hpOpenBrief === 'function') {
    window.parent.hpOpenBrief(payload);
  } else {
    try { sessionStorage.setItem('hp_brief_payload', JSON.stringify(payload)); } catch (e) {}
    window.open('../index.html#kol', '_blank');
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

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
boot();
