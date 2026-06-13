#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
//  HP Sales Dashboard — KOL Brief Generator  QA Bot
//  Run:  node .claude/qa-bot.js
//  Checks: logic correctness, XSS safety, edge-case robustness,
//          HTML output validity, UX completeness, stale references
// ══════════════════════════════════════════════════════════════════

const fs   = require('fs');
const path = require('path');

const APP_JS = path.resolve(__dirname, '../js/app.js');
const src    = fs.readFileSync(APP_JS, 'utf8');

// ── Inject stubs so browser-only globals don't crash ──────────────
const stubs = `
const document = { getElementById:()=>null, querySelector:()=>null,
  querySelectorAll:()=>[], createElement:()=>({style:{},appendChild:()=>{},
  select:()=>{},click:()=>{}}), head:{appendChild:()=>{}}, body:{appendChild:()=>{},removeChild:()=>{}} };
const window = {};
const navigator = { clipboard:{ writeText:()=>Promise.resolve() } };
function showToast(){}
function renderKOLBrief(){}
function kolUpdateHookSuggestions(){}
function kolUpdateNicheHelper(){}
const CONFIG = { sheetId: 'test' };
`;

// ── Extract KOL block: constants + pure logic + brief builder ────
// Ends AFTER kolBuildBriefHTML (just before Export & Actions).
// DOM-heavy functions (renderKOLBrief, generateKOLBrief) are eval'd
// but never called, so document stubs don't matter.
const kolStart = src.indexOf('const HP_PRODUCTS_DB');
const kolEnd   = src.indexOf('// --- Export & Actions ---');
const kolBlock = src.slice(kolStart, kolEnd);

// Eval the logic into scope
try {
  eval(stubs + kolBlock);
} catch(e) {
  console.error('❌ FATAL: Could not eval logic block:', e.message);
  process.exit(1);
}

// ── Test runner ────────────────────────────────────────────────────
let passed = 0, failed = 0, warned = 0;
const bugs = [];

function ok(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { process.stdout.write('  ✓ '); console.log(label); passed++; }
  else { console.log(`  ✗ FAIL  ${label}`);
         console.log(`         got:      ${a}`);
         console.log(`         expected: ${e}`);
         failed++; bugs.push({ sev:'BUG', label, got:a, expected:e }); }
}

function truthy(label, val) {
  if (val) { process.stdout.write('  ✓ '); console.log(label); passed++; }
  else { console.log(`  ✗ FAIL  ${label}`);
         failed++; bugs.push({ sev:'BUG', label }); }
}

function includes(label, str, needle) {
  if (typeof str === 'string' && str.includes(needle)) {
    process.stdout.write('  ✓ '); console.log(label); passed++;
  } else {
    console.log(`  ✗ FAIL  ${label}  (missing: ${needle})`);
    failed++; bugs.push({ sev:'BUG', label, missing: needle });
  }
}

function excludes(label, str, needle) {
  if (typeof str === 'string' && !str.includes(needle)) {
    process.stdout.write('  ✓ '); console.log(label); passed++;
  } else {
    console.log(`  ✗ FAIL  ${label}  (found forbidden: ${needle})`);
    failed++; bugs.push({ sev:'SECURITY', label, found: needle });
  }
}

function noThrow(label, fn) {
  try { fn(); process.stdout.write('  ✓ '); console.log(label); passed++; }
  catch(e) { console.log(`  ✗ THROW ${label}: ${e.message}`);
             failed++; bugs.push({ sev:'CRASH', label, error: e.message }); }
}

function warn(label, msg) {
  console.log(`  ⚠  WARN  ${label}${msg ? ': '+msg : ''}`);
  warned++; bugs.push({ sev:'WARN', label });
}

