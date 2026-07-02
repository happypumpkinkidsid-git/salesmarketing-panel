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

    // Command Center is LIVE-ONLY: never fall back to a stale local cache. If the
    // backend can't be reached we report 'offline' and the UI shows a reconnect
    // state — so what's on screen is always the shared cloud data, never stale.
    async init() {
      const ok = await tryBackend();
      if (!ok) { cache = { kol: [], negotiations: [], state: {} }; mode = 'offline'; }
      return mode;
    },

    kolById(id) { return cache.kol.find(k => k.id === id); },

    // Create a brand-new KOL row (manual add from the dashboard). Live-only:
    // returns null if not connected so the UI can prompt to reconnect.
    async createKOL(fields) {
      if (mode !== 'backend') return null;
      const slug = String(fields.handle || '').trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9._]/g, '');
      let id = 'k_' + (slug || 'kol');
      if (cache.kol.some(k => k.id === id)) id += '_' + Math.random().toString(36).slice(2, 6);
      let by = '';
      try { by = (window.HP_MEMBER && window.HP_MEMBER.name) || (window.parent && window.parent.HP_MEMBER && window.parent.HP_MEMBER.name) || ''; } catch (e) {}
      const row = {
        id, handle: slug, nama: fields.nama || '', platform: fields.platform || 'Instagram',
        tier: fields.tier || '', niche: fields.niche || '', followers: Number(fields.followers) || 0,
        avg_views: 0, er_persen: 0,
        ig_link: fields.ig_link || (slug ? 'https://instagram.com/' + slug : ''),
        kontak_wa: fields.kontak_wa || '', ratecard_orig: fields.ratecard_orig || '',
        scope: fields.scope || '', status: fields.status || 'KANDIDAT',
        decision: '', decision_date: '', campaign_month: '', produk: '', brief_type: '',
        angle: '', ref_link: '', content_style: '', family_situation: '', audience: '',
        rate_cash: 0, rate_barter: 0, rate_card: {},
        notes_hasna: fields.notes_hasna || '', internal_notes: '',
        in_pool: true, in_juni: false, source: 'Manual',
        workflow: { added_by: by, added_at: new Date().toISOString(), pks: [] },
      };
      const r = await post({ action: 'upsert_kol', kol: row });
      if (!r.ok) return null;
      cache.kol.unshift(row);
      return row;
    },

    async patchKOL(id, patch) {
      const k = this.kolById(id); if (!k) return;
      Object.assign(k, patch);
      if (mode === 'backend') await post({ action: 'patch_kol', id, patch });
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

    // Upload a generated brief file → backend stores it + sets workflow.brief_created.
    // Returns the signed URL, or null if not on the live backend.
    async uploadBrief(id, file) {
      if (mode !== 'backend') return null;
      const data_b64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result || '').split(',').pop() || '');
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const r = await post({ action: 'upload_brief', id, filename: file.name,
        contentType: file.type || 'application/pdf', data_b64 });
      if (!r.ok) return null;
      const j = await r.json().catch(() => ({}));
      if (!j.ok) return null;
      const k = this.kolById(id);
      if (k && j.workflow) k.workflow = Object.assign({}, k.workflow || {}, j.workflow);
      return j.url;
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
