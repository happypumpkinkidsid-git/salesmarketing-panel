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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

function reply(statusCode, body) {
  return { statusCode, headers: CORS, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return reply(200, {});

  // If env not configured, tell the client to fall back to localStorage.
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return reply(503, { error: 'backend_unconfigured',
      hint: 'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify env.' });
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

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
