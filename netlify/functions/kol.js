// ============================================================
// KOL Command Center — serverless API (Netlify Function)
// The ONLY component that talks to Supabase. Holds the service-role key.
// Browser → this function → Supabase. Anon key never ships to the client.
//
// Routes (single endpoint, dispatched by ?action= or POST body.action):
//   GET  /.netlify/functions/kol            → { kol:[], negotiations:[], state:{} }
//   POST { action:'upsert_kol', kol:{...} }
//   POST { action:'patch_kol', id, patch:{...} }
//   POST { action:'add_negotiation', entry:{...} }
//   POST { action:'set_latest_update', text, by }
//   POST { action:'seed', kol:[...] }       → bulk insert (idempotent upsert)
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Lock CORS to the site origin (+ localhost dev). Same-origin app calls are
// unaffected; this blocks other websites from browser-calling this endpoint.
const ALLOWED = [
  'https://hpsalesadmin.netlify.app',
  'http://localhost:8888', 'http://localhost:8091',
];
function corsFor(event) {
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
  const ok = ALLOWED.includes(origin) || /^https:\/\/[a-z0-9-]+--hpsalesadmin\.netlify\.app$/.test(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : ALLOWED[0],
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}

exports.handler = async (event) => {
  const CORS = corsFor(event);
  const reply = (statusCode, body) => ({ statusCode, headers: CORS, body: JSON.stringify(body) });
  if (event.httpMethod === 'OPTIONS') return reply(200, {});

  // If env not configured, tell the client to fall back to localStorage.
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return reply(503, { error: 'backend_unconfigured',
      hint: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify env.' });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // Require a logged-in owner/content member (KOL data is their domain).
  const authz = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  const jwt = authz.replace(/^Bearer\s+/i, '');
  if (!jwt) return reply(401, { error: 'auth_required' });
  try {
    const { data: { user }, error } = await sb.auth.getUser(jwt);
    if (error || !user) return reply(401, { error: 'invalid_token' });
    const { data: m } = await sb.from('members').select('role').eq('email', user.email).maybeSingle();
    if (!m || !['owner', 'content', 'sales'].includes(m.role)) return reply(403, { error: 'forbidden' });
  } catch (e) { return reply(401, { error: 'auth_failed' }); }

  try {
    if (event.httpMethod === 'GET') {
      const [kol, neg, state] = await Promise.all([
        sb.from('kol').select('*').order('updated_at', { ascending: false }),
        sb.from('negotiations').select('*').order('log_date', { ascending: false }),
        sb.from('app_state').select('*'),
      ]);
      if (kol.error) throw kol.error;
      const stateObj = {};
      (state.data || []).forEach(r => { stateObj[r.key] = r.value; });
      return reply(200, { kol: kol.data || [], negotiations: neg.data || [], state: stateObj });
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const action = body.action;

      if (action === 'upsert_kol') {
        const { data, error } = await sb.from('kol').upsert(body.kol).select();
        if (error) throw error;
        return reply(200, { ok: true, kol: data });
      }

      if (action === 'patch_kol') {
        const patch = { ...body.patch };
        const { data, error } = await sb.from('kol').update(patch).eq('id', body.id).select();
        if (error) throw error;
        return reply(200, { ok: true, kol: data });
      }

      if (action === 'add_negotiation') {
        const { data, error } = await sb.from('negotiations').insert(body.entry).select();
        if (error) throw error;
        return reply(200, { ok: true, entry: data });
      }

      if (action === 'set_latest_update') {
        const value = { text: body.text || '', by: body.by || '', at: new Date().toISOString() };
        const { error } = await sb.from('app_state')
          .upsert({ key: 'latest_update', value });
        if (error) throw error;
        return reply(200, { ok: true, value });
      }

      // Attach a generated brief file → private 'briefs' bucket → signed link.
      // Sets workflow.brief_created so the next step auto-advances to Rahmi.
      if (action === 'upload_brief') {
        const { id, filename, contentType, data_b64 } = body;
        if (!id || !data_b64) return reply(400, { error: 'bad_upload' });
        const safe = String(filename || 'brief').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60) || 'brief';
        const path = `${id}/${Date.now()}-${safe}`;
        const buf = Buffer.from(data_b64, 'base64');
        if (buf.length > 10 * 1024 * 1024) return reply(413, { error: 'too_large' });
        const up = await sb.storage.from('briefs')
          .upload(path, buf, { contentType: contentType || 'application/pdf', upsert: true });
        if (up.error) throw up.error;
        const signed = await sb.storage.from('briefs').createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signed.error) throw signed.error;
        const cur = await sb.from('kol').select('workflow').eq('id', id).maybeSingle();
        const wf = Object.assign({}, (cur.data && cur.data.workflow) || {}, {
          brief_created: true,
          brief_url: signed.data.signedUrl,
          brief_path: path,
          brief_at: new Date().toISOString(),
        });
        const { error } = await sb.from('kol').update({ workflow: wf }).eq('id', id);
        if (error) throw error;
        return reply(200, { ok: true, url: signed.data.signedUrl, workflow: wf });
      }

      // Re-sign a stored brief path (links expire after 1 year).
      if (action === 'sign_brief') {
        if (!body.path) return reply(400, { error: 'no_path' });
        const s = await sb.storage.from('briefs').createSignedUrl(body.path, 60 * 60 * 24 * 365);
        if (s.error) throw s.error;
        return reply(200, { ok: true, url: s.data.signedUrl });
      }

      if (action === 'seed') {
        const rows = body.kol || [];
        const { data, error } = await sb.from('kol').upsert(rows, { onConflict: 'id' }).select('id');
        if (error) throw error;
        return reply(200, { ok: true, seeded: (data || []).length });
      }

      return reply(400, { error: 'unknown_action', action });
    }

    return reply(405, { error: 'method_not_allowed' });
  } catch (e) {
    return reply(500, { error: 'server_error', detail: String(e.message || e) });
  }
};