// ── Helper: build a minimal valid brief data object ────────────────
function mkData(overrides = {}) {
  const tierKey = overrides.tierKey || 'mid';
  return {
    handle:   overrides.handle   ?? '@testuser',
    slug:     overrides.slug     ?? 'testuser',
    tier:     HP_TIERS_DB[tierKey],
    tierKey,
    prods:    overrides.prods    ?? ['Sunny Days', 'ActiveKnit'],
    month:    overrides.month    ?? '2026-05',
    hook:     overrides.hook     ?? 'Konten biasa yang tidak biasa.',
    cashFee:  overrides.cashFee  ?? '300k',
    barter:   overrides.barter   ?? '200k',
    refUrl:   overrides.refUrl   ?? '',
    pic:      overrides.pic      ?? 'Rahmi',
    picWa:    overrides.picWa    ?? '6281292580956',
    nicheText:overrides.nicheText?? '',
    notes:    overrides.notes    ?? '',
    tiktok:   overrides.tiktok   ?? false,
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(' SUITE 1 · kolParseHandle');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

ok('empty string returns empty',              kolParseHandle(''),             '');
ok('bare handle returns as-is',               kolParseHandle('johndoe'),      'johndoe');
ok('@ prefix stripped',                       kolParseHandle('@johndoe'),     'johndoe');
ok('trailing slash stripped',                 kolParseHandle('@johndoe/'),    'johndoe');
ok('just @ returns empty',                    kolParseHandle('@'),            '');
ok('spaces only returns empty',               kolParseHandle('   '),         '');
ok('IG URL extracted',                        kolParseHandle('https://instagram.com/johndoe'), 'johndoe');
ok('IG URL with trailing slash',              kolParseHandle('https://instagram.com/johndoe/'), 'johndoe');
ok('IG URL with query param',                 kolParseHandle('https://instagram.com/johndoe?hl=en'), 'johndoe');
ok('/p/ reserved path returns empty',         kolParseHandle('https://instagram.com/p/abc123'), '');
ok('/reel/ reserved path returns empty',      kolParseHandle('https://instagram.com/reel/abc'), '');
ok('/stories/ reserved path returns empty',   kolParseHandle('https://instagram.com/stories/user'), '');
ok('dots & underscores in handle preserved',  kolParseHandle('@john.doe_123'), 'john.doe_123');
ok('www.instagram.com URL works',             kolParseHandle('https://www.instagram.com/johndoe'), 'johndoe');
ok('http (not https) URL works',              kolParseHandle('http://instagram.com/johndoe'), 'johndoe');

// ══════════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(' SUITE 2 · kolFmtMonth');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

ok('empty string → dash',     kolFmtMonth(''),        '—');
ok('null → dash',             kolFmtMonth(null),      '—');
ok('May 2026',                kolFmtMonth('2026-05'), 'Mei 2026');
ok('January 2026',            kolFmtMonth('2026-01'), 'Januari 2026');
ok('December 2026',           kolFmtMonth('2026-12'), 'Desember 2026');

// Edge: invalid month number
const badMonth = kolFmtMonth('2026-13');
if (badMonth && !badMonth.startsWith('undefined')) {
  process.stdout.write('  ✓ '); console.log('invalid month 13 does not crash');  passed++;
} else {
  console.log(`  ✗ FAIL  invalid month 13 produces garbage: "${badMonth}"`);
  failed++; bugs.push({ sev:'BUG', label:'kolFmtMonth invalid month 13', got: badMonth });
}

const noSeparator = kolFmtMonth('202605');
if (noSeparator && !noSeparator.startsWith('undefined')) {
  process.stdout.write('  ✓ '); console.log('no-separator input does not produce "undefined"'); passed++;
} else {
  console.log(`  ✗ FAIL  kolFmtMonth("202605") → "${noSeparator}"`);
  failed++; bugs.push({ sev:'BUG', label:'kolFmtMonth no separator', got: noSeparator });
}

// ══════════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(' SUITE 3 · kolGetNicheProfile');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const profiles = [
  ['',              'Mom & Parenting'],
  ['fashion ootd',  'Kids Fashion & Aesthetic'],
  ['style outfit',  'Kids Fashion & Aesthetic'],
  ['tidur malam',   'Sleep & Bedtime Routine'],
  ['bedtime baby',  'Sleep & Bedtime Routine'],
  ['family vlog',   'Family Vlog & Life Moments'],
  ['suami ayah',    'Family Vlog & Life Moments'],
  ['newborn bayi',  'Baby & Newborn'],
  ['0m baru lahir', 'Baby & Newborn'],
  ['review jujur',  'Edukatif & Detail-conscious'],
  ['tips mama',     'Edukatif & Detail-conscious'],
  ['masak dapur',   'Mom & Parenting'],  // no match → default
];
for (const [input, expectedLabel] of profiles) {
  const p = kolGetNicheProfile(input);
  ok(`"${input || '(empty)'}" → ${expectedLabel}`, p.label, expectedLabel);
  // Also verify profile has all required fields
  noThrow(`profile for "${input}" has angle/audience/tone/hookStyle`,
    () => { if (!p.angle||!p.audience||!p.tone||!p.hookStyle||!p.optHashtags) throw new Error('missing field'); });
}

// ══════════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(' SUITE 4 · kolGetHookSuggestions');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const tiers = ['soft', 'mid', 'hard'];
const prodSets = [
  [],
  ['Sunny Days'],
  ['ActiveKnit'],
  ['PureKnit'],
  ['UltraCool™'],
  ['Wonder Set™'],
  ['Sunny Days', 'ActiveKnit'],
  ['PureKnit', 'Wonder Set™'],
  ['Sunny Days', 'ActiveKnit', 'PureKnit', 'UltraCool™', 'Wonder Set™'],
];

for (const tier of tiers) {
  for (const prods of prodSets) {
    const label = `${tier} + [${prods.join(',')||'none'}]`;
    noThrow(`no crash: ${label}`, () => {
      const r = kolGetHookSuggestions(tier, prods, '');
      if (!Array.isArray(r)) throw new Error('not array');
      if (r.length !== 4)    throw new Error(`expected 4, got ${r.length}`);
      r.forEach((h,i) => { if (typeof h !== 'string') throw new Error(`item ${i} not string`); });
    });
  }
}

// Invalid tier key falls back
noThrow('invalid tier key falls back to mid', () => {
  const r = kolGetHookSuggestions('INVALID', ['Sunny Days'], '');
  if (!r || r.length !== 4) throw new Error('bad fallback');
});

// Niche text influences hooks
const hookFashion = kolGetHookSuggestions('soft', ['Sunny Days'], 'fashion ootd style');
const hookDefault = kolGetHookSuggestions('soft', ['Sunny Days'], '');
ok('niche text influences soft hooks (fashion ≠ default)',
  hookFashion.join('') !== hookDefault.join(''), true);

// ══════════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(' SUITE 5 · kolBuildBriefHTML — crash safety');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// All tiers
for (const t of ['soft','mid','hard']) {
  noThrow(`builds without crash — tier ${t}`, () => kolBuildBriefHTML(mkData({tierKey:t})));
}

// All products individually
for (const p of Object.keys(HP_PRODUCTS_DB)) {
  noThrow(`builds without crash — single product: ${p}`,
    () => kolBuildBriefHTML(mkData({ prods:[p] })));
}

// All 5 products at once
noThrow('builds with all 5 products', () => kolBuildBriefHTML(mkData({
  prods: Object.keys(HP_PRODUCTS_DB)
})));

// No products (edge — normally blocked by validation but test the builder)
noThrow('builds with empty prods array (no crash)', () => kolBuildBriefHTML(mkData({ prods:[] })));

// Edge: missing/undefined fields
noThrow('builds when cashFee empty', () => kolBuildBriefHTML(mkData({ cashFee:'' })));
noThrow('builds when barter empty',  () => kolBuildBriefHTML(mkData({ barter:'' })));
noThrow('builds when both fee empty',() => kolBuildBriefHTML(mkData({ cashFee:'', barter:'' })));
noThrow('builds when notes empty',   () => kolBuildBriefHTML(mkData({ notes:'' })));
noThrow('builds when picWa empty',   () => kolBuildBriefHTML(mkData({ picWa:'' })));
noThrow('builds with reel ref URL',  () => kolBuildBriefHTML(mkData({ refUrl:'https://instagram.com/reel/ABC123xyz' })));
noThrow('builds with non-reel URL',  () => kolBuildBriefHTML(mkData({ refUrl:'https://instagram.com/p/ABC123' })));
noThrow('builds when month empty',   () => kolBuildBriefHTML(mkData({ month:'' })));
noThrow('builds with tiktok=true',   () => kolBuildBriefHTML(mkData({ tiktok:true })));
noThrow('builds with all niche texts', () => {
  ['fashion ootd','tidur malam','family vlog','newborn bayi','review jujur','masak dapur']
    .forEach(n => kolBuildBriefHTML(mkData({ nicheText: n })));
});

// ══════════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(' SUITE 6 · kolBuildBriefHTML — HTML output correctness');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const html = kolBuildBriefHTML(mkData());

includes('output is valid HTML',         html, '<!DOCTYPE html>');
includes('closing html tag present',     html, '</html>');
includes('@handle shown with @',         html, '@testuser');
includes('month label present',          html, 'Mei 2026');
includes('product Sunny Days present',   html, 'Sunny Days');
includes('product ActiveKnit present',   html, 'ActiveKnit');
includes('tier label present',           html, 'Mid-selling');
includes('page count 01/02',             html, '01 / 02');
includes('page count 02/02',             html, '02 / 02');
includes('HappyPumpkin hashtag',         html, '#HappyPumpkin');
includes('product hashtag SunnyDays',    html, '#SunnyDays');
includes('product hashtag ActiveKnit',   html, '#ActiveKnit');
includes('angle/tema text in brief',     html, 'Konten biasa yang tidak biasa.');
includes('PIC name in brief',            html, 'Rahmi');
includes('WA link in brief',             html, '6281292580956');
includes('do/dont section present',      html, '✓ Do');
includes('dont section present',         html, "× Don");
includes('must-have section present',    html, 'Wajib Ada');
includes('Plus Jakarta Sans loaded',     html, 'Plus+Jakarta+Sans');
includes('fee string shows cash',        html, 'Rp 300k cash');
includes('fee string shows barter',      html, 'Rp 200k barter');
includes('Tujuan Campaign present',      html, 'Tujuan Campaign');
includes('Trust Signals present',        html, 'Trust Signals');

// Brief with empty fees shows dash
const htmlNoFee = kolBuildBriefHTML(mkData({ cashFee:'', barter:'' }));
includes('empty fees shows —', htmlNoFee, '>—<');

// Brief with notes shows them
const htmlNotes = kolBuildBriefHTML(mkData({ notes: 'mama muda, suka flat lay' }));
includes('notes appear in brief', htmlNotes, 'mama muda, suka flat lay');

// Brief without notes omits catatan row
const htmlNoNotes = kolBuildBriefHTML(mkData({ notes: '' }));
excludes('no catatan row when notes empty', htmlNoNotes, '>Catatan<');

// Reel ref URL appears in format line
const htmlRef = kolBuildBriefHTML(mkData({ refUrl:'https://instagram.com/reel/ABC123xyz99' }));
includes('reel ref link appears', htmlRef, 'reel/ABC123xyz9');

// All 5 products have correct brand colors in output
const html5 = kolBuildBriefHTML(mkData({ prods: Object.keys(HP_PRODUCTS_DB) }));
includes('Sunny Days color #D4734A', html5, '#D4734A');
includes('ActiveKnit color #4A8C6F', html5, '#4A8C6F');
includes('PureKnit color #5A4A8C',   html5, '#5A4A8C');
includes('UltraCool color #2E7DAF',  html5, '#2E7DAF');
includes('WonderSet color #B8527A',  html5, '#B8527A');

// Tier colors
const htmlSoft = kolBuildBriefHTML(mkData({ tierKey:'soft' }));
const htmlHard = kolBuildBriefHTML(mkData({ tierKey:'hard' }));
includes('soft tier color #2E6A5E',  htmlSoft, '#2E6A5E');
includes('hard tier color #C9412A',  htmlHard, '#C9412A');

// ══════════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(' SUITE 7 · XSS & Injection Safety');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// XSS payloads in user-controlled fields
const xssScript  = '<script>alert("xss")</script>';
const xssImg     = '<img src=x onerror=alert(1)>';
const xssQuote   = '" onmouseover="alert(1)';
const xssTemp    = '${7*7}';        // template literal injection attempt
const xssBack    = '`; alert(1); `'; // backtick injection

const xssFields = {
  handle:    xssScript,
  notes:     xssScript,
  hook:      xssImg,
};

for (const [field, payload] of Object.entries(xssFields)) {
  const h = kolBuildBriefHTML(mkData({
    [field]: payload,
    slug: field === 'handle' ? 'xsstest' : undefined,
    handle: field === 'handle' ? payload : '@testuser',
  }));
  excludes(`XSS <script> not raw in ${field}`,     h, '<script>alert');
  excludes(`XSS onerror not raw in ${field}`,       h, 'onerror=alert');
}

// Quote injection in attributes
const htmlQuoteInj = kolBuildBriefHTML(mkData({ hook: xssQuote }));
// If the hook is inside a style or attribute, the closing quote would break it
// We check the raw HTML doesn't contain the bare payload as attribute injection
const rawQuoteIdx = htmlQuoteInj.indexOf('" onmouseover="alert(1)');
if (rawQuoteIdx === -1) {
  process.stdout.write('  ✓ '); console.log('quote injection in hook not raw in HTML'); passed++;
} else {
  // Check if it's safely inside a text node vs attribute context
  const before = htmlQuoteInj.substring(Math.max(0, rawQuoteIdx-50), rawQuoteIdx);
  if (before.includes('>') && !before.includes('<') ) {
    warn('quote injection in hook inside text node (lower risk but not escaped)');
  } else {
    console.log('  ✗ FAIL  quote injection possibly in attribute context');
    failed++; bugs.push({ sev:'SECURITY', label:'quote injection in hook/attribute context' });
  }
}

// Template literal injection
const htmlTmpl = kolBuildBriefHTML(mkData({ hook: xssTemp }));
excludes('template literal ${7*7} not evaluated (appears literally)', htmlTmpl, '49');

// ══════════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(' SUITE 8 · Data Integrity');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// All 5 May Launch products exist
const expectedProds = ['Sunny Days','ActiveKnit','PureKnit','UltraCool™','Wonder Set™'];
for (const p of expectedProds) {
  truthy(`HP_PRODUCTS_DB has ${p}`, HP_PRODUCTS_DB[p]);
}
// No old phantom products
for (const ghost of ['BreatheKnit™','SoftAir™','EverSoft™']) {
  ok(`old product ${ghost} removed`, HP_PRODUCTS_DB[ghost], undefined);
}

// Each product has required fields
for (const [name, p] of Object.entries(HP_PRODUCTS_DB)) {
  noThrow(`${name}: has tagline/type/color/features/construction/items/range/trust/hashtags`, () => {
    if (!p.tagline)      throw new Error('missing tagline');
    if (!p.type)         throw new Error('missing type');
    if (!p.color)        throw new Error('missing color');
    if (!p.features?.length) throw new Error('missing features');
    if (!p.construction) throw new Error('missing construction (can be empty array)');
    if (!p.items)        throw new Error('missing items');
    if (!p.range)        throw new Error('missing range');
    if (!p.trust?.length) throw new Error('missing trust');
    if (!p.hashtags?.length) throw new Error('missing hashtags');
  });
  // Features are [name, desc] pairs
  noThrow(`${name}: all features are [name, desc] pairs`, () => {
    p.features.forEach(([n,d],i) => {
      if (typeof n !== 'string' || !n) throw new Error(`feature ${i} missing name`);
      if (typeof d !== 'string' || !d) throw new Error(`feature ${i} missing desc`);
    });
  });
}

// Tiers have required fields
for (const [key, t] of Object.entries(HP_TIERS_DB)) {
  noThrow(`tier ${key} has all required fields`, () => {
    ['num','label','sublabel','color','colorBg','colorSoft',
     'objective','ctaNote','format','tone','trustWith','avoid','musthave']
      .forEach(f => { if (!t[f]) throw new Error(`missing ${f}`); });
  });
}

// HP_MONTHS_ID has exactly 12 entries
ok('HP_MONTHS_ID has 12 months', HP_MONTHS_ID.length, 12);

// No duplicate hashtags across products (brand hashtags only at generator level)
const allHashes = Object.values(HP_PRODUCTS_DB).flatMap(p => p.hashtags);
const uniqueHashes = [...new Set(allHashes)];
ok('no duplicate product hashtags', allHashes.length, uniqueHashes.length);

// ══════════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(' SUITE 9 · Static Source Analysis');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

function srcCheck(label, pattern, shouldExist, sev='BUG') {
  const found = pattern.test ? pattern.test(src) : src.includes(pattern);
  if (found === shouldExist) { process.stdout.write('  ✓ '); console.log(label); passed++; }
  else {
    const msg = shouldExist ? `expected to find: ${pattern}` : `should NOT contain: ${pattern}`;
    console.log(`  ✗ FAIL  ${label}  (${msg})`);
    failed++; bugs.push({ sev, label });
  }
}

// Old product names should be gone
srcCheck('BreatheKnit™ fully removed',  'BreatheKnit',  false, 'STALE');
srcCheck('SoftAir™ fully removed',      'SoftAir',      false, 'STALE');
srcCheck('EverSoft™ fully removed',     'EverSoft',     false, 'STALE');

// New products present
srcCheck('Sunny Days present in source',  'Sunny Days',   true);
srcCheck('UltraCool™ present in source',  'UltraCool™',   true);
srcCheck('Wonder Set™ present in source', 'Wonder Set™',  true);

// Tier labels
srcCheck('t.label used in tier card (not t.humanTitle)', "t.label}", true);
srcCheck('t.humanTitle NOT used in tier card template', /kol-tier-label.*humanTitle/, false, 'BUG');

// Page count updated to 02/02
srcCheck('old 04/04 page count gone',  '04 / 04', false, 'STALE');
srcCheck('new 02/02 page count exists', '02 / 02', true);

// No console.log left in prod
const consoleLogs = (src.match(/console\.log\(/g) || []).length;
if (consoleLogs > 0) warn(`${consoleLogs} console.log() calls remain in prod code`);
else { process.stdout.write('  ✓ '); console.log('no console.log in prod code'); passed++; }

// innerHTML usage with user data (XSS risk patterns)
const innerHTMLWithUser = /innerHTML\s*=\s*`[^`]*\$\{(?:handle|hook|d\.notes|d\.hook|nicheText)/;
if (innerHTMLWithUser.test(src)) {
  warn('innerHTML used with unescaped user data — XSS risk (check in context)');
} else {
  process.stdout.write('  ✓ '); console.log('no obvious innerHTML+user-data XSS pattern'); passed++;
}

// ══════════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(' SUITE 10 · UX / Completeness Checks');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Form field IDs present in source
const formIds = ['kb_ig','kb_niche','kb_notes','kb_tier','kb_month',
                 'kb_hook','kb_cash','kb_barter','kb_ref','kb_pic','kb_pic_wa'];
for (const id of formIds) {
  srcCheck(`form field #${id} defined`, `id="${id}"`, true);
}

// Validation: both required fields have toast messages
srcCheck('angle required toast present', 'Angle / tema wajib diisi ya!', true);
srcCheck('product required toast present','Pilih minimal 1 produk!', true);

// Brief toolbar buttons
srcCheck('Buka & Print PDF button', 'Buka & Print PDF', true);
srcCheck('Download HTML button',    'Download HTML',     true);
srcCheck('Enrich dengan Claude btn','Enrich dengan Claude', true);

// copyKOLClaudePrompt uses correct label
srcCheck('copyKOLClaudePrompt has Angle label', '"Hook: \\"${hook}\\"', true);

// default PIC pre-filled
srcCheck('default PIC Rahmi', "'Rahmi'", true);
srcCheck('default PIC WA',    "'6281292580956'", true);

// ══════════════════════════════════════════════════════════════════
// FINAL REPORT
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(' RESULTS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Passed:  ${passed}`);
console.log(`  Failed:  ${failed}`);
console.log(`  Warned:  ${warned}`);
console.log(`  Total:   ${passed + failed + warned}`);

if (bugs.length > 0) {
  console.log('\n┌── BUG REPORT ───────────────────────');
  const grouped = { CRASH:[], SECURITY:[], BUG:[], STALE:[], WARN:[] };
  bugs.forEach(b => (grouped[b.sev] || grouped.BUG).push(b));
  for (const [sev, list] of Object.entries(grouped)) {
    if (!list.length) continue;
    console.log(`│  ${sev} (${list.length})`);
    list.forEach(b => console.log(`│    · ${b.label}`));
  }
  console.log('└─────────────────────────────────────');
}

// Machine-readable exit code
process.exit(failed > 0 ? 1 : 0);
