// ============================================================
// KOL INTELLIGENCE — the consideration layer.
// Single source of truth for: product → selling-mode, creator-profile rules,
// and recommendFor() which turns a creator's signals into a brief recommendation.
// Pure data + functions; no DOM. See docs/kol-command-center-audit.md.
// ============================================================
(function (g) {

  // ── Product playbook: how each product wants to be sold ─────────────────────
  // mode = the NATURAL lead selling mode. Rule: the harder a product's value is
  // to SEE, the softer you sell it (explain first).
  const PRODUCT_PLAYBOOK = {
    'UltraCool':   { mode:'Mid',  also:['Soft','Hard'], story:'Patented cooling, 1yr R&D', trigger:'Functional innovation', avoid:'Cold hard-sell — value is invisible without the story' },
    'PureKnit':    { mode:'Mid',  also:['Soft'],        story:'Seamless, zero irritation',  trigger:'Functional safety',     avoid:'Hard-sell on first touch' },
    'BreatheKnit': { mode:'Mid',  also:['Soft'],        story:'Breathable functional knit', trigger:'Functional comfort',    avoid:'Pure fashion framing' },
    'SoftAir':     { mode:'Soft', also:['Mid'],         story:'Soft, airy comfort',         trigger:'Sensory / emotional',   avoid:'Spec-heavy hard-sell' },
    'ActiveKnit':  { mode:'Mid',  also:['Hard'],        story:'4-way stretch, sweat-wicking',trigger:'Performance / real-kids',avoid:'Static, sleepy framing' },
    'Wonder Set':  { mode:'Hard', also:['Mid'],         story:'Day-to-night, community relaunch', trigger:'Scarcity + gifting', avoid:'Awareness-only, no urgency' },
    'Sunny Days':  { mode:'Hard', also:['Soft'],        story:'Fashion basic, bundle value',trigger:'Emotional impulse + value', avoid:'Over-explaining' },
    'Fashion':     { mode:'Hard', also:[],              story:'Seasonal OOTD (dresses, culotte)', trigger:'Lifestyle aspiration', avoid:'Educational framing' },
  };
  // normalize a free-text product mention → playbook key
  const PRODUCT_ALIASES = {
    'ultracool':'UltraCool','ultra cool':'UltraCool','pureknit':'PureKnit','breatheknit':'BreatheKnit',
    'breathe knit':'BreatheKnit','softair':'SoftAir','soft air':'SoftAir','activeknit':'ActiveKnit',
    'wonder set':'Wonder Set','wonderset':'Wonder Set','sunny days':'Sunny Days',
    'serena':'Fashion','culotte':'Fashion','dress':'Fashion','jeans':'Fashion','fashion':'Fashion',
    'sleepwear':'Wonder Set','babywear':'SoftAir',
  };
  function productKeys(text) {
    const t = (text || '').toLowerCase();
    const found = new Set();
    Object.keys(PRODUCT_ALIASES).forEach(a => { if (t.includes(a)) found.add(PRODUCT_ALIASES[a]); });
    return [...found];
  }

  // ── Creator profiles (the consideration layer) ──────────────────────────────
  // Mirrors the Brief Generator's kolGetNicheProfile() so the two stay aligned.
  const CREATOR_PROFILES = {
    Educational: { label:'Educational / detail-conscious', brief:'Soft → Mid',
      products:['PureKnit','BreatheKnit','UltraCool','SoftAir'], trigger:'Functional safety / innovation',
      angle:'"Detail you\'d miss" — functional reasoning, honest review', audience:'Researcher (reads before buying)' },
    Fashion: { label:'Fashion / OOTD / aesthetic', brief:'Hard (+Soft awareness)',
      products:['Sunny Days','Fashion','UltraCool'], trigger:'Lifestyle aspiration / impulse',
      angle:'Visual desire → "link in bio"', audience:'Impulse (visual buyer)' },
    Baby: { label:'Baby / Newborn', brief:'Mid / Soft (trust)',
      products:['PureKnit','SoftAir','BreatheKnit','Wonder Set'], trigger:'Functional safety (anxious parent)',
      angle:'Skin-safety, SNI, gentle on sensitive skin', audience:'New parent, very detail-conscious' },
    Sleep: { label:'Sleep / Bedtime', brief:'Soft / Mid',
      products:['Wonder Set','SoftAir'], trigger:'Comfort / sentimental',
      angle:'Night-routine comfort, "kulit kedua"', audience:'Comfort-first parents' },
    FamilyVlog: { label:'Family-Vlog', brief:'Mid / Hard',
      products:['Sunny Days','Wonder Set','ActiveKnit'], trigger:'Authenticity / real-kids',
      angle:'Story-driven, product appears natural in scene', audience:'Young families, dad + mom relevant' },
    Mom: { label:'Mom / Lifestyle (default)', brief:'Mid',
      products:['UltraCool','ActiveKnit','Sunny Days'], trigger:'Everyday value',
      angle:'Relatable everyday value', audience:'Mom 25–35, active on IG' },
  };

  function inferContentStyle(text) {
    const t = (text || '').toLowerCase();
    const has = (...w) => w.some(x => t.includes(x));
    if (has('fashion','style','ootd','outfit','aesthetic','visual','dress','culotte')) return 'Fashion';
    if (has('tidur','sleep','malam','bedtime','sleepwear','loungewear'))               return 'Sleep';
    if (has('vlog','family','keluarga','ayah','suami','couple'))                       return 'FamilyVlog';
    if (has('baby','bayi','newborn','lahir','babywear','0m','1m','2m','3m'))           return 'Baby';
    if (has('edukasi','educational','tips','review','jujur','teliti','detail','honest')) return 'Educational';
    return 'Mom';
  }

  // family situation — the signal that was being lost in keterangan
  function inferFamily(text) {
    const t = (text || '').toLowerCase();
    // \btwins?\b = literal twins; "twinning" (a matching-content technique) is Sibling
    if (/\btwins?\b|kembar/.test(t))                     return 'Twins';
    if (/adik|kakak|sibling|saudara|twinning/.test(t))   return 'Sibling';
    return 'Solo';
  }

  // ── match a KB collection by keyword overlap (shared HP_PRODUCT_DB) ──────────
  function recommendCollection(signal) {
    const db = (typeof window !== 'undefined') ? window.HP_PRODUCT_DB : (typeof global !== 'undefined' ? global.HP_PRODUCT_DB : null);
    if (!db || !db.collections) return null;
    const t = (signal || '').toLowerCase();
    let best = null, bestScore = 0;
    for (const c of db.collections) {
      let score = 0;
      for (const kw of (c.keywordCloud || [])) if (t.includes(String(kw).toLowerCase())) score++;
      // cleaned collection name (drop ™ and "(…)") — catches product-name mentions
      const cleanName = c.name.toLowerCase().replace(/™/g, '').replace(/\s*\(.*?\)\s*/g, '').trim();
      if (cleanName && t.includes(cleanName)) score += 3;
      // explicit article (SKU) name mention
      for (const a of (c.articles || [])) if (a.name && t.includes(String(a.name).toLowerCase())) score += 2;
      if (score > bestScore) { bestScore = score; best = c; }
    }
    if (!best) return null;
    const hook = (best.hooks && best.hooks[0]) ? best.hooks[0] : null;
    return { id: best.id, name: best.name, score: bestScore, hookId: hook ? hook.id : '', hookEn: hook ? hook.en : '' };
  }

  // ── recommendFor: the engine ────────────────────────────────────────────────
  function recommendFor(kol) {
    const signal = [kol.niche, kol.angle, kol.notes_hasna, kol.produk, kol.scope, kol.internal_notes]
      .filter(Boolean).join('  ');
    // Human-set values win; otherwise infer from the notes.
    const styleSet  = kol.content_style && CREATOR_PROFILES[kol.content_style];
    const familySet = ['Solo','Sibling','Twins'].includes(kol.family_situation);
    const style  = styleSet  ? kol.content_style    : inferContentStyle(signal);
    const family = familySet ? kol.family_situation : inferFamily(signal);
    const prof   = CREATOR_PROFILES[style];

    // products: what they were already assigned (normalized) ∪ profile suggestions
    const assigned = productKeys([kol.produk, kol.angle, kol.scope].filter(Boolean).join(' '));
    const suggested = prof.products.filter(p => !assigned.includes(p));
    const products = [...assigned, ...suggested];

    // brief lead = product's natural mode if a clear product is set, else profile lead
    const leadProduct = assigned[0] || prof.products[0];
    const productDriven = assigned.length > 0 && PRODUCT_PLAYBOOK[assigned[0]];
    const productMode = productDriven ? PRODUCT_PLAYBOOK[assigned[0]].mode : null;
    const briefType = productMode ? mapMode(productMode) : firstMode(prof.brief);
    // what drove the brief — avoids a contradictory "Mid (Hard)" headline
    const briefBasis = productDriven
      ? `produk ${assigned[0]} → ${productMode}`
      : `profil ${prof.label.split(/[\s/]/)[0]} → ${prof.brief}`;

    // family bias → set/bundle + twinning
    const familyNote = family === 'Twins'
      ? 'Twins → matching/“twinning” content, sibling SET = bundle value.'
      : family === 'Sibling'
      ? 'Has sibling → sibling-set & matching angle, bundle logic.'
      : null;

    const rationale = [];
    rationale.push(`Content style **${prof.label}** → audience = ${prof.audience}.`);
    if (leadProduct && PRODUCT_PLAYBOOK[leadProduct])
      rationale.push(`Lead product **${leadProduct}** (${PRODUCT_PLAYBOOK[leadProduct].story}) sells best **${PRODUCT_PLAYBOOK[leadProduct].mode}** — ${PRODUCT_PLAYBOOK[leadProduct].avoid.toLowerCase()}.`);
    if (familyNote) rationale.push(familyNote);

    return {
      contentStyle: style, contentLabel: prof.label, family,
      styleInferred: !styleSet, familyInferred: !familySet,
      briefType, briefRange: prof.brief, briefBasis,
      collection: recommendCollection(signal),
      products, leadProduct,
      angle: prof.angle, trigger: prof.trigger, audience: prof.audience,
      familyNote, rationale,
    };
  }

  // 'Soft → Mid' → 'Soft-selling' ; 'Hard' → 'Hard-selling'
  function firstMode(range) { return mapMode((range || 'Mid').split(/[\s/→]+/)[0]); }
  function mapMode(m) {
    m = (m || '').toLowerCase();
    if (m.startsWith('soft')) return 'Soft-selling';
    if (m.startsWith('hard')) return 'Hard-selling';
    return 'Mid-selling';
  }

  g.KOL_INTEL = {
    PRODUCT_PLAYBOOK, CREATOR_PROFILES,
    recommendFor, recommendCollection, inferContentStyle, inferFamily, productKeys, mapMode,
  };
})(window);
