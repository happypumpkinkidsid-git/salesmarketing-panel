// ============================================================
// HP CREATIVE HUB — APPLICATION
// ============================================================

// ===== STATE =====
const state = {
  tasks:         [],
  calEvents:     [],
  docs:          [],
  hooks:         [],
  usingDemo:     false,
  currentSection:'dashboard',
  calDate:       new Date(2026, 4, 1), // May 2026 default
  calView:       'month',
  filters: {
    taskMember:    'All',
    taskStatus:    'All',
    calPlatform:   'All',
    docsCat:       'All',
    docsSearch:    '',
    hooksSearch:   '',
    hooksPlatform: 'All',
    hooksTrigger:  'All',
  },
};

// ===== ROUTING =====
const SECTIONS = {
  dashboard:   { title: 'Dashboard',        sub: () => `${greeting()}, ${todayStr()}`,             actions: dashActions },
  calendar:    { title: 'Content Calendar', sub: () => 'Monthly and weekly content schedule',        actions: calActions  },
  docs:        { title: 'Document Hub',     sub: () => 'Internal references, templates & briefs',   actions: docsActions },
  hooks:       { title: 'Hook Bank',        sub: () => `${state.hooks.length} hooks — search, filter, copy`, actions: hooksActions },
  competitors: { title: 'Competitor Intel', sub: () => 'Ad angles, psychology triggers, white space',actions: () => '' },
};

function navigate(section) {
  if (!SECTIONS[section]) section = 'dashboard';
  state.currentSection = section;

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.section === section);
  });

  document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
  document.getElementById(`section-${section}`).classList.add('active');

  const s = SECTIONS[section];
  document.getElementById('topbarTitle').textContent = s.title;
  document.getElementById('topbarSub').textContent   = s.sub();
  document.getElementById('topbarActions').innerHTML = s.actions();

  render(section);
  history.replaceState(null, '', `#${section}`);
}

function render(section) {
  const el = document.getElementById(`section-${section}`);
  switch (section) {
    case 'dashboard':   renderDashboard(el);   break;
    case 'calendar':    renderCalendar(el);    break;
    case 'docs':        renderDocs(el);        break;
    case 'hooks':       renderHooks(el);       break;
    case 'competitors': renderCompetitors(el); break;
  }
}

// ===== TOPBAR ACTIONS =====
function dashActions() {
  return `<a class="btn btn-outline btn-sm" href="${CONFIG.sheetUrl}" target="_blank">📋 Edit in Sheets</a>`;
}
function calActions() {
  return `
    <div class="cal-view-toggle">
      <button class="view-btn ${state.calView==='month'?'active':''}" onclick="setCalView('month')">Month</button>
      <button class="view-btn ${state.calView==='week'?'active':''}"  onclick="setCalView('week')">Week</button>
    </div>
    <a class="btn btn-outline btn-sm" href="${CONFIG.sheetUrl}" target="_blank">+ Add Content</a>
  `;
}
function docsActions() {
  return `<a class="btn btn-outline btn-sm" href="${CONFIG.sheetUrl}" target="_blank">+ Add Document</a>`;
}
function hooksActions() {
  return `<a class="btn btn-primary btn-sm" href="${CONFIG.sheetUrl}" target="_blank">+ Add Hook</a>`;
}

// ===== DATA FETCHING =====
function csvUrl(gidKey) {
  return `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/pub?gid=${CONFIG.gids[gidKey]}&single=true&output=csv`;
}

function parseCSVLine(line) {
  const result = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; }
    else if (c === ',' && !inQ) { result.push(cur); cur = ''; }
    else { cur += c; }
  }
  result.push(cur);
  return result;
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line).map(v => v.trim().replace(/^"|"$/g, ''));
    const obj  = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  }).filter(row => Object.values(row).some(v => v));
}

