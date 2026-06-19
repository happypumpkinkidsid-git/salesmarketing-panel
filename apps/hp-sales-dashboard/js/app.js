// ============================================================
// HP SALES NETWORK — APP
// ============================================================

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH_LABELS = { '01':'Jan','02':'Feb','03':'Mar','04':'Apr','05':'May','06':'Jun','07':'Jul','08':'Aug','09':'Sep','10':'Oct','11':'Nov','12':'Dec' };

const state = {
  section: 'brief',
  brief: [], channels: [], distributors: [], leads: [], targets: [],
  activeMonth: '2026-05',
  activePlatform: 'All',
  activeRegion: 'All',
  activeLeadStage: 'All',
  usingSheet: false,
  distAnalyticsLoaded: false,
  activeDistributor: null,
  leadKanbanMode: false,
  distIntelTab: 'fulfillment',
  fulfillMonths: null,         // null = all months; array = specific months selected
  fulfillSort: 'net',
  fulfillSearch: '',
  // ── KOL Program ──────────────────────────────────────
  kols: [],
  kolView: 'roster',           // 'roster' | 'funnel' | 'keputusan' | 'laporan' | 'panduan'
  kolFilterPlatform: 'All',
  kolFilterTier: 'All',
  kolFilterStatus: 'All',
  kolFilterCPMZone: 'All',
  kolFilterSearch: '',
  kolLaporanRange: 'all',
  kolExpandedId: null,         // expanded detail row
  kolEditingId: null,          // row currently in edit mode
  kolKeputusanMode: 'tim',     // 'alex' | 'tim'
};

// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
  setupNav();
  updateTopbarSub();
  loadAllData();
  setInterval(loadAllData, CONFIG.refreshInterval);
  // deep-link: open the section named in the URL hash (e.g. /#product-database)
  const h = (location.hash || '').slice(1);
  if (h && document.querySelector(`.nav-item[data-section="${h}"]`)) navigate(h);
  // Consume a Brief-Generator prefill handed off from the Command Center (full-tab path).
  try {
    const raw = localStorage.getItem('hp_brief_payload');
    if (raw) {
      localStorage.removeItem('hp_brief_payload');
      const pl = JSON.parse(raw);
      if (pl && pl._ts && (Date.now() - pl._ts) < 60000) hpOpenBrief(pl);
    }
  } catch (e) {}
});
window.addEventListener('hashchange', () => {
  const h = (location.hash || '').slice(1);
  if (h && state.section !== h && document.querySelector(`.nav-item[data-section="${h}"]`)) navigate(h);
});

function setupNav() {
  document.querySelectorAll('.nav-item[data-section]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.section));
  });
}

// escape untrusted free-text (Sheet/Supabase/user data) before innerHTML
function escHtml(s) {
  return (s == null ? '' : String(s)).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function navigate(sec) {
  state.section = sec;
  try { if ((location.hash || '').slice(1) !== sec) history.replaceState(null, '', '#' + sec); } catch (e) {}
  document.querySelectorAll('.nav-item[data-section]').forEach(el =>
    el.classList.toggle('active', el.dataset.section === sec)
  );
  document.querySelectorAll('.section').forEach(el =>
    el.classList.toggle('active', el.id === 'section-' + sec)
  );
  const titles = {
    brief:       ['Daily Brief',             'What to focus on today'],
    performance: ['Performance',             'Revenue & orders vs targets'],
    channels:    ['Online Channels',         'Marketplace sub-channel breakdown'],
    offline:     ['Distributor Network',     'Your offline retail & distribution partners'],
    'dist-intel':['Distributor Intelligence','Cohort retention, LTV, churn signals & reactivation'],
    leads:       ['Leads Pipeline',          'Potential & qualified distributor leads'],
    kol:         ['KOL Brief Generator',     'Buat brief kolaborasi untuk influencer & KOL'],
    'kol-program':['KOL Command Center',     'Keputusan, rate card, negosiasi & pool — satu tempat'],
    'product-database':['Product Database',   'Knowledge base bersama — dibaca Brief Generator & Command Center'],
    inventory:   ['Inventory & Stock',       'Live stock levels and reorder alerts'],
    sessions:    ['Live Sessions',           'Shopee & TikTok live session tracking'],
    orders:      ['Order Operations',        'Fulfilment status and SLA monitoring'],
    customers:   ['Customer Analytics',      'New vs repeat buyer breakdown'],
    campaigns:   ['Campaign Calendar',       'Paid media and promotion schedule'],
    executive:   ['Executive View',          'Leadership summary — KPIs at a glance'],
  };
  const t = titles[sec] || [sec, ''];
  document.getElementById('topbarTitle').textContent = t[0];
  document.getElementById('topbarSub').textContent   = t[1];
  renderSection(sec);
}

function renderSection(sec) {
  if (sec === 'brief')       renderBrief();
  if (sec === 'performance') renderPerformance();
  if (sec === 'channels')    renderChannels();
  if (sec === 'offline')     renderOffline();
  if (sec === 'dist-intel')  renderDistributorIntel();
  if (sec === 'leads')       renderLeads();
  if (sec === 'kol')         renderKOLBrief();
  if (sec === 'kol-program') renderKOLCommandCenter();
  if (sec === 'product-database') renderProductDatabase();
  if (sec === 'inventory')   renderInventoryLocked();
  if (sec === 'sessions')    renderSessionsLocked();
  if (sec === 'orders')      renderOrdersLocked();
  if (sec === 'customers')   renderCustomersLocked();
  if (sec === 'campaigns')   renderCampaignsLocked();
  if (sec === 'executive')   renderExecutive();
}

function updateTopbarSub() {
  const now = new Date();
  const dayName  = DAY_NAMES[now.getDay()];
  const dateStr  = now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  document.getElementById('topbarSub').textContent = dateStr;
}

// ===== DATA LOADING =====
async function loadAllData() {
  const btn = document.getElementById('refreshBtn');
  if (btn) btn.classList.add('spinning');

  const id = CONFIG.sheetId;
  if (!id || id === 'YOUR_SHEET_ID_HERE') {
    useSampleData();
    if (btn) btn.classList.remove('spinning');
    return;
  }

  try {
    const base = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=`;
    const [b, ch, dist, ld, tg] = await Promise.all([
      fetchCSV(base + CONFIG.gids.brief),
      fetchCSV(base + CONFIG.gids.channels),
      fetchCSV(base + CONFIG.gids.distributors),
      fetchCSV(base + CONFIG.gids.leads),
      fetchCSV(base + CONFIG.gids.targets),
    ]);
    state.brief        = parseCSV(b,    ['day','priority','task','category','channel']);
    state.channels     = parseCSV(ch,   ['month','platform','subchannel','revenue','orders','spend','roas','notes'], ['revenue','orders','spend','roas']);
    state.distributors = parseCSV(dist, ['name','type','city','province','region','contact_name','contact_wa','tier','status','since','monthly_target','notes','last_order_date','expected_reorder_days','account_tier'], ['monthly_target','expected_reorder_days']);
    state.leads        = parseCSV(ld,   ['name','type','city','province','region','contact_name','contact_wa','stage','source','assigned','last_contact','potential_monthly','notes','first_contact_date','priority'], ['potential_monthly']);
    state.targets      = parseCSV(tg,   ['month','channel','revenue_target','revenue_actual','orders_target','orders_actual'], ['revenue_target','revenue_actual','orders_target','orders_actual']);
    // KOL sheet (optional — only if IDs are set)
    if (CONFIG.kolSheetId && CONFIG.kolGid) {
      try {
        const kolCsv = await fetchCSV(
          `https://docs.google.com/spreadsheets/d/${CONFIG.kolSheetId}/export?format=csv&gid=${CONFIG.kolGid}`
        );
        state.kols = parseCSV(kolCsv,
          ['id','handle','nama','platform','tier','niche','followers','avg_views',
           'er_persen','aqs_score','indonesia_pct','rate_diminta','rate_deal',
           'cpm','cpm_zone','cpe','status','scope','brief_bulan','produk',
           'kontak_wa','sumber','keputusan','tgl_tambah','tgl_update','catatan'],
          ['followers','avg_views','er_persen','aqs_score','indonesia_pct',
           'rate_diminta','rate_deal','cpm','cpe']
        );
      } catch(e) { state.kols = CONFIG.sampleKOL || []; }
    } else {
      state.kols = CONFIG.sampleKOL || [];
    }
    state.usingSheet   = true;
    document.getElementById('lastRefreshLabel').textContent = 'Updated ' + new Date().toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'});
    showToast('Data synced from Google Sheets');
  } catch(e) {
    useSampleData();
  }

  updateBadges();
  // Don't auto-re-render the Brief Generator (a form) or the embedded Command
  // Center (an iframe) on interval refresh — it would wipe in-progress work.
  if (state.section !== 'kol' && state.section !== 'kol-program') renderSection(state.section);
  if (btn) btn.classList.remove('spinning');
}

function useSampleData() {
  state.brief        = CONFIG.sampleBrief;
  state.channels     = CONFIG.sampleChannels;
  state.distributors = CONFIG.sampleDistributors;
  state.leads        = CONFIG.sampleLeads;
  state.targets      = CONFIG.sampleTargets;
  state.kols         = CONFIG.sampleKOL || [];
  state.usingSheet   = false;
  document.getElementById('lastRefreshLabel').textContent = 'Sample data (no Sheet connected)';
  if (state.section !== 'kol' && state.section !== 'kol-program') renderSection(state.section);
  updateBadges();
}

function updateBadges() {
  const distBadge = document.getElementById('distBadge');
  const leadBadge = document.getElementById('leadBadge');
  const kolBadge  = document.getElementById('kolProgramBadge');
  if (distBadge) { distBadge.textContent = state.distributors.length; distBadge.style.display = state.distributors.length ? 'inline' : 'none'; }
  if (leadBadge) {
    const hot = state.leads.filter(l => ['Proposal Sent','Negotiating'].includes(l.stage)).length;
    leadBadge.textContent = hot || state.leads.length;
    leadBadge.style.display = 'inline';
  }
  if (kolBadge) {
    const deals = state.kols.filter(k => k.status === 'DEAL').length;
    kolBadge.textContent = deals;
    kolBadge.style.display = deals ? 'inline' : 'none';
  }
}

async function fetchCSV(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('fetch failed');
  return r.text();
}

function parseCSV(text, cols, numericCols = []) {
  const lines = text.trim().split('\n').slice(1);
  return lines.map(line => {
    // RFC 4180-compliant split: handles quoted fields containing commas
    const vals = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    vals.push(cur.trim());
    const obj = {};
    cols.forEach((c, i) => {
      obj[c] = numericCols.includes(c) ? (parseFloat(vals[i]) || 0) : (vals[i] || '');
    });
    return obj;
  }).filter(o => o[cols[0]]);
}

// ===== FORMATTERS =====
function fmtIDR(n) {
  n = Number(n) || 0;
  if (n >= 1e9) return 'Rp ' + (n/1e9).toFixed(2) + 'M';
  if (n >= 1e6) return 'Rp ' + (n/1e6).toFixed(1) + 'jt';
  if (n >= 1e3) return 'Rp ' + (n/1e3).toFixed(0) + 'K';
  return 'Rp ' + n;
}
function fmtNum(n)  { return Number(n).toLocaleString('id-ID'); }
function fmtPct(a, b) { return b ? Math.round((a/b)*100) : 0; }
function daysAgo(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - d) / 86400000);
}
function priClass(p) {
  if (p === 'High') return 'pri-high';
  if (p === 'Medium') return 'pri-med';
  return 'pri-low';
}
function achClass(pct) {
  if (pct >= 90) return 'var(--green)';
  if (pct >= 70) return 'var(--amber)';
  return 'var(--red)';
}
function monthLabel(m) {
  if (!m) return '';
  const [y, mo] = m.split('-');
  return (MONTH_LABELS[mo] || mo) + ' ' + y;
}

// ===== BRIEF SECTION =====
function renderBrief() {
  const el = document.getElementById('section-brief');
  const now = new Date();
  const todayName = DAY_NAMES[now.getDay()];
  const todayTasks = state.brief.filter(t => t.day === todayName);
  const highCount  = todayTasks.filter(t => t.priority === 'High').length;

  const sheetHint = !state.usingSheet ? `<div class="sheet-hint" style="font-size:12px;color:var(--text-muted)">Menampilkan data contoh — belum terhubung ke Google Sheet.</div>` : '';

  el.innerHTML = `
    ${sheetHint}

    <div class="brief-hero">
      <div class="greeting">Sales Network · ${DAY_NAMES[now.getDay()].toUpperCase()}</div>
      <div class="date-line">${now.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})} <span>— Today's Brief</span></div>
      <div class="focus-line">${highCount} high-priority task${highCount !== 1 ? 's' : ''} · ${todayTasks.length} total items today</div>
    </div>

    <div class="section-header mb-12"><div><div class="section-title">This Week's Schedule</div><div class="section-sub">Click any day to see its tasks</div></div></div>
    ${renderWeekGrid(todayName)}

    <div class="brief-two-col">
      ${renderTodayTasks(todayName, todayTasks)}
      ${renderQuickActions()}
    </div>

    <div class="two-col">
      ${renderCompetitorPulse()}
      ${renderUpcomingEvents()}
    </div>
  `;

  el.querySelectorAll('.day-card').forEach(card => {
    card.addEventListener('click', () => {
      const day = card.dataset.day;
      showDayModal(day);
    });
  });
}

function renderWeekGrid(todayName) {
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const focusMap = {
    Monday:'Data Review & Team Kickoff', Tuesday:'Ads Review & Lead Outreach', Wednesday:'Mid-week Check & Offline',
    Thursday:'Weekend Prep & Lead Push', Friday:'Reporting & Wrap-up', Saturday:'Live Sessions', Sunday:'Strategy & Planning',
  };
  const catColors = { 'Data Review':'#FF7B1C','Ads Review':'#1877F2','Lead Action':'#8B5CF6','Distributor':'#22C55E','Reporting':'#EF4444','Live Session':'#111111','Planning':'#14B8A6','Research':'#F59E0B','Internal':'#64748B','Content':'#E1306C','Commercial':'#D97706','Operations':'#0369A1','Strategy':'#16A34A','Community':'#6366F1' };
  return `<div class="week-grid mb-24">` + days.map(day => {
    const tasks = state.brief.filter(t => t.day === day);
    const high  = tasks.filter(t => t.priority === 'High').length;
    const cats  = [...new Set(tasks.map(t => t.category))].slice(0,3);
    const isToday = day === todayName;
    return `<div class="day-card ${isToday ? 'today' : ''}" data-day="${day}">
      <div class="day-name">${day.slice(0,3)}</div>
      <div class="day-count">${tasks.length}</div>
      <div class="day-focus">${focusMap[day] || ''}</div>
      <div class="day-cats">${cats.map(c => `<span class="day-cat" style="background:${(catColors[c]||'#64748B')}18;color:${catColors[c]||'#64748B'}">${c.slice(0,4)}</span>`).join('')}</div>
    </div>`;
  }).join('') + `</div>`;
}

function renderTodayTasks(todayName, tasks) {
  if (!tasks.length) return `<div class="task-list"><div class="task-list-header"><span class="title">Today — ${todayName}</span><span class="count">0 tasks</span></div><div class="empty-state"><div class="empty-icon">✅</div><div class="empty-title">Nothing scheduled</div></div></div>`;
  const items = tasks.map(t => `
    <div class="task-item">
      <span class="${priClass(t.priority)}">${t.priority.slice(0,1)}</span>
      <div class="task-body">
        <div class="task-text">${escHtml(t.task)}</div>
        <div class="task-meta">
          <span class="task-channel">${t.channel}</span>
          <span class="task-channel">${t.category}</span>
        </div>
      </div>
    </div>`).join('');
  return `<div class="task-list">
    <div class="task-list-header">
      <span class="title">Today — ${todayName}</span>
      <span class="count">${tasks.length} tasks · ${tasks.filter(t=>t.priority==='High').length} high priority</span>
    </div>
    ${items}
  </div>`;
}

function renderQuickActions() {
  const actions = [
    { icon:'🛍️', label:'Shopee Seller', url:'https://seller.shopee.co.id/' },
    { icon:'🟢', label:'Tokopedia Seller', url:'https://seller.tokopedia.com/' },
    { icon:'🎵', label:'TikTok Shop', url:'https://seller-id.tiktok.com/' },
    { icon:'📘', label:'Meta Ads Mgr', url:'https://adsmanager.facebook.com/' },
    { icon:'🔍', label:'FB Ad Library', url:'https://www.facebook.com/ads/library/?country=ID' },
    { icon:'📊', label:'Creative Hub', url:'../hp-dashboard/index.html' },
    { icon:'🎯', label:'View Leads', url:'#' },
    { icon:'🏪', label:'Distributors', url:'#' },
  ];
  const btns = actions.map(a => {
    const isInternal = a.url === '#';
    const sec = a.label === 'View Leads' ? 'leads' : a.label === 'Distributors' ? 'offline' : null;
    const click = sec ? `onclick="navigate('${sec}'); return false;"` : '';
    return `<a href="${a.url}" target="${a.url.startsWith('http') ? '_blank' : '_self'}" class="qa-btn" ${click}>
      <span class="qa-icon">${a.icon}</span>${a.label}
    </a>`;
  }).join('');
  return `<div class="quick-actions"><div class="title">Quick Actions</div><div class="qa-grid">${btns}</div></div>`;
}

function renderCompetitorPulse() {
  const rows = CONFIG.competitors.map(c => {
    const url = c.pageId
      ? `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ID&search_type=page&view_all_page_id=${c.pageId}`
      : `https://www.facebook.com/ads/library/?country=ID`;
    return `<div class="comp-row">
      <div class="comp-info">
        <div>
          <div class="comp-name">${c.name}</div>
          <div class="comp-scale">${c.scale}</div>
        </div>
      </div>
      <a href="${url}" target="_blank" class="comp-btn">🔍 Check Ads</a>
    </div>`;
  }).join('');
  return `<div class="comp-pulse"><div class="title">Competitor Pulse — FB Ad Library</div>${rows}</div>`;
}

function renderUpcomingEvents() {
  const today = new Date();
  const upcoming = CONFIG.shoppingEvents
    .map(e => ({ ...e, daysLeft: Math.ceil((new Date(e.date) - today) / 86400000) }))
    .filter(e => e.daysLeft >= 0)
    .sort((a,b) => a.daysLeft - b.daysLeft)
    .slice(0, 6);
  const chips = upcoming.map(e => `
    <div class="event-chip ${e.daysLeft <= 14 ? 'soon' : ''}">
      <div>
        <div class="ev-date">${e.platform !== 'All' ? e.platform + ' · ' : ''}${escHtml(e.name)}</div>
        <div class="ev-name">${new Date(e.date).toLocaleDateString('id-ID',{day:'numeric',month:'short'})}</div>
        <div class="ev-days">${e.daysLeft === 0 ? 'TODAY' : e.daysLeft + ' days'}</div>
      </div>
    </div>`).join('');
  return `<div class="quick-actions"><div class="title">Upcoming Shopping Events</div><div class="events-row">${chips}</div></div>`;
}

function showDayModal(day) {
  const tasks = state.brief.filter(t => t.day === day);
  const title = document.getElementById('modalLeadTitle');
  const body  = document.getElementById('modalLeadBody');
  title.textContent = `${day}'s Tasks`;
  body.innerHTML = tasks.length
    ? tasks.map(t => `<div class="modal-row">
        <span class="mr-label"><span class="${priClass(t.priority)}">${t.priority}</span></span>
        <div class="mr-val"><strong>${escHtml(t.task)}</strong><br><span style="font-size:11px;color:var(--text-muted)">${t.category} · ${t.channel}</span></div>
      </div>`).join('')
    : `<div class="empty-state"><div class="empty-icon">🌙</div><div class="empty-title">No tasks scheduled for ${day}</div></div>`;
  document.getElementById('leadModal').style.display = 'flex';
}
function closeLeadModal(e) {
  if (!e || e.target === document.getElementById('leadModal')) {
    document.getElementById('leadModal').style.display = 'none';
  }
}

// ===== PERFORMANCE SECTION =====
function renderPerformance() {
  const el = document.getElementById('section-performance');
  const months = [...new Set(state.targets.map(t => t.month))].sort().reverse();
  if (!months.includes(state.activeMonth)) state.activeMonth = months[0] || '2026-05';

  const mo = state.activeMonth;
  const targets = state.targets.filter(t => t.month === mo);
  const prevMo  = months[months.indexOf(mo)+1];
  const prevTargets = prevMo ? state.targets.filter(t => t.month === prevMo) : [];

  const totalRevTarget  = targets.reduce((s,t) => s + Number(t.revenue_target), 0);
  const totalRevActual  = targets.reduce((s,t) => s + Number(t.revenue_actual), 0);
  const totalOrdTarget  = targets.filter(t=>t.channel!=='Offline').reduce((s,t) => s + Number(t.orders_target), 0);
  const totalOrdActual  = targets.filter(t=>t.channel!=='Offline').reduce((s,t) => s + Number(t.orders_actual), 0);
  const onlineRev  = targets.filter(t=>t.channel!=='Offline').reduce((s,t) => s + Number(t.revenue_actual), 0);
  const offlineRev = (targets.find(t=>t.channel==='Offline') || {}).revenue_actual || 0;

  const prevTotalRev = prevTargets.reduce((s,t) => s + Number(t.revenue_actual), 0);
  const momDelta = prevTotalRev ? Math.round(((totalRevActual - prevTotalRev)/prevTotalRev)*100) : null;
  const momSign  = momDelta > 0 ? '+' : '';
  const momCls   = momDelta >= 0 ? 'up' : 'down';

  const revPct = fmtPct(totalRevActual, totalRevTarget);
  const ordPct = fmtPct(totalOrdActual, totalOrdTarget);

  const monthNav = months.map(m => `<button onclick="state.activeMonth='${m}';renderPerformance()" class="${m===mo?'active':''}" style="${m===mo?'border-color:var(--primary);color:var(--primary);':''}">${monthLabel(m)}</button>`).join('');

  const sheetHint = !state.usingSheet ? `<div class="sheet-hint"><strong>📋 Sample data.</strong> Connect Google Sheets — tab <strong>Targets</strong>: month | channel | revenue_target | revenue_actual | orders_target | orders_actual</div>` : '';

  el.innerHTML = `
    ${sheetHint}
    <div class="month-picker">${monthNav}</div>

    <div class="stat-grid">
      <div class="stat-card accent">
        <div class="label">Total Revenue</div>
        <div class="value">${fmtIDR(totalRevActual)}</div>
        <div class="sub">Target: ${fmtIDR(totalRevTarget)}</div>
        ${momDelta !== null ? `<div class="delta" style="color:rgba(255,255,255,0.8)">${momSign}${momDelta}% vs prev month</div>` : ''}
        <div class="prog-wrap">
          <div class="prog-label"><span>${revPct}% achieved</span><span>${fmtIDR(totalRevTarget - totalRevActual)} gap</span></div>
          <div class="prog-bar-track"><div class="prog-bar-fill ${revPct<70?'danger':revPct<90?'warn':''}" style="width:${Math.min(revPct,100)}%"></div></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="label">Online Revenue</div>
        <div class="value">${fmtIDR(onlineRev)}</div>
        <div class="sub">${Math.round((onlineRev/totalRevActual)*100)}% of total</div>
        <div class="delta up">Shopee + Tokped + TikTok + Meta</div>
      </div>
      <div class="stat-card">
        <div class="label">Offline Revenue</div>
        <div class="value">${fmtIDR(offlineRev)}</div>
        <div class="sub">${Math.round((offlineRev/totalRevActual)*100)}% of total · ${state.distributors.filter(d=>d.status==='Active').length} active distributors</div>
        <div class="delta ${offlineRev >= ((targets.find(t=>t.channel==='Offline')||{}).revenue_target||0) ? 'up' : 'down'}">
          Target: ${fmtIDR((targets.find(t=>t.channel==='Offline')||{}).revenue_target||0)}
        </div>
      </div>
      <div class="stat-card">
        <div class="label">Total Online Orders</div>
        <div class="value">${fmtNum(totalOrdActual)}</div>
        <div class="sub">Target: ${fmtNum(totalOrdTarget)}</div>
        <div class="prog-wrap">
          <div class="prog-label"><span>${ordPct}% achieved</span></div>
          <div class="prog-bar-track"><div class="prog-bar-fill ${ordPct<70?'danger':ordPct<90?'warn':''}" style="width:${Math.min(ordPct,100)}%"></div></div>
        </div>
      </div>
    </div>

    <div class="section-header mb-12"><div><div class="section-title">Channel Breakdown</div></div></div>
    ${renderPerfTable(targets)}

    ${renderSplitVisual(onlineRev, offlineRev)}
  `;
}

function renderPerfTable(targets) {
  const rows = targets.map(t => {
    const revPct = fmtPct(t.revenue_actual, t.revenue_target);
    const ordPct = t.orders_target ? fmtPct(t.orders_actual, t.orders_target) : null;
    const color  = CONFIG.platformColors[t.channel] || 'var(--primary)';
    return `<tr>
      <td><div class="channel-cell"><span class="platform-dot" style="background:${color}"></span><strong>${t.channel}</strong></div></td>
      <td>${fmtIDR(t.revenue_target)}</td>
      <td>${fmtIDR(t.revenue_actual)}</td>
      <td>
        <span class="achieve-bar"><span class="achieve-fill" style="width:${Math.min(revPct,100)}%;background:${achClass(revPct)}"></span></span>
        <span style="font-weight:700;color:${achClass(revPct)}">${revPct}%</span>
      </td>
      <td>${t.orders_target ? fmtNum(t.orders_target) : '—'}</td>
      <td>${t.orders_actual ? fmtNum(t.orders_actual) : '—'}</td>
      <td>${ordPct !== null ? `<span style="font-weight:700;color:${achClass(ordPct)}">${ordPct}%</span>` : '—'}</td>
    </tr>`;
  }).join('');
  return `<div class="perf-table-wrap mb-24"><table class="perf-table">
    <thead><tr><th>Channel</th><th>Rev Target</th><th>Rev Actual</th><th>Achievement</th><th>Order Target</th><th>Order Actual</th><th>Orders %</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function renderSplitVisual(online, offline) {
  const total = online + offline;
  const onPct  = total ? Math.round((online/total)*100)  : 0;
  const offPct = total ? Math.round((offline/total)*100) : 0;
  const platformsOnline = [
    { name:'Shopee', color:'#EE4D2D' }, { name:'TikTok Shop', color:'#111111' },
    { name:'Tokopedia', color:'#00AA5B' }, { name:'Meta CPAS', color:'#1877F2' },
  ];
  return `<div class="split-visual">
    <div class="title">Online vs Offline Revenue Split</div>
    <div class="split-bar">
      <div class="seg" style="width:${onPct}%;background:linear-gradient(90deg,#FF7B1C,#1877F2)">${onPct}% Online</div>
      <div class="seg" style="width:${offPct}%;background:#94A3B8">${offPct}% Offline</div>
    </div>
    <div class="split-legend">
      <div class="split-leg-item"><span class="split-leg-dot" style="background:var(--primary)"></span><span>Online — ${fmtIDR(online)}</span></div>
      <div class="split-leg-item"><span class="split-leg-dot" style="background:#94A3B8"></span><span>Offline — ${fmtIDR(offline)}</span></div>
    </div>
  </div>`;
}

// ===== CHANNELS SECTION =====
function renderChannels() {
  const el = document.getElementById('section-channels');
  const months = [...new Set(state.channels.map(c => c.month))].sort().reverse();
  if (!months.includes(state.activeMonth)) state.activeMonth = months[0] || '2026-05';

  const plats = CONFIG.platforms;
  const tabs = plats.map(p => {
    const color = CONFIG.platformColors[p] || 'var(--primary)';
    return `<div class="tab-pill ${state.activePlatform===p?'active':''}" onclick="state.activePlatform='${p}';renderChannels()">
      ${p !== 'All' ? `<span class="dot" style="background:${color}"></span>` : ''}${p}
    </div>`;
  }).join('');

  const mo = state.activeMonth;
  const monthData = state.channels.filter(c => c.month === mo);
  const filtered  = state.activePlatform === 'All' ? monthData : monthData.filter(c => c.platform === state.activePlatform);

  // Summary cards
  const totalRev    = filtered.reduce((s,c) => s + Number(c.revenue), 0);
  const totalOrders = filtered.reduce((s,c) => s + Number(c.orders),  0);
  const totalSpend  = filtered.reduce((s,c) => s + Number(c.spend),   0);
  const avgROAS     = filtered.filter(c=>c.roas).reduce((s,c,_,a) => s + c.roas/a.filter(x=>x.roas).length, 0);

  const monthNav = months.map(m => `<button onclick="state.activeMonth='${m}';renderChannels()" style="padding:5px 12px;border-radius:20px;border:1.5px solid var(--border);background:var(--bg-card);font-size:12px;font-weight:700;cursor:pointer;color:${m===mo?'var(--primary)':'var(--text-muted)'};border-color:${m===mo?'var(--primary)':'var(--border)'}">${monthLabel(m)}</button>`).join('');

  const sheetHint = !state.usingSheet ? `<div class="sheet-hint"><strong>📋 Sample data.</strong> Connect Google Sheets — tab <strong>Channels</strong>: month | platform | subchannel | revenue | orders | spend | roas | notes</div>` : '';

  el.innerHTML = `
    ${sheetHint}
    <div class="filter-bar" style="margin-bottom:16px">${monthNav}</div>
    <div class="tab-row">${tabs}</div>
    <div class="channel-hero">
      <div class="ch-card"><div class="ch-label">Revenue</div><div class="ch-val">${fmtIDR(totalRev)}</div><div class="ch-sub">${state.activePlatform === 'All' ? 'All platforms combined' : state.activePlatform}</div></div>
      <div class="ch-card"><div class="ch-label">Orders</div><div class="ch-val">${fmtNum(totalOrders)}</div><div class="ch-sub">Avg ${fmtIDR(totalOrders ? totalRev/totalOrders : 0)} / order</div></div>
      <div class="ch-card"><div class="ch-label">Ad Spend</div><div class="ch-val">${fmtIDR(totalSpend)}</div><div class="ch-sub">${totalSpend ? Math.round((totalSpend/totalRev)*100) + '% of revenue' : 'Organic channels included'}</div></div>
      <div class="ch-card"><div class="ch-label">Avg ROAS</div><div class="ch-val">${avgROAS ? avgROAS.toFixed(1) + 'x' : '—'}</div><div class="ch-sub">${avgROAS >= 3 ? '✅ Above 3x target' : avgROAS ? '⚠️ Below 3x target' : 'Organic sub-channels'}</div></div>
    </div>
    ${renderChannelTable(filtered)}
  `;
}

function renderChannelTable(rows) {
  if (!rows.length) return `<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">No channel data for this selection</div></div>`;
  const sorted = [...rows].sort((a,b) => b.revenue - a.revenue);
  const trs = sorted.map(c => {
    const color = CONFIG.platformColors[c.platform] || 'var(--primary)';
    const roasCell = c.roas ? `<span style="font-weight:700;color:${c.roas>=3?'var(--green)':'var(--amber)'}">${Number(c.roas).toFixed(1)}x</span>` : '<span style="color:var(--text-muted)">—</span>';
    return `<tr>
      <td><div class="channel-cell"><span class="platform-dot" style="background:${color}"></span><strong>${c.platform}</strong></div></td>
      <td>${c.subchannel}</td>
      <td style="font-weight:700">${fmtIDR(c.revenue)}</td>
      <td>${fmtNum(c.orders)}</td>
      <td style="color:var(--text-muted)">${fmtIDR(c.orders ? c.revenue/c.orders : 0)}</td>
      <td>${c.spend ? fmtIDR(c.spend) : '<span style="color:var(--text-muted)">—</span>'}</td>
      <td>${roasCell}</td>
      <td style="font-size:12px;color:var(--text-muted);max-width:180px">${escHtml(c.notes || '')}</td>
    </tr>`;
  }).join('');
  return `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>Platform</th><th>Sub-Channel</th><th>Revenue</th><th>Orders</th><th>Avg Order</th><th>Spend</th><th>ROAS</th><th>Notes</th></tr></thead>
    <tbody>${trs}</tbody>
  </table></div>`;
}

