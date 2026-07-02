// ============================================================
// Scheduled: End-of-Day digest → dwiputratex@gmail.com
// Schedule is set in netlify.toml ([functions."digest-daily"]).
// Includes new KOLs added today + a pipeline & budget snapshot.
// Also runnable manually for testing: GET ?key=<CRON_SECRET>
// ============================================================
const { fetchKOL, buildDailyDigest } = require('./lib/report');
const { send } = require('./lib/mail');

exports.handler = async (event) => {
  // Manual HTTP invocation (testing) must present CRON_SECRET; the Netlify
  // scheduler invokes without query params and is always allowed.
  const isManual = event && event.httpMethod === 'GET';
  if (isManual) {
    const key = (event.queryStringParameters || {}).key || '';
    if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) {
      return { statusCode: 403, body: JSON.stringify({ error: 'forbidden' }) };
    }
  }
  try {
    const kol = await fetchKOL();
    const { subject, html, text } = buildDailyDigest(kol);
    const res = await send({ subject, html, text });
    return { statusCode: 200, body: JSON.stringify({ ok: true, sent: !res.skipped, mail: res }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: String(e.message || e) }) };
  }
};