async function fetchSheet(gidKey) {
  const res = await fetch(csvUrl(gidKey), { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseCSV(await res.text());
}

async function loadAllData() {
  const btn = document.getElementById('refreshBtn');
  btn.classList.add('spinning');
  btn.textContent = '↻ Syncing…';

  const isConfigured = CONFIG.sheetId !== 'YOUR_SHEET_ID_HERE';

  if (isConfigured) {
    try {
      const [tasks, calEvents, docs, hooks] = await Promise.all([
        fetchSheet('tasks'),
        fetchSheet('calendar'),
        fetchSheet('docs'),
        fetchSheet('hooks'),
      ]);
      state.tasks     = tasks;
      state.calEvents = calEvents;
      state.docs      = docs;
      state.hooks      = hooks;
      state.usingDemo  = false;
      const now = new Date();
      document.getElementById('lastRefreshLabel').textContent =
        `Synced at ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
      showToast('Data refreshed', 'success');
    } catch (e) {
      console.warn('Sheets fetch failed:', e);
      loadDemoData();
      showToast('Could not reach Sheets — showing demo data', 'error');
    }
  } else {
    loadDemoData();
  }

  btn.classList.remove('spinning');
  btn.textContent = '↻ Refresh Data';
  updateOverdueBadge();
  render(state.currentSection);
}

function loadDemoData() {
  state.tasks     = CONFIG.sampleTasks;
  state.calEvents = CONFIG.sampleCalendar;
  state.docs      = CONFIG.sampleDocs;
  state.hooks     = CONFIG.sampleHooks;
  state.usingDemo = true;
  document.getElementById('lastRefreshLabel').textContent = 'Demo data';
}

// ===== UTILITIES =====
function todayStr() {
  return new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}
function isOverdue(s) {
  if (!s) return false;
  return new Date(s) < new Date(new Date().toDateString());
}
function isToday(s) {
  if (!s) return false;
  return new Date(s).toDateString() === new Date().toDateString();
}
function platformClass(p) {
  return (p || '').toLowerCase().replace(/[^a-z]/g,'') || 'other';
}
function statusClass(s) {
  return (s || '').toLowerCase().replace(/[^a-z]/g,'');
}
function escHtml(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

function updateOverdueBadge() {
  const overdue = state.tasks.filter(t => t.status !== 'Done' && isOverdue(t['Due Date'] || t.due));
  const el = document.getElementById('overdueCount');
  if (overdue.length > 0) { el.textContent = overdue.length; el.style.display = ''; }
  else                    { el.style.display = 'none'; }
}

// ===== DEMO BANNER =====
function demoBanner() {
  if (!state.usingDemo) return '';
  return `
    <div class="setup-banner">
      <h3>🔧 Connect your Google Sheet to go live</h3>
      <p>Currently showing sample data. To sync your real tasks, calendar, docs, and hooks:</p>
      <ol>
        <li>Create a Google Sheet with 4 tabs: <code>Tasks</code>, <code>Calendar</code>, <code>Docs</code>, <code>Hooks</code></li>
        <li>Go to <strong>File → Share → Publish to web</strong>, publish each tab as <strong>CSV</strong></li>
        <li>Copy the Sheet ID from the URL: <code>docs.google.com/spreadsheets/d/<strong>SHEET_ID</strong>/edit</code></li>
        <li>Open <code>js/config.js</code> and paste your ID into <code>sheetId: 'YOUR_SHEET_ID_HERE'</code></li>
        <li>Reload and click <strong>↻ Refresh Data</strong></li>
      </ol>
      <p style="margin-top:8px">Column names for each tab are shown below each section header.</p>
    </div>
  `;
}

// ============================================================
// DASHBOARD
// ============================================================
function renderDashboard(el) {
  const today = new Date().toISOString().split('T')[0];
  const tasks  = state.tasks;

  const todayTasks  = tasks.filter(t => isToday(t['Due Date'] || t.due));
  const inProgress  = tasks.filter(t => (t.Status || t.status) === 'In Progress');
  const overdue     = tasks.filter(t => (t.Status || t.status) !== 'Done' && isOverdue(t['Due Date'] || t.due));
  const totalActive = tasks.filter(t => (t.Status || t.status) !== 'Done');
  const todayCal    = state.calEvents.filter(e => (e.Date || e.date) === today);

  const filtered = applyTaskFilters(tasks);
  const todo      = filtered.filter(t => (t.Status || t.status) === 'To Do');
  const progress  = filtered.filter(t => (t.Status || t.status) === 'In Progress');
  const done      = filtered.filter(t => (t.Status || t.status) === 'Done');

  el.innerHTML = `
    ${demoBanner()}
    <div class="greeting">
      <h1>${greeting()} 👋</h1>
      <div class="greeting-sub">${todayStr()}</div>
    </div>

    <div class="stats-grid">
      <div class="stat-card orange">
        <div class="stat-value">${todayTasks.length}</div>
        <div class="stat-label">Due Today</div>
        <div class="stat-sub">tasks with today's deadline</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-value">${inProgress.length}</div>
        <div class="stat-label">In Progress</div>
        <div class="stat-sub">being worked on now</div>
      </div>
      <div class="stat-card ${overdue.length>0?'red':'green'}">
        <div class="stat-value">${overdue.length}</div>
        <div class="stat-label">Overdue</div>
        <div class="stat-sub">${overdue.length===0 ? 'all on track 🎉' : 'need attention'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalActive.length}</div>
        <div class="stat-label">Active Tasks</div>
        <div class="stat-sub">across the whole team</div>
      </div>
    </div>

    ${todayCal.length > 0 ? `
    <div class="section-title-wrap" style="margin-bottom:12px">
      <div class="section-title">📅 Going Live Today</div>
    </div>
    <div class="schedule-grid" style="margin-bottom:24px">
      ${todayCal.map(renderScheduleItem).join('')}
    </div>` : ''}

    <div class="section-title-wrap">
      <div class="section-title">📋 Task Board</div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <select class="filt-select" style="font-size:12px;padding:6px 10px" onchange="state.filters.taskMember=this.value;render('dashboard')">
          ${CONFIG.team.map(m => `<option value="${m}" ${state.filters.taskMember===m?'selected':''}>${m}</option>`).join('')}
        </select>
        <select class="filt-select" style="font-size:12px;padding:6px 10px" onchange="state.filters.taskStatus=this.value;render('dashboard')">
          ${['All','To Do','In Progress','In Review','Done'].map(s => `<option value="${s}" ${state.filters.taskStatus===s?'selected':''}>${s}</option>`).join('')}
        </select>
        <a class="btn btn-outline btn-sm" href="${CONFIG.sheetUrl}" target="_blank">+ Add Task</a>
      </div>
    </div>
    ${state.usingDemo ? `<p style="font-size:11px;color:var(--text-muted);margin-bottom:12px">Demo columns: <code>ID | Title | Assignee | Status | Priority | Due Date | Platform | Category</code></p>` : ''}
    <div class="kanban">
      ${kanbanCol('To Do', 'col-todo', todo)}
      ${kanbanCol('In Progress', 'col-inprogress', progress)}
      ${kanbanCol('Done', 'col-done', done)}
    </div>
  `;
}

function applyTaskFilters(tasks) {
  return tasks.filter(t => {
    const m = state.filters.taskMember;
    const s = state.filters.taskStatus;
    const assignee = t.Assignee || t.assignee || '';
    const status   = t.Status   || t.status   || '';
    if (m !== 'All' && assignee !== m) return false;
    if (s !== 'All' && status   !== s) return false;
    return true;
  });
}

function kanbanCol(label, cls, tasks) {
  return `
    <div class="kanban-col ${cls}">
      <div class="kanban-col-header">
        <div class="kanban-col-dot"></div>
        <div class="kanban-col-title">${label}</div>
        <div class="kanban-col-count">${tasks.length}</div>
      </div>
      <div class="kanban-cards">
        ${tasks.length ? tasks.map(renderTaskCard).join('') : `<div class="empty" style="padding:24px"><div class="empty-text">No tasks</div></div>`}
      </div>
    </div>
  `;
}

function renderTaskCard(t) {
  const id       = t.ID        || t.id        || '';
  const title    = t.Title     || t.title     || 'Untitled task';
  const assignee = t.Assignee  || t.assignee  || '';
  const status   = t.Status    || t.status    || '';
  const priority = t.Priority  || t.priority  || '';
  const due      = t['Due Date']|| t.due      || '';
  const platform = t.Platform  || t.platform  || '';
  const overdue  = status !== 'Done' && isOverdue(due);
  return `
    <div class="task-card">
      ${id ? `<div class="task-card-id">${escHtml(id)}</div>` : ''}
      <div class="task-card-title">${escHtml(title)}</div>
      <div class="task-card-meta">
        ${priority ? `<span class="badge badge-${statusClass(priority)}">${escHtml(priority)}</span>` : ''}
        ${platform ? `<span class="badge badge-${platformClass(platform)}">${escHtml(platform)}</span>` : ''}
      </div>
      <div class="task-card-foot">
        <span class="task-card-assignee">${escHtml(assignee) || '—'}</span>
        <span class="task-due ${overdue?'overdue':''}">${due ? (overdue?'⚠ ':'')+'Due '+fmtDate(due) : ''}</span>
      </div>
    </div>
  `;
}

function renderScheduleItem(e) {
  const platform = e.Platform || e.platform || 'Other';
  const color    = CONFIG.platformColors[platform] || '#94A3B8';
  return `
    <div class="schedule-item">
      <div class="schedule-dot" style="background:${color}"></div>
      <div class="schedule-info">
        <div class="schedule-title">${escHtml(e.Title || e.title || 'Untitled')}</div>
        <div class="schedule-meta">${escHtml(platform)} · ${escHtml(e.Type || e.type || '')} · ${escHtml(e.Assignee || e.assignee || '')}</div>
      </div>
      <span class="badge badge-${statusClass(e.Status || e.status)}">${escHtml(e.Status || e.status || '')}</span>
    </div>
  `;
}

// ============================================================
// CALENDAR
// ============================================================
function setCalView(v) {
  state.calView = v;
  navigate('calendar');
}

function renderCalendar(el) {
  el.innerHTML = state.calView === 'month' ? buildMonthView() : buildWeekView();
}

function filteredCalEvents() {
  const p = state.filters.calPlatform;
  return state.calEvents.filter(e => p === 'All' || (e.Platform || e.platform) === p);
}

function buildMonthView() {
  const d    = state.calDate;
  const year = d.getFullYear();
  const mon  = d.getMonth();
  const firstDay = new Date(year, mon, 1);
  const lastDay  = new Date(year, mon+1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0
  const totalDays = lastDay.getDate();
  const events    = filteredCalEvents();

  const monthLabel = firstDay.toLocaleDateString('en-GB', { month:'long', year:'numeric' });

  // Build day cells
  const cells = [];
  for (let i = 0; i < startDow; i++) {
    const prevDate = new Date(year, mon, -startDow + i + 1);
    cells.push({ date: prevDate, cur: false });
  }
  for (let d2 = 1; d2 <= totalDays; d2++) {
    cells.push({ date: new Date(year, mon, d2), cur: true });
  }
  while (cells.length % 7 !== 0) {
    const nd = new Date(year, mon+1, cells.length - startDow - totalDays + 1);
    cells.push({ date: nd, cur: false });
  }

  function eventsForDate(date) {
    const iso = date.toISOString().split('T')[0];
    return events.filter(e => (e.Date || e.date) === iso);
  }

  const cellsHtml = cells.map(cell => {
    const iso    = cell.date.toISOString().split('T')[0];
    const dayEvs = eventsForDate(cell.date);
    const isT    = cell.date.toDateString() === new Date().toDateString();
    const visible = dayEvs.slice(0, 3);
    const hidden  = dayEvs.length - visible.length;
    return `
      <div class="cal-day ${!cell.cur?'other-month':''} ${isT?'today':''}" onclick="openDayModal('${iso}')">
        <div class="cal-day-num">${cell.date.getDate()}</div>
        <div class="cal-day-events">
          ${visible.map(e => {
            const pc = platformClass(e.Platform || e.platform);
            return `<div class="cal-event ${pc}" title="${escHtml(e.Title || e.title || '')}">${escHtml(e.Title || e.title || '')}</div>`;
          }).join('')}
          ${hidden > 0 ? `<div class="cal-more">+${hidden} more</div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  const platformFilter = CONFIG.platforms.map(p =>
    `<button class="filt ${state.filters.calPlatform===p?'active':''}" onclick="state.filters.calPlatform='${p}';render('calendar')">${p}</button>`
  ).join('');

  return `
    ${demoBanner()}
    <div class="cal-header">
      <div class="cal-nav">
        <button class="btn btn-ghost btn-sm" onclick="shiftMonth(-1)">◀</button>
        <div class="cal-month-label">${monthLabel}</div>
        <button class="btn btn-ghost btn-sm" onclick="shiftMonth(1)">▶</button>
        <button class="btn btn-outline btn-sm" onclick="state.calDate=new Date(2026,4,1);render('calendar')">Today</button>
      </div>
    </div>
    <div class="filter-bar">${platformFilter}</div>
    ${state.usingDemo ? `<p style="font-size:11px;color:var(--text-muted);margin-bottom:12px">Demo columns: <code>Date | Platform | Content Type | Title | Caption | Status | Assignee | Campaign</code></p>` : ''}
    <div class="cal-grid">
      <div class="cal-day-headers">
        ${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => `<div class="cal-day-header">${d}</div>`).join('')}
      </div>
      <div class="cal-days">${cellsHtml}</div>
    </div>
    <div class="cal-legend">
      ${Object.entries(CONFIG.platformColors).map(([p,c]) =>
        `<div class="legend-item"><div class="legend-dot" style="background:${c}"></div>${p}</div>`
      ).join('')}
    </div>
  `;
}

function buildWeekView() {
  const today = new Date();
  const dow   = (today.getDay() + 6) % 7;
  const mon   = new Date(state.calDate);
  // Find Monday of the current week in calDate's month
  const refDay = new Date(state.calDate.getFullYear(), state.calDate.getMonth(), 1);
  const refDow = (refDay.getDay() + 6) % 7;
  // Use today's week if in same month, else first week of calDate
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dow);

  const days = Array.from({length:7}, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const events = filteredCalEvents();

  function eventsFor(date) {
    const iso = date.toISOString().split('T')[0];
    return events.filter(e => (e.Date || e.date) === iso);
  }

  const monthLabel = weekStart.toLocaleDateString('en-GB', {day:'numeric', month:'short'}) +
    ' – ' + days[6].toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'});

  const headers = days.map(d => {
    const isT = d.toDateString() === today.toDateString();
    return `
      <div class="week-col-header ${isT?'today-col':''}">
        <div class="week-day-name">${d.toLocaleDateString('en-GB',{weekday:'short'})}</div>
        <div class="week-day-num">${d.getDate()}</div>
      </div>
    `;
  }).join('');

  const bodies = days.map(d => {
    const evs = eventsFor(d);
    return `
      <div class="week-day-body">
        ${evs.length ? evs.map(e => {
          const pc = platformClass(e.Platform || e.platform);
          return `
            <div class="week-event ${pc}">
              <div class="we-type">${escHtml(e.Platform || e.platform || '')} · ${escHtml(e.Type || e.type || '')}</div>
              <div class="we-title">${escHtml(e.Title || e.title || 'Untitled')}</div>
              <div class="we-assignee">${escHtml(e.Assignee || e.assignee || '')}</div>
            </div>
          `;
        }).join('') : `<div class="week-empty">—</div>`}
      </div>
    `;
  }).join('');

  const platformFilter = CONFIG.platforms.map(p =>
    `<button class="filt ${state.filters.calPlatform===p?'active':''}" onclick="state.filters.calPlatform='${p}';render('calendar')">${p}</button>`
  ).join('');

  return `
    ${demoBanner()}
    <div class="cal-header">
      <div class="cal-nav">
        <button class="btn btn-ghost btn-sm" onclick="shiftWeek(-1)">◀</button>
        <div class="cal-month-label" style="font-size:16px">${monthLabel}</div>
        <button class="btn btn-ghost btn-sm" onclick="shiftWeek(1)">▶</button>
        <button class="btn btn-outline btn-sm" onclick="goToThisWeek()">This Week</button>
      </div>
    </div>
    <div class="filter-bar">${platformFilter}</div>
    <div class="week-view">
      <div class="week-cols">${headers}</div>
      <div class="week-body-cols">${bodies}</div>
    </div>
    <div class="cal-legend" style="margin-top:14px">
      ${Object.entries(CONFIG.platformColors).map(([p,c]) =>
        `<div class="legend-item"><div class="legend-dot" style="background:${c}"></div>${p}</div>`
      ).join('')}
    </div>
  `;
}

function shiftMonth(delta) {
  state.calDate = new Date(state.calDate.getFullYear(), state.calDate.getMonth() + delta, 1);
  render('calendar');
}

function shiftWeek(delta) {
  const d = state._weekStart || new Date();
  d.setDate(d.getDate() + delta * 7);
  state._weekStart = d;
  render('calendar');
}

function goToThisWeek() {
  state._weekStart = null;
  render('calendar');
}

// Day modal
function openDayModal(isoDate) {
  const d      = new Date(isoDate + 'T00:00:00');
  const label  = d.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' });
  const events = state.calEvents.filter(e => (e.Date || e.date) === isoDate);

  document.getElementById('modalDate').textContent = label;
  document.getElementById('modalBody').innerHTML = events.length
    ? events.map(e => {
        const pc    = platformClass(e.Platform || e.platform);
        const color = CONFIG.platformColors[e.Platform || e.platform] || '#94A3B8';
        return `
          <div class="modal-event" style="background:${color}">
            <div class="me-type">${escHtml(e.Platform || e.platform || '')} · ${escHtml(e.Type || e.type || '')}</div>
            <div class="me-title">${escHtml(e.Title || e.title || 'Untitled')}</div>
            <div class="me-meta">
              ${escHtml(e.Assignee || e.assignee || '')}
              ${e.Status || e.status ? '· ' + escHtml(e.Status || e.status) : ''}
              ${e.Campaign || e.campaign ? '· ' + escHtml(e.Campaign || e.campaign) : ''}
            </div>
          </div>
        `;
      }).join('')
    : `<div class="modal-empty">No content scheduled for this day.<br><a href="${CONFIG.sheetUrl}" target="_blank" class="btn btn-outline btn-sm" style="margin-top:12px">+ Add in Sheets</a></div>`;

  document.getElementById('dayModal').style.display = 'flex';
}

function closeDayModal(e) {
  if (!e || e.target === document.getElementById('dayModal')) {
    document.getElementById('dayModal').style.display = 'none';
  }
}

// ============================================================
// DOCUMENT HUB
// ============================================================
function renderDocs(el) {
  const cats = ['All', ...new Set(state.docs.map(d => d.Category || d.category || 'Other'))];
  const search = (state.filters.docsSearch || '').toLowerCase();
  const cat    = state.filters.docsCat;

  const filtered = state.docs.filter(d => {
    const c = d.Category || d.category || '';
    const t = (d.Title || d.title || '').toLowerCase();
    const desc = (d.Description || d.desc || '').toLowerCase();
    if (cat !== 'All' && c !== cat) return false;
    if (search && !t.includes(search) && !desc.includes(search)) return false;
    return true;
  });

  // Pinned first
  const pinned = filtered.filter(d => (d.Pinned || d.pinned) === 'Yes');
  const rest   = filtered.filter(d => (d.Pinned || d.pinned) !== 'Yes');
  const sorted = [...pinned, ...rest];

  el.innerHTML = `
    ${demoBanner()}
    <div class="docs-top">
      <div class="search-wrap">
        <span class="si">🔍</span>
        <input type="text" placeholder="Search documents…" value="${escHtml(state.filters.docsSearch)}"
          oninput="state.filters.docsSearch=this.value;render('docs')">
      </div>
    </div>
    <div class="filter-bar">
      ${cats.map(c =>
        `<button class="filt ${cat===c?'active':''}" onclick="state.filters.docsCat='${escHtml(c)}';render('docs')">${c}</button>`
      ).join('')}
    </div>
    ${state.usingDemo ? `<p style="font-size:11px;color:var(--text-muted);margin-bottom:12px">Demo columns: <code>Category | Title | URL | Description | Last Updated | Pinned</code></p>` : ''}
    <div class="docs-grid">
      ${sorted.length ? sorted.map(renderDocCard).join('') : `<div class="docs-empty"><div class="empty-icon">📭</div><div>No documents match your search.</div></div>`}
    </div>
  `;
}

function renderDocCard(d) {
  const url     = d.URL || d.url || '#';
  const icon    = d.icon || d.Icon || '📄';
  const title   = d.Title || d.title || 'Untitled';
  const desc    = d.Description || d.desc || '';
  const cat     = d.Category || d.category || '';
  const updated = d['Last Updated'] || d.updated || '';
  const pinned  = (d.Pinned || d.pinned) === 'Yes';

  // Internal SPA navigation (#section links)
  if (url.startsWith('#') && SECTIONS[url.slice(1)]) {
    const section = url.slice(1);
    return `
      <div class="doc-card ${pinned?'pinned':''}" onclick="navigate('${section}')" style="cursor:pointer">
        ${pinned ? `<div class="doc-pin">📌 Pinned</div>` : ''}
        <div class="doc-icon">${icon}</div>
        <div class="doc-title">${escHtml(title)}</div>
        <div class="doc-desc">${escHtml(desc)}</div>
        <div class="doc-foot">
          <span class="doc-cat">${escHtml(cat)}</span>
          <span class="doc-updated">→ Open in dashboard</span>
        </div>
      </div>
    `;
  }

  const target = url && url !== '#' ? 'target="_blank"' : '';
  return `
    <a class="doc-card ${pinned?'pinned':''}" href="${escHtml(url)}" ${target}>
      ${pinned ? `<div class="doc-pin">📌 Pinned</div>` : ''}
      <div class="doc-icon">${icon}</div>
      <div class="doc-title">${escHtml(title)}</div>
      <div class="doc-desc">${escHtml(desc)}</div>
      <div class="doc-foot">
        <span class="doc-cat">${escHtml(cat)}</span>
        <span class="doc-updated">${updated ? 'Updated '+fmtDate(updated) : ''}</span>
      </div>
    </a>
  `;
}

// ============================================================
// HOOK BANK
// ============================================================
function renderHooks(el) {
  const search   = (state.filters.hooksSearch   || '').toLowerCase();
  const platform = state.filters.hooksPlatform;
  const trigger  = state.filters.hooksTrigger;

  const allTriggers = ['All', ...new Set(CONFIG.psychTriggers.map(t => t.name))];

  const filtered = state.hooks.filter(h => {
    const p = h.Platform || h.platform || '';
    const t = h['Psychology Trigger'] || h.trigger || '';
    const text = (h['Hook Text'] || h.text || '').toLowerCase();
    const tags = (h.Tags || h.tags || '').toLowerCase();
    if (platform !== 'All' && p !== platform && p !== 'All') return false;
    if (trigger  !== 'All' && t !== trigger)  return false;
    if (search && !text.includes(search) && !tags.includes(search)) return false;
    return true;
  });

  el.innerHTML = `
    ${demoBanner()}
    <div class="hooks-top">
      <div class="search-wrap">
        <span class="si">🔍</span>
        <input type="text" placeholder="Search hooks by keyword or tag…" value="${escHtml(state.filters.hooksSearch)}"
          oninput="state.filters.hooksSearch=this.value;render('hooks')">
      </div>
      <select class="filt-select" onchange="state.filters.hooksPlatform=this.value;render('hooks')">
        ${CONFIG.platforms.map(p => `<option value="${p}" ${platform===p?'selected':''}>${p}</option>`).join('')}
      </select>
      <select class="filt-select" onchange="state.filters.hooksTrigger=this.value;render('hooks')">
        ${allTriggers.map(t => `<option value="${t}" ${trigger===t?'selected':''}>${t}</option>`).join('')}
      </select>
    </div>
    ${state.usingDemo ? `<p style="font-size:11px;color:var(--text-muted);margin-bottom:12px">Demo columns: <code>ID | Hook Text | Platform | Psychology Trigger | Theme | Tags | Added By | Date Added</code></p>` : ''}
    <div class="hooks-count">${filtered.length} hook${filtered.length!==1?'s':''} found</div>
    <div class="hooks-list">
      ${filtered.length ? filtered.map(renderHookCard).join('') : `
        <div class="empty">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">No hooks found</div>
          <div class="empty-text">Try a different search or filter, or <a href="${CONFIG.sheetUrl}" target="_blank">add new hooks in Sheets</a>.</div>
        </div>
      `}
    </div>
  `;
}

function renderHookCard(h) {
  const id      = h.ID        || h.id        || '';
  const text    = h['Hook Text'] || h.text   || '';
  const platform= h.Platform  || h.platform  || '';
  const trigger = h['Psychology Trigger'] || h.trigger || '';
  const theme   = h.Theme     || h.theme     || '';
  const tags    = (h.Tags     || h.tags      || '').split(',').map(t => t.trim()).filter(Boolean);
  const addedBy = h['Added By'] || h.addedBy || '';
  return `
    <div class="hook-card">
      <div class="hook-body">
        <div class="hook-text">${escHtml(text)}</div>
        <div class="hook-tags">
          ${platform  ? `<span class="badge badge-${platformClass(platform)}">${escHtml(platform)}</span>` : ''}
          ${trigger   ? `<span class="hook-tag trigger">${escHtml(trigger)}</span>` : ''}
          ${theme     ? `<span class="hook-tag">${escHtml(theme)}</span>` : ''}
          ${tags.map(t => `<span class="hook-tag">${escHtml(t)}</span>`).join('')}
        </div>
      </div>
      <div class="hook-right">
        <button class="copy-btn" id="cp-${escHtml(id)}" onclick="copyHook(this, ${JSON.stringify(text)})">📋 Copy</button>
        ${addedBy ? `<div class="hook-by">${escHtml(addedBy)}</div>` : ''}
      </div>
    </div>
  `;
}

function copyHook(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✓ Copied!';
    btn.classList.add('copied');
    showToast('Hook copied to clipboard', 'success');
    setTimeout(() => { btn.textContent = '📋 Copy'; btn.classList.remove('copied'); }, 2000);
  }).catch(() => showToast('Copy failed — try manually selecting the text', 'error'));
}

// ============================================================
// COMPETITOR INTEL
// ============================================================
function renderCompetitors(el) {
  el.innerHTML = `
    <p class="comp-intro">
      Priority competitors in the Indonesian kids apparel market. Ads ranked by running duration —
      90+ day creatives are proven winners. Cross-reference hooks against the psychology trigger framework below.
    </p>

    <div class="section-title">🏆 Competitor Profiles</div>
    <div class="comp-grid">
      ${CONFIG.competitors.map(renderCompCard).join('')}
    </div>

    <hr class="divider">

    <div class="section-title">💡 White Space Opportunities</div>
    <p style="font-size:13px;color:var(--text-muted);margin-bottom:14px">Angles less contested by competitors — prioritise these in Happy Pumpkin creative.</p>
    <div class="ws-grid">
      ${CONFIG.whiteSpace.map(ws => `
        <div class="ws-card">
          <div class="ws-title">✦ ${escHtml(ws.title)}</div>
          <div class="ws-desc">${escHtml(ws.desc)}</div>
        </div>
      `).join('')}
    </div>

    <hr class="divider">

    <div class="section-title">🧠 Buying Psychology Framework</div>
    <p style="font-size:13px;color:var(--text-muted);margin-bottom:4px">Tag every ad creative against one of these triggers to identify gaps and opportunities.</p>
    <div class="trig-grid">
      ${CONFIG.psychTriggers.map(t => `
        <div class="trig-card">
          <div class="trig-name">${escHtml(t.name)}</div>
          <div class="trig-def">${escHtml(t.def)}</div>
          <div class="trig-brands"><strong>Used by:</strong> ${escHtml(t.brands)}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderCompCard(c) {
  return `
    <div class="comp-card">
      <div class="comp-head">
        <div>
          <div class="comp-name">${escHtml(c.name)}</div>
          ${c.aka ? `<div style="font-size:11px;color:var(--text-muted)">${escHtml(c.aka)}</div>` : ''}
        </div>
        <div class="comp-scale">${escHtml(c.scale)}</div>
      </div>
      <div class="comp-body">
        ${row('Followers', c.followers)}
        ${row('Price range', c.price)}
        ${row('Age range', c.ages)}
        ${row('Certs', c.certs)}
        ${c.hq && c.hq !== '—' ? row('HQ', c.hq) : ''}
        <div style="font-size:12px;color:var(--text-muted);margin-top:8px;line-height:1.5">${escHtml(c.positioning)}</div>
        <div style="font-size:11.5px;font-style:italic;margin-top:4px;color:var(--text)">${escHtml(c.tagline)}</div>
        <div class="comp-angles">
          <div class="comp-angles-label">Ad Angles</div>
          ${c.angles.map(a => `<span class="angle-pill">${escHtml(a)}</span>`).join('')}
        </div>
        <a class="comp-ad-link" href="${escHtml(c.adUrl)}" target="_blank">🔗 View Ad Library</a>
      </div>
    </div>
  `;
}

function row(k, v) {
  if (!v || v === '—') return '';
  return `<div class="comp-row"><span class="comp-k">${escHtml(k)}</span><span class="comp-v">${escHtml(v)}</span></div>`;
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Sidebar navigation
  document.querySelectorAll('.nav-item[data-section]').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.section));
  });

  // Hash routing
  const hash = location.hash.replace('#', '') || 'dashboard';

  // Set calendar to current month
  const now = new Date();
  state.calDate = new Date(now.getFullYear(), now.getMonth(), 1);

  loadAllData().then(() => {
    navigate(hash);
  });

  // Auto-refresh
  setInterval(loadAllData, CONFIG.refreshInterval);
});
