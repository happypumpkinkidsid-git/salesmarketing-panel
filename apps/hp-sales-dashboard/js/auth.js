// ============================================================
// HP Auth — Supabase email+password gate with role-based tab visibility.
// Roles: owner (all) · sales (Today/Online/Offline/Leadership) · content (KOL + Product DB + Performance).
// Embedded (iframe) contexts inherit the parent session — no double login.
// ============================================================
(function () {
  const SB_URL  = 'https://onoetbbbrgxqqjssomdi.supabase.co';
  const SB_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ub2V0YmJicmd4cXFqc3NvbWRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDEyNTksImV4cCI6MjA5NjkxNzI1OX0.Bwg1e4eCsH58xv8-ZSOFSH-hGxsjBlwJ47X1_HPTQho';
  const ROLE_TABS = {
    owner: '*',
    sales: ['brief', 'performance', 'channels', 'offline', 'dist-intel', 'leads', 'executive', 'kol-program'],
    content: ['kol', 'kol-program', 'product-database', 'channels', 'inventory', 'sessions', 'orders', 'customers', 'campaigns'],
  };
  const DEFAULT_TAB = { owner: 'brief', sales: 'brief', content: 'kol' };
  const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  let sb;

  const embedded = (function () { try { return window.parent && window.parent !== window; } catch (e) { return false; } })();

  function el(html) { const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  function ov(html) {
    let o = document.getElementById('hp-auth-overlay');
    if (!o) { o = document.createElement('div'); o.id = 'hp-auth-overlay'; (document.body || document.documentElement).appendChild(o); }
    o.innerHTML = html; o.style.display = 'flex';
    return o;
  }
  function hide() { const o = document.getElementById('hp-auth-overlay'); if (o) o.style.display = 'none'; }

  function loginScreen(msg) {
    ov(`<div class="hp-auth-card">
      <div class="hp-auth-logo">🎃 Happy <b>Pumpkin</b></div>
      <div class="hp-auth-sub">Sales &amp; Marketing Panel</div>
      ${msg ? `<div class="hp-auth-err">${msg}</div>` : ''}
      <input id="hp-auth-email" type="email" placeholder="Email" autocomplete="username">
      <input id="hp-auth-pw" type="password" placeholder="Password" autocomplete="current-password">
      <button id="hp-auth-btn">Masuk</button>
    </div>`);
    const btn = document.getElementById('hp-auth-btn');
    const go = async () => {
      btn.disabled = true; btn.textContent = 'Memeriksa…';
      const email = (document.getElementById('hp-auth-email').value || '').trim();
      const pw = document.getElementById('hp-auth-pw').value || '';
      try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password: pw });
        if (error) { loginScreen('Email atau password salah.'); return; }
        await afterLogin(data.session);
      } catch (e) { loginScreen('Gagal masuk. Coba lagi.'); }
    };
    btn.onclick = go;
    const pwEl = document.getElementById('hp-auth-pw');
    pwEl.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }
  function errScreen(m) { ov(`<div class="hp-auth-card"><div class="hp-auth-logo">🎃 Happy <b>Pumpkin</b></div><div class="hp-auth-err">${m}</div></div>`); }

  async function afterLogin(session) {
    if (!session) { loginScreen(); return; }
    let role, name;
    try {
      const { data } = await sb.from('members').select('name,role').eq('email', session.user.email).maybeSingle();
      if (!data) { await sb.auth.signOut(); loginScreen('Akun ini belum terdaftar sebagai member.'); return; }
      role = data.role; name = data.name;
    } catch (e) { errScreen('Gagal memuat profil member. Refresh halaman.'); return; }
    window.HP_MEMBER = { email: session.user.email, name, role };
    window.HP_TOKEN = session.access_token;
    applyRole(role);
    hide();
  }

  function applyRole(role) {
    const allowed = ROLE_TABS[role] || [];
    document.querySelectorAll('.nav-item[data-section]').forEach(it => {
      const ok = allowed === '*' || allowed.includes(it.dataset.section);
      it.style.display = ok ? '' : 'none';
    });
    document.querySelectorAll('.nav-section-label').forEach(lbl => {
      let n = lbl.nextElementSibling, any = false;
      while (n && !n.classList.contains('nav-section-label')) {
        if (n.classList && n.classList.contains('nav-item') && n.style.display !== 'none') any = true;
        n = n.nextElementSibling;
      }
      lbl.style.display = any ? '' : 'none';
    });
    addUserBar(role);
    const cur = (window.state && window.state.section) || '';
    const allow = allowed === '*' || allowed.includes(cur);
    if (!allow && typeof window.navigate === 'function') {
      window.navigate(DEFAULT_TAB[role] || (allowed === '*' ? 'brief' : allowed[0]));
    }
  }

  function addUserBar(role) {
    if (document.getElementById('hp-userbar')) return;
    const foot = document.querySelector('.sidebar-footer') || document.querySelector('.sidebar');
    if (!foot) return;
    const bar = el(`<div id="hp-userbar"><span>${(window.HP_MEMBER && window.HP_MEMBER.name) || ''} · ${role}</span><button id="hp-logout">Keluar</button></div>`);
    foot.insertBefore(bar, foot.firstChild);
    document.getElementById('hp-logout').onclick = window.hpLogout;
  }

  window.hpLogout = async () => { try { if (sb) await sb.auth.signOut(); } catch (e) {} location.reload(); };

  function loadCDN(cb) {
    if (window.supabase && window.supabase.createClient) return cb();
    const s = document.createElement('script');
    s.src = CDN; s.onload = cb;
    s.onerror = () => errScreen('Gagal memuat modul login (cek koneksi internet), lalu refresh.');
    document.head.appendChild(s);
  }

  function start() {
    // Embedded mini-app: inherit the parent's session; don't show a 2nd login.
    if (embedded) {
      try {
        window.HP_TOKEN = window.parent.HP_TOKEN;
        window.HP_MEMBER = window.parent.HP_MEMBER;
      } catch (e) {}
      return;
    }
    ov(`<div class="hp-auth-card"><div class="hp-auth-logo">🎃 Happy <b>Pumpkin</b></div><div class="hp-auth-sub">Memuat…</div></div>`);
    loadCDN(async () => {
      try {
        sb = window.supabase.createClient(SB_URL, SB_ANON, { auth: { persistSession: true, autoRefreshToken: true } });
        window.HP_SB = sb;
        const { data: { session } } = await sb.auth.getSession();
        if (session) await afterLogin(session); else loginScreen();
      } catch (e) { errScreen('Sistem login tidak tersedia. Refresh halaman.'); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
