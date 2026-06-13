// ============================================================
// HP CREATIVE HUB — CONFIGURATION
// ============================================================
// HOW TO CONNECT YOUR GOOGLE SHEET:
//  1. Create a sheet with 4 tabs: Tasks, Calendar, Docs, Hooks
//  2. File → Share → Publish to web → publish each tab as CSV
//  3. Copy the Sheet ID from the URL bar
//  4. Paste it into sheetId below (replace the placeholder)
//  5. Save, reload — data syncs automatically every 60 seconds
// ============================================================

const CONFIG = {

  // --- Google Sheets ---
  sheetId: 'YOUR_SHEET_ID_HERE',   // ← paste your Sheet ID here

  gids: {
    tasks:    '0',   // GID of the Tasks tab (check URL when tab is selected)
    calendar: '1',   // GID of the Calendar tab
    docs:     '2',   // GID of the Docs tab
    hooks:    '3',   // GID of the Hooks tab
  },

  // Direct URL to open when user clicks "Edit in Sheets"
  sheetUrl: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE',

  // --- Team ---
  team: ['All', 'Sarah', 'Rina', 'Dika', 'Alex', 'Bella'],

  // --- Platforms ---
  platforms: ['All', 'Instagram', 'TikTok', 'Facebook', 'YouTube', 'Shopee', 'Other'],

  platformColors: {
    Instagram: '#E1306C',
    TikTok:    '#000000',
    Facebook:  '#1877F2',
    YouTube:   '#FF0000',
    Shopee:    '#EE4D2D',
    Other:     '#94A3B8',
  },

  // --- Auto-refresh ---
  refreshInterval: 60000,

  // ============================================================
  // PSYCHOLOGY TRIGGERS (from competitor intelligence)
  // ============================================================
  psychTriggers: [
    { name: 'Functional safety',      def: 'SNI/OEKO-TEX certs, skin-safe, no harmful chemicals',                            brands: 'Libby, Bohopanna, Nice Kids, Baby Loop, Little Palmerhaus' },
    { name: 'Emotional impulse',      def: '"My child looks cute = I\'m a good parent" — visual cuteness drives unplanned purchase', brands: 'Bohopanna, Cuit, Yobebee' },
    { name: 'Habitual repeat',        def: 'Kids grow fast → constant resizing → built-in repurchase cycle',                  brands: 'All brands — core repeat mechanic' },
    { name: 'Bundle / set logic',     def: 'Matching sets, sibling sets, family matchy-matchy',                               brands: 'Bohopanna, Little Palmerhaus' },
    { name: 'Gifting',                def: 'Newborn gifts, Lebaran outfits, birthday presents',                               brands: 'Nice Kids, Little Palmerhaus (Disney/Sanrio), Baby Loop' },
    { name: 'Milestone / event',      def: 'Lebaran, first birthday, school entry, family photos',                            brands: 'All — seasonal campaigns' },
    { name: 'Sentimental / fleeting', def: '"They grow up so fast" — moment scarcity drives urgency',                         brands: 'Yobebee, Little Palmerhaus' },
    { name: 'Social proof',           def: 'Mom communities, Shopee reviews, KOL endorsement',                               brands: 'Libby (966K IG), Bohopanna (events)' },
    { name: 'Trust / certification',  def: 'SNI, OEKO-TEX as purchase justification for anxious parents',                    brands: 'Baby Loop, Libby, Nice Kids' },
    { name: 'Lifestyle aspiration',   def: '"Stylish kid = stylish family" — parent self-expression via child',               brands: 'Bohopanna, Cuit, Little Palmerhaus' },
  ],

  whiteSpace: [
    { title: 'Bundling with emotional narrative', desc: 'Sets sold as "moments" not just clothing' },
    { title: 'Fleeting moment urgency',           desc: '"They won\'t fit this size for long" framing' },
    { title: 'Parent lifestyle aspiration',       desc: "The parent's identity, not just the child's comfort" },
    { title: 'Gifting with occasion specificity', desc: 'Targeted gift messaging beyond generic Lebaran' },
  ],

  // ============================================================
  // COMPETITORS
  // ============================================================
  competitors: [
    {
      name: 'Bohopanna', aka: 'Bohobabyofficialstore', scale: '🔴 Very High',
      followers: '534K IG', price: 'IDR 40K–200K', ages: 'Newborn–10yr',
      certs: 'OEKO-TEX, SNI', hq: 'Semarang',
      positioning: 'Stylish affordable daily wear, bohemian aesthetic, wide size range',
      tagline: '"Your Little One\'s Stylish Dailywear"',
      angles: ['Style-first + comfort validation', 'New collection drops (urgency)', 'Seasonal campaigns (Lebaran, back-to-school)', 'Lifestyle / active family events'],
      adUrl: 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ID&search_type=page&view_all_page_id=106054137987511',
    },
    {
      name: 'Little Palmerhaus', aka: null, scale: '🔴 Very High',
      followers: '408K IG', price: 'IDR 40K–250K', ages: 'Newborn–kids',
      certs: 'SNI', hq: 'Tangerang',
      positioning: 'Premium quality meets comfort, earthy/timeless aesthetic, maternal trust',
      tagline: '"Where Quality Meets Comfort"',
      angles: ['Material quality / skin safety', 'Timeless design (value framing)', 'Gifting (Disney/Sanrio collabs)', 'Sentimental / milestone moments'],
      adUrl: 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&search_type=page&view_all_page_id=102180987938711',
    },
    {
      name: 'Cuit Babywear', aka: null, scale: '🟠 High',
      followers: '312K IG', price: 'Mid-range', ages: 'Baby–kids',
      certs: '—', hq: 'Bandung',
      positioning: 'Nature-inspired comfort, soft aesthetics, Bandung craft identity',
      tagline: '"Inspired by Nature"',
      angles: ['Organic / nature safety angle', 'Soft aesthetic / visual appeal', 'Local craft pride'],
      adUrl: 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ID&search_type=page&view_all_page_id=1203574416370380',
    },
    {
      name: 'Yobebee', aka: null, scale: '🟠 High',
      followers: '139K IG', price: '—', ages: '—',
      certs: '—', hq: '—',
      positioning: 'Authentic lifestyle, real kid moments, casual timeless',
      tagline: '"Real Kids, Real Moments, Real Yobebee"',
      angles: ['Authenticity / UGC-style content', 'Lifestyle aspiration (real kids, not models)', 'Promo-heavy (frequent discount cadence)'],
      adUrl: 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ID&search_type=page&view_all_page_id=330014347888223',
    },
    {
      name: 'Nice Kids', aka: null, scale: '🟡 Medium-High',
      followers: '—', price: '—', ages: '—',
      certs: '—', hq: '—',
      positioning: 'Gift-forward, premium comfort, innovation-led materials',
      tagline: '"Treat your little one to something special"',
      angles: ['Gifting triggers (newborn, birthday, occasion)', 'Material innovation / eco angle', 'Premium without guilt'],
      adUrl: 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ID&search_type=page&view_all_page_id=557606664656803',
    },
    {
      name: 'Baby Loop', aka: 'Baby Loop Indonesia', scale: '🟠 High',
      followers: '221K IG', price: '—', ages: 'Newborn+',
      certs: 'SNI', hq: '—',
      positioning: "Mom's first choice for newborn, trust and safety-first",
      tagline: '"Moms 1st choice — Newborn Essentials & Bedding"',
      angles: ['New parent anxiety / trust (SNI front & centre)', 'Newborn gifting (baby shower, birth gifts)', 'Essentials bundling (diapers + bedding + clothing)', '"Mom community" social proof'],
      adUrl: 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ID&search_type=page&view_all_page_id=298585253860150',
    },
    {
      name: 'Libby Baby', aka: null, scale: '🔴 Very High',
      followers: '966K IG / 105K FB', price: 'IDR 30K–120K', ages: 'Newborn–14yr',
      certs: 'OEKO-TEX, SNI', hq: '—',
      positioning: 'Mass market trusted safety brand, widest size range, affordable',
      tagline: '"Aman, Nyaman" (Safe, Comfortable)',
      angles: ['Safety certification as primary trust signal', 'Mass market accessibility (price anchoring)', 'Size range breadth (one brand, whole childhood)', 'Habitual repeat purchase'],
      adUrl: 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ID&search_type=page',
    },
    {
      name: 'Mooi Kids', aka: 'Mooi Baby & Kids', scale: '🟡 Medium',
      followers: '—', price: 'IDR 75K–150K', ages: 'Baby–adult',
      certs: '—', hq: '—',
      positioning: 'Minimalist, modern, slightly elevated mid-range',
      tagline: '—',
      angles: ['Minimalist aesthetic appeal', 'Adult crossover (parent-child matching)', 'Everyday elevated basics'],
      adUrl: 'https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ID&search_type=page',
    },
  ],

  // ============================================================
  // SAMPLE DATA (shown until Google Sheets is connected)
  // ============================================================
  sampleTasks: [
    { id:'T-001', title:'Create Reel — Lebaran Collection Teaser',    assignee:'Sarah', status:'In Progress', priority:'High',   due:'2026-05-25', platform:'Instagram', category:'Creative Production' },
    { id:'T-002', title:'Design carousel — Product bundle sets',      assignee:'Rina',  status:'In Progress', priority:'High',   due:'2026-05-24', platform:'Instagram', category:'Creative Production' },
    { id:'T-003', title:'Film UGC-style video for TikTok',            assignee:'Bella', status:'To Do',       priority:'High',   due:'2026-05-27', platform:'TikTok',    category:'Creative Production' },
    { id:'T-004', title:'Competitor ad analysis — Bohopanna',         assignee:'Alex',  status:'In Progress', priority:'High',   due:'2026-05-23', platform:'',          category:'Research' },
    { id:'T-005', title:'Write Shopee promo captions (5 variants)',   assignee:'Dika',  status:'To Do',       priority:'Medium', due:'2026-05-26', platform:'Shopee',    category:'Copywriting' },
    { id:'T-006', title:'June content calendar — first draft',        assignee:'Sarah', status:'To Do',       priority:'High',   due:'2026-05-30', platform:'',          category:'Planning' },
    { id:'T-007', title:'Design IG Stories template (3 sizes)',       assignee:'Rina',  status:'To Do',       priority:'Medium', due:'2026-05-28', platform:'Instagram', category:'Creative Production' },
    { id:'T-008', title:'Review TikTok drafts — approve or revise',  assignee:'Alex',  status:'In Progress', priority:'Medium', due:'2026-05-23', platform:'TikTok',    category:'Review' },
    { id:'T-009', title:'Hook bank update — add 10 new hooks',       assignee:'Dika',  status:'To Do',       priority:'Low',    due:'2026-05-29', platform:'',          category:'Research' },
    { id:'T-010', title:'Write caption copy — new arrivals batch',   assignee:'Dika',  status:'Done',        priority:'Medium', due:'2026-05-22', platform:'Instagram', category:'Copywriting' },
    { id:'T-011', title:'Photography brief — summer lookbook',       assignee:'Bella', status:'Done',        priority:'High',   due:'2026-05-20', platform:'',          category:'Planning' },
    { id:'T-012', title:'Facebook ad copy — CPAS bundle offer',     assignee:'Alex',  status:'Done',        priority:'High',   due:'2026-05-19', platform:'Facebook',  category:'Copywriting' },
  ],

  sampleCalendar: [
    { date:'2026-05-19', platform:'Instagram', type:'Reel',      title:'New arrivals GRWM',          status:'Published', assignee:'Bella' },
    { date:'2026-05-20', platform:'TikTok',    type:'Video',     title:'Bundle styling challenge',    status:'Published', assignee:'Sarah' },
    { date:'2026-05-21', platform:'Facebook',  type:'Post',      title:'CPAS bundle promo',           status:'Published', assignee:'Alex'  },
    { date:'2026-05-22', platform:'Instagram', type:'Carousel',  title:'How to mix & match sets',    status:'Published', assignee:'Rina'  },
    { date:'2026-05-23', platform:'Instagram', type:'Reel',      title:'Lebaran teaser — day 1',     status:'Planned',   assignee:'Sarah' },
    { date:'2026-05-23', platform:'TikTok',    type:'Video',     title:'UGC mom testimonial',        status:'In Production', assignee:'Bella' },
    { date:'2026-05-24', platform:'Shopee',    type:'Live',      title:'Weekend sale live stream',   status:'Planned',   assignee:'Sarah' },
    { date:'2026-05-24', platform:'Instagram', type:'Stories',   title:'Poll — fav colour set',     status:'Planned',   assignee:'Rina'  },
    { date:'2026-05-25', platform:'Instagram', type:'Reel',      title:'Lebaran teaser — day 2',     status:'Planned',   assignee:'Sarah' },
    { date:'2026-05-25', platform:'TikTok',    type:'Video',     title:'Trending sound + product',   status:'To Do',     assignee:'Dika'  },
    { date:'2026-05-26', platform:'Facebook',  type:'Post',      title:'Social proof — reviews',     status:'Planned',   assignee:'Alex'  },
    { date:'2026-05-27', platform:'Instagram', type:'Carousel',  title:'New arrivals flat lay',      status:'To Do',     assignee:'Rina'  },
    { date:'2026-05-28', platform:'TikTok',    type:'Video',     title:'Style guide — set pairings', status:'To Do',     assignee:'Bella' },
    { date:'2026-05-29', platform:'Instagram', type:'Reel',      title:'Customer OOTD compilation',  status:'Planned',   assignee:'Sarah' },
    { date:'2026-05-30', platform:'Shopee',    type:'Post',      title:'Payday sale teaser',         status:'Planned',   assignee:'Dika'  },
    { date:'2026-05-31', platform:'Instagram', type:'Stories',   title:'End of May recap',           status:'Planned',   assignee:'Rina'  },
    { date:'2026-06-01', platform:'Instagram', type:'Reel',      title:'June launch — new collection', status:'Planned', assignee:'Sarah' },
    { date:'2026-06-02', platform:'TikTok',    type:'Video',     title:'Behind the scenes — photoshoot', status:'Planned', assignee:'Bella' },
    { date:'2026-06-03', platform:'Facebook',  type:'Post',      title:'June CPAS campaign goes live', status:'Planned', assignee:'Alex'  },
  ],

  // Document Hub categories (shown as filter tabs)
  docCategories: [
    'All',
    'Brand Identity',
    'Product & Launch',
    'Content Strategy',
    'Creative Reference',
    'Content Audits',
    'Ads & KV',
    'Competitor Intel',
  ],

  sampleDocs: [

    // ══ BRAND IDENTITY ══════════════════════════════════════════════════════
    {
      category:'Brand Identity', pinned:'Yes', icon:'📘',
      title:'Brand Guideline 2025',
      url:'file:///Users/alexandergrant/Documents/Claude/Projects/Happy Pumpkin Branding/BRAND GUIDELINE 2025/Brand Guideline Happy Pumpkin.pdf',
      desc:'Full brand book — logo usage, colour palette, typography, brand voice, visual system.',
      updated:'2025-01-01',
    },
    {
      category:'Brand Identity', pinned:'Yes', icon:'🎨',
      title:'2026 Rebranding Logos',
      url:'file:///Users/alexandergrant/Documents/Claude/Projects/Happy Pumpkin Branding/REBRANDING LOGO 2026/LOGO Happy Pumpkin 2026 - Orange.png',
      desc:'New 2026 logo files — Orange, Multi, Stacked. Label tag sizes S/M/L/XL/2XL included.',
      updated:'2026-01-01',
    },
    {
      category:'Brand Identity', pinned:'No', icon:'🖼️',
      title:'Colour Palette',
      url:'file:///Users/alexandergrant/Documents/Claude/Projects/Happy Pumpkin Branding/Color Palette.jpg',
      desc:'Official HP colour palette reference — brand colours, neutrals, accent tones.',
      updated:'2025-01-01',
    },
    {
      category:'Brand Identity', pinned:'No', icon:'🖋️',
      title:'Brand Fonts',
      url:'file:///Users/alexandergrant/Documents/Claude/Projects/Happy Pumpkin Branding/BRAND GUIDELINE 2025/FONT',
      desc:'Filicudi Solid (display) · Myriad Pro (body) · Hurme Geometric Sans family.',
      updated:'2025-01-01',
    },
    {
      category:'Brand Identity', pinned:'No', icon:'✏️',
      title:'Graphic Asset Library',
      url:'file:///Users/alexandergrant/Documents/Claude/Projects/Happy Pumpkin Branding/BRAND GUIDELINE 2025/Asset - Graphic',
      desc:'PNG brand assets — Pumpky mascot, promo stickers (Flash Sale, Bundle, GWP, Voucher), frames, campaign backgrounds.',
      updated:'2025-12-01',
    },

    // ══ PRODUCT & LAUNCH ════════════════════════════════════════════════════
    {
      category:'Product & Launch', pinned:'Yes', icon:'🚀',
      title:'May Launch — 360 Strategy Hub',
      url:'assets/HP_Product_May_Launch.html',
      desc:'Full product & creative strategy for the May 2026 launch. Covers Fashion Basic, ActiveKnit, PureKnit, UltraCool™, and Wonder Set™ — positioning, messaging, and campaign direction for each.',
      updated:'2026-05-23',
    },

    // ══ CONTENT STRATEGY ════════════════════════════════════════════════════
    {
      category:'Content Strategy', pinned:'Yes', icon:'📖',
      title:'HP Content Framework (English)',
      url:'assets/HP_Content_Framework.html',
      desc:'Core content strategy — 60/30/10 Reach/Consideration/Conversion split, casual pathway, audience formula, hook framework.',
      updated:'2026-01-01',
    },
    {
      category:'Content Strategy', pinned:'Yes', icon:'📗',
      title:'HP Content Framework (Bahasa)',
      url:'assets/HP_Content_Framework_ID.html',
      desc:'Versi Bahasa Indonesia — strategi konten lengkap, formula target audiens, hook framework, casual pathway.',
      updated:'2026-01-01',
    },
    {
      category:'Content Strategy', pinned:'No', icon:'🤖',
      title:'Claude Content Skill — English',
      url:'file:///Users/alexandergrant/Documents/Claude/Projects/Content Framework/HP_Claude_Content_Skill.md',
      desc:'Paste into Claude Project instructions to unlock full HP brand + content strategy context for the team.',
      updated:'2026-01-01',
    },
    {
      category:'Content Strategy', pinned:'No', icon:'🤖',
      title:'Claude Content Skill — Bahasa',
      url:'file:///Users/alexandergrant/Documents/Claude/Projects/Content Framework/HP_Claude_Content_Skill_ID.md',
      desc:'Versi Bahasa — instruksi Claude Project untuk strategi konten Happy Pumpkin.',
      updated:'2026-01-01',
    },

    // ══ CREATIVE REFERENCE ══════════════════════════════════════════════════
    {
      category:'Creative Reference', pinned:'Yes', icon:'🎣',
      title:'1M Hook Guide — CTP Framework',
      url:'file:///Users/alexandergrant/Downloads/1M_Hook CTP.pdf',
      desc:'Reference guide to high-performing hooks — call-to-purchase (CTP) angles, hook structures, and formats proven to drive 1M+ views. 59 pages.',
      updated:'2026-01-01',
    },
    {
      category:'Creative Reference', pinned:'Yes', icon:'📈',
      title:'40 Trending Content Formats',
      url:'file:///Users/alexandergrant/Downloads/40_Trending.pdf',
      desc:'Catalogue of 40 trending content formats and angles. Use as inspiration for Reels and TikTok planning. 89 pages.',
      updated:'2026-01-01',
    },
    {
      category:'Creative Reference', pinned:'No', icon:'💡',
      title:'Hook Bank (Live in Dashboard)',
      url:'#hooks',
      desc:'Open the Hook Bank tab — searchable library of 20+ hooks tagged by platform, psychology trigger, and theme. One-click copy.',
      updated:'2026-05-23',
    },

    // ══ CONTENT AUDITS ══════════════════════════════════════════════════════
    {
      category:'Content Audits', pinned:'Yes', icon:'🔬',
      title:'Audit: Mix Match Outfit Creative',
      url:'file:///Users/alexandergrant/Documents/Claude/Projects/HP Content Audit/Content Audit - Creative Mix Match Outfit - 23 May 2026.pdf',
      desc:'Performance breakdown, hook analysis, and optimisation notes for the Mix Match Outfit creative. May 2026.',
      updated:'2026-05-23',
    },
    {
      category:'Content Audits', pinned:'Yes', icon:'🔬',
      title:'Audit: Stretchy Outfit Creative',
      url:'file:///Users/alexandergrant/Documents/Claude/Projects/HP Content Audit/Content Audit - Creative Stretchy Outfit - 23 May 2026.pdf',
      desc:'Performance breakdown and recommendations for the Stretchy Outfit creative. May 2026.',
      updated:'2026-05-23',
    },
    {
      category:'Content Audits', pinned:'No', icon:'🔬',
      title:'Audit: Relatable Video — Moms Asik',
      url:'file:///Users/alexandergrant/Documents/Claude/Projects/HP Content Audit/Content Audit - Relatable Video 1 (Moms Asik) - 23 May 2026.pdf',
      desc:'Hook, retention, and engagement analysis for Relatable Video #1 — Moms Asik format. May 2026.',
      updated:'2026-05-23',
    },
    {
      category:'Content Audits', pinned:'No', icon:'🔬',
      title:'Audit: Relatable Video — POV tiap makan',
      url:'file:///Users/alexandergrant/Documents/Claude/Projects/HP Content Audit/Content Audit - Relatable Video 3 (POV HP tiap makan) - 23 May 2026.pdf',
      desc:'Performance and hook breakdown for Relatable Video #3 — POV HP tiap makan. May 2026.',
      updated:'2026-05-23',
    },

    // ══ ADS & KV ════════════════════════════════════════════════════════════
    {
      category:'Ads & KV', pinned:'Yes', icon:'📊',
      title:'Brand Content Framework (KV Generator)',
      url:'file:///Users/alexandergrant/Documents/Claude/Projects/KV Generator for Meta Ads - Happy Pumpkin/01_Framework/Happy_Pumpkin_Brand_Content_Framework.xlsx',
      desc:'Master framework for Meta Ads KVs — messaging pillars, creative angles, audience mapping.',
      updated:'2026-01-01',
    },
    {
      category:'Ads & KV', pinned:'No', icon:'📁',
      title:'KV Generator Project Folder',
      url:'file:///Users/alexandergrant/Documents/Claude/Projects/KV Generator for Meta Ads - Happy Pumpkin',
      desc:'Full KV generator project — IG saves, PDFs, sheet references, KV drafts, ad creative drafts, and reports.',
      updated:'2026-01-01',
    },

    // ══ COMPETITOR INTEL ════════════════════════════════════════════════════
    {
      category:'Competitor Intel', pinned:'Yes', icon:'🔍',
      title:'Competitor Intelligence (Live Dashboard)',
      url:'#competitors',
      desc:'Full competitor profiles, ad angles, buying psychology triggers, and white space opportunities for Happy Pumpkin.',
      updated:'2026-05-23',
    },
  ],

  sampleHooks: [
    { id:'H-001', text:'Mereka tumbuh lebih cepat dari yang kamu kira…',                         platform:'Instagram', trigger:'Sentimental / fleeting', theme:'Size urgency',    tags:'fleeting,urgency,bahasa',   addedBy:'Dika'  },
    { id:'H-002', text:'Lihat betapa lucunya si kecil pakai ini 🧡',                              platform:'Instagram', trigger:'Emotional impulse',      theme:'Cuteness',        tags:'cute,visual,bahasa',         addedBy:'Sarah' },
    { id:'H-003', text:'Ukuran ini tidak akan muat lama — ambil sekarang sebelum habis',         platform:'Shopee',    trigger:'Sentimental / fleeting', theme:'Scarcity',        tags:'urgency,scarcity,shopee',   addedBy:'Alex'  },
    { id:'H-004', text:'Set serasi untuk kakak dan adik — matching from day one 👫',             platform:'Instagram', trigger:'Bundle / set logic',     theme:'Sibling sets',    tags:'bundle,sibling,set',         addedBy:'Rina'  },
    { id:'H-005', text:'Hadiah terbaik untuk si newborn — lembut, aman, dan lucu',               platform:'Facebook',  trigger:'Gifting',                theme:'Newborn gift',    tags:'gift,newborn,safe',          addedBy:'Dika'  },
    { id:'H-006', text:'Dipercaya oleh ribuan mama Indonesia ❤️',                                platform:'All',       trigger:'Social proof',           theme:'Trust',           tags:'social-proof,mama,trust',    addedBy:'Sarah' },
    { id:'H-007', text:'Foto keluarga? Si kecil siap tampil stylish dari ujung kepala',          platform:'Instagram', trigger:'Milestone / event',      theme:'Family photos',   tags:'milestone,event,family',    addedBy:'Bella' },
    { id:'H-008', text:'Tampil stylish dari pagi sampai malam — nyaman sepanjang hari',          platform:'TikTok',    trigger:'Lifestyle aspiration',   theme:'All-day style',   tags:'style,comfort,lifestyle',   addedBy:'Rina'  },
    { id:'H-009', text:'Bahan aman untuk kulit sensitif si kecil — lulus uji SNI ✅',            platform:'All',       trigger:'Functional safety',      theme:'Safety cert',     tags:'safety,SNI,skin-safe',       addedBy:'Alex'  },
    { id:'H-010', text:'One size won\'t last — get the next two while stock is here',            platform:'TikTok',    trigger:'Habitual repeat',        theme:'Growth reminder', tags:'growth,repeat,english',      addedBy:'Dika'  },
    { id:'H-011', text:'You don\'t need a reason to treat your little one 🎁',                   platform:'Instagram', trigger:'Emotional impulse',      theme:'Impulse treat',   tags:'impulse,gift,english',       addedBy:'Sarah' },
    { id:'H-012', text:'The outfit that made every mama in the comment section ask "where from?"',platform:'TikTok',    trigger:'Social proof',           theme:'Viral OOTD',      tags:'viral,OOTD,comment',         addedBy:'Bella' },
    { id:'H-013', text:'Koleksi baru sudah tiba — jangan sampai kehabisan size favoritmu',      platform:'Shopee',    trigger:'Emotional impulse',      theme:'New arrivals',    tags:'new,arrivals,urgency,shopee',addedBy:'Rina'  },
    { id:'H-014', text:'Kado lebaran yang pasti dipakai, bukan disimpan di lemari',              platform:'Facebook',  trigger:'Gifting',                theme:'Lebaran gift',    tags:'lebaran,gift,practical',    addedBy:'Alex'  },
    { id:'H-015', text:'Karena jadi orangtua yang stylish itu dimulai dari pilihan yang tepat', platform:'Instagram', trigger:'Lifestyle aspiration',   theme:'Parent identity', tags:'parent,style,aspiration',   addedBy:'Dika'  },
    { id:'H-016', text:'First birthday? Make it unforgettable with the perfect outfit',          platform:'Instagram', trigger:'Milestone / event',      theme:'First birthday',  tags:'milestone,birthday,english', addedBy:'Sarah' },
    { id:'H-017', text:'This won\'t be on shelves for long — and neither will their size',      platform:'TikTok',    trigger:'Sentimental / fleeting', theme:'Double urgency',  tags:'urgency,fleeting,english',  addedBy:'Bella' },
    { id:'H-018', text:'Belanja lebih hemat dengan bundle set — 3 pasang harga spesial!',       platform:'Shopee',    trigger:'Bundle / set logic',     theme:'Bundle value',    tags:'bundle,promo,shopee,hemat', addedBy:'Rina'  },
    { id:'H-019', text:'From newborn to toddler — one brand that grows with them',               platform:'Facebook',  trigger:'Habitual repeat',        theme:'Brand loyalty',   tags:'loyalty,growth,english',    addedBy:'Alex'  },
    { id:'H-020', text:'Soft enough for their skin. Tough enough for everything else.',          platform:'All',       trigger:'Functional safety',      theme:'Durability + safety', tags:'safety,durable,english', addedBy:'Dika'  },
  ],
};