// ===== OFFLINE SECTION =====
// ── Tab switcher for section-offline ──────────────────────────────
function switchOfflineTab(tab) {
  document.querySelectorAll('#offline-tab-bar .stab').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === tab));
  document.getElementById('offline-directory').style.display = tab === 'directory' ? '' : 'none';
  document.getElementById('offline-analytics').style.display = tab === 'analytics'  ? '' : 'none';
  if (tab === 'analytics' && !state.distAnalyticsLoaded) mountDistributorAnalytics();
}

function mountDistributorAnalytics() {
  const container = document.getElementById('offline-analytics');
  container.innerHTML = `
    <iframe
      src="distributor/index.html"
      style="width:100%;height:calc(100vh - 130px);border:none;border-radius:var(--radius)"
      id="distAnalyticsFrame"
      title="Distributor Analytics Dashboard"
    ></iframe>`;
  state.distAnalyticsLoaded = true;
}

// ── Consignment helpers ────────────────────────────────────────────
function isConsignment(distName, month) {
  const cp = CONFIG.consignmentPrograms || [];
  return cp.find(c => {
    const nameMatch = c.matchBranches
      ? distName.toLowerCase().includes(c.distributor.toLowerCase().split(' ')[0])
      : distName.toLowerCase() === c.distributor.toLowerCase();
    if (!nameMatch) return false;
    if (!month) return true;
    if (c.period.end   && month > c.period.end)   return false;
    if (c.period.start && month < c.period.start) return false;
    return true;
  });
}

// ── DSLO (Days Since Last Order) helpers ──────────────────────────
function getDSLO(dist) {
  if (!dist.last_order_date) return null;
  const last = new Date(dist.last_order_date);
  if (isNaN(last.getTime())) return null;
  return Math.floor((new Date() - last) / (1000 * 60 * 60 * 24));
}
function getChurnRisk(dist) {
  const dslo = getDSLO(dist);
  const window = dist.expected_reorder_days || 60;
  if (dslo === null) return 'unknown';
  if (dslo > window * 1.5) return 'high';
  if (dslo > window)       return 'medium';
  return 'low';
}

function renderOffline() {
  const regions     = CONFIG.regions;
  const all         = state.distributors;
  const active      = all.filter(d => d.status === 'Active');
  const filtered    = state.activeRegion === 'All' ? active : active.filter(d => d.region === state.activeRegion);
  const totalTarget = active.reduce((s,d) => s + Number(d.monthly_target), 0);

  const sheetHint = !state.usingSheet
    ? `<div class="sheet-hint"><strong>📋 Sample data.</strong> Connect Google Sheets — tab <strong>Distributors</strong>: name | type | city | province | region | contact_name | contact_wa | tier | status | since | monthly_target | notes | last_order_date | expected_reorder_days | account_tier</div>`
    : '';

  // Consignment warning banner
  const missingRates = (CONFIG.consignmentPrograms || []).filter(c => c.sellThroughRate === null);
  const consignBanner = missingRates.length
    ? `<div class="alert-banner amber">
        <span>⚠️</span>
        <span><strong>${missingRates.length} consignment partner${missingRates.length > 1 ? 's' : ''} missing sell-through rate</strong> — ATO value for <em>${missingRates.map(c => c.distributor).join(', ')}</em> may overstate recognized revenue (~Rp 418jt combined ATO at risk). <a href="#" onclick="navigate('dist-intel');return false">View Intel →</a></span>
      </div>`
    : '';

  // Churn alert: any high-risk distributor
  const highChurn = active.filter(d => getChurnRisk(d) === 'high');
  const churnBanner = highChurn.length
    ? `<div class="alert-banner red">
        <span>🔴</span>
        <span><strong>${highChurn.length} distributor${highChurn.length > 1 ? 's' : ''} overdue for reorder</strong> — ${highChurn.map(d=>d.name).join(', ')}. Check in now.</span>
      </div>`
    : '';

  // Region map tiles
  const regionTiles = regions.slice(1).map(r => {
    const count = active.filter(d => d.region === r).length;
    const color = CONFIG.regionColors[r] || 'var(--primary)';
    return `<div class="region-tile ${state.activeRegion===r?'active':''}" onclick="state.activeRegion='${r}';renderOfflineDirectory()">
      <div class="r-name" style="color:${color}">${r}</div>
      <div class="r-count" style="color:${color}">${count}</div>
      <div class="r-sub">${count===1?'distributor':'distributors'}</div>
    </div>`;
  }).join('');

  document.getElementById('offline-directory').innerHTML = `
    ${sheetHint}
    ${consignBanner}
    ${churnBanner}
    <div class="stat-grid">
      <div class="stat-card accent"><div class="label">Active Distributors</div><div class="value">${active.length}</div><div class="sub">Across ${[...new Set(active.map(d=>d.region))].length} regions</div></div>
      <div class="stat-card"><div class="label">Monthly Target (Offline)</div><div class="value">${fmtIDR(totalTarget)}</div><div class="sub">Across all active partners</div></div>
      <div class="stat-card"><div class="label">Tier 1 Partners</div><div class="value">${active.filter(d=>d.tier==='1').length}</div><div class="sub">Chain stores & major retailers</div></div>
      <div class="stat-card"><div class="label">Regions Covered</div><div class="value">${[...new Set(active.map(d=>d.region))].length}</div><div class="sub">of 6 major Indonesia regions</div></div>
    </div>
    <div class="section-header mb-12"><div><div class="section-title">Coverage by Region</div></div></div>
    <div class="region-map mb-24">
      <div class="region-tile ${state.activeRegion==='All'?'active':''}" onclick="state.activeRegion='All';renderOfflineDirectory()" style="grid-column:span 1">
        <div class="r-name">All Regions</div>
        <div class="r-count">${active.length}</div>
        <div class="r-sub">total distributors</div>
      </div>
      ${regionTiles}
    </div>
    <div class="section-header mb-12">
      <div><div class="section-title">Distributor Directory</div><div class="section-sub">${filtered.length} partner${filtered.length!==1?'s':''} · DSLO = days since last order</div></div>
      <div><a href="${CONFIG.sheetUrl}" target="_blank" style="font-size:12px;color:var(--primary);font-weight:700">Edit in Sheets ↗</a></div>
    </div>
    ${renderDistributorTable(filtered)}
  `;
}

// Called by region tiles inside the directory tab
function renderOfflineDirectory() {
  const all    = state.distributors;
  const active = all.filter(d => d.status === 'Active');
  const filtered = state.activeRegion === 'All' ? active : active.filter(d => d.region === state.activeRegion);
  // Update region tile active states
  document.querySelectorAll('.region-tile').forEach(t => {
    const r = t.querySelector('.r-name')?.textContent;
    t.classList.toggle('active', r === state.activeRegion || (state.activeRegion==='All' && r==='All Regions'));
  });
  // Re-render just the table portion
  const tableWrap = document.querySelector('#offline-directory .table-wrap')?.parentElement;
  if (tableWrap) tableWrap.innerHTML = renderDistributorTable(filtered);
  else renderOffline(); // fallback: full re-render
}

function renderDistributorTable(rows) {
  if (!rows.length) return `<div class="empty-state"><div class="empty-icon">🏪</div><div class="empty-title">No distributors in this region yet</div><div class="empty-sub">Add them to your Google Sheet or check the Leads Pipeline</div></div>`;
  const trs = rows.map(d => {
    const tierEl    = `<span class="tier-${d.tier}">Tier ${d.tier}</span>`;
    const statusEl  = `<span class="badge ${d.status==='Active'?'badge-green':'badge-gray'}">${d.status}</span>`;
    const waLink    = d.contact_wa ? `<a href="https://wa.me/${d.contact_wa}" target="_blank" class="wa-btn">💬 WA</a>` : '—';
    const since     = d.since ? new Date(d.since+'-01').toLocaleDateString('id-ID',{month:'short',year:'numeric'}) : '—';

    // Consignment badge
    const consign = isConsignment(d.name);
    const consignBadge = consign
      ? `<span class="badge-consign" title="${consign.note}">📦 Consignment${consign.sellThroughRate ? ' · '+consign.sellThroughRate+'%' : ' · Rate TBD'}</span>`
      : '';

    // DSLO
    const dslo = getDSLO(d);
    const risk = getChurnRisk(d);
    const dsloHtml = dslo !== null
      ? `<span class="dslo-badge dslo-${risk}" title="Expected reorder: ${d.expected_reorder_days||60}d">${dslo}d ago</span>`
      : `<span class="dslo-unknown" style="font-size:11px;color:var(--text-muted)">—</span>`;

    return `<tr>
      <td>
        <div class="dist-name-cell">${escHtml(d.name)}</div>
        <div class="dist-type">${d.type}${consignBadge ? ' &nbsp;' + consignBadge : ''}</div>
      </td>
      <td>${d.city}<br><span style="font-size:11px;color:var(--text-muted)">${d.province}</span></td>
      <td><span class="badge" style="background:${CONFIG.regionColors[d.region]||'var(--primary)'}18;color:${CONFIG.regionColors[d.region]||'var(--primary)'}">${d.region}</span></td>
      <td>${tierEl}${d.account_tier ? `<br><span style="font-size:10px;color:var(--text-muted)">${d.account_tier}</span>` : ''}</td>
      <td>${statusEl}</td>
      <td style="font-weight:700">${fmtIDR(d.monthly_target)}</td>
      <td>${since}</td>
      <td>${dsloHtml}</td>
      <td>${escHtml(d.contact_name || '—')}</td>
      <td>${waLink}</td>
    </tr>`;
  }).join('');
  return `<div class="table-wrap"><table class="data-table">
    <thead><tr><th>Name / Type</th><th>Location</th><th>Region</th><th>Tier</th><th>Status</th><th>Monthly Target</th><th>Since</th><th>Last Order</th><th>Contact</th><th>WA</th></tr></thead>
    <tbody>${trs}</tbody>
  </table></div>`;
}

// ===== CRM STATE (localStorage) =====
const CRM_KEY = 'hp_crm_v1';
function getCRM() { try { return JSON.parse(localStorage.getItem(CRM_KEY) || '{}'); } catch { return {}; } }
function saveCRM(data) { localStorage.setItem(CRM_KEY, JSON.stringify(data)); }
function getCRMLead(name) { const c = getCRM(); return c[name] || {}; }
function setCRMLead(name, updates) { const c = getCRM(); c[name] = { ...(c[name] || {}), ...updates }; saveCRM(c); }

function getThisMonday() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(now);
  m.setDate(now.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}
function isFollowedUpThisWeek(name) {
  const e = getCRMLead(name);
  if (!e.followedUpDate) return false;
  return new Date(e.followedUpDate) >= getThisMonday();
}
function getLeadStage(lead) {
  const e = getCRMLead(lead.name);
  return e.stage || lead.stage;
}
function toggleFollowUp(name) {
  const today = new Date().toISOString().split('T')[0];
  const e = getCRMLead(name);
  const wasChecked = e.followedUpDate === today;
  setCRMLead(name, { followedUpDate: wasChecked ? null : today });
  renderLeads();
  showToast(wasChecked ? 'Follow-up removed' : '✅ Marked as followed up!');
}
function updateLeadStage(name, newStage) {
  setCRMLead(name, { stage: newStage });
  renderLeads();
  showToast(name + ' → ' + newStage);
}
function clearFollowUps() {
  const c = getCRM();
  const monday = getThisMonday().toISOString().split('T')[0];
  Object.keys(c).forEach(n => {
    if (c[n].followedUpDate && c[n].followedUpDate >= monday) c[n].followedUpDate = null;
  });
  saveCRM(c);
  renderLeads();
  showToast('Weekly follow-up tracker reset');
}

// ===== LEADS SECTION =====
function renderLeads() {
  const el = document.getElementById('section-leads');

  // Merge localStorage stage overrides
  const leads      = state.leads.map(l => ({ ...l, stage: getLeadStage(l) }));
  const activeLeads = leads.filter(l => !['Won','Lost'].includes(l.stage));
  const wonLeads   = leads.filter(l => l.stage === 'Won');
  const lostLeads  = leads.filter(l => l.stage === 'Lost');

  // Ops metrics
  const followedThisWeek = activeLeads.filter(l => isFollowedUpThisWeek(l.name));
  const followupRate = activeLeads.length ? Math.round((followedThisWeek.length / activeLeads.length) * 100) : 0;
  const hotLeads = activeLeads.filter(l => ['Proposal Sent','Negotiating'].includes(l.stage));
  const staleLeads = activeLeads.filter(l => {
    if (isFollowedUpThisWeek(l.name)) return false;
    const d = daysAgo(l.last_contact);
    return d === null || d > 7;
  });

  // Stage counts for funnel (active only)
  const byStage = {};
  CONFIG.leadStages.forEach(s => { byStage[s] = 0; });
  leads.forEach(l => { if (byStage[l.stage] !== undefined) byStage[l.stage]++; });
  const convPct = activeLeads.length ? Math.round((hotLeads.length / activeLeads.length) * 100) : 0;

  // Active pipeline stages only (exclude Won/Lost from funnel filter)
  const pipelineStages = CONFIG.leadStages.filter(s => !['Won','Lost'].includes(s));

  // Filter by selected stage
  const filtered = state.activeLeadStage === 'All'
    ? activeLeads
    : leads.filter(l => l.stage === state.activeLeadStage);

  const sheetHint = !state.usingSheet
    ? `<div class="sheet-hint"><strong>📋 Sample data.</strong> Connect Google Sheets — tab <strong>Leads</strong>: name | type | city | province | region | contact_name | contact_wa | stage | source | assigned | last_contact | potential_monthly | notes | first_contact_date | priority</div>`
    : '';

  const rateColor  = followupRate >= 75 ? 'var(--green)' : followupRate >= 40 ? 'var(--amber)' : 'var(--red)';
  const staleColor = staleLeads.length > 15 ? 'var(--red)' : staleLeads.length > 5 ? 'var(--amber)' : 'var(--green)';

  const wonSc  = CONFIG.stageColors['Won']  || {};
  const lostSc = CONFIG.stageColors['Lost'] || {};

  el.innerHTML = `
    ${sheetHint}

    <!-- Ops header -->
    <div class="ops-header mb-20">
      <div class="ops-stat">
        <div class="ops-num">${activeLeads.length}</div>
        <div class="ops-label">Active Leads</div>
      </div>
      <div class="ops-stat ops-stat-wide">
        <div class="ops-num" style="color:${rateColor}">${followedThisWeek.length}<span class="ops-denom">/${activeLeads.length}</span></div>
        <div class="ops-label">Followed Up This Week</div>
        <div class="ops-bar-track"><div class="ops-bar-fill" style="width:${followupRate}%;background:${rateColor}"></div></div>
        <div class="ops-rate">${followupRate}% completion rate</div>
      </div>
      <div class="ops-stat">
        <div class="ops-num" style="color:${staleColor}">${staleLeads.length}</div>
        <div class="ops-label">Need Follow-up</div>
        <div class="ops-sub">Not touched this week</div>
      </div>
      <div class="ops-stat">
        <div class="ops-num" style="color:var(--primary)">${hotLeads.length}</div>
        <div class="ops-label">Hot Leads 🔥</div>
        <div class="ops-sub">Proposal + Negotiating</div>
      </div>
      <div class="ops-stat">
        <div class="ops-num" style="color:${wonSc.text||'var(--green)'}">${wonLeads.length}</div>
        <div class="ops-label">Won ✅</div>
        <div class="ops-sub">${lostLeads.length} lost</div>
      </div>
    </div>

    <!-- Stage funnel filter -->
    <div class="stage-funnel mb-12">
      <div class="funnel-step ${state.activeLeadStage==='All'?'active':''}" onclick="state.activeLeadStage='All';renderLeads()">
        <div class="fn-num">${activeLeads.length}</div>
        <div class="fn-label">All Active</div>
      </div>
      ${pipelineStages.map(s => {
        const cnt = byStage[s] || 0;
        const cfg = CONFIG.stageColors[s] || {};
        const isActive = state.activeLeadStage === s;
        return `<div class="funnel-step ${isActive?'active':''}" onclick="state.activeLeadStage='${s}';renderLeads()"
          style="${isActive?`background:${cfg.bg};border-color:${cfg.border};`:''}">
          <div class="fn-num" style="color:${cfg.text||'var(--text)'}">${cnt}</div>
          <div class="fn-label" style="color:${isActive?cfg.text:'var(--text-muted)'}">${s}</div>
        </div>`;
      }).join('')}
      <div class="funnel-step ${state.activeLeadStage==='Won'?'active':''}" onclick="state.activeLeadStage='Won';renderLeads()"
        style="${state.activeLeadStage==='Won'?`background:${wonSc.bg};border-color:${wonSc.border};`:''}">
        <div class="fn-num" style="color:${wonSc.text||'var(--green)'}">${wonLeads.length}</div>
        <div class="fn-label" style="color:${state.activeLeadStage==='Won'?wonSc.text:'var(--text-muted)'}">Won</div>
      </div>
      <div class="funnel-step ${state.activeLeadStage==='Lost'?'active':''}" onclick="state.activeLeadStage='Lost';renderLeads()"
        style="${state.activeLeadStage==='Lost'?`background:${lostSc.bg};border-color:${lostSc.border};`:''}">
        <div class="fn-num" style="color:${lostSc.text||'var(--text-muted)'}">${lostLeads.length}</div>
        <div class="fn-label" style="color:${state.activeLeadStage==='Lost'?lostSc.text:'var(--text-muted)'}">Lost</div>
      </div>
    </div>

    <!-- View toggle + header -->
    <div class="section-header mb-12">
      <div>
        <div class="section-title">Follow-up Tracker</div>
        <div class="section-sub">${filtered.length} leads · ☐ check off when followed up · stage dropdown to update</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <div class="view-toggle">
          <button class="${!state.leadKanbanMode?'active':''}" onclick="state.leadKanbanMode=false;renderLeads()">≡ List</button>
          <button class="${state.leadKanbanMode?'active':''}" onclick="state.leadKanbanMode=true;renderLeads()">⊞ Kanban</button>
        </div>
        <button onclick="clearFollowUps()" class="btn-ghost">↺ Reset Week</button>
        <a href="${CONFIG.sheetUrl}" target="_blank" class="btn-ghost">Edit in Sheets ↗</a>
      </div>
    </div>

    ${state.leadKanbanMode && !['Won','Lost'].includes(state.activeLeadStage)
      ? renderKanban(activeLeads)
      : renderCRMTable(filtered)
    }
  `;
}

