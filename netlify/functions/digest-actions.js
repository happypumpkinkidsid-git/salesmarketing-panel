// ============================================================
// Scheduled: every-3-days "Actions needed" nudge → dwiputratex@gmail.com
// Schedule is set in netlify.toml ([functions."digest-actions"]).
// Lists each pending next-step grouped by owner (Alex / Hasna / Rahmi).
// Also runnable manually for testing: GET ?key=<CRON_SECRET>
// ============================================================
const { fetchKOL, buildActionsDigest } = require('./lib/report');
const { send } = require('./lib/mail');

exports.handler = async (event) => {
  const isManual = event && event.httpMethod === 'GET';
  if (isManual) {
    const key = (event.queryStringParameters || {}).key || '';
    if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
      return { statusCode: 403, body: JSON.stringify({ error: 'forbidden' }) };
    }
  }
  try {
    const kol = await fetchKOL();
    const { subject, html, text } = buildActionsDigest(kol);
    const res = await send({ subject, html, text });
    return { statusCode: 200, body: JSON.stringify({ ok: true, sent: !res.skipped, mail: res }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e.message || e) }) };
  }
};
