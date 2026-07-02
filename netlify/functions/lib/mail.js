// ============================================================
// Centralized email sender — SINGLE swap point for the provider.
// Provider currently: Resend (chosen as default; "decide later").
// To switch providers later, edit only this file.
//
// Env vars (set in Netlify → Site settings → Environment):
//   MAIL_PROVIDER      optional, default 'resend'
//   RESEND_API_KEY     required to actually send (Resend)
//   MAIL_FROM          optional, default 'Happy Pumpkin KOL <onboarding@resend.dev>'
//   MAIL_TO            optional, default 'dwiputratex@gmail.com'
//
// If the key is missing, send() no-ops gracefully (returns {skipped:true})
// so scheduled runs never error before the provider is configured.
// ============================================================

const PROVIDER = process.env.MAIL_PROVIDER || 'resend';
const DEFAULT_FROM = 'Happy Pumpkin KOL <onboarding@resend.dev>';
const DEFAULT_TO   = 'dwiputratex@gmail.com';

async function send({ subject, html, text, to }) {
  const recipient = to || process.env.MAIL_TO || DEFAULT_TO;
  const from = process.env.MAIL_FROM || DEFAULT_FROM;

  if (PROVIDER === 'resend') {
    const key = process.env.RESEND_API_KEY;
    if (!key) return { ok: false, skipped: true, reason: 'RESEND_API_KEY not set — email not sent (provider not yet configured).' };
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [recipient], subject, html, text }),
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, id: j.id, detail: j };
  }

  // TODO (decide-later): add 'sendgrid' / 'gmail-smtp' branches here — this is the
  // only place that needs to change to switch delivery services.
  return { ok: false, skipped: true, reason: 'Unknown MAIL_PROVIDER: ' + PROVIDER };
}

module.exports = { send };