function renderKanban(leads) {
  const stages = CONFIG.leadStages.filter(s => !['Won','Lost'].includes(s));
  return `<div class="kanban-board">
    ${stages.map(stage => {
      const cfg   = CONFIG.stageColors[stage] || {};
      const cards = leads.filter(l => l.stage === stage);
      return `<div class="kanban-col">
        <div class="kanban-col-header" style="color:${cfg.text||'var(--text)'};background:${cfg.bg||'var(--bg)'};border-color:${cfg.border||'var(--border)'}">
          <span>${stage}</span>
          <span class="kanban-count">${cards.length}</span>
        </div>
        <div class="kanban-cards">
          ${cards.length
            ? cards.map(l => {
                const safe = l.name.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
                const days = daysAgo(l.last_contact);
                const stale = !isFollowedUpThisWeek(l.name) && (days===null || days>7);
                return `<div class="kanban-card${stale?' row-stale':''}" onclick="showLeadDetail('${safe}')">
                  <div class="kc-name">${escHtml(l.name)}</div>
                  <div class="kc-meta">${l.city||'—'} · ${l.type}</div>
                  ${l.potential_monthly ? `<div class="kc-val">~${fmtIDR(l.potential_monthly)}/mo</div>` : ''}
                  ${stale ? `<div class="kc-meta" style="color:var(--red)">⚠ ${days===null?'Never':''+days+'d ago'}</div>` : ''}
                  ${l.assigned ? `<div class="kc-assign">👤 ${l.assigned}</div>` : ''}
                </div>`;
              }).join('')
            : `<div class="kc-empty">No leads</div>`
          }
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function renderCRMTable(leads) {
  if (!leads.length) return `<div class="empty-state"><div class="empty-icon">🎯</div><div class="empty-title">No leads in this stage</div><div class="empty-sub">Select a different filter above</div></div>`;

  const stageOrder = { 'Negotiating': 0, 'Proposal Sent': 1, 'Interested': 2, 'Contacted': 3, 'Cold Lead': 4 };

  // Sort: stale unfollowed first → then by stage urgency → followed up last
  const sorted = [...leads].sort((a, b) => {
    const aF = isFollowedUpThisWeek(a.name);
    const bF = isFollowedUpThisWeek(b.name);
    const aS = !aF && (daysAgo(a.last_contact) === null || (daysAgo(a.last_contact) || 0) > 7);
    const bS = !bF && (daysAgo(b.last_contact) === null || (daysAgo(b.last_contact) || 0) > 7);
    if (aS !== bS) return aS ? -1 : 1;
    if (aF !== bF) return aF ? 1 : -1;
    return (stageOrder[a.stage] || 5) - (stageOrder[b.stage] || 5);
  });

  const rows = sorted.map(l => {
    const isChecked = isFollowedUpThisWeek(l.name);
    const days = daysAgo(l.last_contact);
    const isStale = !isChecked && (days === null || days > 7);
    const sc = CONFIG.stageColors[l.stage] || {};
    const safeName = l.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    // WA button
    const waBtn = l.contact_wa
      ? `<a href="https://wa.me/${l.contact_wa}" target="_blank" class="wa-action" onclick="event.stopPropagation()" title="${l.contact_name ? l.contact_name + ' · ' : ''}${l.contact_wa}">💬</a>`
      : `<span class="wa-action disabled" title="No WA number">—</span>`;

    // Last contact label + style
    const lastLabel = days === null ? 'Never contacted' : days === 0 ? 'Today' : `${days}d ago`;
    const lastCls = days === null || days > 30 ? 'last-overdue' : days > 7 ? 'last-stale' : '';

    // IG handle extracted from notes
    const igMatch = l.notes ? l.notes.match(/IG:\s*@?([\w.]+)/) : null;
    const igHandle = igMatch ? igMatch[1] : null;

    // Stage select — all stages including Won/Lost
    const stageOptsHtml = CONFIG.leadStages.map(s =>
      `<option value="${s}"${s === l.stage ? ' selected' : ''}>${s}</option>`
    ).join('');

    // Revenue — very small, labelled as estimate
    const revLabel = l.potential_monthly
      ? `<span class="est-rev" title="Estimated — assumption only">~${fmtIDR(l.potential_monthly)}/mo est.</span>`
      : '';

    return `<tr class="crm-row${isChecked ? ' row-done' : ''}${isStale ? ' row-stale' : ''}">
      <td class="td-check" onclick="toggleFollowUp('${safeName}');event.stopPropagation()">
        <div class="fu-checkbox${isChecked ? ' checked' : ''}">${isChecked ? '✓' : ''}</div>
      </td>
      <td class="td-name" onclick="showLeadDetail('${safeName}')">
        <div class="crm-name">${escHtml(l.name)}</div>
        <div class="crm-sub">
          ${l.contact_name ? `<span class="crm-pic">👤 ${l.contact_name}</span>` : ''}
          ${igHandle ? `<a href="https://instagram.com/${igHandle}" target="_blank" class="crm-ig" onclick="event.stopPropagation()">@${igHandle}</a>` : ''}
        </div>
      </td>
      <td class="td-loc">
        <div class="crm-city">${l.city || '—'}</div>
        <div class="crm-rgn">${l.region || ''}</div>
      </td>
      <td class="td-stage">
        <select class="stage-sel"
          style="background:${sc.bg||'#F1F5F9'};color:${sc.text||'inherit'};border-color:${sc.border||'var(--border)'}"
          onchange="updateLeadStage('${safeName}',this.value)" onclick="event.stopPropagation()">
          ${stageOptsHtml}
        </select>
        ${revLabel}
      </td>
      <td class="td-src">
        <span class="crm-source">${l.source || '—'}</span>
      </td>
      <td class="td-last">
        <div class="last-lbl ${lastCls}">${lastLabel}</div>
        ${isStale && !isChecked ? '<div class="fu-flag">⚠ Follow up!</div>' : ''}
        ${isChecked ? '<div class="done-flag">✓ This week</div>' : ''}
      </td>
      <td class="td-wa">${waBtn}</td>
    </tr>`;
  }).join('');

  return `<div class="crm-wrap">
    <table class="crm-table">
      <thead><tr>
        <th class="th-done" title="Check when followed up this week">✅</th>
        <th>Store / Contact</th>
        <th>Location</th>
        <th>Stage</th>
        <th>Source</th>
        <th>Last Contact</th>
        <th>WA</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function showLeadDetail(name) {
  const lead = state.leads.find(x => x.name === name);
  if (!lead) return;
  const l = { ...lead, stage: getLeadStage(lead) };
  const sc = CONFIG.stageColors[l.stage] || {};
  const days = daysAgo(l.last_contact);
  const isChecked = isFollowedUpThisWeek(l.name);

  const waBlock = l.contact_wa
    ? `<a href="https://wa.me/${l.contact_wa}" target="_blank" class="wa-btn" style="font-size:14px;padding:10px 20px;margin-bottom:16px;display:inline-flex">💬 Open WhatsApp${l.contact_name ? ' · ' + l.contact_name : ''}</a>`
    : '';

  document.getElementById('modalLeadTitle').innerHTML = `${escHtml(l.name)} <span class="badge" style="background:${sc.bg};color:${sc.text};margin-left:6px;font-size:12px">${l.stage}</span>`;
  document.getElementById('modalLeadBody').innerHTML = `
    ${waBlock}
    <div class="modal-row"><span class="mr-label">Follow-up</span><span class="mr-val">${isChecked ? '<span style="color:var(--green);font-weight:700">✅ Done this week</span>' : '<span style="color:var(--amber);font-weight:700">⚠️ Not yet this week</span>'}</span></div>
    <div class="modal-row"><span class="mr-label">Location</span><span class="mr-val">${l.city || '—'}, ${l.province || ''} · ${l.region || ''}</span></div>
    <div class="modal-row"><span class="mr-label">Contact</span><span class="mr-val">${escHtml(l.contact_name || '—')}${l.contact_wa ? ` <span style="color:var(--text-muted);font-size:11px">${l.contact_wa}</span>` : ''}</span></div>
    <div class="modal-row"><span class="mr-label">Source</span><span class="mr-val">${l.source || '—'}</span></div>
    <div class="modal-row"><span class="mr-label">Last Contact</span><span class="mr-val ${days !== null && days > 7 ? 'last-stale' : ''}">${l.last_contact || 'Never'}${days !== null ? ` (${days}d ago)` : ''}</span></div>
    <div class="modal-row"><span class="mr-label">Assigned</span><span class="mr-val">${l.assigned || '—'}</span></div>
    ${l.notes ? `<div class="modal-row"><span class="mr-label">Notes</span><span class="mr-val" style="font-size:12px;color:var(--text-muted);line-height:1.5">${escHtml(l.notes)}</span></div>` : ''}
    <div class="modal-row" style="padding-top:12px"><span class="mr-label" style="color:var(--text-muted);font-size:11px">Est. Revenue</span><span class="mr-val" style="color:var(--text-muted);font-size:12px">${l.potential_monthly ? '~' + fmtIDR(l.potential_monthly) + '/mo (rough estimate)' : '—'}</span></div>
  `;
  document.getElementById('leadModal').style.display = 'flex';
}

// ===== TOAST =====
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.classList.remove('show'), 2500);
}


// ============================================================
// ============================================================
// KOL BRIEF GENERATOR
// ============================================================

// --- Product & Tier Databases ---

const HP_PRODUCTS_DB = {
  'SoftAir': {
    tagline: 'Seringan udara. Selembut pelukan.',
    type: 'Soft Comfort Knit',
    color: '#6BAED6',
    features: [
      ['Air-Soft Handfeel',      'Rajutan ringan yang terasa seperti udara di kulit si kecil.'],
      ['Breathable Everyday',    'Sirkulasi udara baik — nyaman dipakai seharian di iklim tropis.'],
      ['Gentle on Newborn Skin', 'Lembut untuk kulit sensitif — minim gesekan, minim iritasi.'],
      ['Soft Wash-After-Wash',   'Tetap lembut & bentuknya terjaga meski sering dicuci.'],
    ],
    construction: [
      ['Lightweight Soft Knit', 'Konstruksi rajut ringan dengan handfeel selembut kapas premium.'],
      ['Combed Cotton Yarn',    'Benang katun yang disisir halus — lembut & tidak berbulu.'],
    ],
    items: 'Bodysuit · Set · Sleep Set', range: 'Newborn–3Y',
    trust: ['Gentle on Sensitive Skin', 'SNI Certified', 'Combed Soft Cotton'],
    hashtags: ['#SoftAir', '#HappyPumpkinSoftAir'],
  },
  'BreatheKnit': {
    tagline: 'Dibuat untuk bernapas. Seperti kulit keduanya.',
    type: 'Breathable Knit',
    color: '#3FA796',
    features: [
      ['Active Airflow Knit', 'Struktur rajut berpori yang mengalirkan udara — tetap sejuk saat aktif.'],
      ['Sweat-Friendly',      'Membantu menyerap & menguapkan keringat — kulit tetap kering.'],
      ['All-Day Comfort',     'Ringan & tidak gerah — cocok untuk anak yang bergerak seharian.'],
      ['Soft Yet Durable',    'Lembut di kulit, tapi kuat untuk dicuci berulang.'],
    ],
    construction: [
      ['Open-Pore Breathable Knit', 'Rajutan dengan pori mikro yang meningkatkan sirkulasi udara.'],
      ['Cotton-Rich Blend',         'Mayoritas katun untuk kelembutan, dengan ketahanan ekstra.'],
    ],
    items: 'Tee · Set · Romper', range: 'Newborn–6Y',
    trust: ['Breathable Airflow Knit', 'SNI Certified', 'Sweat-Wicking Cotton'],
    hashtags: ['#BreatheKnit', '#HappyPumpkinBreatheKnit'],
  },
  'Sunny Days': {
    tagline: 'Summer doesn\'t need a destination.',
    type: 'Fashion Basic',
    color: '#D4734A',
    features: [
      ['Timeless Design',    'Terlihat fresh wash-after-wash — 50 kali cuci masih seperti baru.'],
      ['Bundle Value',       '1 set = beberapa look berbeda. Satu keputusan, banyak pilihan.'],
      ['Made for Real Kids', 'Dirancang untuk cara anak sebenarnya hidup — main, gerak, kotor, cuci ulang.'],
      ['Everyday Essential', 'Dari rumah ke mall, dari pagi ke sore — satu set cukup.'],
    ],
    construction: [
      ['Premium Cotton Blend', 'Material yang tetap terjaga bentuk & warnanya meski sering dicuci.'],
      ['Relaxed Easy Fit',     'Potongan yang nyaman bergerak — tidak mengekang aktivitas anak.'],
    ],
    items: 'Top · Bottom · Set', range: 'Newborn–8Y',
    trust: ['SNI Certified', 'Wash-Tested 50+ Times', 'Safe for Everyday Wear'],
    hashtags: ['#SunnyDays', '#HappyPumpkinSunnyDays'],
  },
  'ActiveKnit': {
    tagline: 'Stylish for the photo. Built for everything after.',
    type: 'Activewear',
    color: '#4A8C6F',
    features: [
      ['4-Way Stretch Spandex', 'Ikuti semua gerakan si kecil — lari, lompat, merangkak.'],
      ['100% Cotton Sweat Mgmt','Menyerap keringat dengan cepat — tetap segar meski aktif seharian.'],
      ['Full Range of Motion',  'Potongan yang tidak membatasi — dirancang khusus untuk anak aktif.'],
      ['Style Meets Performance','Stylish di foto — tapi siap menghadapi semua setelahnya.'],
    ],
    construction: [
      ['Knit + Spandex Construction','Elastisitas tinggi yang kembali ke bentuk semula setelah dicuci.'],
      ['Moisture-Wicking Knit',      'Teknologi rajutan yang membuat kulit tetap kering dan nyaman.'],
    ],
    items: 'Polo · Active Set · Shorts', range: '1Y–10Y',
    trust: ['4-Way Stretch Technology', 'Sweat-Wicking Cotton', 'SNI Certified'],
    hashtags: ['#ActiveKnit', '#HappyPumpkinActiveKnit'],
  },
  'PureKnit': {
    tagline: 'Zero Stitches. 100% Comfort.',
    type: 'Premium Knit',
    color: '#5A4A8C',
    features: [
      ['Seamless Technology',  'Teknologi Shima Seiki — pertama di kidswear Indonesia. Zero seam, zero iritasi.'],
      ['100% Pure Cotton',     'Tanpa campuran polyester atau nylon — hanya kapas murni.'],
      ['Premium Look & Feel',  'Terlihat 3× lebih mahal dari harganya — setiap momen layak diabadikan.'],
      ['No Seam = No Irritation','Kulit sensitif anak aman dari gesekan jahitan sepanjang hari.'],
    ],
    construction: [
      ['Shima Seiki Seamless Knit','Satu-satunya kidswear Indonesia dengan teknologi ini — dirajut utuh tanpa jahitan.'],
      ['Pure Cotton Yarn',         'Material kapas asli tanpa bahan sintetis tambahan.'],
    ],
    items: 'Seamless Top · Seamless Set · Longsleeve', range: 'Newborn–5Y',
    trust: ['Shima Seiki Technology', 'Zero Seam Zero Irritation', '100% Pure Cotton'],
    hashtags: ['#PureKnit', '#HappyPumpkinPureKnit'],
  },
  'UltraCool™': {
    tagline: 'We spent a year building the coolest shirt in Indonesia.',
    type: 'Premium Polo',
    color: '#2E7DAF',
    features: [
      ['Patented Cooling Tech',  '1 tahun R&D. Satu paten. Satu kaos — untuk cuaca Indonesia yang sesungguhnya.'],
      ['Fine Cotton + Spandex',  'Menyerap suhu dingin sekitar — tetap terasa sejuk di iklim tropis.'],
      ['4-Way Stretch Durability','100+ kali cuci masih sempurna — investasi jangka panjang.'],
      ['+20-30% Premium = 200% Value','Sedikit lebih premium — tapi nilainya 2× lebih panjang.'],
    ],
    construction: [
      ['Patented Cooling Knit',   'Dikembangkan 1 tahun khusus untuk iklim Indonesia — dipatenkan resmi.'],
      ['Fine Cotton Spandex Blend','Tetap hold shape & warna setelah 100+ kali cuci.'],
    ],
    items: 'Polo Shirt · Classic Tee', range: '1Y–12Y',
    trust: ['Patented in Indonesia', 'Made in Indonesia', '100+ Wash Tested'],
    hashtags: ['#UltraCool', '#HappyPumpkinUltraCool'],
  },
  'Wonder Set™': {
    tagline: 'You asked for it. Here it is. Again — and better.',
    type: 'Day-to-Night Set',
    color: '#B8527A',
    features: [
      ['Day-to-Night Versatility', 'Dari bedtime ke café — satu set yang bekerja sepanjang hari.'],
      ['Linen Blend That Softens', 'Cotton + rayon + linen — semakin sering dicuci, semakin lembut.'],
      ['Community Relaunch',       'Diluncurkan kembali berkat ribuan request nyata dari pelanggan setia.'],
      ['The Perfect Gift',         'Kado yang disukai si bayi — sekaligus disukai mamanya.'],
    ],
    construction: [
      ['Linen Blend Fabric',       'Perpaduan cotton, rayon & linen yang makin lembut dengan setiap cucian.'],
      ['Relaxed Day-to-Night Cut', 'Potongan serbaguna — nyaman untuk tidur, pantas untuk keluar rumah.'],
    ],
    items: 'Pyjama Set · Loungewear Set · Gift Set', range: 'Newborn–5Y',
    trust: ['Linen Softens with Wash', 'Community Request Relaunch', 'SNI Certified'],
    hashtags: ['#WonderSet', '#HappyPumpkinWonderSet'],
  },
};

const HP_TIERS_DB = {
  soft: {
    num:'01', label:'Soft-selling', sublabel:'Brand Image & Awareness',
    color:'#2E6A5E', colorBg:'#DDEBE6', colorSoft:'#F0F7F5',
    humanTitle: 'Inspire & Build Awareness',
    humanDesc: 'Biarkan brand hadir natural dalam cerita keseharian — tanpa push, tanpa promo. Audiens merasakan sendiri.',
    objective:'Membangun awareness & brand image yang kuat di benak audiens.',
    ctaNote:'CTA sangat lembut — inspire & ciptakan rasa ingin tahu, jangan push ke beli.',
    format:'1× IG Feed (lifestyle integration) · 3 frame IG Story',
    tone:['Inspirational','Subtle','Natural','Lifestyle-forward','Non-promotional'],
    trustWith:[
      'Hook pembuka yang sudah disepakati.',
      'Lifestyle integration yang natural — produk hadir sebagai bagian dari keseharian.',
      'Mention merek sesekali tanpa konteks produk yang terlalu detail.',
      'Ritme & gaya editingmu yang membuat audiens tetap engage.',
    ],
    avoid:[
      'Hard-sell atau call-to-action langsung ke pembelian di video utama.',
      'Close-up produk yang terlalu obvious — lebih natural jika produk "tertangkap kamera".',
      'Pengulangan nama brand atau tagline di video.',
    ],
    musthave:[
      'Hook pembuka yang disepakati di 3 detik pertama.',
      'Mention <b>@happypumpkin.kids</b> di caption & story.',
      'Link ke profil HP di IG Story (link sticker).',
      'Product tag di Feed (jika fitur tersedia).',
    ],
  },
  mid: {
    num:'02', label:'Mid-selling', sublabel:'Storytelling Fungsi',
    color:'#B8540F', colorBg:'#FCEBD8', colorSoft:'#FFF8EE',
    humanTitle: 'Ceritakan Fungsinya',
    humanDesc: 'Edukasi audiens lewat pengamatan jujur — detail yang sering terlewat, diceritakan seperti kamu menemukan sesuatu.',
    objective:'Edukasi audiens tentang keunggulan produk melalui storytelling yang relatable.',
    ctaNote:'CTA lembut tapi jelas — cek profil, link in bio. Promo opsional di Story.',
    format:'1× IG Reels storytelling ≥30dtk · 3 frame IG Story',
    tone:['Edukatif','Reflektif','Detail-conscious','Hangat','Tidak menggurui'],
    trustWith:[
      'Hook pembuka yang sudah disepakati.',
      'Storytelling 2–3 detail fungsi — naratif, bukan list spec.',
      'Minimal satu close-up tekstur produk.',
      'Sudut pandang orang tua yang teliti — pengamatan jujur tentang detail.',
      'Ritme & gaya editing khasmu.',
    ],
    avoid:[
      'Demo produk yang frontal — terasa seperti iklan biasa.',
      'Pengulangan tagline brand di video — biarkan tagline bekerja di caption.',
      'Klaim medis (anti-alergi, menyembuhkan ruam) — tidak diizinkan secara legal.',
      'Hard-sell, kode kupon di video utama — promo cukup di Story.',
    ],
    musthave:[
      'Hook pembuka yang disepakati di 3 detik pertama video.',
      '2–3 detail fungsi diceritakan secara naratif — bukan list spec.',
      'Minimal satu close-up tekstur produk.',
      'Mention <b>@happypumpkin.kids</b> di video, caption & story.',
      'Link checkout / katalog di IG Story (link sticker) — H+0 launch.',
      'Product tag di Reels (jika fitur tersedia).',
    ],
  },
  hard: {
    num:'03', label:'Hard-selling', sublabel:'Konversi & Promo',
    color:'#C9412A', colorBg:'#FBE0DA', colorSoft:'#FEF5F3',
    humanTitle: 'Dorong Ke Shopee',
    humanDesc: 'Rekomendasi jujur yang meyakinkan — audiens siap beli, tugasmu kasih mereka alasan terakhir.',
    objective:'Mendorong konversi langsung — pembelian, klik Shopee, kode promo.',
    ctaNote:'CTA jelas & urgency-driven — kode promo, limited stock, link langsung ke Shopee.',
    format:'1× IG Reels + CTA ≥30dtk · 5 frame IG Story (swipe-up) · 1× IG Feed',
    tone:['Enthusiastic','Direct','Conversational','Clear CTA','Urgency-aware'],
    trustWith:[
      'Hook pembuka yang sudah disepakati.',
      'Manfaat produk yang konkret & relatable.',
      'Kode promo disebutkan secara natural di video.',
      'CTA yang clear & confident: "link di bio", "pakai kode [PROMO]".',
      'Urgency yang terasa natural — bukan dipaksakan.',
    ],
    avoid:[
      'Konten yang terasa scripted atau terlalu dipoles.',
      'CTA yang terlalu hard-push sampai terasa tidak autentik.',
      'Klaim medis (anti-alergi, menyembuhkan ruam).',
      'Membandingkan langsung dengan brand lain.',
    ],
    musthave:[
      'Hook pembuka yang disepakati di 3 detik pertama video.',
      'Kode promo disebutkan secara natural — minimal 1× di video utama.',
      'Swipe-up link ke Shopee HP di semua frame Story.',
      'Mention <b>@happypumpkin.kids</b> di video, caption & story.',
      'CTA yang jelas di akhir video & caption.',
    ],
  },
};

const HP_MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

// Niche keyword detection → profile
function kolGetNicheProfile(text) {
  const t = (text || '').toLowerCase();
  const has = (...words) => words.some(w => t.includes(w));

  if (has('fashion','style','ootd','outfit','aesthetic','visual')) {
    return {
      label: 'Kids Fashion & Aesthetic',
      angle: 'Visual-first — produk hadir sebagai bagian dari gaya, bukan sekadar pakaian.',
      audience: 'Orang tua muda yang peduli penampilan & estetika anak.',
      tone: 'Aspirational, stylish, ringan — tidak terlalu serius.',
      emphasis: 'Warna, desain, dan momen visual yang "worthy of a share".',
      hookStyle: 'visual hook — open dengan visual yang langsung menarik mata',
      optHashtags: ['#OOTDAnak','#FashionAnak','#StyleAnak','#BajuAnakIndonesia','#KidsOOTD'],
    };
  }
  if (has('tidur','sleep','malam','bedtime','mimpi','istirahat')) {
    return {
      label: 'Sleep & Bedtime Routine',
      angle: 'Fokus pada kenyamanan malam hari — rutinitas tidur yang tenang & berkualitas.',
      audience: 'Orang tua yang memprioritaskan kualitas tidur & kenyamanan si kecil.',
      tone: 'Tenang, reflektif, hangat — seperti momen sebelum tidur.',
      emphasis: 'Tekstur lembut, adem, dan "kulit kedua" yang bikin bayi tidur lebih nyenyak.',
      hookStyle: 'reflective hook — mulai dari momen malam yang relatable',
      optHashtags: ['#TidurNyenyak','#BedtimeRoutine','#BayiAnteng','#NightRoutineBaby','#SleepRoutine'],
    };
  }
  if (has('vlog','family','keluarga','ayah','bapak','pasangan','couple','suami')) {
    return {
      label: 'Family Vlog & Life Moments',
      angle: 'Momen keluarga yang jujur — produk hadir sebagai bagian dari cerita, bukan subjek utama.',
      audience: 'Keluarga muda yang suka berbagi keseharian — ayah & ibu sama-sama relevan.',
      tone: 'Hangat, relatable, autentik — seperti ngobrol dengan teman yang punya anak.',
      emphasis: 'Story-driven, momen spontan, detail produk terungkap natural dalam adegan.',
      hookStyle: 'story hook — buka dengan momen keluarga yang relate',
      optHashtags: ['#FamilyVlog','#FamilyLife','#KidsOfInstagram','#FamilyGoals','#MomenKeluarga'],
    };
  }
  if (has('baby','bayi','newborn','lahir','baru lahir','0m','1m','2m','3m','4m','5m','6m')) {
    return {
      label: 'Baby & Newborn',
      angle: 'Kepercayaan bahan & keamanan — setiap detail yang menyentuh kulit bayi punya alasan.',
      audience: 'Orang tua baru — ibu trimester 3 atau baru melahirkan, sangat detail-conscious.',
      tone: 'Penuh perhatian, teliti, hangat — seperti sesama ibu baru yang berbagi pengalaman.',
      emphasis: 'Keamanan bahan, SNI, kelembutan di kulit sensitif, sarung tangan menyatu.',
      hookStyle: 'discovery hook — "baru sadar" atau "pertama kali coba dan langsung..."',
      optHashtags: ['#NewbornEssentials','#BayiLucu','#KulitBayiSensitif','#BabyEssentials','#MomOfBaby'],
    };
  }
  if (has('edukasi','educational','tips','review','detail','honest','jujur','teliti')) {
    return {
      label: 'Edukatif & Detail-conscious',
      angle: 'Pengamatan mendalam — audiens mengikuti karena mereka percaya reviewmu jujur & berdasar.',
      audience: 'Ibu muda yang research sebelum beli — tidak impulsif, butuh fakta & penjelasan.',
      tone: 'Edukatif, teliti, tidak menggurui — seperti kakak yang sudah pernah nyoba duluan.',
      emphasis: 'Detail konstruksi, perbandingan tekstur, alasan di balik setiap fitur.',
      hookStyle: 'insight hook — mulai dari fakta atau detail yang biasanya orang tidak perhatikan',
      optHashtags: ['#ReviewJujur','#TipsMama','#ParentingHonest','#BajuAnakReview','#KulitAnak'],
    };
  }
  // Default: mom & parenting
  return {
    label: 'Mom & Parenting',
    angle: 'Kehidupan nyata orang tua muda — produk hadir sebagai solusi dalam rutinitas keseharian.',
    audience: 'Ibu muda 25–35 tahun yang aktif di Instagram, care dengan kualitas produk anak.',
    tone: 'Hangat, relatable, sedikit aspirational — seperti teman yang baru nemukan produk bagus.',
    emphasis: 'Kenyamanan sehari-hari, kemudahan penggunaan, nilai per rupiah yang baik.',
    hookStyle: 'relatable hook — mulai dari situasi yang langsung relate ke keseharian ibu',
    optHashtags: ['#IbuMuda','#MomLife','#ParentingIndo','#TipsMama','#MomOfToddler'],
  };
}

function kolUpdateNicheHelper(text) {
  const helper = document.getElementById('kb_niche_helper');
  if (!helper) return;
  if (!text || text.trim().length < 3) {
    helper.style.display = 'none';
    kolUpdateHookSuggestions();
    return;
  }
  const p = kolGetNicheProfile(text);
  helper.style.display = 'block';
  helper.innerHTML = `
    <div style="font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--primary);margin-bottom:8px">✦ Niche terdeteksi: ${p.label}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
      <div class="kol-niche-row"><span class="kol-niche-key">Angle</span><span class="kol-niche-val">${p.angle}</span></div>
      <div class="kol-niche-row"><span class="kol-niche-key">Audiens</span><span class="kol-niche-val">${p.audience}</span></div>
      <div class="kol-niche-row"><span class="kol-niche-key">Tone</span><span class="kol-niche-val">${p.tone}</span></div>
      <div class="kol-niche-row"><span class="kol-niche-key">Emphasis</span><span class="kol-niche-val">${p.emphasis}</span></div>
    </div>
    <div style="margin-top:6px;font-size:10.5px;color:var(--text-muted)">💡 Brief akan disesuaikan otomatis dengan profil ini.</div>
  `;
  kolUpdateHookSuggestions();
}

// Hook suggestions based on context
function kolGetHookSuggestions(tierKey, prods, nicheText) {
  const niche     = kolGetNicheProfile(nicheText);
  const hasSunny  = prods.includes('Sunny Days');
  const hasActive = prods.includes('ActiveKnit');
  const hasPure   = prods.includes('PureKnit');
  const hasUltra  = prods.includes('UltraCool™');
  const hasWonder = prods.includes('Wonder Set™');
  const hasMulti  = prods.length > 1;

  const banks = {
    soft: [
      hasUltra  ? '"1 tahun riset. Satu paten. Dan ternyata ini yang si kecil butuhkan."'
      : hasActive ? '"Saat anak aktif dan bajunya ikut — momen itu selalu terasa berbeda."'
      : hasPure   ? '"Detail yang tidak terlihat, tapi selalu terasa — setiap kali dipakai."'
      : hasWonder ? '"Dia minta dipakaikan lagi. Padahal baru mau tidur."'
      : hasSunny  ? '"Baju yang masih keliatan baru setelah berkali-kali dicuci — itu beda."'
      : '"Ada hal kecil yang membuat rutinitas si kecil jadi sedikit lebih bermakna."',
      '"Tidak semua keputusan parenting kelihatan — tapi semua terasa."',
      niche.label.includes('Fashion')
        ? '"Baju yang benar bukan yang paling mahal — tapi yang paling tepat."'
        : '"Hal-hal kecil yang tidak ada di caption, tapi selalu ada di keseharian."',
      hasWonder ? '"Kapan restock? — pertanyaan yang akhirnya terjawab, dan lebih baik dari sebelumnya."'
      : '"Satu pilihan kecil yang ternyata membuat perbedaan besar."',
    ],
    mid: [
      hasUltra  ? '"1 tahun R&D untuk satu kaos — aku baru coba, dan ini yang terjadi."'
      : hasActive ? '"Kenapa polo ini beda dari yang lain? Baru sadar setelah 2 minggu dipakai."'
      : hasPure   ? '"Tidak ada jahitan sama sekali — dan aku baru sadar betapa pentingnya itu."'
      : hasWonder ? '"Baju tidur yang masih pantas dipakai ke café. Ini serius."'
      : hasSunny  ? '"50 kali cuci dan masih keliatan fresh — aku hitung sendiri."'
      : '"Ada satu detail di baju ini yang aku tidak bisa abaikan lagi."',
      hasPure   ? '"Teknologi yang biasanya cuma ada di baju premium dewasa — kini untuk si kecil."'
      : hasUltra  ? '"Dicuci 100 kali — masih sempurna. Aku coba dan ini hasilnya."'
      : '"Dua minggu aku perhatikan — ini yang berbeda dari baju anak biasa."',
      niche.label.includes('Baby') || niche.label.includes('Newborn')
        ? '"Kulit bayi baru lahir adalah detail yang tidak bisa dikompromikan."'
        : '"Orang tua yang teliti pasti nyadar ini — yang lain mungkin belum."',
      hasMulti
        ? `"${prods.slice(0, 2).join(' dan ')} — dua yang berbeda, satu alasan yang sama."`
        : '"Satu detail kecil yang bikin aku tidak bisa balik ke baju anak biasa."',
    ],
    hard: [
      '"Aku jarang langsung checkout — tapi kali ini nggak bisa nunggu."',
      hasUltra  ? '"Dipatenkan di Indonesia. Dibuat di Indonesia. Untuk cuaca Indonesia. Sudah coba?"'
      : hasActive ? '"Polo yang anak aku minta dipakaikan setiap hari — ini link-nya."'
      : hasPure   ? '"Zero jahitan, 100% kapas murni — link di bio sebelum stok habis."'
      : hasWonder ? '"Ribuan orang nunggu ini restock — sekarang sudah ada lagi, tapi terbatas."'
      : hasSunny  ? '"1 set, 5 look berbeda — dan masih keliatan baru setelah dicuci berkali-kali."'
      : '"Produk yang aku rekomendasikan ulang ke semua sesama mama."',
      '"Stok terbatas — ini yang langsung aku grab sebelum kehabisan."',
      niche.label.includes('Vlog') || niche.label.includes('Family')
        ? '"Keluarga kami sudah pakai ini — dan ini honest review setelah 3 bulan."'
        : '"Kode promo aktif minggu ini — link di bio sebelum habis."',
    ],
  };

  return (banks[tierKey] || banks.mid).slice(0, 4);
}

function kolUpdateHookSuggestions() {
  const container = document.getElementById('kb_hook_suggestions');
  if (!container) return;
  const tierKey  = document.getElementById('kb_tier')?.value || 'mid';
  const prods    = kolSelectedProds();
  const nicheText= document.getElementById('kb_niche')?.value || '';
  const suggestions = kolGetHookSuggestions(tierKey, prods, nicheText);
  const tier = HP_TIERS_DB[tierKey];
  container.innerHTML = `
    <div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-muted);margin-bottom:6px">Inspirasi angle — pilih atau ketik sendiri ↓</div>
    <div style="display:flex;flex-direction:column;gap:5px">
      ${suggestions.map(h => `
        <button class="kol-hook-chip" onclick="kolSelectHookSuggestion(${JSON.stringify(h)})" style="--hc:${tier.color};--hcbg:${tier.colorBg}">${h}</button>
      `).join('')}
    </div>
  `;
}

function kolSelectHookSuggestion(hook) {
  const inp = document.getElementById('kb_hook');
  if (!inp) return;
  // strip surrounding quotes if present
  inp.value = hook.replace(/^["']|["']$/g, '');
  inp.focus();
  showToast('✦ Hook dipilih — edit sesuai seleramu!');
}

// Util: parse username (handles URL or bare handle)
function kolParseHandle(raw) {
  if (!raw) return '';
  const v = raw.trim().replace(/^@/, '');
  // if it looks like a URL, extract slug
  const m = v.match(/instagram\.com\/([^/?#\s]+)/);
  if (m) {
    const slug = m[1].replace(/\/$/, '');
    if (['p','reel','reels','stories','explore','tv','accounts'].includes(slug)) return '';
    return slug;
  }
  // bare word — just return it (strip trailing slashes)
  return v.replace(/\/+$/, '');
}

function kolHandleUsernameInput(val) {
  const chip = document.getElementById('kb_handle_chip');
  const row  = document.getElementById('kb_handle_row');
  const slug = kolParseHandle(val);
  if (chip && row) {
    if (slug) { chip.textContent = '@' + slug; row.style.display = 'flex'; }
    else       { row.style.display = 'none'; }
  }
  // Auto-populate from pool when an exact handle match is found
  if (!slug) return;
  const match = kolMergedData().find(k => kolParseHandle(k.handle) === slug);
  if (!match) return;
  const nicheEl = document.getElementById('kb_niche');
  const notesEl = document.getElementById('kb_notes');
  const monthEl = document.getElementById('kb_month');
  if (nicheEl && !nicheEl.value && match.niche)      { nicheEl.value = match.niche; kolUpdateNicheHelper(match.niche); }
  if (notesEl && !notesEl.value) {
    const parts = [];
    if (match.catatan)  parts.push(match.catatan);
    if (match.scope)    parts.push('Scope: ' + match.scope);
    if (match.keputusan) parts.push('Status: ' + match.keputusan);
    if (parts.length)   notesEl.value = parts.join(' | ');
  }
  if (monthEl && !monthEl.value && match.brief_bulan) {
    const MONTHS_MAP = { Januari:'01',Februari:'02',Maret:'03',April:'04',Mei:'05',Juni:'06',Juli:'07',Agustus:'08',September:'09',Oktober:'10',November:'11',Desember:'12' };
    const [mon, yr] = match.brief_bulan.split(' ');
    if (MONTHS_MAP[mon] && yr) monthEl.value = yr + '-' + MONTHS_MAP[mon];
  }
}

function kolFmtMonth(ym) {
  if (!ym) return '—';
  const [y, m] = ym.split('-');
  return HP_MONTHS_ID[parseInt(m) - 1] + ' ' + y;
}

// --- Render Form ---

function renderKOLBrief() {
  if (!document.querySelector('link[href*="Plus+Jakarta+Sans"]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap';
    document.head.appendChild(l);
  }
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);

  const el = document.getElementById('section-kol');
  el.innerHTML = `
    <div class="kol-wrap">

      <!-- ── FORM COLUMN ── -->
      <div class="kol-form-col">
        <div class="kol-form-intro">
          <div class="kol-intro-title">KOL Brief Generator</div>
          <div class="kol-intro-sub">Isi detail KOL di bawah → brief 4 halaman siap otomatis.</div>
        </div>

        <!-- Block 01: Instagram + Niche + Notes -->
        <div class="kol-block">
          <div class="kol-block-num">01</div>
          <div class="kol-block-body">
            <label class="kol-lbl">Instagram KOL</label>

            <div style="position:relative">
              <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:14px;font-weight:700;color:var(--text-muted);pointer-events:none;user-select:none">@</span>
              <input class="kol-inp" id="kb_ig" type="text"
                placeholder="username"
                style="padding-left:26px"
                oninput="kolHandleUsernameInput(this.value)">
            </div>

            <div id="kb_handle_row" style="display:none;margin-top:7px;align-items:center;gap:10px;flex-wrap:wrap">
              <span class="kol-handle-chip" id="kb_handle_chip"></span>
              <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;color:var(--text-muted)">
                <input type="checkbox" id="kb_tiktok" style="accent-color:var(--primary)"> + TikTok cross-post
              </label>
            </div>

            <div style="margin-top:14px">
              <div class="kol-sub-lbl" style="margin-bottom:5px">Niche / Jenis Konten</div>
              <input class="kol-inp" id="kb_niche" type="text"
                placeholder="cth: ibu muda, parenting, kids fashion, family vlog…"
                oninput="kolUpdateNicheHelper(this.value)">
              <div id="kb_niche_helper" class="kol-niche-helper" style="display:none;margin-top:8px"></div>
            </div>

            <div style="margin-top:12px">
              <div class="kol-sub-lbl" style="margin-bottom:5px">
                Catatan KOL
                <span style="font-weight:400;text-transform:none;letter-spacing:0;opacity:.7"> — gaya konten, nama anak, latar belakang relevan</span>
              </div>
              <textarea class="kol-inp" id="kb_notes" rows="3"
                placeholder="cth: Ibu dari Adik & Kakak, konten slow & educational, sering show OOTD anak di pagi hari, audiens ibu muda 25–32 tahun."
                style="resize:vertical;line-height:1.5"></textarea>
            </div>
          </div>
        </div>

        <!-- Block 02: Tier -->
        <div class="kol-block">
          <div class="kol-block-num">02</div>
          <div class="kol-block-body">
            <label class="kol-lbl">Tipe Brief</label>
            <div class="kol-tier-row">
              ${Object.entries(HP_TIERS_DB).map(([k, t]) => `
                <div class="kol-tier-card${k === 'mid' ? ' kol-tier-active' : ''}"
                  onclick="kolSelectTier('${k}')" data-tier="${k}"
                  style="--tc:${t.color};--tcbg:${t.colorBg}">
                  <div class="kol-tier-num" style="color:${t.color}">Tier ${t.num}</div>
                  <div class="kol-tier-label">${t.label}</div>
                  <div class="kol-tier-sub">${t.humanDesc}</div>
                </div>`).join('')}
            </div>
            <input type="hidden" id="kb_tier" value="mid">
          </div>
        </div>

        <!-- Block 03: Products + Month -->
        <div class="kol-block">
          <div class="kol-block-num">03</div>
          <div class="kol-block-body">
            <label class="kol-lbl">Produk / Koleksi</label>
            <div style="margin-bottom:14px">
              <div class="kol-sub-lbl" style="margin-bottom:5px">Koleksi (Knowledge Base) — bisa pilih lebih dari satu</div>
              <div class="kol-prod-row">
                ${(window.HP_PRODUCT_DB?.collections || []).map(c => `
                  <label class="kol-prod-chip">
                    <input type="checkbox" name="kb_collections" value="${c.id}" ${c.id === 'active' ? 'checked' : ''} onchange="kolUpdateHookSuggestions()">
                    <span class="kol-prod-name">${c.name}</span>
                    <span class="kol-prod-type">${(c.kicker && (c.kicker.id || c.kicker.en)) || ''}</span>
                  </label>`).join('')}
              </div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:6px">Brief memakai story / show / hooks dari Product Database untuk tiap koleksi terpilih.</div>
            </div>
            <div style="margin-top:12px">
              <div class="kol-sub-lbl" style="margin-bottom:5px">Bulan Campaign</div>
              <input class="kol-inp" id="kb_month" type="month" value="${thisMonth}"
                style="width:auto;max-width:180px">
            </div>
          </div>
        </div>

        <!-- Block 04: Hook with suggestions -->
        <div class="kol-block">
          <div class="kol-block-num">04</div>
          <div class="kol-block-body">
            <label class="kol-lbl">Angle / Tema Utama</label>
            <div id="kb_hook_suggestions" style="margin-bottom:10px"></div>
            <input class="kol-inp" id="kb_hook"
              placeholder="Ketik angle atau tema kontenmu…">
          </div>
        </div>

        <!-- Block 05: Kompensasi -->
        <div class="kol-block">
          <div class="kol-block-num">05</div>
          <div class="kol-block-body">
            <label class="kol-lbl">Kompensasi</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div>
                <div class="kol-sub-lbl" style="margin-bottom:5px">Cash</div>
                <input class="kol-inp" id="kb_cash" placeholder="cth: 300k">
              </div>
              <div>
                <div class="kol-sub-lbl" style="margin-bottom:5px">Barter value</div>
                <input class="kol-inp" id="kb_barter" placeholder="cth: 200k">
              </div>
            </div>
          </div>
        </div>

        <!-- Block 06: Referensi -->
        <div class="kol-block">
          <div class="kol-block-num">06</div>
          <div class="kol-block-body">
            <label class="kol-lbl">Referensi Konten <span class="kol-lbl-hint">opsional</span></label>
            <input class="kol-inp" id="kb_ref" type="url"
              placeholder="https://instagram.com/reel/...">
          </div>
        </div>

        <!-- Block 07: PIC -->
        <div class="kol-block">
          <div class="kol-block-num">07</div>
          <div class="kol-block-body">
            <label class="kol-lbl">PIC Tim Happy Pumpkin</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div>
                <div class="kol-sub-lbl" style="margin-bottom:5px">Nama</div>
                <input class="kol-inp" id="kb_pic" value="Rahmi">
              </div>
              <div>
                <div class="kol-sub-lbl" style="margin-bottom:5px">No. WA</div>
                <input class="kol-inp" id="kb_pic_wa" value="6281292580956">
              </div>
            </div>
          </div>
        </div>

        <div style="display:flex;gap:9px">
          <button class="kol-gen-btn" style="flex:1" onclick="generateKOLBrief()">✦ Generate Brief</button>
          <button class="kol-reset-btn" onclick="kolResetBrief()" title="Kosongkan semua isian">↺ Reset</button>
        </div>

        <button class="kol-research-btn" onclick="copyKOLClaudePrompt()">
          🔍 Research KOL otomatis dengan Claude
          <span class="kol-research-sub">Copy prompt → paste ke Claude Code → brief dengan personalisasi penuh</span>
        </button>
      </div>

      <!-- ── OUTPUT COLUMN ── -->
      <div class="kol-output-col" id="kol_out">
        <div class="kol-out-empty">
          <div style="font-size:42px;opacity:.18">📄</div>
          <div style="font-size:15px;font-weight:700;color:var(--text-muted);margin-top:12px">Brief muncul di sini</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px;line-height:1.5">Isi form → klik Generate Brief</div>
        </div>
      </div>

    </div>
  `;

  // Restore any saved draft, then auto-save on every edit
  kolRestoreDraft();
  const formCol = el.querySelector('.kol-form-col');
  if (formCol) {
    formCol.addEventListener('input', kolSaveDraft);
    formCol.addEventListener('change', kolSaveDraft);
  }
  // Init hook suggestions on load
  setTimeout(kolUpdateHookSuggestions, 0);
}

// ── Brief Generator draft auto-save (localStorage) ──
const KOL_DRAFT_KEY = 'hp_brief_draft';
function kolCollectFormState() {
  const v  = id => (document.getElementById(id)?.value || '');
  const ck = id => !!document.getElementById(id)?.checked;
  return {
    ig: v('kb_ig'), tiktok: ck('kb_tiktok'), niche: v('kb_niche'), notes: v('kb_notes'),
    tier: v('kb_tier'), month: v('kb_month'), hook: v('kb_hook'), cash: v('kb_cash'),
    barter: v('kb_barter'), ref: v('kb_ref'), pic: v('kb_pic'), picWa: v('kb_pic_wa'),
    collections: [...document.querySelectorAll('input[name="kb_collections"]:checked')].map(e => e.value),
  };
}
function kolSaveDraft() {
  try { localStorage.setItem(KOL_DRAFT_KEY, JSON.stringify(kolCollectFormState())); } catch (e) {}
}
function kolRestoreDraft() {
  let d; try { d = JSON.parse(localStorage.getItem(KOL_DRAFT_KEY) || 'null'); } catch (e) {}
  if (!d) return false;
  const set = (id, val) => { const e = document.getElementById(id); if (e && val != null) e.value = val; };
  set('kb_ig', d.ig); set('kb_niche', d.niche); set('kb_notes', d.notes); set('kb_month', d.month);
  set('kb_hook', d.hook); set('kb_cash', d.cash); set('kb_barter', d.barter); set('kb_ref', d.ref);
  if (d.pic != null && d.pic !== '') set('kb_pic', d.pic);
  if (d.picWa != null && d.picWa !== '') set('kb_pic_wa', d.picWa);
  const tt = document.getElementById('kb_tiktok'); if (tt) tt.checked = !!d.tiktok;
  if (d.tier) try { kolSelectTier(d.tier); } catch (e) {}
  if (Array.isArray(d.collections)) {
    document.querySelectorAll('input[name="kb_collections"]').forEach(cb => { cb.checked = d.collections.includes(cb.value); });
  }
  if (d.ig)    try { kolHandleUsernameInput(d.ig); } catch (e) {}
  if (d.niche) try { kolUpdateNicheHelper(d.niche); } catch (e) {}
  return true;
}
function kolResetBrief() {
  if (!confirm('Kosongkan semua isian brief? Draft tersimpan akan dihapus.')) return;
  try { localStorage.removeItem(KOL_DRAFT_KEY); } catch (e) {}
  renderKOLBrief();             // re-render blank (default tier + ActiveKnit collection)
  try { showToast('Brief dikosongkan'); } catch (e) {}
}

function kolSelectTier(tier) {
  document.querySelectorAll('.kol-tier-card').forEach(c =>
    c.classList.toggle('kol-tier-active', c.dataset.tier === tier));
  document.getElementById('kb_tier').value = tier;
  kolUpdateHookSuggestions();
  kolSaveDraft();
}

// --- Generate ---

// Single source of products: derived from the selected KB collections (the only
// collection selector). Collections with a legacy USP card map to its name.
const PROD_FROM_COLLECTION = { active: 'ActiveKnit', pureknit: 'PureKnit', ultracool: 'UltraCool', softair: 'SoftAir', breathe: 'BreatheKnit' };
function kolSelectedProds() {
  const ids = [...document.querySelectorAll('input[name="kb_collections"]:checked')].map(el => el.value);
  return [...new Set(ids.map(id => PROD_FROM_COLLECTION[id]).filter(Boolean))];
}

function generateKOLBrief() {
  const rawIg    = (document.getElementById('kb_ig')?.value    || '').trim();
  const slug     = kolParseHandle(rawIg);
  const handle   = slug ? '@' + slug : '@kol';
  const tierKey  = document.getElementById('kb_tier')?.value   || 'mid';
  const tier     = HP_TIERS_DB[tierKey];
  const prods    = kolSelectedProds();
  const month    = document.getElementById('kb_month')?.value  || '';
  const hook     = (document.getElementById('kb_hook')?.value  || '').trim();
  const cashFee  = (document.getElementById('kb_cash')?.value  || '').trim();
  const barter   = (document.getElementById('kb_barter')?.value|| '').trim();
  const refUrl   = (document.getElementById('kb_ref')?.value   || '').trim();
  const pic      = (document.getElementById('kb_pic')?.value   || 'Rahmi').trim();
  const picWa    = (document.getElementById('kb_pic_wa')?.value|| '6281292580956').trim();
  const nicheText= (document.getElementById('kb_niche')?.value || '').trim();
  const notes    = (document.getElementById('kb_notes')?.value || '').trim();
  const tiktok   = document.getElementById('kb_tiktok')?.checked || false;
  const collectionIds = [...document.querySelectorAll('input[name="kb_collections"]:checked')].map(el => el.value);

  if (!collectionIds.length) { showToast('Pilih minimal 1 koleksi!'); return; }

  const data = { handle, slug, tier, tierKey, prods, month, hook, cashFee, barter, refUrl,
                 pic, picWa, nicheText, notes, tiktok, collectionIds };
  const briefHtml = kolBuildBriefHTML(data);

  window._kolBriefHtml   = briefHtml;
  window._kolBriefHandle = handle;
  window._kolBriefMonth  = month;

  const outEl = document.getElementById('kol_out');
  outEl.innerHTML = `
    <div class="kol-brief-toolbar">
      <button class="kol-tb-btn primary" onclick="kolOpenNewTab()">↗ Buka & Print PDF</button>
      <button class="kol-tb-btn" onclick="kolDownloadHTML()">⬇ Download HTML</button>
      <button class="kol-tb-btn ghost" onclick="copyKOLClaudePrompt()">🔍 Enrich dengan Claude</button>
    </div>
    <iframe class="kol-brief-iframe" id="kol_brief_iframe" frameborder="0" title="KOL Brief Preview"></iframe>
  `;
  const iframe = document.getElementById('kol_brief_iframe');
  iframe.srcdoc = briefHtml;
  iframe.onload = () => {
    try {
      const h = iframe.contentDocument?.documentElement?.scrollHeight;
      if (h && h > 200) iframe.style.height = (h + 32) + 'px';
    } catch(e) {}
  };
  outEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('✦ Brief siap!');
}

// --- Build Brief HTML ---

function kolBuildBriefHTML(d) {
  const { handle, slug, tier, tierKey, prods, month, hook } = d;
  const handleAt    = '@' + (slug || handle.replace(/^@/, ''));
  const handleClean = slug || handle.replace(/^@/, '');
  const monthLabel  = kolFmtMonth(month);
  const prodsLabel  = prods.join(' · ');
  const niche       = kolGetNicheProfile(d.nicheText);

  // Fee string
  const feeStr = [
    d.cashFee ? `Rp ${d.cashFee} cash`   : '',
    d.barter  ? `Rp ${d.barter} barter`  : '',
  ].filter(Boolean).join(' + ') || '—';

  // Format + ref
  let formatStr = tier.format;
  if (d.tiktok) formatStr += ' · TikTok cross-post';
  let refHtml = '';
  if (d.refUrl) {
    const rm = d.refUrl.match(/reel\/([A-Za-z0-9_-]+)/);
    refHtml = rm
      ? `<a href="${d.refUrl}" style="color:${tier.color};text-decoration:underline">reel/${rm[1].slice(0,10)}…</a>`
      : `<a href="${d.refUrl}" style="color:${tier.color};text-decoration:underline">${d.refUrl.slice(0,36)}…</a>`;
  }

  // Product USP cards
  const prodCols = prods.length === 1 ? '1fr' : '1fr 1fr';
  const prodCards = prods.map(pname => {
    const p = HP_PRODUCTS_DB[pname];
    if (!p) return '';
    const prodColor = p.color || tier.color;
    const featRows = p.features.map(([n, desc]) =>
      `<div style="display:grid;grid-template-columns:42% 1fr;gap:6px;padding:5px 0;border-bottom:1px dashed #EDEAE2">
        <div style="font-weight:700;font-size:11px;color:#1F2140">· ${n}</div>
        <div style="font-size:11px;color:#5A5C75;line-height:1.4">${desc}</div>
       </div>`).join('');
    return `
      <div style="background:#FDFAF5;border:1.5px solid #E8E3D6;border-top:3px solid ${prodColor};border-radius:10px;padding:12px 14px">
        <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:2px">
          <span style="font-weight:800;font-size:13.5px;color:${prodColor}">${pname}</span>
          <span style="font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#8A8CA0;font-weight:700">${p.type}</span>
        </div>
        <p style="margin:0 0 8px;font-size:10.5px;color:#5A5C75;line-height:1.35;font-style:italic;padding-bottom:7px;border-bottom:1px solid #E8E3D6">${p.tagline}</p>
        ${featRows}
        <div style="margin-top:7px;font-size:10px;color:#8A8CA0">${p.items} · ${p.range}</div>
      </div>`;
  }).join('');

  // Trust signals
  let allTrust = [...new Set(prods.flatMap(p => HP_PRODUCTS_DB[p]?.trust || []))];
  if (!allTrust.length) allTrust = ['SNI', 'OEKO-TEX® Standard 100', '100% Katun'];

  // Hashtags
  const reqHashes = ['#HappyPumpkin', '#HappyPumpkinID', ...prods.flatMap(p => HP_PRODUCTS_DB[p]?.hashtags || [])];
  const optHashes = niche.optHashtags || [];

  // Do / Don't
  const doItems = [
    ...tier.trustWith.slice(0, 3),
    'Kirim draft ke PIC sebelum upload — revisi 1× adalah hal wajar.',
  ];
  const dontItems = [
    'Color-grading yang mengubah warna asli produk.',
    'Membandingkan langsung dengan brand lain.',
    'Share detail kerjasama, fee, atau timeline.',
    ...tier.avoid.slice(0, 2),
  ];

  const li = (mark, bg, text) =>
    `<li style="display:grid;grid-template-columns:18px 1fr;gap:7px;align-items:start;font-size:12px;line-height:1.4;margin-bottom:6px">
      <span style="width:14px;height:14px;border-radius:999px;background:${bg};display:inline-flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:800;color:white;margin-top:2px;flex-shrink:0">${mark}</span>
      <span>${text}</span>
    </li>`;

  const tagReq       = li('@', tier.color, 'Wajib <b>tag &amp; mention @happypumpkin.kids</b> di setiap postingan — Instagram &amp; TikTok.');
  const mustHaveRows = tagReq + tier.musthave.map(t  => li('★', tier.color, t)).join('');
  const doRows       = doItems.slice(0,4).map(t  => li('✓', '#2E6A5E', t)).join('');
  const dontRows     = dontItems.slice(0,4).map(t => li('×', '#C9412A', t)).join('');

  const toneBadges = tier.tone.map((t, i) =>
    `<span style="background:${i<3?tier.colorBg:'#F3EBE5'};color:${i<3?tier.color:'#5A5C75'};font-weight:700;font-size:10px;letter-spacing:.12em;text-transform:uppercase;padding:3px 9px;border-radius:999px">${t}</span>`).join('');

  const lc = (txt, clr) =>
    `<div style="font-weight:700;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:${clr||'#8A8CA0'};margin-bottom:8px">${txt}</div>`;

  const card = (inner, extra='') =>
    `<div style="background:#fff;border:1px solid #E8E3D6;border-radius:10px;padding:13px 15px;${extra}">${inner}</div>`;

  const specRow = (k, v, sub='') =>
    `<div style="display:grid;grid-template-columns:108px 1fr;gap:10px;padding:6px 0;border-bottom:1px dashed #E8E3D6;align-items:start">
      <span style="font-weight:700;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#8A8CA0;padding-top:3px">${k}</span>
      <span style="font-size:13px;color:#1F2140;font-weight:600;line-height:1.4">${v}${sub ? `<span style="display:block;font-weight:500;color:#5A5C75;font-size:11.5px;margin-top:2px">${sub}</span>` : ''}</span>
    </div>`;

  // KB collection blocks (sourced from shared HP_PRODUCT_DB) — Indonesian; one per selected collection
  let kbBlock = '';
  const kbIds = d.collectionIds || (d.collectionId ? [d.collectionId] : []);
  if (kbIds.length && window.HP_PRODUCT_DB) {
    const ID = o => (o && (o.id || o.en)) || '';
    const bullets = (arr, clr) => (arr || []).map(it =>
      `<div style="display:grid;grid-template-columns:14px 1fr;gap:7px;font-size:11.5px;line-height:1.45;margin-bottom:5px;color:#3a4254"><span style="color:${clr};font-weight:800">›</span><span>${ID(it)}</span></div>`).join('');
    kbBlock = kbIds.map(cid => {
      const col = (window.HP_PRODUCT_DB.collections || []).find(c => c.id === cid);
      if (!col) return '';
      const colColor = (typeof PDB_COLORS !== 'undefined' && PDB_COLORS[col.id]) || tier.color;
      return `
      <div style="margin-top:14px;background:#FDFAF5;border:1.5px solid #E8E3D6;border-top:3px solid ${colColor};border-radius:10px;padding:13px 15px">
        <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:4px">
          <span style="font-weight:800;font-size:13.5px;color:${colColor}">📚 ${col.name}</span>
          <span style="font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#8A8CA0;font-weight:700">Knowledge Base</span>
        </div>
        <div style="font-size:11.5px;font-style:italic;color:#5A5C75;margin-bottom:8px">${ID(col.oneLiner)}</div>
        <div style="font-size:11px;background:#fff;border:1px solid #E8E3D6;border-left:3px solid ${colColor};border-radius:8px;padding:8px 10px;margin-bottom:10px;color:#3a4254"><b>Material:</b> ${ID(col.material)}</div>
        ${lc('Talking Points', '#2E6A5E')}${bullets(col.say, '#2E6A5E')}
        ${lc('Hindari', '#C9412A')}${bullets(col.avoid, '#C9412A')}
      </div>`;
    }).join('');
  }

  const PAGE_CSS = `
*{box-sizing:border-box}
html,body{background:#d9d6cd;margin:0;padding:0;font-family:"Plus Jakarta Sans",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.doc-wrap{display:flex;flex-direction:column;align-items:center;padding:32px 24px;gap:24px}
.page{width:794px;min-height:1123px;background:#fff;position:relative;padding:58px 48px 54px;box-sizing:border-box;box-shadow:0 4px 24px rgba(0,0,0,.14);border-radius:3px;overflow:hidden;display:flex;flex-direction:column}
.dh{position:absolute;top:20px;left:48px;right:48px;display:flex;align-items:center;justify-content:space-between;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#8A8CA0;border-bottom:1px solid #F1ECDF;padding-bottom:10px;font-weight:700}
.df{position:absolute;bottom:20px;left:48px;right:48px;display:flex;align-items:center;justify-content:space-between;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#8A8CA0;border-top:1px solid #F1ECDF;padding-top:9px;font-weight:600}
.pg{color:#1F2140}
.hp-mark{display:inline-flex;align-items:center;gap:6px;color:#1F2140}
.hp-dot{width:7px;height:7px;border-radius:999px;background:${tier.color};display:inline-block}
.cp{position:absolute;top:-60px;right:-60px;width:280px;height:280px;background:radial-gradient(circle at 30% 30%,${tier.colorBg},transparent 68%);pointer-events:none;z-index:0}
@media print{html,body{background:white}.doc-wrap{padding:0;gap:0}.page{box-shadow:none;margin:0;page-break-after:always;border-radius:0;min-height:auto}}`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>KOL Brief — ${handleAt} — ${monthLabel} — Happy Pumpkin</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet">
<style>${PAGE_CSS}</style>
</head>
<body>
<div class="doc-wrap">

<!-- ══ PAGE 01 — Campaign Overview ══ -->
<div class="page">
  <div class="cp"></div>
  <div class="dh">
    <span class="hp-mark"><span class="hp-dot"></span> Happy Pumpkin × ${handleClean}</span>
    <span>KOL Campaign Brief · ${tier.label} · ${monthLabel}</span>
  </div>

  <div style="position:relative;z-index:1;flex:1;display:flex;flex-direction:column;gap:14px">

    <!-- Title -->
    <div style="padding-top:4px">
      <div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin-bottom:14px">
        <span style="background:${tier.color};color:white;font-size:11px;padding:5px 12px;border-radius:999px;font-weight:700;letter-spacing:.14em;text-transform:uppercase">KOL BRIEF</span>
        <span style="background:${tier.colorBg};color:${tier.color};font-size:10.5px;padding:4px 11px;border-radius:999px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">${tier.num} · ${tier.label} · ${tier.sublabel}</span>
        ${prods.map(p => `<span style="background:#F3EBE5;color:#5A5C75;font-size:10.5px;padding:3px 10px;border-radius:999px;font-weight:700">${p}</span>`).join('')}
      </div>
      <div style="display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:6px">
        <span style="font-weight:800;font-size:38px;line-height:1;letter-spacing:-.025em;color:${tier.color}">${handleAt}</span>
        <span style="font-weight:600;font-size:17px;color:#8A8CA0;letter-spacing:-.01em">${monthLabel}</span>
      </div>
      <div style="font-size:13px;font-weight:600;color:#5A5C75;margin-bottom:10px">Happy Pumpkin Indonesia &nbsp;·&nbsp; Kidswear Campaign Brief</div>
      <div style="height:4px;width:56px;background:${tier.color};border-radius:999px"></div>
    </div>

    <!-- Metadata card — two-column grid -->
    ${card(`
      ${lc('Detail Campaign')}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 20px">
        <div>
          ${specRow('IG Handle', handleAt, niche.label)}
          ${specRow('Produk', prodsLabel, [...new Set(prods.map(p => HP_PRODUCTS_DB[p]?.range||''))].filter(Boolean).join(', ') + ' · Sampel via WhatsApp')}
          ${specRow('Angle / Tema', `<span style="font-size:12.5px;font-style:italic;color:#3A3C55">${hook || 'Diserahkan ke creator'}</span>`)}
        </div>
        <div style="border-left:1px dashed #E8E3D6;padding-left:16px">
          ${specRow('Tipe Brief', tier.label, tier.sublabel)}
          ${specRow('Bulan Tayang', monthLabel, 'Tanggal final via WhatsApp')}
          ${specRow('Kompensasi', `<span style="font-size:12.5px">${feeStr}</span>`)}
          ${specRow('Format', `<span style="font-size:11.5px;font-weight:500">${formatStr}${refHtml?' · Ref: '+refHtml:''}</span>`)}
        </div>
      </div>
    `)}

    <!-- Tujuan + Tone — side by side -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      ${card(`
        ${lc('Tujuan Campaign', tier.color)}
        <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:#1F2140;font-weight:500">${tier.objective}</p>
        <p style="margin:0;font-size:11.5px;line-height:1.45;color:#5A5C75">${tier.ctaNote}</p>
      `, `border-top:3px solid ${tier.color}`)}
      ${card(`
        ${lc('Tone &amp; Feel')}
        <div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px">${toneBadges}</div>
        <p style="margin:0;font-size:11.5px;color:#5A5C75;line-height:1.45">${niche.angle}</p>
      `)}
    </div>

    <!-- PIC contact -->
    <div style="display:flex;align-items:center;gap:12px;padding:11px 14px;border:1.5px dashed ${tier.color};border-radius:9px;background:${tier.colorSoft};margin-top:auto">
      <div style="width:30px;height:30px;border-radius:999px;background:${tier.colorBg};color:${tier.color};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0">${d.pic.charAt(0).toUpperCase()}</div>
      <div style="flex:1;font-size:12px;color:#1F2140;line-height:1.5">
        <b>${d.pic}</b> · PIC Marketing Happy Pumpkin${d.picWa?` · <a href="https://wa.me/${d.picWa}" style="color:${tier.color};text-decoration:none">+${d.picWa}</a>`:''}
        <span style="color:#5A5C75"> · Senin–Jumat 09.00–18.00 WIB · Subj WA: "Brief ${handleClean} HP"</span>
      </div>
    </div>

  </div>
  <div class="df">
    <span>Happy Pumpkin × ${handleClean} · ${prodsLabel}</span>
    <span class="pg">01 / 02</span>
  </div>
</div>

<!-- ══ PAGE 02 — USP, Do/Don't, Checklist ══ -->
<div class="page">
  <div class="dh">
    <span class="hp-mark"><span class="hp-dot"></span> Happy Pumpkin × ${handleClean}</span>
    <span>02 · USP Produk &amp; Ketentuan</span>
  </div>

  <div style="flex:1;display:flex;flex-direction:column;gap:13px;padding-top:4px">

    <!-- Product talking points (condensed, per collection) -->
    <div>
      ${lc('Produk — Talking Points')}
      ${kbBlock}
    </div>

    <!-- Trust signals -->
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:9px 13px;background:#FBF8F0;border-radius:8px;border:1px solid #E8E3D6">
      <span style="font-weight:700;font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:${tier.color};flex-shrink:0">★ Trust Signals</span>
      ${allTrust.map(t=>`<span style="background:${tier.colorBg};color:${tier.color};font-weight:700;font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:3px 9px;border-radius:999px">${t}</span>`).join('')}
    </div>

    <!-- Do / Don't -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:11px">
      ${card(`${lc('✓ Do', '#2E6A5E')}<ul style="list-style:none;padding:0;margin:0">${doRows}</ul>`, 'border-top:3px solid #2E6A5E')}
      ${card(`${lc('× Don\'t', '#C9412A')}<ul style="list-style:none;padding:0;margin:0">${dontRows}</ul>`, 'border-top:3px solid #C9412A')}
    </div>

    <!-- Must-have (full width) -->
    ${card(`
      ${lc('★ Wajib Ada di Konten', tier.color)}
      <ul style="list-style:none;padding:0;margin:0">${mustHaveRows}</ul>
    `, `border-top:3px solid ${tier.color}`)}

  </div>
  <div class="df">
    <span>Produk · Do/Don't · Wajib Ada</span>
    <span class="pg">02 / 02</span>
  </div>
</div>

</div>
</body>
</html>`;
}

// --- Export & Actions ---

function kolOpenNewTab() {
  if (!window._kolBriefHtml) return;
  const blob = new Blob([window._kolBriefHtml], { type: 'text/html;charset=utf-8' });
  window.open(URL.createObjectURL(blob), '_blank');
}

function kolDownloadHTML() {
  if (!window._kolBriefHtml) return;
  const handle = (window._kolBriefHandle || 'kol').replace('@', '');
  const month  = (window._kolBriefMonth  || '').replace('-', '-');
  const blob   = new Blob([window._kolBriefHtml], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `HP-KOL-Brief_${handle}_${month}.html`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('⬇ Brief didownload!');
}

function copyKOLClaudePrompt() {
  const ig      = (document.getElementById('kb_ig')?.value    || '').trim();
  const handle  = ig ? '@' + kolParseHandle(ig) : '@kol';
  const tier    = document.getElementById('kb_tier')?.value  || 'mid';
  const prods   = kolSelectedProds().join(', ');
  const hook    = document.getElementById('kb_hook')?.value  || '';
  const cash    = document.getElementById('kb_cash')?.value  || '';
  const barter  = document.getElementById('kb_barter')?.value|| '';
  const month   = document.getElementById('kb_month')?.value || '';
  const ref     = document.getElementById('kb_ref')?.value   || '';
  const pic     = document.getElementById('kb_pic')?.value   || 'Rahmi';
  const picWa   = document.getElementById('kb_pic_wa')?.value|| '6281292580956';
  const niche   = document.getElementById('kb_niche')?.value || '';
  const notes   = document.getElementById('kb_notes')?.value || '';

  const prompt = `/happy-pumpkin-kol-brief

Instagram: https://instagram.com/${kolParseHandle(ig) || ig}
Tier: ${HP_TIERS_DB[tier]?.label || tier}
Produk: ${prods}
Hook: "${hook}"
Kompensasi: Cash ${cash} + Barter ${barter}
Bulan: ${kolFmtMonth(month)}
${niche ? 'Niche: ' + niche : ''}
${notes ? 'Catatan KOL: ' + notes : ''}
${ref ? 'Referensi reel: ' + ref : ''}
PIC: ${pic} — WA: ${picWa}

Tolong browse Instagram KOL ini, riset profil (nama asli, gaya konten, followers, detail personal relevan dari bio & postingan). Lalu generate KOL brief lengkap sebagai file HTML standalone yang bisa langsung dikirim ke KOL.`;

  navigator.clipboard.writeText(prompt)
    .then(() => showToast('✅ Prompt di-copy! Paste ke Claude Code.'))
    .catch(() => {
      const ta = document.createElement('textarea');
      ta.value = prompt; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      showToast('✅ Prompt di-copy!');
    });
}
// ============================================================
// DISTRIBUTOR INTELLIGENCE SECTION (Task 4)
// ============================================================

// ── Distributor Intel: tab shell ─────────────────────────────
function renderDistributorIntel() {
  const el = document.getElementById('section-dist-intel');
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:24px;text-align:center">
      <div style="font-size:48px">🧠</div>
      <div>
        <div style="font-size:20px;font-weight:800;color:var(--ink);margin-bottom:6px">Distributor Intel</div>
        <div style="font-size:14px;color:var(--text-muted);max-width:320px">Dashboard ini telah dipindahkan ke panel manajemen terpisah.</div>
      </div>
      <a href="https://mgmt-panel.vercel.app/login" target="_blank" rel="noopener"
         style="display:inline-flex;align-items:center;gap:8px;background:var(--primary);color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;transition:opacity .15s"
         onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
        Buka Management Panel →
      </a>
    </div>
  `;
}

// ── Fulfillment analytics ─────────────────────────────────────
function renderDistFulfillment() {
  const el = document.getElementById('di-view-fulfillment');
  if (!el || typeof FULFILLMENT_DATA === 'undefined') {
    if (el) el.innerHTML = `<div class="empty-state"><div class="empty-icon">📦</div><div class="empty-title">Fulfillment data tidak tersedia</div><div class="empty-sub">Pastikan js/fulfillment-data.js sudah dimuat.</div></div>`;
    return;
  }

  const parents = FULFILLMENT_DATA.parents;
  if (!state.fulfillSort)   state.fulfillSort   = 'net';
  if (!state.fulfillSearch) state.fulfillSearch = '';

  // All months available across the full dataset
  const allMonthsSet = new Set();
  parents.forEach(p => p.months_present.forEach(m => allMonthsSet.add(m)));
  const allMonths  = [...allMonthsSet].sort();
  const years      = [...new Set(allMonths.map(m => m.split('-')[0]))].sort();

  // Selected months: null = all, array = specific set
  const selSet = state.fulfillMonths ? new Set(state.fulfillMonths) : new Set(allMonths);
  const isAll  = !state.fulfillMonths || state.fulfillMonths.length === allMonths.length;
  const selCount = selSet.size;

  // ── Helpers exposed globally for inline onclick ────────────
  window._fulfillToggle = function(month) {
    const cur = state.fulfillMonths ? new Set(state.fulfillMonths) : new Set(allMonths);
    cur.has(month) ? cur.delete(month) : cur.add(month);
    const arr = [...cur].sort();
    state.fulfillMonths = arr.length === allMonths.length ? null : (arr.length === 0 ? null : arr);
    renderDistFulfillment();
  };
  window._fulfillPreset = function(preset) {
    if (preset === 'all')  state.fulfillMonths = null;
    else if (preset === '3m')   state.fulfillMonths = allMonths.slice(-3);
    else if (preset === '6m')   state.fulfillMonths = allMonths.slice(-6);
    else if (preset === 'ytd')  state.fulfillMonths = allMonths.filter(m => m.startsWith(years[years.length-1]));
    else if (preset === 'prev') state.fulfillMonths = allMonths.filter(m => m.startsWith(years[years.length-2]||years[0]));
    renderDistFulfillment();
  };

  // ── Aggregate data for selected months ────────────────────
  function agg(p) {
    const rows = p.mseries.filter(m => selSet.has(m.month));
    const monthsActive = rows.filter(r => r.ato > 0).length;
    const tot = rows.reduce((s,m) => ({
      po: s.po+m.po, ato: s.ato+m.ato,
      ori: s.ori+m.ori, net: s.net+m.net,
    }), {po:0,ato:0,ori:0,net:0});
    return { ...tot, monthsActive };
  }

  let distRows = parents
    .map(p => ({ name: p.parent, has_branches: p.has_branches, ...agg(p) }))
    .filter(d => d.po > 0 || d.net > 0);

  if (state.fulfillSearch) {
    const q = state.fulfillSearch.toLowerCase();
    distRows = distRows.filter(d => d.name.toLowerCase().includes(q));
  }

  const fulColor = pct => pct >= 90 ? 'var(--green)' : pct >= 70 ? 'var(--amber)' : 'var(--red)';
  const sortMap  = {
    net:  d => -d.net,
    ful:  d => -(d.ato / Math.max(d.po,1)),
    po:   d => -d.po,
    ato:  d => -d.ato,
    gap:  d => -(d.po - d.ato),
  };
  distRows.sort((a,b) => (sortMap[state.fulfillSort]||sortMap.net)(a) - (sortMap[state.fulfillSort]||sortMap.net)(b));

  const fleet   = distRows.reduce((s,d)=>({po:s.po+d.po,ato:s.ato+d.ato,net:s.net+d.net,ori:s.ori+d.ori}),{po:0,ato:0,net:0,ori:0});
  const fleetFul= fleet.po > 0 ? (fleet.ato/fleet.po*100) : 0;
  const fleetGap= fleet.po - fleet.ato;
  const maxNet  = distRows.reduce((m,d)=>Math.max(m,d.net),0);
  const activeCount = distRows.filter(d=>d.ato>0).length;

  // ── Period selector label ─────────────────────────────────
  const periodLabel = isAll ? 'Semua waktu'
    : selCount === 1 ? monthLabel([...selSet][0])
    : (() => {
        const sorted = [...selSet].sort();
        return `${monthLabel(sorted[0])} – ${monthLabel(sorted[sorted.length-1])} (${selCount} bln)`;
      })();

  // ── Trend chart: all months, dual metric ─────────────────
  const trendData = allMonths.map(m => {
    const t = parents.reduce((s,p)=>{
      const r = p.mseries.find(x=>x.month===m);
      return r ? {net:s.net+r.net, po:s.po+r.po, ato:s.ato+r.ato} : s;
    },{net:0,po:0,ato:0});
    return {month:m,...t};
  });
  const maxTrendNet = trendData.reduce((m,d)=>Math.max(m,d.net),0);
  const BAR_H = 72; // max bar height px
  const trendBars = trendData.map(d => {
    const h     = maxTrendNet > 0 ? Math.max(3, Math.round((d.net/maxTrendNet)*BAR_H)) : 3;
    const ful   = d.po > 0 ? Math.round(d.ato/d.po*100) : 0;
    const isSel = selSet.has(d.month);
    const fc    = fulColor(ful);
    // Ful% dot position: % of bar height from bottom
    const dotY  = Math.round((ful/100)*h);
    const lbl   = monthLabel(d.month);
    return `
      <div class="di-trend-col${isSel?' di-trend-sel':''}"
        onclick="_fulfillToggle('${d.month}')"
        title="${lbl}: NET ${fmtIDR(d.net)} · Ful ${ful}% · PO ${fmtNum(Math.round(d.po))} → ATO ${fmtNum(Math.round(d.ato))}">
        <div class="di-trend-val" style="color:${isSel?'var(--primary)':'var(--text-muted)'}">${fmtIDR(d.net).replace('Rp ','')}</div>
        <div class="di-trend-bars">
          <div class="di-trend-bar" style="height:${h}px;background:${isSel?'var(--primary)':'var(--border)'}">
            <div class="di-trend-ful-dot" style="bottom:${dotY}px;background:${isSel?fc:'rgba(0,0,0,.18)'}"></div>
          </div>
        </div>
        <div class="di-trend-lbl" style="color:${isSel?'var(--text)':'var(--text-muted)'}">${lbl.slice(0,3)}<br><span style="font-size:8px">${lbl.slice(-4)}</span></div>
      </div>`;
  }).join('');

  // ── Table rows ────────────────────────────────────────────
  const tableRows = distRows.map((d,i) => {
    const ful  = d.po > 0 ? (d.ato/d.po*100) : 0;
    const gap  = Math.round(d.po - d.ato);
    const barW = maxNet > 0 ? Math.round((d.net/maxNet)*100) : 0;
    const fc   = fulColor(ful);
    const avgNet = d.monthsActive > 0 ? fmtIDR(d.net/d.monthsActive) : '—';
    return `<tr>
      <td class="num" style="color:var(--text-muted);font-size:11px;width:28px">${i+1}</td>
      <td>
        <div style="font-weight:700;font-size:12.5px;line-height:1.3">${escHtml(d.name)}</div>
        ${d.has_branches?'<div style="font-size:10px;color:var(--text-muted)">Multi-cabang</div>':''}
      </td>
      <td class="num" style="color:var(--text-muted)">${fmtNum(Math.round(d.po))}</td>
      <td class="num">${fmtNum(Math.round(d.ato))}</td>
      <td class="num" style="color:${gap>0?'var(--red)':'var(--text-muted)'}">
        ${gap > 0 ? fmtNum(gap) : '—'}
      </td>
      <td style="min-width:120px">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="flex:1;height:5px;background:var(--border);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${Math.min(ful,100).toFixed(0)}%;background:${fc};border-radius:3px"></div>
          </div>
          <span style="font-size:11.5px;font-weight:800;color:${fc};min-width:32px;text-align:right">${ful.toFixed(0)}%</span>
        </div>
      </td>
      <td style="min-width:140px">
        <div style="display:flex;align-items:center;gap:6px">
          <div class="prog-bar-track" style="flex:1"><div class="prog-bar-fill" style="width:${barW}%;background:var(--primary)"></div></div>
          <span style="font-weight:700;font-size:12px;white-space:nowrap">${fmtIDR(d.net)}</span>
        </div>
      </td>
      <td class="num" style="color:var(--text-muted);font-size:11px">${avgNet}<span style="font-size:9px">/bln</span></td>
    </tr>`;
  }).join('');

  // Totals footer
  const totFul = fleet.po > 0 ? (fleet.ato/fleet.po*100) : 0;
  const totGap = Math.round(fleet.po - fleet.ato);
  const tableFooter = `<tr style="background:var(--bg);font-weight:800;border-top:2px solid var(--border)">
    <td colspan="2" style="font-size:11.5px;font-weight:800;padding:10px">TOTAL (${distRows.length} distributor)</td>
    <td class="num">${fmtNum(Math.round(fleet.po))}</td>
    <td class="num">${fmtNum(Math.round(fleet.ato))}</td>
    <td class="num" style="color:${totGap>0?'var(--red)':'var(--text-muted)'}">${totGap>0?fmtNum(totGap):'—'}</td>
    <td>
      <div style="display:flex;align-items:center;gap:6px">
        <div style="flex:1;height:5px;background:var(--border);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${Math.min(totFul,100).toFixed(0)}%;background:${fulColor(totFul)};border-radius:3px"></div>
        </div>
        <span style="font-size:11.5px;font-weight:800;color:${fulColor(totFul)};min-width:32px;text-align:right">${totFul.toFixed(0)}%</span>
      </div>
    </td>
    <td><span style="font-weight:800">${fmtIDR(fleet.net)}</span></td>
    <td class="num" style="font-size:11px;color:var(--text-muted)">—</td>
  </tr>`;

  const mkSort = (key, label) =>
    `<button class="filter-btn${state.fulfillSort===key?' active':''}" style="font-size:11px"
      onclick="state.fulfillSort='${key}';renderDistFulfillment()">${label}</button>`;

  // ── Month selector chips (grouped by year) ────────────────
  const monthChips = years.map(yr => {
    const yrMonths = allMonths.filter(m => m.startsWith(yr));
    const allYrSel = yrMonths.every(m => selSet.has(m));
    const chips = yrMonths.map(m => {
      const isSel = selSet.has(m);
      return `<button class="di-month-chip${isSel?' active':''}" onclick="_fulfillToggle('${m}')">${monthLabel(m).slice(0,3)}</button>`;
    }).join('');
    return `
      <div class="di-month-group">
        <button class="di-year-btn${allYrSel?' active':''}" onclick="_fulfillPreset('${yr === years[years.length-1] ? 'ytd' : 'prev'}')" title="${yr}">${yr}</button>
        ${chips}
      </div>`;
  }).join('');

  el.innerHTML = `
    <!-- Period selector -->
    <div class="di-period-section">
      <div class="di-period-header">
        <div>
          <span class="di-period-title">Pilih Periode</span>
          <span class="di-period-badge">${selCount} dari ${allMonths.length} bulan dipilih</span>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="di-preset-btn${isAll?' active':''}" onclick="_fulfillPreset('all')">Semua</button>
          <button class="di-preset-btn" onclick="_fulfillPreset('3m')">3 Bln Terakhir</button>
          <button class="di-preset-btn" onclick="_fulfillPreset('6m')">6 Bln Terakhir</button>
          <button class="di-preset-btn" onclick="_fulfillPreset('ytd')">${years[years.length-1]}</button>
          ${years.length > 1 ? `<button class="di-preset-btn" onclick="_fulfillPreset('prev')">${years[years.length-2]}</button>` : ''}
        </div>
      </div>
      <div class="di-month-selector">${monthChips}</div>
    </div>

    <!-- KPI cards — reordered: Ful% first (headline signal), then revenue, then units -->
    <div class="stat-grid" style="margin-bottom:20px">
      <div class="stat-card" style="border-top:3px solid ${fulColor(fleetFul)}">
        <div class="label">Fulfillment Rate</div>
        <div class="value" style="color:${fulColor(fleetFul)}">${fleetFul.toFixed(1)}%</div>
        <div class="sub">ATO ÷ PO · fleet-wide</div>
        <div class="prog-bar-track" style="margin-top:8px">
          <div class="prog-bar-fill" style="width:${Math.min(fleetFul,100)}%;background:${fulColor(fleetFul)}"></div>
        </div>
        <div style="margin-top:6px;font-size:10.5px;color:var(--text-muted)">
          ${fleetFul >= 90 ? '✅ Target tercapai' : fleetFul >= 70 ? '⚠️ Di bawah target 90%' : '🔴 Perlu perhatian segera'}
        </div>
      </div>
      <div class="stat-card accent">
        <div class="label">NET Revenue</div>
        <div class="value">${fmtIDR(fleet.net)}</div>
        <div class="sub">dari ORI ${fmtIDR(fleet.ori)}</div>
      </div>
      <div class="stat-card">
        <div class="label">Distributor Aktif</div>
        <div class="value">${activeCount}</div>
        <div class="sub">dari ${distRows.length} terdaftar · periode ini</div>
      </div>
      <div class="stat-card">
        <div class="label">Total PO</div>
        <div class="value">${fmtNum(Math.round(fleet.po))}</div>
        <div class="sub">unit dipesan</div>
      </div>
      <div class="stat-card">
        <div class="label">Total ATO</div>
        <div class="value">${fmtNum(Math.round(fleet.ato))}</div>
        <div class="sub">unit terkirim</div>
      </div>
      <div class="stat-card" style="${fleetGap>0?'border-top:3px solid var(--red)':''}">
        <div class="label">Gap (Tidak Terkirim)</div>
        <div class="value" style="color:${fleetGap>0?'var(--red)':'var(--green)'}">${fmtNum(Math.round(fleetGap))}</div>
        <div class="sub">PO – ATO · unit belum terpenuhi</div>
      </div>
    </div>

    <!-- Trend chart: all months, click to toggle -->
    <div class="section-header mb-12">
      <div><div class="section-title">NET Revenue per Bulan</div><div class="section-sub">Klik bar untuk pilih / batalkan bulan · titik = fulfillment rate</div></div>
    </div>
    <div class="di-trend-chart mb-24">${trendBars}</div>
    <div class="di-trend-legend mb-24">
      <span class="di-legend-item"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--primary);margin-right:4px"></span>Bulan dipilih</span>
      <span class="di-legend-item"><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--border);margin-right:4px"></span>Bulan tidak dipilih</span>
      <span class="di-legend-item"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--green);margin-right:4px"></span>Titik = Ful% (makin tinggi = makin baik)</span>
    </div>

    <!-- Per-distributor table -->
    <div class="section-header mb-12">
      <div>
        <div class="section-title">Per Distributor</div>
        <div class="section-sub">${distRows.length} distributor · ${periodLabel}</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
        <input class="kol-search" placeholder="🔍 Cari distributor…"
          value="${state.fulfillSearch.replace(/"/g,'&quot;')}"
          oninput="state.fulfillSearch=this.value;renderDistFulfillment()" style="max-width:180px">
        <div class="filter-bar" style="gap:4px">
          ${mkSort('net','NET ↓')}${mkSort('ful','Ful% ↓')}${mkSort('gap','Gap ↓')}${mkSort('po','PO ↓')}${mkSort('ato','ATO ↓')}
        </div>
      </div>
    </div>
    <div class="table-wrap mb-24">
      <table class="data-table">
        <thead><tr>
          <th style="width:28px">#</th>
          <th>Distributor</th>
          <th title="Purchase Order — unit dipesan">PO</th>
          <th title="Actual Transfer Order — unit terkirim">ATO</th>
          <th title="Gap = PO - ATO, unit belum terpenuhi" style="color:var(--red)">Gap ↑</th>
          <th title="ATO ÷ PO">Ful%</th>
          <th>NET Revenue</th>
          <th title="NET dibagi jumlah bulan aktif">Avg/Bln</th>
        </tr></thead>
        <tbody>
          ${tableRows || '<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-muted)">Tidak ada data untuk periode ini</td></tr>'}
        </tbody>
        <tfoot>${tableFooter}</tfoot>
      </table>
    </div>
  `;
}

// ── Legacy Intel view (preserved) ────────────────────────────
function renderDistIntelLegacy() {
  const el = document.getElementById('di-view-intel');
  if (!el) return;

  const all    = state.distributors;
  const active = all.filter(d => d.status === 'Active');

  // ── Churn / DSLO summary ────────────────────────────────────────
  const churnHigh   = active.filter(d => getChurnRisk(d) === 'high');
  const churnMedium = active.filter(d => getChurnRisk(d) === 'medium');
  const churnLow    = active.filter(d => getChurnRisk(d) === 'low');
  const churnUnknown= active.filter(d => getChurnRisk(d) === 'unknown');

  // ── Consignment deferred revenue summary ────────────────────────
  const cp = CONFIG.consignmentPrograms || [];
  const missingRates = cp.filter(c => c.sellThroughRate === null);
  const CONSIGN_COMBINED_ATO = 418000000; // ~Rp 418jt combined ATO (from master prompt)

  // ── Velocity analysis (targets vs actual) ───────────────────────
  const latestMonth = state.activeMonth;
  const targets = state.targets.filter(t => t.month === latestMonth && t.channel === 'Offline');
  const offlineTarget = targets.reduce((s,t) => s + (t.revenue_target||0), 0);
  const offlineActual = targets.reduce((s,t) => s + (t.revenue_actual||0), 0);
  const offlineAchiev = offlineTarget > 0 ? Math.round((offlineActual / offlineTarget) * 100) : null;

  // ── Tier breakdown ───────────────────────────────────────────────
  const tier1 = active.filter(d => d.tier === '1');
  const tier2 = active.filter(d => d.tier === '2');
  const tier3 = active.filter(d => d.tier === '3');
  const totalTarget = active.reduce((s,d) => s + Number(d.monthly_target||0), 0);

  // ── Regional spread ─────────────────────────────────────────────
  const byRegion = {};
  active.forEach(d => { byRegion[d.region] = (byRegion[d.region]||0) + 1; });
  const regionRows = Object.entries(byRegion)
    .sort((a,b) => b[1]-a[1])
    .map(([r,n]) => {
      const color = CONFIG.regionColors[r] || 'var(--primary)';
      const pct   = Math.round((n / active.length) * 100);
      return `<div class="intel-row">
        <div><div class="intel-row-name" style="color:${color}">● ${r}</div></div>
        <div style="text-align:right">
          <div class="intel-row-val">${n} partner${n>1?'s':''}</div>
          <div class="intel-row-sub">${pct}% of network</div>
        </div>
      </div>`;
    }).join('');

  // ── Churn watchlist ──────────────────────────────────────────────
  const churnRows = [...churnHigh, ...churnMedium].slice(0,8).map(d => {
    const dslo = getDSLO(d);
    const risk = getChurnRisk(d);
    const colors = { high:'var(--red)', medium:'var(--amber)' };
    return `<div class="intel-row">
      <div>
        <div class="intel-row-name">${escHtml(d.name)}</div>
        <div class="intel-row-sub">${d.city} · Tier ${d.tier}</div>
      </div>
      <div style="text-align:right">
        <span class="dslo-badge dslo-${risk}">${dslo}d ago</span>
        <div class="intel-row-sub">${risk === 'high' ? '🔴 Overdue' : '🟡 Past window'}</div>
      </div>
    </div>`;
  }).join('') || `<div style="font-size:12px;color:var(--text-muted);padding:8px 0">No churn risk detected — all orders within reorder window.</div>`;

  // ── Consignment risk table ───────────────────────────────────────
  const consignRows = cp.map(c => {
    const rate = c.sellThroughRate;
    const rateDisplay = rate !== null ? `${rate}%` : `<span style="color:var(--amber);font-weight:700">? — TBD</span>`;
    const period = c.period.end ? `Up to ${c.period.end}` : 'All periods';
    return `<div class="intel-row">
      <div>
        <div class="intel-row-name">${c.distributor}${c.matchBranches?' <span style="font-size:10px;font-weight:400">(all branches)</span>':''}</div>
        <div class="intel-row-sub">${period} · ${c.note}</div>
      </div>
      <div style="text-align:right">
        <div class="intel-row-val">${rateDisplay}</div>
        <div class="intel-row-sub">sell-through</div>
      </div>
    </div>`;
  }).join('');

  const deferredRisk = missingRates.length > 0
    ? `<div class="alert-banner amber" style="margin-top:12px">
        <span>⚠️</span>
        <span><strong>~Rp ${fmtIDR(CONSIGN_COMBINED_ATO)} combined ATO</strong> in deferred revenue until sell-through rates are confirmed. Update <code>config.js → consignmentPrograms[].sellThroughRate</code> when available.</span>
      </div>` : '';

  el.innerHTML = `
    <div style="height:16px"></div>
    <!-- Summary stats -->
    <div class="stat-grid" style="margin-bottom:20px">
      <div class="stat-card accent">
        <div class="label">Network Size</div>
        <div class="value">${active.length}</div>
        <div class="sub">${tier1.length} Tier 1 · ${tier2.length} Tier 2 · ${tier3.length} Tier 3</div>
      </div>
      <div class="stat-card">
        <div class="label">Monthly Network Target</div>
        <div class="value">${fmtIDR(totalTarget)}</div>
        <div class="sub">${offlineAchiev !== null ? offlineAchiev+'% achieved '+latestMonth : 'No target data yet'}</div>
      </div>
      <div class="stat-card" style="${churnHigh.length ? 'border-top:3px solid var(--red)' : ''}">
        <div class="label">Churn Risk</div>
        <div class="value" style="color:${churnHigh.length ? 'var(--red)' : churnMedium.length ? 'var(--amber)' : 'var(--green)'}">${churnHigh.length + churnMedium.length}</div>
        <div class="sub">${churnHigh.length} high · ${churnMedium.length} medium · ${churnUnknown.length} no data</div>
      </div>
      <div class="stat-card" style="${missingRates.length ? 'border-top:3px solid var(--amber)' : ''}">
        <div class="label">Consignment Partners</div>
        <div class="value" style="color:${missingRates.length ? 'var(--amber)' : 'var(--text)'}">${cp.length}</div>
        <div class="sub">${missingRates.length} missing sell-through rate</div>
      </div>
    </div>

    <div class="intel-grid">

      <!-- Churn Watchlist -->
      <div class="intel-card" style="${churnHigh.length ? 'border-top:3px solid var(--red)' : ''}">
        <div class="intel-card-title">🔴 Churn Watchlist — DSLO</div>
        ${churnRows}
        ${churnUnknown.length ? `<div style="margin-top:8px;font-size:11px;color:var(--text-muted)">${churnUnknown.length} partners have no last_order_date in sheet — add it to enable DSLO tracking.</div>` : ''}
      </div>

      <!-- Regional Coverage -->
      <div class="intel-card">
        <div class="intel-card-title">🗺 Network by Region</div>
        ${regionRows}
        <div style="margin-top:10px;font-size:11px;color:var(--text-muted)">
          ${CONFIG.regions.slice(1).filter(r => !byRegion[r]).map(r => `<span style="color:var(--amber)">⚠ ${r}: no coverage</span>`).join(' · ')||'All regions covered ✓'}
        </div>
      </div>

      <!-- Consignment Risk -->
      <div class="intel-card" style="grid-column:span 2;${missingRates.length?'border-top:3px solid var(--amber)':''}">
        <div class="intel-card-title">📦 Consignment Program — Revenue Recognition</div>
        ${consignRows}
        ${deferredRisk}
      </div>

    </div>

    <!-- Tier breakdown detail -->
    <div class="intel-card" style="margin-top:16px">
      <div class="intel-card-title">📊 Partner Tier Breakdown</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
        ${[['1','Chain / Major Retailers',tier1],['2','Regional Independents',tier2],['3','Smaller Stockists',tier3]].map(([t,label,list]) => `
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:8px">Tier ${t} — ${label} (${list.length})</div>
            ${list.map(d => `<div class="intel-row" style="padding:4px 0">
              <div><div style="font-size:12px;font-weight:600">${escHtml(d.name)}</div><div style="font-size:10.5px;color:var(--text-muted)">${d.city} · ${d.region}</div></div>
              <div style="font-size:11.5px;font-weight:700;color:var(--primary);text-align:right">${fmtIDR(d.monthly_target)}</div>
            </div>`).join('') || `<div style="font-size:12px;color:var(--text-muted)">None yet</div>`}
          </div>`).join('')}
      </div>
    </div>
  `;
}

// ============================================================
// KOL PROGRAM MODULE
// ============================================================

const KOL_BUFFER_KEY     = 'hp_kol_buffer_v1';
const KOL_STATE_KEY      = 'hp_kol_state_v1';
const KOL_EDITS_KEY      = 'hp_kol_edits_v1';       // local status/link/tag overrides
const KOL_DECISIONS_KEY  = 'hp_kol_decisions_v1';   // decision + activity log
const KOL_CANDIDATES_KEY = 'hp_kol_candidates_v1';  // manually added candidates

const KOL_STAGES = [
  { key:'KANDIDAT',  label:'Kandidat',  emoji:'🔍', color:'var(--text-muted)',  desc:'Ditemukan, belum dikontak' },
  { key:'PENDING',   label:'Dikontak',  emoji:'📤', color:'var(--blue)',        desc:'Menunggu reply dari KOL' },
  { key:'HOLD',      label:'Hold',      emoji:'⏸️',  color:'var(--amber)',       desc:'Ditunda sementara' },
  { key:'NEGOSIASI', label:'Negosiasi', emoji:'🤝', color:'var(--purple)',      desc:'Rate dalam negosiasi' },
  { key:'DEAL',      label:'Deal',      emoji:'✅', color:'var(--green)',       desc:'Sepakat, campaign aktif' },
  { key:'BARTER',    label:'Barter',    emoji:'🎁', color:'var(--purple)',      desc:'Deal barter produk' },
  { key:'SELESAI',   label:'Selesai',   emoji:'🏁', color:'var(--green)',       desc:'Campaign selesai' },
  { key:'CANCEL',    label:'Cancel',    emoji:'❌', color:'var(--red)',         desc:'Tidak jadi' },
];
// Main funnel flow (linear)
const KOL_FUNNEL_MAIN   = ['KANDIDAT','PENDING','NEGOSIASI','DEAL','SELESAI'];
// Side exits shown separately
const KOL_FUNNEL_SIDE   = ['HOLD','BARTER','CANCEL'];
// All valid statuses
const KOL_ALL_STATUSES  = KOL_STAGES.map(s => s.key);

const KOL_ACTION_TYPES = [
  { key:'status_change', label:'Ubah Status' },
  { key:'brief_ready',   label:'Brief Disiapkan' },
  { key:'rate_approved', label:'Rate Disetujui' },
  { key:'rate_rejected', label:'Rate Ditolak' },
  { key:'follow_up',     label:'Follow Up Diminta' },
  { key:'link_updated',  label:'D-Link Diupdate' },
  { key:'form_update',   label:'Update Form Google' },
  { key:'note_added',    label:'Catatan Ditambah' },
];

// ── Data layer: edits ─────────────────────────────────────────
function kolGetEdits() {
  try { return JSON.parse(localStorage.getItem(KOL_EDITS_KEY) || '{}'); } catch(e) { return {}; }
}
function kolSaveEdits(edits) {
  try { localStorage.setItem(KOL_EDITS_KEY, JSON.stringify(edits)); } catch(e) {}
}
function kolApplyEdit(kolId, fields) {
  const edits = kolGetEdits();
  edits[kolId] = { ...(edits[kolId]||{}), ...fields };
  kolSaveEdits(edits);
}

// ── Data layer: decisions/activity log ───────────────────────
function kolGetDecisions() {
  try { return JSON.parse(localStorage.getItem(KOL_DECISIONS_KEY) || '[]'); } catch(e) { return []; }
}
function kolSaveDecisions(decisions) {
  try { localStorage.setItem(KOL_DECISIONS_KEY, JSON.stringify(decisions)); } catch(e) {}
}
function kolAddDecision(kolId, handle, nama, actionKey, detail, by) {
  const decisions = kolGetDecisions();
  const actionLabel = KOL_ACTION_TYPES.find(a => a.key === actionKey)?.label || actionKey;
  decisions.unshift({
    id:      Date.now() + '_' + Math.random().toString(36).slice(2,6),
    kol_id:  kolId, handle, nama,
    action:  actionKey, action_label: actionLabel,
    detail:  detail || '',
    by:      by || 'Alex',
    at:      new Date().toISOString(),
    inbox_status: 'pending',   // 'pending' | 'done' | 'blocked'
    done_note: '', done_at: '', done_by: '',
  });
  kolSaveDecisions(decisions);
  return decisions[0];
}
function kolMarkDecision(id, status, note, by) {
  const decisions = kolGetDecisions();
  const d = decisions.find(d => d.id === id);
  if (d) {
    d.inbox_status = status;
    d.done_note    = note || '';
    d.done_at      = new Date().toISOString();
    d.done_by      = by || 'Tim';
    kolSaveDecisions(decisions);
  }
  kolRenderKeputusan();
}

// ── Data layer: manual candidates ────────────────────────────
function kolGetCandidates() {
  try { return JSON.parse(localStorage.getItem(KOL_CANDIDATES_KEY) || '[]'); } catch(e) { return []; }
}
function kolSaveCandidates(cands) {
  try { localStorage.setItem(KOL_CANDIDATES_KEY, JSON.stringify(cands)); } catch(e) {}
}

// ── Merged data: Sheet + candidates + local edits ────────────
function kolMergedData() {
  const edits = kolGetEdits();
  const base  = [...(state.kols || []), ...kolGetCandidates()];
  return base.map(k => {
    const e = edits[k.id] || {};
    return { ...k, ...e, _hasEdits: Object.keys(e).length > 0, _isCandidate: !!k._isCandidate };
  });
}

// ── Step 2: Calculation helpers ───────────────────────────────
function kolCalcCPM(rate, avgViews) {
  if (!avgViews || avgViews === 0) return 0;
  return Math.round((rate / avgViews) * 1000);
}
function kolCPMZone(cpm) {
  if (!cpm || cpm === 0) return 'unknown';
  if (cpm < 5000)  return 'green';
  if (cpm < 10000) return 'blue';
  if (cpm < 15000) return 'amber';
  return 'red';
}
function kolCPMLabel(zone) {
  return { green:'Hijau', blue:'Biru', amber:'Kuning', red:'Merah', unknown:'—' }[zone] || '—';
}
function kolCalcCPE(rate, followers, erPct) {
  const eng = followers * (erPct / 100);
  if (!eng) return 0;
  return Math.round(rate / eng);
}
function kolCPELabel(cpe) {
  if (!cpe) return '—';
  if (cpe < 500)  return 'Sangat Bagus';
  if (cpe < 1500) return 'Bagus';
  if (cpe < 2500) return 'Borderline';
  return 'Terlalu Mahal';
}
function kolMaxOffer(avgViews) {
  return Math.round((avgViews / 1000) * 10000);
}
function kolScore(eng, aud, reach, content) {
  return Math.round(eng * 0.30 + aud * 0.30 + reach * 0.25 + content * 0.15);
}

// ── State persistence ─────────────────────────────────────────
function saveKOLState() {
  try {
    localStorage.setItem(KOL_STATE_KEY, JSON.stringify({
      view:             state.kolView,
      filterPlatform:   state.kolFilterPlatform,
      filterTier:       state.kolFilterTier,
      filterStatus:     state.kolFilterStatus,
      filterCPMZone:    state.kolFilterCPMZone,
      filterSearch:     state.kolFilterSearch,
      laporanRange:     state.kolLaporanRange,
      keputusanMode:    state.kolKeputusanMode,
    }));
  } catch(e) {}
}
function loadKOLState() {
  try {
    const s = JSON.parse(localStorage.getItem(KOL_STATE_KEY) || '{}');
    if (s.view)            state.kolView            = s.view;
    if (s.filterPlatform)  state.kolFilterPlatform  = s.filterPlatform;
    if (s.filterTier)      state.kolFilterTier      = s.filterTier;
    if (s.filterStatus)    state.kolFilterStatus    = s.filterStatus;
    if (s.filterCPMZone)   state.kolFilterCPMZone   = s.filterCPMZone;
    if (s.filterSearch !== undefined) state.kolFilterSearch = s.filterSearch;
    if (s.laporanRange)    state.kolLaporanRange    = s.laporanRange;
    if (s.keputusanMode)   state.kolKeputusanMode   = s.keputusanMode;
  } catch(e) {}
}

// Parse "Juni 2026" → "2026-06" for date comparisons
function kolParseBulan(str) {
  const map = { januari:'01',februari:'02',maret:'03',april:'04',mei:'05',juni:'06',
                juli:'07',agustus:'08',september:'09',oktober:'10',november:'11',desember:'12' };
  if (!str) return '';
  const p = str.trim().toLowerCase().split(/\s+/);
  if (p.length < 2) return '';
  const m = map[p[0]];
  return m ? `${p[1]}-${m}` : '';
}

function kolFilteredData() {
  return kolMergedData().filter(k => {
    if (state.kolFilterPlatform !== 'All' && k.platform !== state.kolFilterPlatform) return false;
    if (state.kolFilterTier     !== 'All' && k.tier     !== state.kolFilterTier)     return false;
    if (state.kolFilterStatus   !== 'All' && k.status   !== state.kolFilterStatus)   return false;
    if (state.kolFilterCPMZone  !== 'All' && k.cpm_zone !== state.kolFilterCPMZone)  return false;
    if (state.kolFilterSearch) {
      const q = state.kolFilterSearch.toLowerCase();
      if (!k.handle.toLowerCase().includes(q) && !(k.nama||'').toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

// ── Handoff: Command Center (iframe) → Brief Generator, pre-filled ──
window.hpOpenBrief = function (p) {
  p = p || {};
  navigate('kol');
  const ID_MONTHS = { januari:'01', februari:'02', maret:'03', april:'04', mei:'05', juni:'06', juli:'07', agustus:'08', september:'09', oktober:'10', november:'11', desember:'12' };
  const toMonthInput = (m) => {
    if (!m) return '';
    if (/^\d{4}-\d{2}$/.test(m)) return m;                         // already YYYY-MM
    const parts = String(m).trim().toLowerCase().split(/\s+/);     // "Juni 2026"
    if (parts.length === 2 && ID_MONTHS[parts[0]] && /^\d{4}$/.test(parts[1])) return `${parts[1]}-${ID_MONTHS[parts[0]]}`;
    return '';
  };
  const fmtAmt = (v) => {
    if (v === '' || v == null) return '';
    const n = Number(v);
    return (isFinite(n) && n > 0) ? n.toLocaleString('id-ID') : String(v);
  };
  setTimeout(() => {
    const ig = document.getElementById('kb_ig');
    if (ig && p.handle) { ig.value = String(p.handle).replace(/^@/, ''); try { kolHandleUsernameInput(ig.value); } catch (e) {} }
    const niche = document.getElementById('kb_niche');
    if (niche && p.niche) { niche.value = p.niche; try { kolUpdateNicheHelper(p.niche); } catch (e) {} }
    const notes = document.getElementById('kb_notes');
    if (notes && p.notes) notes.value = p.notes;
    // Tier: explicit if mapped from Tipe Brief, else derived from briefType label
    const tk = p.tier || ({ 'Soft-selling': 'soft', 'Mid-selling': 'mid', 'Hard-selling': 'hard' }[p.briefType]);
    if (tk) try { kolSelectTier(tk); } catch (e) {}
    // Collections: uncheck all, then check exactly the mapped ones
    const cols = (p.collections && p.collections.length) ? p.collections : (p.collection ? [p.collection] : []);
    if (cols.length) document.querySelectorAll('input[name="kb_collections"]').forEach(cb => { cb.checked = cols.includes(cb.value); });
    // Month, cash, barter
    const mEl = document.getElementById('kb_month'); const mi = toMonthInput(p.month); if (mEl && mi) mEl.value = mi;
    const cashEl = document.getElementById('kb_cash'); if (cashEl && p.cash !== '' && p.cash != null) cashEl.value = fmtAmt(p.cash);
    const barEl  = document.getElementById('kb_barter'); if (barEl && p.barter !== '' && p.barter != null) barEl.value = fmtAmt(p.barter);
    // Angle: blank → brief prints "Diserahkan ke creator"
    const hk = document.getElementById('kb_hook'); if (hk) hk.value = p.angle || p.hook || '';
    try { kolUpdateHookSuggestions(); } catch (e) {}
    try { kolSaveDraft(); } catch (e) {}   // Command Center handoff overwrites the saved draft
    try { showToast('✦ Brief di-prefill dari Command Center'); } catch (e) {}
    window.scrollTo(0, 0);
  }, 280);
};

// ── Product Database (shared knowledge base) ──────────────────
const pdbState   = { i: 0, lang: 'id' };
const PDB_COLORS = { pureknit:'#5A4A8C', ultracool:'#2E7DAF', active:'#4A8C6F', knitfashion:'#B8527A',
  woven:'#9A6A3C', play:'#E08A1E', basic:'#64748B', denim:'#3B5C8A', sleep:'#7A52CC',
  breathe:'#2E9D8A', softair:'#5BA8C9', batik:'#A8543A', raya:'#C0942A' };

function pdbGroup(label, arr, lang, color, copy) {
  if (!arr || !arr.length) return '';
  const L = o => (o && (o[lang] || o.en)) || '';
  return `<div class="pdb-group"><div class="pdb-glabel" style="color:${color}">${label}</div>
    <ul class="pdb-glist${copy ? ' pdb-copy' : ''}">${arr.map(it => `<li>${L(it)}</li>`).join('')}</ul></div>`;
}
function pdbSelect(i) { pdbState.i = i; renderProductDatabase(); }
function pdbLang(l)   { pdbState.lang = l; renderProductDatabase(); }

function renderProductDatabase() {
  const el = document.getElementById('section-product-database');
  if (!el) return;
  const db = window.HP_PRODUCT_DB;
  if (!db || !db.collections) { el.innerHTML = '<div style="padding:24px;color:var(--text-muted)">Product Database belum termuat.</div>'; return; }
  const lang = pdbState.lang;
  const L = o => (o && (o[lang] || o.en)) || '';
  const cols = db.collections;
  if (pdbState.i >= cols.length) pdbState.i = 0;
  const c = cols[pdbState.i];
  const color = PDB_COLORS[c.id] || 'var(--primary)';

  el.innerHTML = `
    <div class="pdb" style="--accent:${color}">
      <div class="pdb-top">
        <div>
          <div class="pdb-eyebrow">Shared Knowledge Base · v${db.version}</div>
          <div class="pdb-h1">Product Database</div>
          <div class="pdb-purpose">${db.purpose}</div>
          <div class="pdb-srcnote">📚 Sumber tunggal yang dibaca KOL Brief Generator &amp; KOL Command Center.</div>
        </div>
        <div class="pdb-lang">
          <button class="pdb-langbtn ${lang === 'en' ? 'active' : ''}" onclick="pdbLang('en')">EN</button>
          <button class="pdb-langbtn ${lang === 'id' ? 'active' : ''}" onclick="pdbLang('id')">ID</button>
        </div>
      </div>

      <details class="pdb-rules">
        <summary>House Rules &amp; Selling-Point Ratio</summary>
        <ul class="pdb-ruleslist">${db.houseRules.map(r => `<li>${r}</li>`).join('')}</ul>
        <div class="pdb-ratio">
          <div><b>Fashion-forward:</b> ${db.sellingPointRatio.fashionForward}</div>
          <div><b>Essentials &amp; babywear:</b> ${db.sellingPointRatio.essentialsAndBabywear}</div>
        </div>
      </details>

      <div class="pdb-body">
        <div class="pdb-rail">
          ${cols.map((cc, idx) => `
            <button class="pdb-railitem ${idx === pdbState.i ? 'active' : ''}" style="--c:${PDB_COLORS[cc.id] || '#888'}" onclick="pdbSelect(${idx})">
              <span class="pdb-dot"></span>
              <span class="pdb-railtext"><span class="pdb-railname">${cc.name}</span><span class="pdb-railkick">${L(cc.kicker)}</span></span>
            </button>`).join('')}
        </div>

        <div class="pdb-detail">
          <div class="pdb-kick" style="color:${color}">${L(c.kicker)}</div>
          <div class="pdb-name">${c.name}</div>
          <div class="pdb-one">${L(c.oneLiner)}</div>
          <div class="pdb-metarow">${c.meta.map(m => `<span class="pdb-m">${m}</span>`).join('')}</div>
          <div class="pdb-material"><span class="pdb-matlabel">Material</span> ${L(c.material)}</div>
          ${pdbGroup('Say — product story / USP', c.say, lang, '#1f9d6b')}
          ${pdbGroup('Show — what to film', c.show, lang, '#2b6fd6')}
          ${pdbGroup('Avoid', c.avoid, lang, '#d64545')}
          ${pdbGroup('Hooks — opener lines (copy-paste)', c.hooks, lang, color, true)}
          <div class="pdb-hashtags">${c.hashtags}</div>
          <div class="pdb-cloud">${c.keywordCloud.map(k => `<span style="font-size:${11 + (k.length % 3) * 2}px">${k}</span>`).join('')}</div>
          <details class="pdb-articles">
            <summary>Articles in this collection (${c.articles.length}) — internal reference</summary>
            <div class="pdb-artnote">Internal reference — confirm live stock &amp; price before quoting.</div>
            ${c.articles.length ? c.articles.map(a => `
              <div class="pdb-artrow">
                <span class="pdb-artname">${a.name}</span>
                <span class="pdb-artchip">${a.gender}</span>
                <span class="pdb-artchip">${a.colors} warna</span>
                <span class="pdb-artprice">${a.price || '—'}</span>
              </div>`).join('') : '<div class="pdb-artnote">Belum ada artikel terdaftar.</div>'}
          </details>
        </div>
      </div>
    </div>`;
}

// ── KOL Command Center (embedded full app at /kol) ────────────
// The standalone KOL Command Center lives at /kol and is also reachable
// directly. Here we embed it inside the admin shell as the KOL Program tab.
function renderKOLCommandCenter() {
  const el = document.getElementById('section-kol-program');
  if (!el) return;
  if (el.dataset.embedded === '1') return;   // don't reload iframe on re-nav
  el.dataset.embedded = '1';
  el.innerHTML = `
    <div style="display:flex;justify-content:flex-end;margin-bottom:8px">
      <a href="kol/index.html" target="_blank" rel="noopener"
         style="font-size:12px;font-weight:700;color:var(--primary,#ff7a1a);text-decoration:none">
        Buka di tab penuh ↗
      </a>
    </div>
    <iframe src="kol/index.html" title="KOL Command Center"
      style="width:100%;height:calc(100vh - 150px);border:1px solid var(--line,#e7eaf0);border-radius:12px;background:#f5f6fa"></iframe>`;
}

// ── Step 5: Section shell ─────────────────────────────────────
function renderKOLProgram() {
  loadKOLState();
  const pendingCount = kolGetDecisions().filter(d => d.inbox_status === 'pending').length;
  const el = document.getElementById('section-kol-program');
  const views = [
    { key:'roster',    label:'📋 Roster' },
    { key:'funnel',    label:'🔀 Funnel' },
    { key:'keputusan', label:`⚡ Keputusan${pendingCount ? ` <span class="kol-inbox-dot">${pendingCount}</span>` : ''}` },
    { key:'laporan',   label:'📊 Laporan' },
    { key:'panduan',   label:'📖 Panduan' },
  ];
  el.innerHTML = `
    <div id="kol-tab-bar" class="section-tab-bar">
      ${views.map(v => `<button class="stab${state.kolView===v.key?' active':''}" data-tab="${v.key}" onclick="kolSwitchView('${v.key}')">${v.label}</button>`).join('')}
    </div>
    ${views.map(v => `<div id="kol-view-${v.key}" class="kol-view" style="display:${state.kolView===v.key?'block':'none'}"></div>`).join('')}
  `;
  kolRenderCurrentView();
}
function kolSwitchView(view) {
  state.kolView    = view;
  state.kolEditingId = null;
  saveKOLState();
  document.querySelectorAll('#kol-tab-bar .stab').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === view));
  document.querySelectorAll('.kol-view').forEach(v => v.style.display = 'none');
  const el = document.getElementById('kol-view-' + view);
  if (el) el.style.display = 'block';
  kolRenderCurrentView();
}
function kolRenderCurrentView() {
  if (state.kolView === 'roster')    kolRenderRoster();
  if (state.kolView === 'funnel')    kolRenderFunnel();
  if (state.kolView === 'keputusan') kolRenderKeputusan();
  if (state.kolView === 'laporan')   kolRenderLaporan();
  if (state.kolView === 'panduan')   kolRenderPanduan();
}

// ── Funnel view ───────────────────────────────────────────────
function kolRenderFunnel() {
  const el = document.getElementById('kol-view-funnel');
  if (!el) return;
  const all = kolMergedData();
  const byStatus = {};
  KOL_ALL_STATUSES.forEach(s => byStatus[s] = []);
  all.forEach(k => { (byStatus[k.status] || (byStatus['KANDIDAT'] = [])).push(k); });

  // Conversion rates along main funnel
  const convRates = [];
  for (let i = 1; i < KOL_FUNNEL_MAIN.length; i++) {
    const from = (byStatus[KOL_FUNNEL_MAIN[i-1]]||[]).length;
    const to   = (byStatus[KOL_FUNNEL_MAIN[i]]  ||[]).length;
    const total = from + to + (byStatus[KOL_FUNNEL_MAIN[i+1]]||[]).length +
                  KOL_FUNNEL_SIDE.reduce((s,k)=>(byStatus[k]||[]).length+s,0);
    const rate = from > 0 ? Math.round((to / (to + (byStatus[KOL_FUNNEL_MAIN[i-1]]||[]).length)) * 100) : null;
    convRates.push(rate);
  }

  function stageCard(stageKey, isMain) {
    const stage = KOL_STAGES.find(s => s.key === stageKey);
    const kols  = byStatus[stageKey] || [];
    const avatars = kols.slice(0,6).map(k =>
      `<div class="kol-funnel-avatar" style="background:${kolAvatarBg(k.tier)}" title="@${k.handle}">${(k.nama||k.handle||'?').slice(0,2).toUpperCase()}</div>`
    ).join('');
    return `
      <div class="kol-funnel-col${isMain?'':' kol-funnel-side'}" onclick="state.kolFilterStatus='${stageKey}';saveKOLState();kolSwitchView('roster')">
        <div class="kol-funnel-stage-header">
          <span class="kol-funnel-emoji">${stage.emoji}</span>
          <span class="kol-funnel-label">${stage.label}</span>
          <span class="kol-funnel-count" style="background:${stage.color}20;color:${stage.color}">${kols.length}</span>
        </div>
        <div class="kol-funnel-desc">${stage.desc}</div>
        <div class="kol-funnel-avatars">${avatars}${kols.length > 6 ? `<div class="kol-funnel-more">+${kols.length-6}</div>` : ''}</div>
        ${kols.length === 0 ? '<div class="kol-funnel-empty">Kosong</div>' : ''}
      </div>`;
  }

  // Build main funnel with conversion arrows
  let mainCols = '';
  KOL_FUNNEL_MAIN.forEach((key, i) => {
    mainCols += stageCard(key, true);
    if (i < KOL_FUNNEL_MAIN.length - 1) {
      const rate = convRates[i];
      mainCols += `<div class="kol-funnel-arrow">
        <div class="kol-funnel-arrow-line">→</div>
        ${rate !== null ? `<div class="kol-funnel-conv">${rate}%</div>` : ''}
      </div>`;
    }
  });

  // Summary stats
  const totalKOLs   = all.length;
  const activeDeals = (byStatus['DEAL']||[]).length + (byStatus['BARTER']||[]).length;
  const inProgress  = (byStatus['PENDING']||[]).length + (byStatus['NEGOSIASI']||[]).length;
  const cancelled   = (byStatus['CANCEL']||[]).length;
  const overallConv = totalKOLs > 0 ? Math.round(((byStatus['DEAL']||[]).length + (byStatus['SELESAI']||[]).length) / totalKOLs * 100) : 0;

  el.innerHTML = `
    <div class="stat-grid" style="margin-bottom:20px">
      <div class="stat-card accent"><div class="label">Total KOL</div><div class="value">${totalKOLs}</div><div class="sub">Semua stage</div></div>
      <div class="stat-card"><div class="label">Deal Aktif</div><div class="value" style="color:var(--green)">${activeDeals}</div><div class="sub">DEAL + BARTER</div></div>
      <div class="stat-card"><div class="label">Dalam Proses</div><div class="value" style="color:var(--blue)">${inProgress}</div><div class="sub">PENDING + NEGOSIASI</div></div>
      <div class="stat-card"><div class="label">Conversion Rate</div><div class="value">${overallConv}%</div><div class="sub">DEAL dari total KOL</div></div>
    </div>

    <div class="section-header mb-12">
      <div><div class="section-title">Funnel Utama</div><div class="section-sub">Klik stage untuk filter Roster</div></div>
    </div>
    <div class="kol-funnel-main mb-24">${mainCols}</div>

    <div class="section-header mb-12">
      <div><div class="section-title">Off-Ramp</div><div class="section-sub">Hold, Barter, Cancel</div></div>
    </div>
    <div class="kol-funnel-side-row mb-24">
      ${KOL_FUNNEL_SIDE.map(k => stageCard(k, false)).join('')}
    </div>
  `;
}

// ── Keputusan / Decision Inbox ────────────────────────────────
function kolRenderKeputusan() {
  const el = document.getElementById('kol-view-keputusan');
  if (!el) return;

  const decisions  = kolGetDecisions();
  const pending    = decisions.filter(d => d.inbox_status === 'pending');
  const done       = decisions.filter(d => d.inbox_status !== 'pending');
  const merged     = kolMergedData();

  const modeBtn = (key, label) =>
    `<button class="tab-pill${state.kolKeputusanMode===key?' active':''}"
      onclick="state.kolKeputusanMode='${key}';saveKOLState();kolRenderKeputusan()">${label}</button>`;

  // Quick decision form (Alex mode)
  const alexPanel = `
    <div class="kol-decision-form">
      <div class="section-header mb-12">
        <div><div class="section-title">Tambah Keputusan</div><div class="section-sub">Pilih KOL → pilih aksi → tulis catatan → Log</div></div>
      </div>
      <div class="kol-decision-inputs">
        <select id="kd-kol" class="kol-select" style="flex:1.5">
          <option value="">— Pilih KOL —</option>
          ${merged.map(k => `<option value="${k.id}" data-handle="${k.handle}">${k.handle}${k.nama?' ('+k.nama+')':''} · ${k.status||'?'}</option>`).join('')}
        </select>
        <select id="kd-action" class="kol-select" style="flex:1">
          <option value="">— Jenis Aksi —</option>
          ${KOL_ACTION_TYPES.map(a => `<option value="${a.key}">${a.label}</option>`).join('')}
        </select>
        <input id="kd-by" class="kol-search" placeholder="Dari (Alex / Hasna…)" style="max-width:140px" value="Alex">
      </div>
      <div style="display:flex;gap:8px;margin-top:8px">
        <textarea id="kd-note" class="kol-inp" placeholder="Detail keputusan atau instruksi untuk tim…" rows="2" style="flex:1;resize:vertical"></textarea>
        <button class="btn-primary" style="align-self:flex-end;white-space:nowrap" onclick="kolSubmitDecision()">⚡ Log Keputusan</button>
      </div>
    </div>`;

  // Pending action cards (Tim mode)
  const pendingCards = pending.length === 0
    ? `<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-title">Tidak ada aksi pending</div><div class="empty-sub">Semua keputusan sudah ditindaklanjuti.</div></div>`
    : pending.map(d => `
      <div class="kol-decision-card pending" id="kdc-${d.id}">
        <div class="kol-dc-top">
          <div class="kol-dc-meta">
            <span class="kol-dc-handle">@${d.handle}</span>
            <span class="kol-dc-action">${d.action_label}</span>
          </div>
          <span class="kol-dc-by">${d.by} · ${new Date(d.at).toLocaleDateString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>
        </div>
        ${d.detail ? `<div class="kol-dc-detail">${d.detail}</div>` : ''}
        <div class="kol-dc-actions">
          <input id="done-note-${d.id}" class="kol-search" placeholder="Catatan hasil (opsional)…" style="flex:1;font-size:12px">
          <button class="kol-action-btn" style="border-color:var(--green);color:var(--green)" onclick="kolMarkDecision('${d.id}','done',document.getElementById('done-note-${d.id}').value,'Tim')">✓ Selesai</button>
          <button class="kol-action-btn" style="border-color:var(--amber);color:var(--amber)" onclick="kolMarkDecision('${d.id}','blocked',document.getElementById('done-note-${d.id}').value,'Tim')">⚠ Ada Kendala</button>
        </div>
      </div>`).join('');

  // Activity log (all, newest first)
  const logRows = decisions.length === 0
    ? `<div style="color:var(--text-muted);font-size:13px;padding:12px 0">Belum ada aktivitas.</div>`
    : decisions.map(d => {
        const icon  = d.inbox_status==='done' ? '✅' : d.inbox_status==='blocked' ? '⚠️' : '⏳';
        const col   = d.inbox_status==='done' ? 'var(--green)' : d.inbox_status==='blocked' ? 'var(--amber)' : 'var(--text-muted)';
        const when  = new Date(d.at).toLocaleDateString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
        return `<div class="kol-log-row">
          <span class="kol-log-icon">${icon}</span>
          <div class="kol-log-body">
            <span class="kol-log-when">${when}</span>
            <span class="kol-log-by">${d.by}</span>
            <span class="kol-log-arrow">→</span>
            <strong class="kol-log-handle">@${d.handle}</strong>
            <span class="kol-log-action">${d.action_label}</span>
            ${d.detail ? `<span class="kol-log-detail">— ${d.detail}</span>` : ''}
            ${d.done_note ? `<span style="color:${col};font-size:11px;margin-left:4px">[${d.done_note}]</span>` : ''}
          </div>
          <span style="color:${col};font-size:11px;font-weight:700;white-space:nowrap">${d.inbox_status==='pending'?'Pending':d.inbox_status==='done'?'Done':'Blocked'}</span>
        </div>`;
      }).join('');

  el.innerHTML = `
    <div class="tab-row mb-18">
      ${modeBtn('tim', `📋 Aksi Tim ${pending.length ? '('+pending.length+')' : ''}`)}
      ${modeBtn('alex','⚡ Buat Keputusan')}
    </div>

    ${state.kolKeputusanMode === 'alex' ? alexPanel : ''}

    ${state.kolKeputusanMode === 'tim' ? `
      <div class="section-header mb-12">
        <div><div class="section-title">Aksi Pending untuk Tim</div><div class="section-sub">${pending.length} menunggu · ${done.length} selesai / blocked</div></div>
      </div>
      <div class="kol-decision-list mb-24">${pendingCards}</div>
    ` : ''}

    <div class="section-header mb-12">
      <div><div class="section-title">Log Aktivitas</div><div class="section-sub">${decisions.length} entri</div></div>
      ${decisions.length ? `<button class="btn-ghost" onclick="if(confirm('Hapus semua log?')){localStorage.removeItem('${KOL_DECISIONS_KEY}');kolRenderKeputusan();renderKOLProgram()}">Hapus Log</button>` : ''}
    </div>
    <div class="kol-log-list">${logRows}</div>
  `;
}

function kolSubmitDecision() {
  const kolId  = document.getElementById('kd-kol')?.value;
  const action = document.getElementById('kd-action')?.value;
  const note   = document.getElementById('kd-note')?.value?.trim();
  const by     = document.getElementById('kd-by')?.value?.trim() || 'Alex';
  if (!kolId || !action) { showToast('Pilih KOL dan jenis aksi dulu.', 'error'); return; }
  const kol = kolMergedData().find(k => k.id == kolId);
  if (!kol) return;
  kolAddDecision(kol.id, kol.handle, kol.nama, action, note, by);
  showToast(`⚡ Keputusan untuk @${kol.handle} dicatat`);
  renderKOLProgram();   // re-render to update badge count on tab
  kolSwitchView('keputusan');
}

// ── Badge helpers ─────────────────────────────────────────────
function kolAvatarBg(tier) {
  if (tier === 'Macro') return 'var(--purple)';
  if (tier === 'Micro') return 'var(--blue)';
  if (tier === 'Nano')  return 'var(--green)';
  return 'var(--text-muted)';
}
function kolPlatformBadge(platform) {
  if (platform === 'Instagram') return `<span class="badge badge-purple">IG</span>`;
  if (platform === 'TikTok')    return `<span class="badge badge-teal">TT</span>`;
  return `<span class="badge badge-blue">IG+TT</span>`;
}
function kolStatusBadge(status) {
  const cls = { DEAL:'badge-green', PENDING:'badge-amber', HOLD:'badge-blue',
                CANCEL:'badge-red', BARTER:'badge-purple' };
  return `<span class="badge ${cls[status]||'badge-gray'}">${status}</span>`;
}
function kolCPMBadge(zone) {
  if (zone === 'unknown' || !zone) return `<span style="color:var(--text-muted);font-size:12px">—</span>`;
  const cls = { green:'badge-green', blue:'badge-blue', amber:'badge-amber', red:'badge-red' };
  return `<span class="badge ${cls[zone]||'badge-gray'}">${kolCPMLabel(zone)}</span>`;
}
function kolTierClass(tier) {
  return 'kol-tier-' + (tier||'').toLowerCase().replace(/\s+/g,'-');
}

// ── Step 6: Roster view ───────────────────────────────────────
function kolRenderRoster() {
  const el = document.getElementById('kol-view-roster');
  if (!el) return;

  const all         = kolMergedData();
  const deals       = all.filter(k => k.status === 'DEAL');
  const cashDeals   = deals.filter(k => Number(k.rate_deal) > 0);
  const barterDeals = deals.filter(k => Number(k.rate_deal) === 0);
  const cashDeal    = cashDeals.reduce((s,k) => s + (Number(k.rate_deal)||0), 0);
  const pending     = all.filter(k => k.status === 'PENDING' || k.status === 'HOLD');
  const green       = all.filter(k => k.cpm_zone === 'green');
  const ceiling     = CONFIG.kolBudgetCeiling;
  const budPct      = Math.min(Math.round((cashDeal / ceiling) * 100), 100);
  const budColor    = budPct >= 100 ? 'var(--red)' : budPct >= 80 ? 'var(--amber)' : 'var(--green)';
  const filtered    = kolFilteredData();
  // Best CPM in the full roster (lowest non-zero = best value)
  const cpmKols     = all.filter(k => Number(k.cpm) > 0).sort((a,b) => Number(a.cpm)-Number(b.cpm));
  const bestCPMKol  = cpmKols[0] || null;
  // All-red warning: all filtered KOLs with known CPM are red
  const filteredWithCPM = filtered.filter(k => k.cpm_zone && k.cpm_zone !== 'unknown');
  const allRed = filteredWithCPM.length > 0 && filteredWithCPM.every(k => k.cpm_zone === 'red');

  // Buffer banner
  let bufBanner = '';
  try {
    const buf = JSON.parse(localStorage.getItem(KOL_BUFFER_KEY) || '[]');
    if (buf.length) bufBanner = `<div class="alert-banner amber">⚠️ <span>${buf.length} entri belum tersinkron. Buka Google Form untuk mengisi data.</span></div>`;
  } catch(e) {}

  const sheetHint = !state.usingSheet
    ? `<div class="sheet-hint"><strong>📋 Sample data.</strong> Hubungkan Google Sheet KOL_Database untuk data real. Hasna &amp; Rahmi input via Google Form.</div>`
    : '';

  // Filter selects
  const mkSelect = (id, opts, cur, ev) => `
    <select class="kol-select" onchange="${ev}">
      ${opts.map(([v,l]) => `<option value="${v}"${cur===v?' selected':''}>${l}</option>`).join('')}
    </select>`;
  const hasFilter = state.kolFilterPlatform!=='All'||state.kolFilterTier!=='All'||
                    state.kolFilterStatus!=='All'||state.kolFilterCPMZone!=='All'||state.kolFilterSearch;

  el.innerHTML = `
    ${sheetHint}${bufBanner}

    <div class="stat-grid" style="margin-bottom:20px">
      <div class="stat-card accent">
        <div class="label">KOL Aktif</div>
        <div class="value">${deals.length}</div>
        <div class="sub">${cashDeals.length} cash · ${barterDeals.length} barter</div>
      </div>
      <div class="stat-card">
        <div class="label">Cash Budget Bulan Ini</div>
        <div class="value">${fmtIDR(cashDeal)}</div>
        <div class="sub">ceiling ${fmtIDR(ceiling)}${barterDeals.length ? ` · +${barterDeals.length} barter` : ''}</div>
        <div class="prog-bar-track" style="margin-top:8px">
          <div class="prog-bar-fill" style="width:${budPct}%;background:${budColor}"></div>
        </div>
        <div class="prog-label" style="margin-top:4px"><span style="color:${budColor};font-weight:700">${budPct}%</span></div>
      </div>
      <div class="stat-card">
        <div class="label">Menunggu Keputusan</div>
        <div class="value" style="color:var(--amber)">${pending.length}</div>
        <div class="sub">PENDING + HOLD</div>
      </div>
      <div class="stat-card">
        <div class="label">CPM Terbaik Roster</div>
        ${bestCPMKol
          ? `<div class="value" style="color:var(--${bestCPMKol.cpm_zone==='green'?'green':bestCPMKol.cpm_zone==='blue'?'blue':bestCPMKol.cpm_zone==='amber'?'amber':'red'})">${fmtIDR(Number(bestCPMKol.cpm))}</div>
             <div class="sub">@${bestCPMKol.handle} · ${kolCPMLabel(bestCPMKol.cpm_zone)}</div>`
          : `<div class="value" style="color:var(--text-muted)">—</div><div class="sub">Belum ada data CPM</div>`}
      </div>
    </div>
    ${allRed ? `<div class="alert-banner amber" style="margin-bottom:16px">⚠️ <span>Seluruh roster aktif berada di zona <strong>Merah</strong> — pertimbangkan negosiasi rate atau cari KOL baru dengan avg views lebih tinggi.</span></div>` : ''}

    <div class="filter-bar" style="margin-bottom:16px">
      ${mkSelect('kol-fp',[['All','Semua Platform'],['Instagram','Instagram'],['TikTok','TikTok'],['Both','IG + TikTok']],
        state.kolFilterPlatform, "state.kolFilterPlatform=this.value;saveKOLState();kolRenderRoster()")}
      ${mkSelect('kol-ft',[['All','Semua Tier'],['Macro','Macro'],['Micro','Micro'],['Nano','Nano'],['Nano Supplementer','Nano Supp.']],
        state.kolFilterTier, "state.kolFilterTier=this.value;saveKOLState();kolRenderRoster()")}
      ${mkSelect('kol-fs',[['All','Semua Status'],['DEAL','DEAL'],['PENDING','PENDING'],['HOLD','HOLD'],['CANCEL','CANCEL'],['BARTER','BARTER']],
        state.kolFilterStatus, "state.kolFilterStatus=this.value;saveKOLState();kolRenderRoster()")}
      ${mkSelect('kol-fz',[['All','Semua Zone'],['green','Hijau'],['blue','Biru'],['amber','Kuning'],['red','Merah'],['unknown','Tidak Diketahui']],
        state.kolFilterCPMZone, "state.kolFilterCPMZone=this.value;saveKOLState();kolRenderRoster()")}
      <input class="kol-search" type="text" placeholder="🔍 Cari handle atau nama..."
        value="${state.kolFilterSearch.replace(/"/g,'&quot;')}"
        oninput="state.kolFilterSearch=this.value;saveKOLState();kolRenderRoster()">
      ${hasFilter ? `<button class="filter-btn" onclick="state.kolFilterPlatform='All';state.kolFilterTier='All';state.kolFilterStatus='All';state.kolFilterCPMZone='All';state.kolFilterSearch='';saveKOLState();kolRenderRoster()">✕ Reset</button>` : ''}
    </div>

    <div class="section-header mb-12">
      <div>
        <div class="section-title">Creator Roster</div>
        <div class="section-sub">${filtered.length} creator ditampilkan dari ${all.length} total</div>
      </div>
      <button class="btn-ghost" onclick="kolExportCSV()">⬇ Export CSV</button>
    </div>
    ${kolRosterTable(filtered)}
  `;
}

// ── Step 8: Roster table with inline expand + edit ────────────
function kolRosterTable(kols) {
  if (!kols.length) return `<div class="empty-state"><div class="empty-icon">🎯</div><div class="empty-title">Belum ada data KOL</div><div class="empty-sub">Hubungkan Google Sheet atau tambah lewat Google Form.</div></div>`;

  const rows = kols.map(k => {
    const initials = (k.nama || k.handle || '?').slice(0,2).toUpperCase();
    const isExp    = state.kolExpandedId === k.id;
    const safeId   = String(k.id).replace(/'/g,"\\'");
    const waBtn    = k.kontak_wa
      ? `<a href="https://wa.me/${k.kontak_wa.replace(/\D/g,'')}" target="_blank" class="wa-btn" style="font-size:11px;padding:3px 9px">💬 ${k.kontak_wa}</a>`
      : '—';
    const formBtn  = CONFIG.kolFormUrl
      ? `<a href="${CONFIG.kolFormUrl}" target="_blank" class="kol-action-btn">Form ↗</a>`
      : '';
    const isEditing = state.kolEditingId === k.id;
    const edits = kolGetEdits()[k.id] || {};
    // D-link buttons in detail
    const dlinks = [
      k.dlink_ig ? `<a href="${k.dlink_ig}" target="_blank" class="kol-dlink-btn">📷 IG</a>` : '',
      k.dlink_tt ? `<a href="${k.dlink_tt}" target="_blank" class="kol-dlink-btn">🎵 TikTok</a>` : '',
      k.dlink_ha ? `<a href="${k.dlink_ha}" target="_blank" class="kol-dlink-btn">📊 HypeAuditor</a>` : '',
    ].filter(Boolean).join('');

    // Edit panel row
    const editRow = isEditing ? `
      <tr class="kol-edit-row">
        <td colspan="9">
          <div class="kol-edit-inner">
            <div class="kol-edit-title">✏️ Edit @${k.handle}</div>
            <div class="kol-edit-grid">
              <div>
                <label class="kol-detail-label">Status Baru</label>
                <select id="ke-status-${k.id}" class="kol-select" style="width:100%">
                  ${KOL_ALL_STATUSES.map(s => `<option value="${s}"${(k.status===s)?'  selected':''}>${s}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="kol-detail-label">D-Link Instagram</label>
                <input id="ke-ig-${k.id}" class="kol-inp" placeholder="https://instagram.com/…" value="${k.dlink_ig||''}" style="width:100%">
              </div>
              <div>
                <label class="kol-detail-label">D-Link TikTok</label>
                <input id="ke-tt-${k.id}" class="kol-inp" placeholder="https://tiktok.com/…" value="${k.dlink_tt||''}" style="width:100%">
              </div>
              <div>
                <label class="kol-detail-label">D-Link HypeAuditor</label>
                <input id="ke-ha-${k.id}" class="kol-inp" placeholder="https://hypeauditor.com/…" value="${k.dlink_ha||''}" style="width:100%">
              </div>
              <div>
                <label class="kol-detail-label">Tags</label>
                <input id="ke-tags-${k.id}" class="kol-inp" placeholder="parenting, nano, jakarta…" value="${k.tags||''}" style="width:100%">
              </div>
              <div>
                <label class="kol-detail-label">Dicatat oleh</label>
                <input id="ke-by-${k.id}" class="kol-inp" placeholder="Alex / Hasna / Rahmi" value="Alex" style="width:100%">
              </div>
            </div>
            <div style="display:flex;gap:8px;margin-top:10px;align-items:flex-end">
              <div style="flex:0.6">
                <label class="kol-detail-label">Jenis Aksi untuk Log</label>
                <select id="ke-action-${k.id}" class="kol-select" style="width:100%">
                  <option value="">— Auto-detect —</option>
                  ${KOL_ACTION_TYPES.map(a => `<option value="${a.key}">${a.label}</option>`).join('')}
                </select>
              </div>
              <div style="flex:1">
                <label class="kol-detail-label">Catatan / Instruksi Tim</label>
                <textarea id="ke-note-${k.id}" class="kol-inp" rows="2" placeholder="Tulis instruksi untuk Hasna/Rahmi atau catatan keputusan…" style="width:100%;resize:vertical"></textarea>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px">
                <button class="btn-primary" style="white-space:nowrap" onclick="kolSaveEdit('${k.id}')">💾 Simpan & Log</button>
                <button class="kol-action-btn" onclick="kolToggleEdit('${k.id}')">Batal</button>
              </div>
            </div>
          </div>
        </td>
      </tr>` : '';
    const maxBlue   = kolMaxOffer(Number(k.avg_views));
    const rateForCPM = Number(k.rate_deal) || Number(k.rate_diminta) || 0;
    const overRatio  = maxBlue > 0 && rateForCPM > 0 ? (rateForCPM / maxBlue).toFixed(1) : null;
    const detailRow = isExp ? `
      <tr class="kol-detail-row">
        <td colspan="9">
          <div class="kol-detail-inner">
            <div class="kol-detail-grid">
              <div><span class="kol-detail-label">Scope</span><div class="kol-detail-val">${k.scope||'—'}</div></div>
              <div><span class="kol-detail-label">Brief Bulan</span><div class="kol-detail-val">${k.brief_bulan||'—'}</div></div>
              <div><span class="kol-detail-label">Produk</span><div class="kol-detail-val">${k.produk||'—'}</div></div>
              <div><span class="kol-detail-label">Sumber</span><div class="kol-detail-val">${k.sumber||'—'}</div></div>
              <div><span class="kol-detail-label">Kontak WA</span><div class="kol-detail-val">${waBtn}</div></div>
              <div><span class="kol-detail-label">AQS Score</span><div class="kol-detail-val">${k.aqs_score||'—'}</div></div>
              <div><span class="kol-detail-label">CPM Aktual</span><div class="kol-detail-val">${Number(k.cpm) ? fmtIDR(Number(k.cpm)) + ' / 1K' : '—'}</div></div>
              <div><span class="kol-detail-label">Maks Blue CPM</span><div class="kol-detail-val"><span style="color:var(--blue);font-weight:700">${maxBlue ? fmtIDR(maxBlue) : '—'}</span>${overRatio && overRatio > 1 ? `<span style="color:var(--red);font-size:10.5px;margin-left:6px;font-weight:700">${overRatio}× di atas batas</span>` : ''}</div></div>
              <div><span class="kol-detail-label">ER %</span><div class="kol-detail-val">${k.er_persen ? k.er_persen + '%' : '—'}</div></div>
            </div>
            ${k.keputusan ? `<div style="margin-top:10px"><span class="kol-detail-label">Keputusan</span><div class="kol-detail-note">${k.keputusan}</div></div>` : ''}
            ${k.catatan   ? `<div style="margin-top:6px"><span class="kol-detail-label">Catatan</span><div class="kol-detail-note">${k.catatan}</div></div>` : ''}
          </div>
        </td>
      </tr>` : '';

    return `
      <tr class="kol-row${isExp?' kol-row-expanded':''}${isEditing?' kol-row-editing':''}${k._hasEdits?' kol-row-edited':''}">
        <td>
          <div class="kol-avatar" style="background:${kolAvatarBg(k.tier)}">${initials}</div>
          ${k._hasEdits ? '<div class="kol-edited-dot" title="Diedit lokal">●</div>' : ''}
        </td>
        <td>
          <div class="kol-name">@${k.handle}</div>
          <div class="kol-subname">${k.nama||''}</div>
          ${k.niche ? `<div style="font-size:10.5px;color:var(--text-muted)">${k.niche}</div>` : ''}
          ${k.tags ? `<div style="margin-top:3px">${k.tags.split(',').map(t=>`<span class="kol-tag">${t.trim()}</span>`).join('')}</div>` : ''}
          ${dlinks ? `<div style="margin-top:4px;display:flex;gap:4px">${dlinks}</div>` : ''}
        </td>
        <td>${kolPlatformBadge(k.platform)}</td>
        <td><span class="kol-tier-badge ${kolTierClass(k.tier)}">${k.tier}</span></td>
        <td class="kol-num">${k.avg_views ? fmtNum(k.avg_views) : '—'}</td>
        <td>${kolCPMBadge(k.cpm_zone)}</td>
        <td class="kol-num">${Number(k.rate_deal) > 0 ? fmtIDR(k.rate_deal) :
          (k.status === 'DEAL' || k.status === 'BARTER'
            ? `<span class="badge badge-purple" style="font-size:10px">Barter</span>`
            : (k.rate_diminta ? `<span style="color:var(--text-muted)">${fmtIDR(k.rate_diminta)}</span>` : '—'))}</td>
        <td>${kolStatusBadge(k.status)}</td>
        <td>
          <div style="display:flex;gap:4px;flex-wrap:wrap">
            <button class="kol-action-btn${isExp?' active':''}" onclick="kolToggleDetail('${safeId}')">
              ${isExp?'▲':'▼'}
            </button>
            <button class="kol-action-btn${isEditing?' active':''}" style="${isEditing?'border-color:var(--primary);color:var(--primary)':''}" onclick="kolToggleEdit('${safeId}')">
              ✏️
            </button>
            ${formBtn}
          </div>
        </td>
      </tr>
      ${detailRow}${editRow}`;
  }).join('');

  return `<div class="table-wrap"><table class="data-table">
    <thead><tr>
      <th style="width:44px"></th>
      <th>Nama / Handle</th>
      <th>Platform</th>
      <th>Tier</th>
      <th>Avg Views</th>
      <th>CPM Zone</th>
      <th>Rate</th>
      <th>Status</th>
      <th>Aksi</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function kolToggleDetail(id) {
  state.kolExpandedId = state.kolExpandedId === id ? null : id;
  if (state.kolEditingId === id) state.kolEditingId = null;
  kolRenderRoster();
}
function kolToggleEdit(id) {
  state.kolEditingId  = state.kolEditingId === id ? null : id;
  state.kolExpandedId = null;
  kolRenderRoster();
}
function kolSaveEdit(kolId) {
  const handle   = document.getElementById(`ke-handle-${kolId}`)?.value?.trim() || '';
  const status   = document.getElementById(`ke-status-${kolId}`)?.value || '';
  const dlink_ig = document.getElementById(`ke-ig-${kolId}`)?.value?.trim() || '';
  const dlink_tt = document.getElementById(`ke-tt-${kolId}`)?.value?.trim() || '';
  const dlink_ha = document.getElementById(`ke-ha-${kolId}`)?.value?.trim() || '';
  const tags     = document.getElementById(`ke-tags-${kolId}`)?.value?.trim() || '';
  const action   = document.getElementById(`ke-action-${kolId}`)?.value || '';
  const note     = document.getElementById(`ke-note-${kolId}`)?.value?.trim() || '';
  const by       = document.getElementById(`ke-by-${kolId}`)?.value?.trim() || 'Alex';
  const kol      = kolMergedData().find(k => k.id == kolId);
  if (!kol) return;

  // Build changed fields
  const fields = {};
  if (status && status !== kol.status) fields.status = status;
  if (dlink_ig) fields.dlink_ig = dlink_ig;
  if (dlink_tt) fields.dlink_tt = dlink_tt;
  if (dlink_ha) fields.dlink_ha = dlink_ha;
  if (tags)     fields.tags     = tags;

  // Determine auto action label
  let autoAction = action;
  if (!autoAction && fields.status) autoAction = 'status_change';
  if (!autoAction && (fields.dlink_ig || fields.dlink_tt || fields.dlink_ha)) autoAction = 'link_updated';
  if (!autoAction && note) autoAction = 'note_added';

  if (Object.keys(fields).length > 0) kolApplyEdit(kolId, fields);

  // Auto-note for status change
  let fullNote = note;
  if (fields.status) fullNote = `Status: ${kol.status} → ${fields.status}${note ? ' · ' + note : ''}`;

  if (autoAction) kolAddDecision(kolId, kol.handle, kol.nama, autoAction, fullNote, by);

  showToast(`✅ @${kol.handle} disimpan & dicatat`);
  state.kolEditingId = null;
  kolRenderRoster();
}

// ── Step 10: Laporan view ─────────────────────────────────────
function kolRenderLaporan() {
  const el = document.getElementById('kol-view-laporan');
  if (!el) return;

  const now = new Date();
  const thisYM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const prevYM   = `${prevDate.getFullYear()}-${String(prevDate.getMonth()+1).padStart(2,'0')}`;
  const threeDate = new Date(now.getFullYear(), now.getMonth()-2, 1);
  const threeYM   = `${threeDate.getFullYear()}-${String(threeDate.getMonth()+1).padStart(2,'0')}`;

  function inRange(k) {
    const bm = kolParseBulan(k.brief_bulan);
    if (state.kolLaporanRange === 'bulan-ini')  return bm === thisYM;
    if (state.kolLaporanRange === 'bulan-lalu') return bm === prevYM;
    if (state.kolLaporanRange === '3-bulan')    return bm >= threeYM;
    return true;
  }

  const filtered  = state.kols.filter(inRange);
  const deals     = filtered.filter(k => k.status === 'DEAL');
  const totalCash = deals.reduce((s,k) => s + (Number(k.rate_deal)||0), 0);
  const cpmDeals  = deals.filter(k => Number(k.cpm) > 0);
  const avgCPM    = cpmDeals.length ? Math.round(cpmDeals.reduce((s,k)=>s+Number(k.cpm),0)/cpmDeals.length) : 0;
  const convRate  = filtered.length ? Math.round((deals.length / filtered.length) * 100) : 0;

  // Budget by month (all DEAL data, not range-filtered)
  const byMonth = {};
  state.kols.filter(k=>k.status==='DEAL'||k.status==='BARTER').forEach(k => {
    const bm  = kolParseBulan(k.brief_bulan) || 'unknown';
    const lbl = k.brief_bulan || bm;
    if (!byMonth[bm]) byMonth[bm] = { kols:0, cash:0, barter:0, label:lbl };
    byMonth[bm].kols++;
    if (k.status === 'BARTER') byMonth[bm].barter += Number(k.rate_deal)||0;
    else byMonth[bm].cash += Number(k.rate_deal)||0;
  });
  const monthRows = Object.entries(byMonth).sort((a,b)=>b[0].localeCompare(a[0])).map(([,d]) => {
    const total = d.cash + d.barter;
    const pct   = Math.min(Math.round((d.cash / CONFIG.kolBudgetCeiling) * 100), 100);
    const col   = pct >= 100 ? 'var(--red)' : pct >= 80 ? 'var(--amber)' : 'var(--green)';
    return `<tr>
      <td><strong>${d.label}</strong></td>
      <td>${d.kols}</td>
      <td>${fmtIDR(d.cash)}</td>
      <td>${d.barter ? fmtIDR(d.barter) : '—'}</td>
      <td>${fmtIDR(total)}</td>
      <td style="min-width:120px">
        <div style="display:flex;align-items:center;gap:8px">
          <div class="prog-bar-track" style="flex:1"><div class="prog-bar-fill" style="width:${pct}%;background:${col}"></div></div>
          <span style="font-size:11px;font-weight:700;color:${col};white-space:nowrap">${pct}%</span>
        </div>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" style="text-align:center;padding:16px;color:var(--text-muted)">Belum ada data</td></tr>`;

  // CPM distribution (DEAL, asc CPM — barter/zero CPM sorted to bottom)
  const cpmRows = [...deals].sort((a,b) => {
    const ca = Number(a.cpm)||0, cb = Number(b.cpm)||0;
    if (ca === 0 && cb === 0) return 0;
    if (ca === 0) return 1;
    if (cb === 0) return -1;
    return ca - cb;
  }).map(k => {
    const maxB = kolMaxOffer(Number(k.avg_views));
    const rate = Number(k.rate_deal) || 0;
    const over = maxB > 0 && rate > 0 ? (rate / maxB).toFixed(1) : null;
    const flag = rate > maxB * 2;
    return `<tr>
      <td><strong>@${k.handle}</strong>${flag?' <span style="color:var(--amber)" title="Rate > 2× Blue ceiling">✦</span>':''}</td>
      <td><span class="kol-tier-badge ${kolTierClass(k.tier)}">${k.tier}</span></td>
      <td>${k.avg_views ? fmtNum(k.avg_views) : '—'}</td>
      <td>${rate > 0 ? fmtIDR(rate) : '<span class="badge badge-purple" style="font-size:10px">Barter</span>'}</td>
      <td><strong>${k.cpm ? fmtIDR(k.cpm) : '—'}</strong></td>
      <td>${kolCPMBadge(k.cpm_zone)}</td>
      <td style="color:var(--blue);font-size:12px;font-weight:600">${maxB ? fmtIDR(maxB) : '—'}</td>
      <td style="font-size:11.5px;${over && over > 1 ? 'color:var(--red);font-weight:700' : 'color:var(--text-muted)'}">${over ? over+'×' : '—'}</td>
      <td style="color:var(--text-muted);font-size:12px">${k.brief_bulan||'—'}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="9" style="text-align:center;padding:16px;color:var(--text-muted)">Belum ada data DEAL</td></tr>`;

  // Cancel analysis
  const cancelRows = filtered.filter(k=>k.status==='CANCEL').map(k => `<tr>
    <td><strong>@${k.handle}</strong></td>
    <td><span class="kol-tier-badge ${kolTierClass(k.tier)}">${k.tier}</span></td>
    <td>${fmtIDR(k.rate_diminta)}</td>
    <td>${kolCPMBadge(k.cpm_zone)}</td>
    <td style="font-size:12px">${k.keputusan||'—'}</td>
  </tr>`).join('') || `<tr><td colspan="5" style="text-align:center;padding:16px;color:var(--text-muted)">Tidak ada CANCEL di periode ini</td></tr>`;

  // Sourcing
  const bySumber = {};
  filtered.forEach(k => {
    const s = k.sumber || 'Unknown';
    if (!bySumber[s]) bySumber[s] = { total:0, deal:0, cancel:0 };
    bySumber[s].total++;
    if (k.status==='DEAL')   bySumber[s].deal++;
    if (k.status==='CANCEL') bySumber[s].cancel++;
  });
  const sumberRows = Object.entries(bySumber).sort((a,b)=>b[1].total-a[1].total).map(([s,d]) => {
    const conv = d.total ? Math.round((d.deal/d.total)*100) : 0;
    return `<tr>
      <td><strong>${s}</strong></td>
      <td>${d.total}</td>
      <td><span style="color:var(--green);font-weight:700">${d.deal}</span></td>
      <td><span style="color:var(--red);font-weight:700">${d.cancel}</span></td>
      <td>${conv}%</td>
    </tr>`;
  }).join('') || `<tr><td colspan="5" style="text-align:center;padding:16px;color:var(--text-muted)">Belum ada data</td></tr>`;

  const ranges = [['bulan-ini','Bulan Ini'],['bulan-lalu','Bulan Lalu'],['3-bulan','3 Bulan'],['all','Semua']];

  el.innerHTML = `
    <div class="tab-row mb-18">
      ${ranges.map(([k,l]) => `<button class="tab-pill${state.kolLaporanRange===k?' active':''}"
        onclick="state.kolLaporanRange='${k}';saveKOLState();kolRenderLaporan()">${l}</button>`).join('')}
    </div>

    <div class="stat-grid" style="margin-bottom:20px">
      <div class="stat-card">
        <div class="label">Total Dikontak</div>
        <div class="value">${filtered.length}</div>
        <div class="sub">Semua status</div>
      </div>
      <div class="stat-card accent">
        <div class="label">Conversion Rate</div>
        <div class="value">${convRate}%</div>
        <div class="sub">${deals.length} DEAL dari ${filtered.length}</div>
      </div>
      <div class="stat-card">
        <div class="label">Total Cash Dikeluarkan</div>
        <div class="value">${fmtIDR(totalCash)}</div>
        <div class="sub">Hanya status DEAL</div>
      </div>
      <div class="stat-card">
        <div class="label">Avg CPM</div>
        <div class="value" style="color:var(--${avgCPM?kolCPMZone(avgCPM)==='green'?'green':kolCPMZone(avgCPM)==='blue'?'blue':kolCPMZone(avgCPM)==='amber'?'amber':'red':'text-muted'})">${avgCPM ? fmtIDR(avgCPM) : '—'}</div>
        <div class="sub">/ 1.000 views · ${avgCPM ? kolCPMLabel(kolCPMZone(avgCPM)) + ' zone' : 'belum ada data'}</div>
      </div>
    </div>

    <div class="section-header mb-12">
      <div><div class="section-title">Budget per Bulan</div><div class="section-sub">Semua bulan — status DEAL</div></div>
    </div>
    <div class="table-wrap mb-24"><table class="data-table">
      <thead><tr><th>Bulan</th><th>KOL Aktif</th><th>Cash (Rp)</th><th>Barter (Rp)</th><th>Total</th><th>vs Ceiling (${fmtIDR(CONFIG.kolBudgetCeiling)})</th></tr></thead>
      <tbody>${monthRows}</tbody>
    </table></div>

    <div class="section-header mb-12">
      <div><div class="section-title">Distribusi CPM — Creator DEAL</div><div class="section-sub">Diurutkan CPM terbaik (terkecil dulu)</div></div>
    </div>
    <div class="table-wrap" style="margin-bottom:8px"><table class="data-table">
      <thead><tr><th>@Handle</th><th>Tier</th><th>Avg Views</th><th>Rate Deal</th><th>CPM Aktual</th><th>Zone</th><th>Maks Blue</th><th>Rasio</th><th>Bulan</th></tr></thead>
      <tbody>${cpmRows}</tbody>
    </table></div>
    <div style="font-size:11.5px;color:var(--text-muted);margin-bottom:24px">✦ Rate &gt; 2× Blue ceiling. <strong>Maks Blue</strong> = Avg Views ÷ 1.000 × Rp 10.000 — budget ideal untuk zone Biru. <strong>Rasio</strong> = berapa kali lipat di atas batas tersebut.</div>

    <div class="section-header mb-12">
      <div><div class="section-title">Analisis CANCEL</div><div class="section-sub">Untuk review Alexander — apakah keputusan cancel sudah tepat?</div></div>
    </div>
    <div class="table-wrap mb-24"><table class="data-table">
      <thead><tr><th>@Handle</th><th>Tier</th><th>Rate Diminta</th><th>CPM</th><th>Alasan</th></tr></thead>
      <tbody>${cancelRows}</tbody>
    </table></div>

    <div class="section-header mb-12">
      <div><div class="section-title">Saluran Sourcing</div><div class="section-sub">Efektivitas per sumber temuan KOL</div></div>
      <button class="btn-ghost" onclick="kolExportCSV()">⬇ Export CSV</button>
    </div>
    <div class="table-wrap mb-24"><table class="data-table">
      <thead><tr><th>Sumber</th><th>Total</th><th>DEAL</th><th>CANCEL</th><th>Conversion %</th></tr></thead>
      <tbody>${sumberRows}</tbody>
    </table></div>
  `;
}

// ── Step 11: Panduan view ─────────────────────────────────────
function kolRenderPanduan() {
  const el = document.getElementById('kol-view-panduan');
  if (!el) return;

  const formBtn = CONFIG.kolFormUrl
    ? `<a href="${CONFIG.kolFormUrl}" target="_blank" class="kol-link-btn kol-link-primary">📝 Form Input KOL</a>`
    : `<span class="kol-link-btn" style="opacity:.4;cursor:default">📝 Form belum diset di config.js</span>`;

  el.innerHTML = `
    <div class="section-header mb-12"><div><div class="section-title">Link Riset &amp; Tools</div></div></div>
    <div class="kol-links-grid mb-24">
      <a href="https://hypeauditor.com/top-instagram-family-indonesia/" target="_blank" class="kol-link-btn">🏆 Top Family IG Indonesia</a>
      <a href="https://hypeauditor.com/top-instagram/kids-fashion/indonesia/" target="_blank" class="kol-link-btn">👗 Top Kids Fashion Indonesia</a>
      <a href="https://hypeauditor.com/free-tools/instagram-audit/" target="_blank" class="kol-link-btn">🔍 HypeAuditor Audit</a>
      <a href="https://timetotok.com/tiktok-data-analytics" target="_blank" class="kol-link-btn">📊 TimeToTok Analytics</a>
      <a href="https://www.facebook.com/ads/library/?country=ID" target="_blank" class="kol-link-btn">📢 Meta Ad Library</a>
      <a href="https://www.kolsquare.com/en/products/chrome-extension" target="_blank" class="kol-link-btn">🧩 Kolsquare Extension</a>
      ${formBtn}
    </div>

    <div class="section-header mb-12"><div><div class="section-title">Referensi CPM Zone</div></div></div>
    <div class="table-wrap mb-18"><table class="data-table">
      <thead><tr><th>Zone</th><th>CPM per 1K Views</th><th>Keputusan</th></tr></thead>
      <tbody>
        <tr><td><span class="badge badge-green">🟢 Hijau</span></td><td>&lt; Rp 5.000</td><td>Lanjutkan segera</td></tr>
        <tr><td><span class="badge badge-blue">🔵 Biru</span></td><td>Rp 5.000 – 10.000</td><td>Nilai bagus</td></tr>
        <tr><td><span class="badge badge-amber">🟡 Kuning</span></td><td>Rp 10.000 – 15.000</td><td>Monitor ROI dengan ketat</td></tr>
        <tr><td><span class="badge badge-red">🔴 Merah</span></td><td>&gt; Rp 15.000</td><td>Skip — gunakan Meta Ads</td></tr>
      </tbody>
    </table></div>

    <div class="kol-formula-box mb-24">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;color:var(--primary);margin-bottom:8px">Formula Budget Maksimal (Blue CPM)</div>
      <div style="font-size:17px;font-weight:800;margin-bottom:6px">Budget Maks = Avg Views ÷ 1.000 × Rp 10.000</div>
      <div style="font-size:13px;color:var(--text-muted)">Contoh: 42.600 views &rarr; maks <strong>Rp 426.000</strong> per post</div>
    </div>

    <div class="section-header mb-12"><div><div class="section-title">Alur Sourcing KOL</div><div class="section-sub">Klik setiap langkah untuk detail</div></div></div>
    <div class="kol-accordion mb-24">
      <details>
        <summary><span class="kol-step-num">1</span>Buka HypeAuditor ranking list Indonesia</summary>
        <div class="kol-step-body">Buka link "Top Family IG Indonesia" atau "Top Kids Fashion Indonesia" di atas. Filter audience berdasarkan Indonesia. Catat @handle, followers, dan Engagement Rate yang terlihat.</div>
      </details>
      <details>
        <summary><span class="kol-step-num">2</span>Cek HypeAuditor Audit Tool — catat ER + Avg Views</summary>
        <div class="kol-step-body">Masukkan @handle ke HypeAuditor Audit. Catat: ER%, Avg Views per post, AQS Score, % audience Indonesia. Kalau AQS &lt; 45 atau Indonesia &lt; 60% → skip.</div>
      </details>
      <details>
        <summary><span class="kol-step-num">3</span>Hitung CPM — lihat zone sebelum kontak</summary>
        <div class="kol-step-body">Rumus: CPM = Rate ÷ Avg Views × 1.000. Estimasi rate berdasarkan tier. Kalau sudah Merah sebelum nego → skip. Target zone Hijau atau Biru.</div>
      </details>
      <details>
        <summary><span class="kol-step-num">4</span>Buka profil IG/TikTok — cek komentar 2–3 post terakhir</summary>
        <div class="kol-step-body">Lihat apakah komentar genuine atau bot-like ("nice", emoji saja). Cek apakah audiensnya sesuai — ibu muda, konten parenting. Kalau komentar terasa fake → skip.</div>
      </details>
      <details>
        <summary><span class="kol-step-num">5</span>Kalau lulus → input ke Google Form dengan status PENDING</summary>
        <div class="kol-step-body">Klik "Form Input KOL" di atas. Isi semua data yang diketahui. Pilih status PENDING. Data otomatis masuk ke Google Sheet dan muncul di Roster dalam beberapa menit setelah refresh.</div>
      </details>
      <details>
        <summary><span class="kol-step-num">6</span>Setelah deal disepakati → update status ke DEAL</summary>
        <div class="kol-step-body">Submit form baru dengan @handle yang sama, status DEAL, rate final, scope konten, dan bulan campaign. Tim Alexander akan review CPM. Deal selesai!</div>
      </details>
    </div>
  `;
}

// ── Step 12: Export CSV ───────────────────────────────────────
function kolExportCSV() {
  const headers = ['handle','nama','platform','tier','followers',
    'avg_views','er_persen','rate_diminta','cpm','cpm_zone','status',
    'brief_bulan','tgl_tambah'];
  const rows = state.kols.map(k =>
    headers.map(h => {
      const v = String(k[h] ?? '');
      return v.includes(',') ? `"${v}"` : v;
    }).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'HP_KOL_' + new Date().toISOString().slice(0,10) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('⬇ CSV didownload!');
}

// LOCKED PREVIEW PAGES
// ============================================================

function renderLockedPage(sectionId, { phase, title, description, previewHtml, sheetTemplate }) {
  const el = document.getElementById('section-' + sectionId);
  if (!el) return;
  el.innerHTML = `
    <div class="locked-page">
      <div class="locked-preview" aria-hidden="true">
        ${previewHtml}
      </div>
      <div class="locked-overlay">
        <div class="lock-card">
          <div class="lock-icon">🔒</div>
          <div class="lock-phase-badge">Phase ${phase}</div>
          <div class="lock-title">${title}</div>
          <div class="lock-desc">${description}</div>
          <div class="lock-actions">
            <a href="https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}" target="_blank" class="lock-btn-primary">
              📋 View Sheet Template
            </a>
            <a href="ROADMAP.md" target="_blank" class="lock-btn-ghost">View Roadmap →</a>
          </div>
          <div class="lock-checklist">
            ${sheetTemplate.map(item => `<div class="lock-check-item">☐ ${item}</div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ===== INVENTORY =====
function renderInventoryLocked() {
  renderLockedPage('inventory', {
    phase: 2,
    title: 'Inventory & Stock',
    description: 'Live stock levels per SKU, low-stock alerts, and reorder triggers. Pulls from your Inventory Google Sheet tab.',
    sheetTemplate: [
      'Create "Inventory" tab in Google Sheet',
      'Add columns: SKU, Variant, Current Stock, Reorder Level, Last Restock',
      'Publish tab as CSV and add GID to config.js',
    ],
    previewHtml: `
      <div class="lp-stats-row">
        <div class="lp-stat green"><div class="lp-num">142</div><div class="lp-lbl">SKUs In Stock</div></div>
        <div class="lp-stat amber"><div class="lp-num">17</div><div class="lp-lbl">Low Stock</div></div>
        <div class="lp-stat red"><div class="lp-num">4</div><div class="lp-lbl">Out of Stock</div></div>
        <div class="lp-stat blue"><div class="lp-num">Rp 142jt</div><div class="lp-lbl">Stock Value</div></div>
      </div>
      <table class="lp-table">
        <thead><tr><th>SKU</th><th>Variant</th><th>Stock</th><th>Reorder At</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>HP-TEE-001</td><td>Daisy Print / 2T</td><td>87</td><td>20</td><td><span class="lp-badge green">OK</span></td></tr>
          <tr><td>HP-SET-004</td><td>Stripe Set / 3T</td><td>12</td><td>15</td><td><span class="lp-badge amber">Low</span></td></tr>
          <tr><td>HP-ROM-002</td><td>Floral Romper / NB</td><td>0</td><td>10</td><td><span class="lp-badge red">Out</span></td></tr>
          <tr><td>HP-JKT-007</td><td>Denim Jacket / 4T</td><td>34</td><td>10</td><td><span class="lp-badge green">OK</span></td></tr>
          <tr><td>HP-SET-012</td><td>Pyjama Set / 5T</td><td>8</td><td>12</td><td><span class="lp-badge amber">Low</span></td></tr>
        </tbody>
      </table>
    `,
  });
}

// ===== LIVE SESSIONS =====
function renderSessionsLocked() {
  renderLockedPage('sessions', {
    phase: 2,
    title: 'Live Sessions Tracker',
    description: 'Track every Shopee & TikTok live session — GMV, viewers, orders, and host performance week over week.',
    sheetTemplate: [
      'Create "LiveSessions" tab in Google Sheet',
      'Add columns: Date, Platform, Host, GMV, Viewers, Orders, Duration',
      'Log each session within 1 hour of closing',
    ],
    previewHtml: `
      <div class="lp-stats-row">
        <div class="lp-stat shopee"><div class="lp-num">Rp 18.4jt</div><div class="lp-lbl">Shopee GMV This Week</div></div>
        <div class="lp-stat tiktok"><div class="lp-num">Rp 7.2jt</div><div class="lp-lbl">TikTok GMV This Week</div></div>
        <div class="lp-stat blue"><div class="lp-num">6</div><div class="lp-lbl">Sessions This Week</div></div>
        <div class="lp-stat green"><div class="lp-num">1,840</div><div class="lp-lbl">Total Viewers</div></div>
      </div>
      <table class="lp-table">
        <thead><tr><th>Date</th><th>Platform</th><th>Host</th><th>GMV</th><th>Viewers</th><th>Orders</th></tr></thead>
        <tbody>
          <tr><td>22 May</td><td><span class="lp-badge shopee">Shopee</span></td><td>Fhatia</td><td>Rp 6.2jt</td><td>412</td><td>38</td></tr>
          <tr><td>21 May</td><td><span class="lp-badge tiktok">TikTok</span></td><td>Reza</td><td>Rp 3.8jt</td><td>287</td><td>22</td></tr>
          <tr><td>20 May</td><td><span class="lp-badge shopee">Shopee</span></td><td>Fhatia</td><td>Rp 5.1jt</td><td>380</td><td>31</td></tr>
          <tr><td>19 May</td><td><span class="lp-badge tiktok">TikTok</span></td><td>Reza</td><td>Rp 3.4jt</td><td>214</td><td>18</td></tr>
          <tr><td>18 May</td><td><span class="lp-badge shopee">Shopee</span></td><td>Fhatia</td><td>Rp 7.1jt</td><td>761</td><td>44</td></tr>
        </tbody>
      </table>
    `,
  });
}

// ===== ORDER OPS =====
function renderOrdersLocked() {
  renderLockedPage('orders', {
    phase: 2,
    title: 'Order Operations',
    description: 'Daily order fulfilment status, SLA breach alerts, and processing rate tracking across all channels.',
    sheetTemplate: [
      'Create "Orders" tab in Google Sheet',
      'Add columns: Date, Order ID, Channel, SKU, Qty, Status, SLA Breach',
      'Export daily from Shopee Seller Centre and paste in',
    ],
    previewHtml: `
      <div class="lp-stats-row">
        <div class="lp-stat green"><div class="lp-num">94%</div><div class="lp-lbl">Fulfilment Rate</div></div>
        <div class="lp-stat blue"><div class="lp-num">184</div><div class="lp-lbl">Orders Today</div></div>
        <div class="lp-stat red"><div class="lp-num">11</div><div class="lp-lbl">SLA Breaches</div></div>
        <div class="lp-stat amber"><div class="lp-num">26</div><div class="lp-lbl">Pending > 2 Days</div></div>
      </div>
      <table class="lp-table">
        <thead><tr><th>Order ID</th><th>Channel</th><th>Items</th><th>Status</th><th>SLA</th></tr></thead>
        <tbody>
          <tr><td>#SHP-98142</td><td><span class="lp-badge shopee">Shopee</span></td><td>2</td><td>Packed</td><td><span class="lp-badge green">OK</span></td></tr>
          <tr><td>#SHP-98139</td><td><span class="lp-badge shopee">Shopee</span></td><td>1</td><td>Pending</td><td><span class="lp-badge red">Breached</span></td></tr>
          <tr><td>#TKP-44201</td><td><span class="lp-badge tokped">Tokped</span></td><td>3</td><td>Shipped</td><td><span class="lp-badge green">OK</span></td></tr>
          <tr><td>#SHP-98134</td><td><span class="lp-badge shopee">Shopee</span></td><td>1</td><td>Pending</td><td><span class="lp-badge amber">Due Soon</span></td></tr>
          <tr><td>#TKP-44198</td><td><span class="lp-badge tokped">Tokped</span></td><td>2</td><td>Packed</td><td><span class="lp-badge green">OK</span></td></tr>
        </tbody>
      </table>
    `,
  });
}

// ===== CUSTOMER ANALYTICS =====
function renderCustomersLocked() {
  renderLockedPage('customers', {
    phase: 3,
    title: 'Customer Analytics',
    description: 'New vs repeat buyer rates, average order value trends, and top-performing SKUs by customer segment.',
    sheetTemplate: [
      'Create "Customers" tab in Google Sheet',
      'Add columns: Month, New Buyers, Repeat Buyers, AOV, Top SKU',
      'Export from Shopee Seller Centre monthly report',
    ],
    previewHtml: `
      <div class="lp-stats-row">
        <div class="lp-stat blue"><div class="lp-num">68%</div><div class="lp-lbl">New Buyers</div></div>
        <div class="lp-stat green"><div class="lp-num">32%</div><div class="lp-lbl">Repeat Buyers</div></div>
        <div class="lp-stat amber"><div class="lp-num">Rp 187k</div><div class="lp-lbl">Avg Order Value</div></div>
        <div class="lp-stat purple"><div class="lp-num">4.1%</div><div class="lp-lbl">Return Rate</div></div>
      </div>
      <table class="lp-table">
        <thead><tr><th>Month</th><th>New</th><th>Repeat</th><th>AOV</th><th>Top SKU</th></tr></thead>
        <tbody>
          <tr><td>May 2026</td><td>1,240</td><td>584</td><td>Rp 192k</td><td>HP-SET-004</td></tr>
          <tr><td>Apr 2026</td><td>1,108</td><td>512</td><td>Rp 184k</td><td>HP-TEE-001</td></tr>
          <tr><td>Mar 2026</td><td>1,420</td><td>498</td><td>Rp 179k</td><td>HP-ROM-002</td></tr>
          <tr><td>Feb 2026</td><td>980</td><td>432</td><td>Rp 175k</td><td>HP-SET-004</td></tr>
          <tr><td>Jan 2026</td><td>1,650</td><td>620</td><td>Rp 188k</td><td>HP-JKT-007</td></tr>
        </tbody>
      </table>
    `,
  });
}

// ===== CAMPAIGN CALENDAR =====
function renderCampaignsLocked() {
  renderLockedPage('campaigns', {
    phase: 3,
    title: 'Campaign Calendar',
    description: 'Paid media, Shopee flash sales, and promotion schedule — budget, status, and post-campaign results in one view.',
    sheetTemplate: [
      'Create "Campaigns" tab in Google Sheet',
      'Add columns: Campaign, Platform, Start, End, Budget, Status, Target KPI, Result',
      'Update weekly — log results within 3 days of campaign end',
    ],
    previewHtml: `
      <div class="lp-stats-row">
        <div class="lp-stat green"><div class="lp-num">3</div><div class="lp-lbl">Active Now</div></div>
        <div class="lp-stat blue"><div class="lp-num">5</div><div class="lp-lbl">Upcoming</div></div>
        <div class="lp-stat amber"><div class="lp-num">Rp 28jt</div><div class="lp-lbl">Budget This Month</div></div>
        <div class="lp-stat purple"><div class="lp-num">4.2×</div><div class="lp-lbl">Avg ROAS</div></div>
      </div>
      <table class="lp-table">
        <thead><tr><th>Campaign</th><th>Platform</th><th>Dates</th><th>Budget</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>Mid-Year Sale</td><td><span class="lp-badge shopee">Shopee</span></td><td>20–30 Jun</td><td>Rp 8jt</td><td><span class="lp-badge blue">Upcoming</span></td></tr>
          <tr><td>Flash Sale Weekend</td><td><span class="lp-badge shopee">Shopee</span></td><td>24–25 May</td><td>Rp 3jt</td><td><span class="lp-badge green">Active</span></td></tr>
          <tr><td>Meta CPAS May</td><td><span class="lp-badge meta">Meta</span></td><td>1–31 May</td><td>Rp 12jt</td><td><span class="lp-badge green">Active</span></td></tr>
          <tr><td>TikTok Brand Takeover</td><td><span class="lp-badge tiktok">TikTok</span></td><td>1–7 Jun</td><td>Rp 5jt</td><td><span class="lp-badge blue">Upcoming</span></td></tr>
          <tr><td>Harbolnas Prep</td><td>All</td><td>Nov 2026</td><td>Rp 30jt</td><td><span class="lp-badge gray">Planning</span></td></tr>
        </tbody>
      </table>
    `,
  });
}

// ===== EXECUTIVE VIEW =====
function renderExecutive() {
  const el = document.getElementById('section-executive');
  if (!el) return;

  // Use latest available month when current calendar month has no data
  const allMonths = [...new Set(state.targets.map(t => t.month))].sort().reverse();
  const nowYM     = (() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`; })();
  const latestYM  = allMonths[0] || nowYM;
  const useYM     = state.targets.some(t => t.month === nowYM) ? nowYM : latestYM;
  const prevYM    = (() => {
    const [y,m] = useYM.split('-').map(Number);
    const pd = new Date(y, m-2, 1);
    return `${pd.getFullYear()}-${String(pd.getMonth()+1).padStart(2,'0')}`;
  })();

  const tgt  = state.targets.filter(t => t.month === useYM);
  const ptgt = state.targets.filter(t => t.month === prevYM);
  const ch   = state.channels.filter(c => c.month === useYM);

  // Aggregate KPIs
  const totalRev   = tgt.reduce((s,t) => s + (t.revenue_actual||0), 0);
  const totalTgt   = tgt.reduce((s,t) => s + (t.revenue_target||0), 0);
  const totalPrev  = ptgt.reduce((s,t) => s + (t.revenue_actual||0), 0);
  const totalOrd   = tgt.reduce((s,t) => s + (t.orders_actual||0), 0);
  const totalOTgt  = tgt.reduce((s,t) => s + (t.orders_target||0), 0);
  const totalOPrev = ptgt.reduce((s,t) => s + (t.orders_actual||0), 0);
  const totalSpend = ch.reduce((s,c) => s + (c.spend||0), 0);
  const paidRev    = ch.filter(c => c.spend > 0).reduce((s,c) => s + (c.revenue||0), 0);
  const blendedROAS = totalSpend ? (paidRev / totalSpend).toFixed(1) : null;

  const revAch  = totalTgt  ? Math.round(totalRev / totalTgt * 100)  : 0;
  const ordAch  = totalOTgt ? Math.round(totalOrd / totalOTgt * 100) : 0;
  const revMoM  = totalPrev ? Math.round((totalRev - totalPrev) / totalPrev * 100) : null;
  const ordMoM  = totalOPrev ? Math.round((totalOrd - totalOPrev) / totalOPrev * 100) : null;

  // KOL snapshot
  const dealKOLs   = state.kols.filter(k => k.status === 'DEAL');
  const kolCash    = dealKOLs.reduce((s,k) => s + (Number(k.rate_deal)||0), 0);
  const kolPct     = Math.round(kolCash / CONFIG.kolBudgetCeiling * 100);
  const bestKOL    = [...state.kols].filter(k=>Number(k.cpm)>0).sort((a,b)=>Number(a.cpm)-Number(b.cpm))[0];

  // Leads snapshot
  const hotLeads   = state.leads.filter(l => ['Proposal Sent','Negotiating'].includes(l.stage));
  const wonLeads   = state.leads.filter(l => l.stage === 'Won').length;
  const totalLeads = state.leads.length;

  // Distributor snapshot
  const activeDist = state.distributors.filter(d => d.status === 'Active');
  const churnRisk  = activeDist.filter(d => {
    const da = daysAgo(d.last_order_date);
    return da !== null && da > (Number(d.expected_reorder_days) * 1.5);
  });
  const tier1 = activeDist.filter(d => d.tier === '1').length;
  const tier2 = activeDist.filter(d => d.tier === '2').length;
  const tier3 = activeDist.filter(d => d.tier === '3').length;

  // Helpers
  const tl = pct => pct >= 90 ? '🟢' : pct >= 70 ? '🟡' : '🔴';
  const tlCol = pct => pct >= 90 ? 'var(--green)' : pct >= 70 ? 'var(--amber)' : 'var(--red)';
  const momChip = (pct) => {
    if (pct === null) return '';
    const col = pct > 0 ? 'var(--green)' : pct < 0 ? 'var(--red)' : 'var(--text-muted)';
    const sign = pct > 0 ? '+' : '';
    return `<span class="exec-mom-chip" style="background:${col}15;color:${col};border-color:${col}40">${sign}${pct}% MoM</span>`;
  };

  // Per-channel rows
  const channelRows = tgt.map(t => {
    const pct  = t.revenue_target ? Math.round(t.revenue_actual / t.revenue_target * 100) : 0;
    const oPct = t.orders_target  ? Math.round(t.orders_actual  / t.orders_target  * 100) : null;
    const ptRow = ptgt.find(p => p.channel === t.channel);
    const mom  = ptRow && ptRow.revenue_actual ? Math.round((t.revenue_actual - ptRow.revenue_actual) / ptRow.revenue_actual * 100) : null;
    return `<tr>
      <td><strong>${t.channel}</strong></td>
      <td>${tl(pct)}</td>
      <td class="exec-rev">${fmtIDR(t.revenue_actual)}</td>
      <td style="color:var(--text-muted);font-size:12px">${fmtIDR(t.revenue_target)}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <div class="prog-bar-track" style="flex:1;min-width:60px"><div class="prog-bar-fill" style="width:${Math.min(pct,100)}%;background:${tlCol(pct)}"></div></div>
          <span style="font-size:11.5px;font-weight:700;color:${tlCol(pct)};width:32px;text-align:right">${pct}%</span>
        </div>
      </td>
      <td style="font-size:12px">${oPct !== null ? oPct + '%' : '—'}</td>
      <td style="font-size:12px;font-weight:600;color:${mom===null?'var(--text-muted)':mom>0?'var(--green)':'var(--red)'}">${mom !== null ? (mom>0?'+':'')+mom+'%' : '—'}</td>
    </tr>`;
  }).join('');

  // Churn risk list (top 3)
  const churnList = churnRisk.slice(0,4).map(d => {
    const da = daysAgo(d.last_order_date);
    return `<div class="exec-list-row">
      <div>
        <div style="font-weight:600;font-size:13px">${escHtml(d.name)}</div>
        <div style="font-size:11px;color:var(--text-muted)">${d.city} · Tier ${d.tier}</div>
      </div>
      <span class="dslo-badge dslo-high">${da}h lalu</span>
    </div>`;
  }).join('') || `<div style="color:var(--text-muted);font-size:13px;padding:8px 0">Tidak ada churn risk saat ini</div>`;

  // Hot leads list (top 3)
  const hotList = hotLeads.slice(0,4).map(l => `<div class="exec-list-row">
    <div>
      <div style="font-weight:600;font-size:13px">${escHtml(l.name)}</div>
      <div style="font-size:11px;color:var(--text-muted)">${l.city} · ${l.stage}</div>
    </div>
    ${l.contact_wa ? `<a href="https://wa.me/${l.contact_wa.replace(/\D/g,'')}" target="_blank" class="wa-btn" style="font-size:11px;padding:3px 8px">💬</a>` : ''}
  </div>`).join('') || `<div style="color:var(--text-muted);font-size:13px;padding:8px 0">Tidak ada lead panas</div>`;

  const staleNote = useYM !== nowYM
    ? `<div class="alert-banner amber" style="margin-bottom:16px">📅 Menampilkan data <strong>${monthLabel(useYM)}</strong> — data bulan ini belum tersedia. Hubungkan Google Sheet untuk data real-time.</div>`
    : '';

  el.innerHTML = `
    ${staleNote}

    <div class="exec-meta">
      <span class="exec-period">📅 ${monthLabel(useYM)}</span>
      <span style="font-size:12px;color:var(--text-muted)">${state.usingSheet ? 'Live data' : 'Sample data'}</span>
    </div>

    <!-- Hero KPI cards -->
    <div class="exec-hero-grid">

      <div class="exec-hero-card">
        <div class="exec-hero-label">Total Revenue</div>
        <div class="exec-hero-value" style="color:${tlCol(revAch)}">${fmtIDR(totalRev)}</div>
        <div class="prog-bar-track" style="margin:8px 0 6px">
          <div class="prog-bar-fill" style="width:${Math.min(revAch,100)}%;background:${tlCol(revAch)}"></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:12px;color:var(--text-muted)">Target ${fmtIDR(totalTgt)}</span>
          <span style="font-weight:800;font-size:13px;color:${tlCol(revAch)}">${revAch}% ${tl(revAch)}</span>
        </div>
        <div style="margin-top:6px">${momChip(revMoM)}</div>
      </div>

      <div class="exec-hero-card">
        <div class="exec-hero-label">Total Orders</div>
        <div class="exec-hero-value" style="color:${tlCol(ordAch)}">${fmtNum(totalOrd)}</div>
        <div class="prog-bar-track" style="margin:8px 0 6px">
          <div class="prog-bar-fill" style="width:${Math.min(ordAch,100)}%;background:${tlCol(ordAch)}"></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:12px;color:var(--text-muted)">Target ${fmtNum(totalOTgt)}</span>
          <span style="font-weight:800;font-size:13px;color:${tlCol(ordAch)}">${ordAch}% ${tl(ordAch)}</span>
        </div>
        <div style="margin-top:6px">${momChip(ordMoM)}</div>
      </div>

      <div class="exec-hero-card">
        <div class="exec-hero-label">Ad Spend &amp; ROAS</div>
        <div class="exec-hero-value">${blendedROAS ? blendedROAS + '×' : '—'}</div>
        <div style="font-size:12px;color:var(--text-muted);margin:4px 0 10px">Blended ROAS (paid channels)</div>
        <div style="display:flex;justify-content:space-between;font-size:13px">
          <span style="color:var(--text-muted)">Total spend</span>
          <span style="font-weight:700">${fmtIDR(totalSpend)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:4px">
          <span style="color:var(--text-muted)">Paid rev</span>
          <span style="font-weight:700">${fmtIDR(paidRev)}</span>
        </div>
      </div>

      <div class="exec-hero-card">
        <div class="exec-hero-label">Pipeline &amp; Distribusi</div>
        <div style="display:flex;gap:16px;margin:8px 0 10px">
          <div>
            <div style="font-size:22px;font-weight:800;color:var(--primary)">${hotLeads.length}</div>
            <div style="font-size:11px;color:var(--text-muted)">Hot leads</div>
          </div>
          <div>
            <div style="font-size:22px;font-weight:800;color:var(--green)">${activeDist.length}</div>
            <div style="font-size:11px;color:var(--text-muted)">Distributor aktif</div>
          </div>
          <div>
            <div style="font-size:22px;font-weight:800;color:${churnRisk.length > 3 ? 'var(--red)' : 'var(--amber)'}">${churnRisk.length}</div>
            <div style="font-size:11px;color:var(--text-muted)">Churn risk</div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text-muted)">${totalLeads} leads total · ${wonLeads} Won</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Tier 1: ${tier1} · Tier 2: ${tier2} · Tier 3: ${tier3}</div>
      </div>

    </div>

    <!-- Channel performance table -->
    <div class="section-header mb-12" style="margin-top:8px">
      <div><div class="section-title">Performa per Channel</div><div class="section-sub">${monthLabel(useYM)} vs target</div></div>
    </div>
    <div class="table-wrap mb-24">
      <table class="data-table">
        <thead><tr>
          <th>Channel</th><th style="width:36px"></th>
          <th>Revenue Aktual</th><th>Target</th>
          <th style="min-width:140px">Achievement</th>
          <th>Order Ach%</th><th>MoM</th>
        </tr></thead>
        <tbody>${channelRows}</tbody>
      </table>
    </div>

    <!-- Bottom two-col -->
    <div class="exec-bottom-grid">

      <div class="exec-panel">
        <div class="exec-panel-title">⚠️ Distributor Churn Risk (${churnRisk.length})</div>
        ${churnList}
        ${churnRisk.length > 4 ? `<div style="font-size:12px;color:var(--text-muted);margin-top:8px">+${churnRisk.length-4} lainnya — lihat Distributor Intel</div>` : ''}
        <a class="exec-link" onclick="navigate('dist-intel')">→ Buka Distributor Intel</a>
      </div>

      <div class="exec-panel">
        <div class="exec-panel-title">🎯 Hot Leads (${hotLeads.length})</div>
        ${hotList}
        ${hotLeads.length > 4 ? `<div style="font-size:12px;color:var(--text-muted);margin-top:8px">+${hotLeads.length-4} lainnya — lihat Leads Pipeline</div>` : ''}
        <a class="exec-link" onclick="navigate('leads')">→ Buka Leads Pipeline</a>
      </div>

      <div class="exec-panel">
        <div class="exec-panel-title">🎯 KOL Program</div>
        <div style="display:flex;gap:16px;margin-bottom:12px">
          <div><div style="font-size:20px;font-weight:800">${dealKOLs.length}</div><div style="font-size:11px;color:var(--text-muted)">KOL aktif</div></div>
          <div><div style="font-size:20px;font-weight:800">${fmtIDR(kolCash)}</div><div style="font-size:11px;color:var(--text-muted)">Cash budget</div></div>
        </div>
        <div class="prog-bar-track" style="margin-bottom:4px">
          <div class="prog-bar-fill" style="width:${Math.min(kolPct,100)}%;background:${kolPct>=100?'var(--red)':kolPct>=80?'var(--amber)':'var(--green)'}"></div>
        </div>
        <div style="font-size:12px;margin-bottom:10px">
          <span style="font-weight:700;color:${kolPct>=100?'var(--red)':kolPct>=80?'var(--amber)':'var(--green)'}">${kolPct}%</span>
          <span style="color:var(--text-muted)"> dari ceiling ${fmtIDR(CONFIG.kolBudgetCeiling)}</span>
        </div>
        ${bestKOL ? `<div style="font-size:12px;color:var(--text-muted)">Best CPM: <strong>@${bestKOL.handle}</strong> · ${fmtIDR(Number(bestKOL.cpm))} / 1K</div>` : ''}
        <a class="exec-link" onclick="navigate('kol-program')">→ Buka KOL Program</a>
      </div>

    </div>
  `;
}

function renderExecutiveLocked() {
  renderLockedPage('executive', {
    phase: 3,
    title: 'Executive View',
    description: 'Single-screen leadership dashboard — all critical KPIs, traffic-light status vs targets, and weekly summary for the founder and GM.',
    sheetTemplate: [
      'Complete Brief, Targets, Channels, and Leads sheet tabs first',
      'Define 8–10 KPIs that matter to leadership',
      'Set monthly targets in the Targets tab',
    ],
    previewHtml: `
      <div class="lp-exec-grid">
        <div class="lp-exec-card">
          <div class="lp-exec-label">GMV This Month</div>
          <div class="lp-exec-num">Rp 284jt</div>
          <div class="lp-exec-vs"><span class="lp-tl green">●</span> 94% of Rp 300jt target</div>
          <div class="lp-exec-bar"><div class="lp-exec-fill" style="width:94%;background:var(--green)"></div></div>
        </div>
        <div class="lp-exec-card">
          <div class="lp-exec-label">New Resellers</div>
          <div class="lp-exec-num">7</div>
          <div class="lp-exec-vs"><span class="lp-tl amber">●</span> 70% of 10 target</div>
          <div class="lp-exec-bar"><div class="lp-exec-fill" style="width:70%;background:var(--amber)"></div></div>
        </div>
        <div class="lp-exec-card">
          <div class="lp-exec-label">Lead Conversion</div>
          <div class="lp-exec-num">8.4%</div>
          <div class="lp-exec-vs"><span class="lp-tl green">●</span> Above 7% target</div>
          <div class="lp-exec-bar"><div class="lp-exec-fill" style="width:84%;background:var(--green)"></div></div>
        </div>
        <div class="lp-exec-card">
          <div class="lp-exec-label">Fulfilment SLA</div>
          <div class="lp-exec-num">94%</div>
          <div class="lp-exec-vs"><span class="lp-tl green">●</span> Above 90% target</div>
          <div class="lp-exec-bar"><div class="lp-exec-fill" style="width:94%;background:var(--green)"></div></div>
        </div>
        <div class="lp-exec-card">
          <div class="lp-exec-label">Meta ROAS</div>
          <div class="lp-exec-num">4.2×</div>
          <div class="lp-exec-vs"><span class="lp-tl green">●</span> Above 3.5× target</div>
          <div class="lp-exec-bar"><div class="lp-exec-fill" style="width:85%;background:var(--green)"></div></div>
        </div>
        <div class="lp-exec-card">
          <div class="lp-exec-label">Stock Health</div>
          <div class="lp-exec-num">88%</div>
          <div class="lp-exec-vs"><span class="lp-tl amber">●</span> 17 SKUs low stock</div>
          <div class="lp-exec-bar"><div class="lp-exec-fill" style="width:88%;background:var(--amber)"></div></div>
        </div>
      </div>
      <div class="lp-exec-footer">
        <div class="lp-exec-win">🏆 Biggest Win · Mid-May Flash Sale → +42% GMV vs prior week</div>
        <div class="lp-exec-risk">⚠️ Biggest Risk · 4 SKUs out of stock going into Harbolnas season</div>
      </div>
    `,
  });
}
