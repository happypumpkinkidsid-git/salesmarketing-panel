// ============================================================
// KOL Command Center — AI decision assistant (Netlify Function)
// Alex types a plain-language instruction ("deal lenaa + hideo, cancel the
// other 3 pending"); this function reads the live KOL pipeline context, asks
// Claude to interpret it, and returns a list of PROPOSED actions + a summary.
//
// It NEVER writes to Supabase. The browser shows the proposal, Alex confirms,
// and the existing kol.js handlers apply the changes. So the model can suggest
// but cannot silently change the pipeline.
//
//   POST { instruction:"…", kol:[ {handle,status,…} ] }
//     → { summary, clarify, actions:[ {handle,op,value,decision,reason} ] }
//
// Env: ANTHROPIC_API_KEY (server-side only) + the same SUPABASE_* vars kol.js
//      uses, to verify the caller's login.
// ============================================================

const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

const SUPABASE_URL   = process.env.SUPABASE_URL;
const SERVICE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY;
const MODEL          = 'claude-opus-4-8';

// Same origin allowlist as kol.js.
const ALLOWED = [
  'https://hpsalesadmin.netlify.app',
  'http://localhost:8888', 'http://localhost:8091',
];
function corsFor(event) {
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
  const ok = ALLOWED.includes(origin) || /^https:\/\/[a-z0-9-]+--hpsalesadmin\.netlify\.app$/.test(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : ALLOWED[0],
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}

// The shape Claude must return. Only ops the UI knows how to apply.
const OPS = ['set_status', 'set_month', 'set_products', 'set_cash', 'set_barter', 'add_note', 'set_latest_update', 'none'];
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'clarify', 'actions'],
  properties: {
    summary: { type: 'string', description: 'One or two sentences in Indonesian summarising what you understood and propose to do.' },
    clarify: { type: 'string', description: 'If the instruction is ambiguous or refers to a KOL not in the data, ask the question here (Indonesian). Empty string if clear.' },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['handle', 'op', 'value', 'decision', 'reason'],
        properties: {
          handle:   { type: 'string', description: 'Exact KOL handle from the data. Empty for set_latest_update.' },
          op:       { type: 'string', enum: OPS },
          value:    { type: 'string', description: 'For set_status: one of KANDIDAT/PENDING/HOLD/NEGOSIASI/DEAL/BARTER/SELESAI/CANCEL. For set_month: e.g. "Juli 2026". For set_products: comma-separated collection names. For set_cash/set_barter: a plain number in rupiah. For add_note/set_latest_update: the text.' },
          decision: { type: 'string', enum: ['', 'Approve', 'Hold', 'Defer', 'Disapprove'], description: 'Only with set_status when a management decision applies (Approve=deal, Disapprove=cancel).' },
          reason:   { type: 'string', description: 'Short reason (Indonesian), grounded in the data — e.g. budget, counter-offer, instruction.' },
        },
      },
    },
  },
};

function systemPrompt() {
  return `Kamu asisten keputusan untuk Happy Pumpkin (brand fashion anak, Indonesia), khusus untuk pipeline KOL/endorse. Penggunanya Alex (owner/approver) dan Hasna (content/sourcing).

Tugasmu: membaca instruksi singkat dalam bahasa sehari-hari (campur ID/EN) lalu menerjemahkannya menjadi daftar AKSI terstruktur terhadap KOL yang ADA di data konteks. Kamu hanya MENGUSULKAN; manusia yang menyetujui & menerapkan.

Pipeline & status: KANDIDAT → NEGOSIASI → PENDING (menunggu approve Alex) → DEAL atau CANCEL. Lainnya: HOLD (diparkir), BARTER (deal barter), SELESAI (selesai diproses).
- "deal / gas / approve / ambil" untuk KOL PENDING → op set_status, value "DEAL", decision "Approve".
- "cancel / batal / tolak / skip" → op set_status, value "CANCEL", decision "Disapprove".
- "nego / tawar lagi" → set_status "NEGOSIASI".
- "hold / tahan dulu" → set_status "HOLD".
- Ubah bulan campaign → set_month (mis. "Juli 2026").
- Tetapkan produk/koleksi → set_products (nama koleksi, dipisah koma).
- Ubah angka cash/barter yang disepakati → set_cash / set_barter (angka rupiah polos, mis. 3000000).
- Catatan / ronde nego → add_note.
- Update papan "Latest Update" → set_latest_update (handle kosong).

Anggaran bulanan Rp 15.000.000. Pertimbangkan budget bila relevan dan sebutkan di reason.

ATURAN PENTING:
1. Hanya gunakan handle yang PERSIS ada di data. Jangan mengarang KOL.
2. Bila instruksi ambigu, merujuk KOL yang tak ada, atau berisiko (mis. "cancel semua"), JANGAN menebak — isi field "clarify" dengan pertanyaan dan kosongkan/minimalkan actions.
3. Bila pengguna menyebut grup ("yang pending", "3 sisanya"), petakan ke handle nyata dari data; sebut handle yang kamu pilih di summary.
4. Jangan menerapkan apa pun sendiri; cukup usulkan. Tulis dalam Bahasa Indonesia singkat.`;
}

