// ============================================================
// KOLStore — data layer.
// Backend (Netlify function → Supabase) with localStorage fallback.
// The UI never knows which mode it's in; it just awaits these methods.
// ============================================================
const KOLStore = (() => {
  const API    = '/.netlify/functions/kol';
  const LS_KEY = 'kol_cc_v1';
  let mode  = 'local';                                  // 'backend' | 'local'
  let cache = { kol: [], negotiations: [], state: {} };

  function loadLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { kol: JSON.parse(JSON.stringify(window.KOL_SEED || [])), negotiations: [], state: {} };
  }
  function saveLocal() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(cache)); } catch (e) {}
  }
  // logged-in session token (own window, or parent when embedded in the dashboard)
  function authToken() {
    try { return window.HP_TOKEN || (window.parent && window.parent.HP_TOKEN) || ''; } catch (e) { return ''; }
  }
  function headers(extra) {
    const h = Object.assign({}, extra || {});
    const t = authToken(); if (t) h['Authorization'] = 'Bearer ' + t;
    return h;
  }
  async function post(body) {
    return fetch(API, { method: 'POST', headers: headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body) });
  }

  async function tryBackend() {
    try {
      const r = await fetch(API, { method: 'GET', headers: headers() });
      if (!r.ok) return false;
      const data = await r.json();
      if (data.error) return false;
      if (!data.kol || data.kol.length === 0) {
        await post({ action: 'seed', kol: window.KOL_SEED || [] });
        const d2 = await (await fetch(API, { headers: headers() })).json();
        cache = { kol: d2.kol || [], negotiations: d2.negotiations || [], state: d2.state || {} };
      } else {
        cache = { kol: data.kol, negotiations: data.negotiations || [], state: data.state || {} };
      }
      mode = 'backend';
      return true;
    } catch (e) { return false; }
  }

  return {
    get mode()         { return mode; },
    get kol()          { return cache.kol; },
    get negotiations() { return cache.negotiations; },
    get state()        { return cache.state; },

    async init() {
      const ok = await tryBackend();
      if (!ok) { cache = loadLocal(); mode = 'local'; }
      return mode;
    },

    kolById(id) { return cache.kol.find(k => k.id === id); },

    async patchKOL(id, patch) {
      const k = this.kolById(id); if (!k) return;
      Object.assign(k, patch);
      if (mode === 'backend') await post({ action: 'patch_kol', id, patch });
      else saveLocal();
    },

    negotiationsFor(kolId) {
      return cache.negotiations
        .filter(n => n.kol_id === kolId)
        .sort((a, b) => (b.round || 0) - (a.round || 0));
    },

    async addNegotiation(entry) {
      const local = { id: Date.now(), ...entry };
      cache.negotiations.unshift(local);
      if (mode === 'backend') await post({ action: 'add_negotiation', entry });
      else saveLocal();
      return local;
    },

    async setLatestUpdate(text, by) {
      const value = { text, by, at: new Date().toISOString() };
      cache.state.latest_update = value;
      if (mode === 'backend') await post({ action: 'set_latest_update', text, by });
      else saveLocal();
      return value;
    },

    latestUpdate() { return cache.state.latest_update || null; },

    resetLocal() { try { localStorage.removeItem(LS_KEY); } catch (e) {} },
    exportJSON() { return JSON.stringify(cache, null, 2); },
  };
})();