function userBlock(instruction, kol) {
  // Compact the pipeline so the model has only what it needs.
  const rows = (kol || []).slice(0, 200).map(k => ({
    handle: k.handle,
    status: k.status,
    decision: k.decision || '',
    bulan: k.campaign_month || '',
    produk: k.produk || '',
    cash: Number(k.rate_cash) || 0,
    barter: Number(k.rate_barter) || 0,
    tier: k.tier || '',
    niche: k.niche || '',
    catatan: [k.angle, k.notes_hasna, k.last_offer].filter(Boolean).join(' · ').slice(0, 240),
  }));
  return `INSTRUKSI ALEX:\n${instruction}\n\nDATA PIPELINE KOL (${rows.length} baris):\n${JSON.stringify(rows)}`;
}

exports.handler = async (event) => {
  const CORS = corsFor(event);
  const reply = (statusCode, body) => ({ statusCode, headers: CORS, body: JSON.stringify(body) });
  if (event.httpMethod === 'OPTIONS') return reply(200, {});
  if (event.httpMethod !== 'POST')   return reply(405, { error: 'method_not_allowed' });

  if (!ANTHROPIC_KEY) {
    return reply(503, { error: 'ai_unconfigured',
      hint: 'Set ANTHROPIC_API_KEY in Netlify env (Site settings → Environment variables), then redeploy.' });
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return reply(503, { error: 'backend_unconfigured' });
  }

  // Same login gate as kol.js — owner or content only.
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const authz = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  const jwt = authz.replace(/^Bearer\s+/i, '');
  if (!jwt) return reply(401, { error: 'auth_required' });
  try {
    const { data: { user }, error } = await sb.auth.getUser(jwt);
    if (error || !user) return reply(401, { error: 'invalid_token' });
    const { data: m } = await sb.from('members').select('role').eq('email', user.email).maybeSingle();
    if (!m || !['owner', 'content'].includes(m.role)) return reply(403, { error: 'forbidden' });
  } catch (e) { return reply(401, { error: 'auth_failed' }); }

  let instruction, kol;
  try {
    const body = JSON.parse(event.body || '{}');
    instruction = (body.instruction || '').toString().trim();
    kol = Array.isArray(body.kol) ? body.kol : [];
  } catch (e) { return reply(400, { error: 'bad_request' }); }
  if (!instruction) return reply(400, { error: 'empty_instruction' });

  try {
    const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      system: systemPrompt(),
      messages: [{ role: 'user', content: userBlock(instruction, kol) }],
    });
    const textBlock = (response.content || []).find(b => b.type === 'text');
    if (!textBlock) return reply(502, { error: 'no_response' });
    let parsed;
    try { parsed = JSON.parse(textBlock.text); }
    catch (e) { return reply(502, { error: 'parse_failed', raw: textBlock.text }); }
    return reply(200, parsed);
  } catch (e) {
    const status = e && e.status;
    if (status === 401) return reply(502, { error: 'ai_auth_failed', hint: 'ANTHROPIC_API_KEY invalid.' });
    if (status === 429) return reply(502, { error: 'ai_rate_limited', hint: 'Coba lagi sebentar.' });
    return reply(500, { error: 'ai_error', detail: String((e && e.message) || e) });
  }
};
