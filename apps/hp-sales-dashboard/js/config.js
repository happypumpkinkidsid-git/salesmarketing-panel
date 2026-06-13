// ============================================================
// HP SALES NETWORK — CONFIGURATION
// ============================================================
// GOOGLE SHEETS SETUP:
//  1. Create a new Google Sheet with 5 tabs named exactly:
//     Brief | Channels | Distributors | Leads | Targets
//  2. File → Share → Publish to web → publish each tab as CSV
//  3. Copy the Sheet ID from the URL (the long string after /d/)
//  4. Replace YOUR_SHEET_ID_HERE below with that ID
//  5. Update each gid below with the tab's numeric GID
//     (visible in the URL when you click each tab: ...#gid=XXXXXXX)
//
// COLUMN HEADERS FOR EACH TAB:
//
// Brief:        day | priority | task | category | channel
// Channels:     month | platform | subchannel | revenue | orders | spend | roas | notes
// Distributors: name | type | city | province | region | contact_name | contact_wa | tier | status | since | monthly_target | notes
// Leads:        name | type | city | province | region | contact_name | contact_wa | stage | source | assigned | last_contact | potential_monthly | notes
// Targets:      month | channel | revenue_target | revenue_actual | orders_target | orders_actual
// ============================================================

const CONFIG = {

  // --- Google Sheets ---
  sheetId: '1FiLpM-8lkiIIW-GJBIk-fkaKYBxDPK5bS03UQszFdPI',
  gids: {
    brief:        'FILL_AFTER_CREATING_TAB',   // ← update after step 3 below
    channels:     'FILL_AFTER_CREATING_TAB',
    distributors: 'FILL_AFTER_CREATING_TAB',
    leads:        'FILL_AFTER_CREATING_TAB',
    targets:      'FILL_AFTER_CREATING_TAB',
  },
  sheetUrl: 'https://docs.google.com/spreadsheets/d/1FiLpM-8lkiIIW-GJBIk-fkaKYBxDPK5bS03UQszFdPI',

  // --- Auto-refresh (ms) ---
  refreshInterval: 60000,

  // --- Platform config ---
  platforms: ['All', 'Shopee', 'Tokopedia', 'TikTok Shop', 'Meta CPAS'],
  platformColors: {
    'Shopee':     '#EE4D2D',
    'Tokopedia':  '#00AA5B',
    'TikTok Shop':'#111111',
    'Meta CPAS':  '#1877F2',
    'Offline':    '#FF7B1C',
  },

  // --- Lead pipeline stages (includes post-conversion Won/Lost) ---
  leadStages: ['Cold Lead', 'Contacted', 'Interested', 'Proposal Sent', 'Negotiating', 'Won', 'Lost'],
  stageColors: {
    'Cold Lead':      { bg: '#F1F5F9', text: '#64748B', border: '#CBD5E1' },
    'Contacted':      { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
    'Interested':     { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
    'Proposal Sent':  { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
    'Negotiating':    { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
    'Won':            { bg: '#F0FDF4', text: '#15803D', border: '#86EFAC' },
    'Lost':           { bg: '#F9FAFB', text: '#6B7280', border: '#E5E7EB' },
  },

  // --- Consignment Programs ---
  // ATO value for these distributors = goods placed, NOT goods sold.
  // True revenue = ATO × sellThroughRate. Until confirmed = deferred revenue.
  consignmentPrograms: [
    {
      distributor: 'Fany Baby',
      matchBranches: false,
      type: 'Consignment',
      period: { start: null, end: '2026-01' },
      note: 'Switched to outright purchase after Jan 2026',
      sellThroughRate: null,  // ⏳ AWAITING INPUT from owner
    },
    {
      distributor: 'Balonku',
      matchBranches: true,    // matches Balonku Babyshop Sanur, Nusa Dua, etc.
      type: 'Consignment',
      period: { start: null, end: '2026-06' },
      note: 'Full consignment. All Balonku branches up to Jun 2026.',
      sellThroughRate: null,  // ⏳ AWAITING INPUT
    },
    {
      distributor: 'Maxmurah Beringin',
      matchBranches: false,
      type: 'Consignment',
      period: { start: null, end: null },
      note: 'Ongoing consignment program — all periods',
      sellThroughRate: null,  // ⏳ AWAITING INPUT
    },
    {
      distributor: 'Cherry Babyshop',
      matchBranches: false,
      type: 'Consignment',
      period: { start: null, end: null },
      note: 'Ongoing consignment program — all periods',
      sellThroughRate: null,  // ⏳ AWAITING INPUT
    },
  ],

  // --- Regions (Indonesia) ---
  regions: ['All', 'Jawa', 'Sumatera', 'Kalimantan', 'Sulawesi', 'Bali', 'Papua & Maluku'],
  regionColors: {
    'Jawa':            '#FF7B1C',
    'Sumatera':        '#3B82F6',
    'Kalimantan':      '#22C55E',
    'Sulawesi':        '#8B5CF6',
    'Bali':            '#EF4444',
    'Papua & Maluku':  '#14B8A6',
  },

  // --- Key Indonesian shopping dates 2026 ---
  shoppingEvents: [
    { date: '2026-05-25', name: 'Shopee 5.5',        platform: 'Shopee'     },
    { date: '2026-06-06', name: 'Harbolnas 6.6',      platform: 'All'        },
    { date: '2026-06-15', name: 'Mid-Year Sale',       platform: 'All'        },
    { date: '2026-06-30', name: 'End-of-Month Payday', platform: 'All'        },
    { date: '2026-07-07', name: 'Tokopedia 7.7',       platform: 'Tokopedia'  },
    { date: '2026-08-08', name: 'Shopee 8.8',          platform: 'Shopee'     },
    { date: '2026-08-17', name: 'Hari Kemerdekaan',    platform: 'All'        },
    { date: '2026-09-09', name: 'Harbolnas 9.9',       platform: 'All'        },
    { date: '2026-10-10', name: 'Harbolnas 10.10',     platform: 'All'        },
    { date: '2026-11-11', name: 'Harbolnas 11.11',     platform: 'All'        },
    { date: '2026-12-12', name: 'Harbolnas 12.12',     platform: 'All'        },
  ],

  // --- Competitor data (for Competitor Pulse) ---
  competitors: [
    { name: 'Bohopanna',        scale: '🔴 Very High', pageId: '106054137987511' },
    { name: 'Little Palmerhaus',scale: '🔴 Very High', pageId: '102180987938711' },
    { name: 'Cuit Babywear',    scale: '🟠 High',      pageId: '1203574416370380' },
    { name: 'Yobebee',          scale: '🟠 High',      pageId: '330014347888223' },
    { name: 'Libby Baby',       scale: '🔴 Very High', pageId: '' },
  ],

  // ============================================================
  // SAMPLE DATA — shown until Google Sheets is connected
  // ============================================================

  sampleBrief: [
    // --- MONDAY ---
    { day:'Monday', priority:'High',   task:'Review weekend marketplace performance (Shopee, Tokopedia, TikTok Shop)', category:'Data Review',  channel:'Online Channels' },
    { day:'Monday', priority:'High',   task:'Analyze Meta CPAS weekend ROAS & total spend vs budget',                  category:'Ads Review',   channel:'Meta CPAS' },
    { day:'Monday', priority:'Medium', task:'Weekly team standup — set priorities, assign tasks',                      category:'Internal',     channel:'Team' },
    { day:'Monday', priority:'Medium', task:'WhatsApp check-in round with all active distributors',                    category:'Relationship', channel:'Offline Network' },
    // --- TUESDAY ---
    { day:'Tuesday', priority:'High',   task:'Review current Meta CPAS spend vs monthly budget cap',                  category:'Ads Review',   channel:'Meta CPAS' },
    { day:'Tuesday', priority:'High',   task:'Follow up on leads contacted yesterday — push to Interested stage',      category:'Lead Action',  channel:'Leads Pipeline' },
    { day:'Tuesday', priority:'Medium', task:'Approve this week\'s content calendar (Instagram, TikTok, Shopee)',      category:'Content',      channel:'Content Team' },
    { day:'Tuesday', priority:'Medium', task:'Coordinate restock if inventory below 2-week threshold',                 category:'Operations',   channel:'Warehouse' },
    // --- WEDNESDAY ---
    { day:'Wednesday', priority:'High',   task:'Mid-week channel performance check — flag any underperforming sub-channels', category:'Data Review', channel:'Online Channels' },
    { day:'Wednesday', priority:'High',   task:'Scheduled babyshop calls or site visits (see Distributor Network)',    category:'Distributor',  channel:'Offline Network' },
    { day:'Wednesday', priority:'Medium', task:'Update lead pipeline — move stages, add call notes',                  category:'Lead Action',  channel:'Leads Pipeline' },
    { day:'Wednesday', priority:'Low',    task:'Creative sync — review pending KV drafts with the team',              category:'Content',      channel:'Content Team' },
    // --- THURSDAY ---
    { day:'Thursday', priority:'High',   task:'Brief team for weekend Shopee Live & TikTok Live sessions',            category:'Live Prep',    channel:'Shopee / TikTok' },
    { day:'Thursday', priority:'High',   task:'Follow up on Proposal Sent & Negotiating leads — close or move forward', category:'Lead Action', channel:'Leads Pipeline' },
    { day:'Thursday', priority:'Medium', task:'Approve weekend bundle promos and flash sale pricing',                  category:'Commercial',   channel:'All Channels' },
    { day:'Thursday', priority:'Medium', task:'Competitor pulse — check FB Ad Library (Bohopanna, LP, Cuit)',         category:'Research',     channel:'Competitor Intel' },
    // --- FRIDAY ---
    { day:'Friday', priority:'High',   task:'Compile & send weekly sales summary report to stakeholders',             category:'Reporting',    channel:'Performance' },
    { day:'Friday', priority:'High',   task:'Distributor delivery & payment coordination — confirm weekend stock',    category:'Operations',   channel:'Offline Network' },
    { day:'Friday', priority:'Medium', task:'Schedule all weekend content & promo posts across platforms',            category:'Content',      channel:'Content Team' },
    { day:'Friday', priority:'Medium', task:'Team performance check-in + recognition',                                category:'Internal',     channel:'Team' },
    // --- SATURDAY ---
    { day:'Saturday', priority:'High',   task:'Monitor Shopee Live session in real-time — track orders, engagement', category:'Live Session',  channel:'Shopee Live' },
    { day:'Saturday', priority:'High',   task:'Monitor TikTok Live session in real-time — track viewers, conversions',category:'Live Session',  channel:'TikTok Live' },
    { day:'Saturday', priority:'Medium', task:'Respond to DM/WA inquiries from live sessions — potential leads',     category:'Lead Action',  channel:'Leads' },
    { day:'Saturday', priority:'Low',    task:'Community engagement — comment replies on IG & TikTok posts',         category:'Community',    channel:'Instagram / TikTok' },
    // --- SUNDAY ---
    { day:'Sunday', priority:'High',   task:'Full weekly performance review — all channels vs targets',              category:'Reporting',    channel:'Performance' },
    { day:'Sunday', priority:'High',   task:'Plan next week\'s content themes, campaign priorities & budgets',       category:'Planning',     channel:'All Channels' },
    { day:'Sunday', priority:'Medium', task:'Competitor ad monitoring — scan FB Ad Library for new KVs',           category:'Research',     channel:'Competitor Intel' },
    { day:'Sunday', priority:'Medium', task:'Business strategy review — KPI tracking, pipeline health check',       category:'Strategy',     channel:'All' },
  ],

  sampleChannels: [
    // May 2026 — Shopee
    { month:'2026-05', platform:'Shopee', subchannel:'Official Store', revenue:85000000,  orders:1240, spend:0,        roas:null, notes:'' },
    { month:'2026-05', platform:'Shopee', subchannel:'Live',           revenue:34000000,  orders:520,  spend:0,        roas:null, notes:'' },
    { month:'2026-05', platform:'Shopee', subchannel:'Shopee Ads',     revenue:47000000,  orders:690,  spend:12000000, roas:3.9,  notes:'' },
    // May 2026 — Tokopedia
    { month:'2026-05', platform:'Tokopedia', subchannel:'Official Store', revenue:42000000, orders:680, spend:0,       roas:null, notes:'' },
    { month:'2026-05', platform:'Tokopedia', subchannel:'Live',           revenue:18000000, orders:290, spend:0,       roas:null, notes:'' },
    { month:'2026-05', platform:'Tokopedia', subchannel:'TopAds',         revenue:22000000, orders:320, spend:6000000, roas:3.7,  notes:'' },
    // May 2026 — TikTok Shop
    { month:'2026-05', platform:'TikTok Shop', subchannel:'Official Store', revenue:38000000, orders:560, spend:0,      roas:null, notes:'' },
    { month:'2026-05', platform:'TikTok Shop', subchannel:'Live',           revenue:52000000, orders:780, spend:0,      roas:null, notes:'' },
    { month:'2026-05', platform:'TikTok Shop', subchannel:'TikTok Ads',     revenue:24000000, orders:360, spend:8000000,roas:3.0,  notes:'' },
    // May 2026 — Meta CPAS
    { month:'2026-05', platform:'Meta CPAS', subchannel:'CPAS → Shopee',    revenue:95000000,  orders:1440, spend:30000000, roas:3.2, notes:'Main CPAS campaign' },
    { month:'2026-05', platform:'Meta CPAS', subchannel:'CPAS → Tokopedia', revenue:22000000,  orders:340,  spend:8000000,  roas:2.8, notes:'Lower ROI — review targeting' },

    // April 2026 — Shopee (for MoM comparison)
    { month:'2026-04', platform:'Shopee', subchannel:'Official Store', revenue:72000000,  orders:1050, spend:0,        roas:null, notes:'' },
    { month:'2026-04', platform:'Shopee', subchannel:'Live',           revenue:28000000,  orders:440,  spend:0,        roas:null, notes:'' },
    { month:'2026-04', platform:'Shopee', subchannel:'Shopee Ads',     revenue:38000000,  orders:560,  spend:10000000, roas:3.8,  notes:'' },
    { month:'2026-04', platform:'Tokopedia', subchannel:'Official Store', revenue:36000000, orders:580, spend:0,       roas:null, notes:'' },
    { month:'2026-04', platform:'Tokopedia', subchannel:'Live',           revenue:14000000, orders:220, spend:0,       roas:null, notes:'' },
    { month:'2026-04', platform:'Tokopedia', subchannel:'TopAds',         revenue:18000000, orders:260, spend:5000000, roas:3.6,  notes:'' },
    { month:'2026-04', platform:'TikTok Shop', subchannel:'Official Store', revenue:30000000, orders:450, spend:0,      roas:null, notes:'' },
    { month:'2026-04', platform:'TikTok Shop', subchannel:'Live',           revenue:44000000, orders:660, spend:0,      roas:null, notes:'' },
    { month:'2026-04', platform:'TikTok Shop', subchannel:'TikTok Ads',     revenue:20000000, orders:290, spend:7000000,roas:2.9,  notes:'' },
    { month:'2026-04', platform:'Meta CPAS', subchannel:'CPAS → Shopee',    revenue:80000000, orders:1210, spend:26000000, roas:3.1, notes:'' },
    { month:'2026-04', platform:'Meta CPAS', subchannel:'CPAS → Tokopedia', revenue:18000000, orders:280, spend:7000000,  roas:2.6, notes:'' },
  ],

  sampleDistributors: [
    // Tier 1 — Large DPM / Chain accounts (from Jan 2026 B2B Sales Report)
    // last_order_date sourced from PO sheet tab names in Google Drive order workbooks
    { name:'Baby Fame Store',         type:'Chain Retailer',       city:'Bandar Lampung', province:'Lampung',              region:'Sumatera',  contact_name:'Ibu Wulan Aritha', contact_wa:'628975488677',  tier:'1', status:'Active', since:'2025-08', monthly_target:41000000, last_order_date:'2026-06-01', expected_reorder_days:30, account_tier:'Gold',   notes:'Top MTN account. Jan 2026 nett Rp 41.5jt. IG: @babyfamestore' },
    { name:'Millenium Babies',        type:'Regional Distributor', city:'Makassar',       province:'Sulawesi Selatan',     region:'Sulawesi',  contact_name:'',                 contact_wa:'',              tier:'1', status:'Active', since:'2024-06', monthly_target:37000000, last_order_date:'2026-05-07', expected_reorder_days:30, account_tier:'Gold',   notes:'Multi-city coverage: Makassar, Gowa, Perintis, Manado. Jan 2026 nett Rp 37.3jt.' },
    { name:'Balonku Babyshop',        type:'Chain Store',          city:'Denpasar',       province:'Bali',                 region:'Bali',      contact_name:'',                 contact_wa:'',              tier:'1', status:'Active', since:'2024-09', monthly_target:36000000, last_order_date:'2026-02-27', expected_reorder_days:30, account_tier:'Gold',   notes:'2 locations: Sanur & Nusa Dua. Jan 2026 combined nett Rp 36.7jt. Consignment up to Jun 2026.' },
    { name:'Babywise',                type:'Chain Store',          city:'BSD City',       province:'Banten',               region:'Jawa',      contact_name:'',                 contact_wa:'628783800550',  tier:'1', status:'Active', since:'2024-06', monthly_target:38000000, last_order_date:'2026-06-02', expected_reorder_days:30, account_tier:'Gold',   notes:'Jan 2026 combined nett Rp 38.7jt (2 accounts). SNI & PKP discussions in progress.' },
    // Tier 2 — Medium stockists
    { name:'Gallery BabyShop Lombok', type:'Independent Store',    city:'Mataram',        province:'Nusa Tenggara Barat',  region:'Bali',      contact_name:'',                 contact_wa:'6281237775458', tier:'2', status:'Active', since:'2025-07', monthly_target:18000000, last_order_date:'2026-05-22', expected_reorder_days:45, account_tier:'Silver', notes:'Fashion wear & comfort wear. IG: @gallerybaby.lombok' },
    { name:'Haritsa Baby Shop',       type:'Independent Store',    city:'Medan',          province:'Sumatera Utara',       region:'Sumatera',  contact_name:'',                 contact_wa:'',              tier:'2', status:'Active', since:'2024-06', monthly_target:18000000, last_order_date:'2026-04-04', expected_reorder_days:45, account_tier:'Silver', notes:'Jan 2026 nett Rp 16.8jt. IG: @haritsababyshop.co.id' },
    { name:'Pratama Babyshop',        type:'Independent Store',    city:'Tulungagung',    province:'Jawa Timur',           region:'Jawa',      contact_name:'',                 contact_wa:'',              tier:'2', status:'Active', since:'2024-06', monthly_target:16000000, last_order_date:'2026-05-23', expected_reorder_days:45, account_tier:'Silver', notes:'Jan 2026 nett Rp 15.6jt. IG: @pratamababyshopid' },
    { name:'Joy Baby & Kids',         type:'Independent Store',    city:'Mojokerto',      province:'Jawa Timur',           region:'Jawa',      contact_name:'Cynthia',          contact_wa:'6285737377727', tier:'2', status:'Active', since:'2025-07', monthly_target:15000000, last_order_date:'2026-06-02', expected_reorder_days:45, account_tier:'Silver', notes:'Covers Mojokerto & Jombang. Fashion wear & comfort wear. KTP & NPWP submitted.' },
    { name:'Cilukba Superstore',      type:'Chain Store',          city:'Bandar Lampung', province:'Lampung',              region:'Sumatera',  contact_name:'',                 contact_wa:'6287899680410', tier:'2', status:'Active', since:'2025-08', monthly_target:15000000, last_order_date:'2025-08-29', expected_reorder_days:60, account_tier:'Silver', notes:'Fashion & comfort wear. IG: @cilukbasuperstore. No order since Aug 2025 — reactivation needed.' },
    { name:'Panda and Bear',          type:'Independent Store',    city:'Mataram',        province:'Nusa Tenggara Barat',  region:'Bali',      contact_name:'Ibu Ari',          contact_wa:'6281237076170', tier:'2', status:'Active', since:'2025-07', monthly_target:15000000, last_order_date:'2025-09-18', expected_reorder_days:60, account_tier:'Silver', notes:'Covers Lombok & Bali. IG: @pandaandbear.id. No order since Sep 2025 — reactivation needed.' },
    { name:'Asia Best Baby Shop',     type:'Independent Store',    city:'Medan',          province:'Sumatera Utara',       region:'Sumatera',  contact_name:'',                 contact_wa:'628116177927',  tier:'2', status:'Active', since:'2025-07', monthly_target:14000000, last_order_date:'2026-04-14', expected_reorder_days:45, account_tier:'Silver', notes:'Fashion wear. Admin contact. IG: @asiabestbabyshop' },
    { name:'Bobo Samarinda',          type:'Independent Store',    city:'Samarinda',      province:'Kalimantan Timur',     region:'Kalimantan',contact_name:'',                 contact_wa:'',              tier:'2', status:'Active', since:'2025-07', monthly_target:12000000, last_order_date:'2026-04-09', expected_reorder_days:60, account_tier:'Silver', notes:'Fashion & comfort wear. IG: @bobo.samarinda' },
    // Tier 3 — Smaller stockists (DEAL confirmed)
    { name:'Emmelia Baby Kids Store', type:'Independent Store',    city:'Blitar',         province:'Jawa Timur',           region:'Jawa',      contact_name:'Ibu Meiliana',     contact_wa:'6281554170178', tier:'3', status:'Active', since:'2025-08', monthly_target:10000000, last_order_date:'2026-05-15', expected_reorder_days:60, account_tier:'Bronze', notes:'Fashion wear & comfort wear. IG: @emmelia_babykidsstore' },
    { name:'Kid Story',               type:'Independent Store',    city:'Banda Aceh',     province:'Aceh',                 region:'Sumatera',  contact_name:'',                 contact_wa:'628116875758',  tier:'3', status:'Active', since:'2025-09', monthly_target:8000000,  last_order_date:'2025-07-18', expected_reorder_days:90, account_tier:'Bronze', notes:'Fashion & comfort wear. IG: @kidstory.co. No order since Jul 2025 — reactivation needed.' },
    { name:'The Baby Mart',           type:'Independent Store',    city:'Tanjung Pinang', province:'Kepulauan Riau',       region:'Sumatera',  contact_name:'Susana',           contact_wa:'628127071650',  tier:'3', status:'Active', since:'2025-08', monthly_target:8000000,  last_order_date:'2025-07-28', expected_reorder_days:90, account_tier:'Bronze', notes:'KTP submitted. Fashion & comfort wear. IG: @babymart_fashion. No order since Jul 2025.' },
    { name:'Haibabyshop',             type:'Independent Store',    city:'Kediri',         province:'Jawa Timur',           region:'Jawa',      contact_name:'',                 contact_wa:'',              tier:'3', status:'Active', since:'2025-07', monthly_target:8000000,  last_order_date:'2025-07-28', expected_reorder_days:90, account_tier:'Bronze', notes:'Fashion & comfort wear. IG: @haibabyshop. No order since Jul 2025 — reactivation needed.' },
  ],

  sampleLeads: [
    // ── NEGOTIATING ─────────────────────────────────────────────────────────
    // Reply + kondisi khusus / meeting dijadwalkan (sumber: CRM Pumpkin Reseller Tracker)
    { name:'Willow Babyshop',            type:'Independent Store', city:'Surabaya',        province:'Jawa Timur',          region:'Jawa',          contact_name:'Ibu Fita',  contact_wa:'6282229111087', stage:'Negotiating',   source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:20000000, notes:'Meeting Kamis 19 Jun 2025, 10.00 WIB. IG: @willowbabyshop' },
    { name:'maisonmiel.id',              type:'Boutique Store',    city:'Denpasar',        province:'Bali',                region:'Bali',          contact_name:'',          contact_wa:'',              stage:'Negotiating',   source:'Kid & Knit',   assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:12000000, notes:'HOLD — minta konsinyasi. Perlu keputusan terms. IG: @maisonmiel.id' },

    // ── PROPOSAL SENT ────────────────────────────────────────────────────────
    // Reply + katalog sudah terkirim
    { name:'Kiddiposh Store',            type:'Independent Store', city:'Bandung',         province:'Jawa Barat',          region:'Jawa',          contact_name:'Bunga',     contact_wa:'628112199950',  stage:'Proposal Sent', source:'Kid & Knit',   assigned:'Fhatia', last_contact:'2025-06-02', potential_monthly:15000000, notes:'Katalog terkirim. T&C dari Kiddiposh sudah ada — follow up. Purchasing contact.' },
    { name:'Miniku',                     type:'Independent Store', city:'Padang',          province:'Sumatera Barat',      region:'Sumatera',      contact_name:'Ibu Hanny', contact_wa:'6281364656172', stage:'Proposal Sent', source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:10000000, notes:'Katalog terkirim. Admin order contact. IG: @miniku_official' },
    { name:'Sheryl Baby Shop',           type:'Independent Store', city:'Pontianak',       province:'Kalimantan Barat',    region:'Kalimantan',    contact_name:'',          contact_wa:'6289619178331', stage:'Proposal Sent', source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-27', potential_monthly:8000000,  notes:'Katalog terkirim ke purchasing. IG: @sherylbabyshop' },

    // ── CONTACTED — ada PIC / nomor WA ──────────────────────────────────────
    { name:'Baby Place',                 type:'Independent Store', city:'Pekanbaru',       province:'Riau',                region:'Sumatera',      contact_name:'',          contact_wa:'6282169268782', stage:'Contacted',     source:'Poptoe',       assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:8000000,  notes:'Katalog terkirim. Purchasing contact. IG: @babyplace.id' },
    { name:'Freya Baby & Kids',          type:'Independent Store', city:'Cirebon',         province:'Jawa Barat',          region:'Jawa',          contact_name:'Melia',     contact_wa:'628122313003',  stage:'Contacted',     source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-27', potential_monthly:9000000,  notes:'Owner contact. Via WA. IG: @freyababykidsshop' },
    { name:'Ceria Baby Shop',            type:'Independent Store', city:'Tegal',           province:'Jawa Tengah',         region:'Jawa',          contact_name:'',          contact_wa:'62895360636466',stage:'Contacted',     source:'Kids Embassy', assigned:'Fhatia', last_contact:'2025-05-31', potential_monthly:8000000,  notes:'Admin contact. IG: @ceriababyshop_tegal' },
    { name:'Sono Bebe',                  type:'Independent Store', city:'Gading Serpong',  province:'Banten',              region:'Jawa',          contact_name:'',          contact_wa:'6285281010565', stage:'Contacted',     source:'Kids Embassy', assigned:'Fhatia', last_contact:'2025-06-02', potential_monthly:10000000, notes:'Baru dikirimkan katalog. Admin contact. IG: @sonobebe.id' },
    { name:'Filly Shop Kids',            type:'Independent Store', city:'Tanah Grogot',    province:'Kalimantan Timur',    region:'Kalimantan',    contact_name:'',          contact_wa:'6283892019332', stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-05', potential_monthly:6000000,  notes:'Katalog terkirim. Admin contact. IG: @fillyshop_kids' },

    // ── CONTACTED — sumber: Harlow Kids ─────────────────────────────────────
    { name:'Emily Kids',                 type:'Independent Store', city:'Semarang',        province:'Jawa Tengah',         region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Harlow Kids',  assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:7000000,  notes:'IG: @emilykids.id' },
    { name:'Agung Babyshop',             type:'Independent Store', city:'Duren Sawit',     province:'DKI Jakarta',         region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Harlow Kids',  assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:6000000,  notes:'IG: @agungbabytoys' },
    { name:'Hanamibabystore',            type:'Independent Store', city:'Pekanbaru',       province:'Riau',                region:'Sumatera',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Harlow Kids',  assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:7000000,  notes:'IG: @hanami.pku' },
    { name:'Canina',                     type:'Independent Store', city:'Surabaya',        province:'Jawa Timur',          region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Harlow Kids',  assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:8000000,  notes:'IG: @canina.id' },
    { name:'Oui Baby Kids',              type:'Independent Store', city:'Makassar',        province:'Sulawesi Selatan',    region:'Sulawesi',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Harlow Kids',  assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:8000000,  notes:'IG: @oui.baby.kids' },
    { name:'Moon Baby And Kids',         type:'Independent Store', city:'Padang',          province:'Sumatera Barat',      region:'Sumatera',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Harlow Kids',  assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:6000000,  notes:'IG: @moonbaby_padang' },
    { name:'Kuma Babyshop',              type:'Independent Store', city:'Denpasar',        province:'Bali',                region:'Bali',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Harlow Kids',  assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:7000000,  notes:'IG: @kumababyshop' },
    { name:'Liloandfriends',             type:'Independent Store', city:'Semarang',        province:'Jawa Tengah',         region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Harlow Kids',  assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:6000000,  notes:'IG: @liloandfriends.id' },
    { name:'Babyuberchic',               type:'Independent Store', city:'Purwokerto',      province:'Jawa Tengah',         region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Harlow Kids',  assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:6000000,  notes:'IG: @babyuberchic' },
    { name:'Qwertybaby',                 type:'Independent Store', city:'Bogor',           province:'Jawa Barat',          region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Harlow Kids',  assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:6000000,  notes:'IG: @qwertybabyplanet' },

    // ── CONTACTED — sumber: Kid & Knit ──────────────────────────────────────
    { name:'giggles.idn',                type:'Independent Store', city:'Semarang',        province:'Jawa Tengah',         region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kid & Knit',   assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:6000000,  notes:'IG: @giggles.idn' },
    { name:'oadkids',                    type:'Independent Store', city:'Jakarta',         province:'DKI Jakarta',         region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kid & Knit',   assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:7000000,  notes:'IG: @oadkids' },
    { name:'upiek babyandkidsshop',      type:'Independent Store', city:'Kudus',           province:'Jawa Tengah',         region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kid & Knit',   assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:6000000,  notes:'Covers Kudus & Pati. IG: @upiek_babyandkidsshop' },
    { name:'babygiggles.id',             type:'Independent Store', city:'Tangerang',       province:'Banten',              region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kid & Knit',   assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:6000000,  notes:'IG: @babygiggles.id' },
    { name:'clarababyandkids',           type:'Independent Store', city:'Denpasar',        province:'Bali',                region:'Bali',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kid & Knit',   assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:7000000,  notes:'IG: @clarababyandkids' },
    { name:'Aubreys Home',               type:'Boutique Store',    city:'Depok',           province:'Jawa Barat',          region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kid & Knit',   assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:6000000,  notes:'IG: @aubreyshome' },

    // ── CONTACTED — sumber: Poptoe ───────────────────────────────────────────
    { name:'Kakimini Baby Shop',         type:'Independent Store', city:'Batam',           province:'Kepulauan Riau',      region:'Sumatera',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Poptoe',       assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:7000000,  notes:'IG: @kakimini.babyshop' },
    { name:'Aston Baby Shop',            type:'Independent Store', city:'Medan',           province:'Sumatera Utara',      region:'Sumatera',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Poptoe',       assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:7000000,  notes:'IG: @astonbabyshopp' },
    { name:'Meizia Baby Kids & Teen',    type:'Independent Store', city:'Jambi',           province:'Jambi',               region:'Sumatera',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Poptoe',       assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:6000000,  notes:'IG: @babykids.teen_meizia' },
    { name:'Dunia Bayi Kid Shop',        type:'Independent Store', city:'Padang',          province:'Sumatera Barat',      region:'Sumatera',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Poptoe',       assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:6000000,  notes:'IG: @duniabayipdg' },
    { name:'Dino and Bunny Baby Shop',   type:'Independent Store', city:'Denpasar',        province:'Bali',                region:'Bali',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Poptoe',       assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:7000000,  notes:'IG: @dinoandbunny.id' },

    // ── CONTACTED — sumber: Kids Embassy ────────────────────────────────────
    { name:'Gathan Baby Shop',           type:'Independent Store', city:'Jakarta',         province:'DKI Jakarta',         region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kids Embassy', assigned:'Fhatia', last_contact:'2025-05-31', potential_monthly:7000000,  notes:'IG: @ghatan_babyshop' },
    { name:'Baby Kids Lab',              type:'Independent Store', city:'Jakarta Selatan', province:'DKI Jakarta',         region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kids Embassy', assigned:'Fhatia', last_contact:'2025-05-31', potential_monthly:7000000,  notes:'IG: @babykidslab' },
    { name:'Baby Clemira',               type:'Independent Store', city:'Karawaci',        province:'Banten',              region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kids Embassy', assigned:'Fhatia', last_contact:'2025-05-31', potential_monthly:6000000,  notes:'IG: @babyclemira_' },
    { name:'Malayeka Kids',              type:'Independent Store', city:'Sukabumi',        province:'Jawa Barat',          region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kids Embassy', assigned:'Fhatia', last_contact:'2025-05-31', potential_monthly:6000000,  notes:'IG: @malayeka.kids' },
    { name:'Qlamby Kids',                type:'Independent Store', city:'Garut',           province:'Jawa Barat',          region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kids Embassy', assigned:'Fhatia', last_contact:'2025-05-31', potential_monthly:6000000,  notes:'IG: @qlambykids' },
    { name:'Makassar Baby',              type:'Independent Store', city:'Makassar',        province:'Sulawesi Selatan',    region:'Sulawesi',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kids Embassy', assigned:'Fhatia', last_contact:'2025-05-31', potential_monthly:8000000,  notes:'IG: @makassarbaby' },
    { name:'Dzikri Baby Shop',           type:'Independent Store', city:'Makassar',        province:'Sulawesi Selatan',    region:'Sulawesi',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kids Embassy', assigned:'Fhatia', last_contact:'2025-05-31', potential_monthly:6000000,  notes:'IG: @dzikri_baby_shop' },
    { name:'Surabaya Baby',              type:'Independent Store', city:'Surabaya',        province:'Jawa Timur',          region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kids Embassy', assigned:'Fhatia', last_contact:'2025-05-31', potential_monthly:8000000,  notes:'IG: @surabayababy' },
    { name:'Aora Kids Baby',             type:'Independent Store', city:'Jambi',           province:'Jambi',               region:'Sumatera',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kids Embassy', assigned:'Fhatia', last_contact:'2025-05-31', potential_monthly:6000000,  notes:'IG: @aorakidsbaby_' },
    { name:'Boomee Baby',                type:'Independent Store', city:'Pariaman',        province:'Sumatera Barat',      region:'Sumatera',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kids Embassy', assigned:'Fhatia', last_contact:'2025-05-31', potential_monthly:5000000,  notes:'IG: @boomeebaby' },
    { name:'Konita Baby & Kids',         type:'Independent Store', city:'Pati',            province:'Jawa Tengah',         region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kids Embassy', assigned:'Fhatia', last_contact:'2025-05-30', potential_monthly:6000000,  notes:'IG: @konita_babykids' },
    { name:'Boone Baby & Kids Shop',     type:'Independent Store', city:'Purwokerto',      province:'Jawa Tengah',         region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kids Embassy', assigned:'Fhatia', last_contact:'2025-05-30', potential_monthly:7000000,  notes:'IG: @boone.babyshop' },
    { name:'Salwa Baby Shop Jepara',     type:'Independent Store', city:'Jepara',          province:'Jawa Tengah',         region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kids Embassy', assigned:'Fhatia', last_contact:'2025-05-30', potential_monthly:5000000,  notes:'IG: @salwababyshopjepara' },
    { name:'Anakids',                    type:'Independent Store', city:'Pacitan',         province:'Jawa Timur',          region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kids Embassy', assigned:'Fhatia', last_contact:'2025-05-30', potential_monthly:5000000,  notes:'IG: @anakids.id' },
    { name:'Ran Baby Room',              type:'Independent Store', city:'Padang',          province:'Sumatera Barat',      region:'Sumatera',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kids Embassy', assigned:'Fhatia', last_contact:'2025-05-30', potential_monthly:6000000,  notes:'IG: @ranbabyroom' },
    { name:'Moms Kid Timika',            type:'Independent Store', city:'Timika',          province:'Papua',               region:'Papua & Maluku',contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kids Embassy', assigned:'Fhatia', last_contact:'2025-05-31', potential_monthly:5000000,  notes:'IG: @momskidstimika' },
    { name:'Kaka Nino',                  type:'Independent Store', city:'Ternate',         province:'Maluku Utara',        region:'Papua & Maluku',contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kids Embassy', assigned:'Fhatia', last_contact:'2025-05-31', potential_monthly:5000000,  notes:'IG: @kakanino_ternate' },
    { name:'Little Hannah',              type:'Independent Store', city:'Gading Serpong',  province:'Banten',              region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kids Embassy', assigned:'Fhatia', last_contact:'2025-06-02', potential_monthly:7000000,  notes:'IG: @littlehannah.id' },
    { name:'Lykids Shop',                type:'Independent Store', city:'Palembang',       province:'Sumatera Selatan',    region:'Sumatera',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kids Embassy', assigned:'Fhatia', last_contact:'2025-06-02', potential_monthly:6000000,  notes:'IG: @lykidsshop' },
    { name:'Butikids',                   type:'Independent Store', city:'Karawang',        province:'Jawa Barat',          region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kids Embassy', assigned:'Fhatia', last_contact:'2025-05-31', potential_monthly:6000000,  notes:'IG: @butikids_' },

    // ── CONTACTED — sumber: Bohopana ─────────────────────────────────────────
    { name:'Baby Palm',                  type:'Independent Store', city:'Surabaya',        province:'Jawa Timur',          region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-02', potential_monthly:8000000,  notes:'IG: @babypalm.id' },
    { name:'Lovely Baby Shop',           type:'Independent Store', city:'Ambon',           province:'Maluku',              region:'Papua & Maluku',contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-02', potential_monthly:5000000,  notes:'IG: @lovelybabyamq' },
    { name:'Satu Sama Baby Care',        type:'Independent Store', city:'Makassar',        province:'Sulawesi Selatan',    region:'Sulawesi',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-02', potential_monthly:7000000,  notes:'IG: @satusamababycare' },
    { name:'Sangir Talaud Perintis',     type:'Independent Store', city:'Manado',          province:'Sulawesi Utara',      region:'Sulawesi',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-02', potential_monthly:6000000,  notes:'IG: @sangirtalaudperintis' },
    { name:'Haura Baby Shop',            type:'Independent Store', city:'Makassar',        province:'Sulawesi Selatan',    region:'Sulawesi',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-02', potential_monthly:6000000,  notes:'IG: @haurababykidss' },
    { name:'Mhk Baby and Kids',          type:'Independent Store', city:'Palu',            province:'Sulawesi Tengah',     region:'Sulawesi',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-02', potential_monthly:5000000,  notes:'IG: @mhkbabykids' },
    { name:'Jordan Baby Shop',           type:'Independent Store', city:'Bandar Lampung',  province:'Lampung',             region:'Sumatera',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-02', potential_monthly:7000000,  notes:'IG: @jordanbabyshop.lampung' },
    { name:'Bambino Baby and Kids',      type:'Independent Store', city:'Palembang',       province:'Sumatera Selatan',    region:'Sumatera',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-02', potential_monthly:7000000,  notes:'IG: @bambino_babynkids' },
    { name:'Faluta Baby Shop',           type:'Independent Store', city:'Padang',          province:'Sumatera Barat',      region:'Sumatera',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-02', potential_monthly:6000000,  notes:'IG: @falutababyshop' },
    { name:'Zizi Baby Kids',             type:'Independent Store', city:'Banda Aceh',      province:'Aceh',                region:'Sumatera',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-02', potential_monthly:5000000,  notes:'IG: @zizi.babykids.aceh' },
    { name:'Baby Market',                type:'Independent Store', city:'Pekanbaru',       province:'Riau',                region:'Sumatera',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-02', potential_monthly:7000000,  notes:'IG: @babymarketindonesia' },
    { name:'Istana Bayi',                type:'Independent Store', city:'Pekanbaru',       province:'Riau',                region:'Sumatera',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-03', potential_monthly:7000000,  notes:'IG: @istanabayipku1' },
    { name:'Tododo Baby Shop',           type:'Independent Store', city:'Samarinda',       province:'Kalimantan Timur',    region:'Kalimantan',    contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-03', potential_monthly:6000000,  notes:'IG: @tododo.official' },
    { name:'Kidspot Baby Shop',          type:'Independent Store', city:'Denpasar',        province:'Bali',                region:'Bali',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-03', potential_monthly:7000000,  notes:'IG: @kidspotbabyshop' },
    { name:'Pikmi Baby Kids',            type:'Independent Store', city:'Banjarmasin',     province:'Kalimantan Selatan',  region:'Kalimantan',    contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-04', potential_monthly:6000000,  notes:'IG: @pikmiibabykids' },
    { name:'Ubay Kidstore',              type:'Independent Store', city:'Balikpapan',      province:'Kalimantan Timur',    region:'Kalimantan',    contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-04', potential_monthly:6000000,  notes:'IG: @ubay.kidsstore' },
    { name:'Bambini Baby Shop',          type:'Independent Store', city:'Kendari',         province:'Sulawesi Tenggara',   region:'Sulawesi',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-04', potential_monthly:5000000,  notes:'IG: @bambinibabyshop' },
    { name:'Mamabun Kids',               type:'Independent Store', city:'Makassar',        province:'Sulawesi Selatan',    region:'Sulawesi',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-04', potential_monthly:7000000,  notes:'IG: @mamabun_kids' },
    { name:'Raina Baby Kids',            type:'Independent Store', city:'Palu',            province:'Sulawesi Tengah',     region:'Sulawesi',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-04', potential_monthly:5000000,  notes:'IG: @raina.babykidspalu' },
    { name:'Sulthan Baby Shop',          type:'Independent Store', city:'Bukittinggi',     province:'Sumatera Barat',      region:'Sumatera',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-05', potential_monthly:6000000,  notes:'IG: @sulthanbabyshop.official' },
    { name:'Pelangi Baby Shop',          type:'Independent Store', city:'Kota Baru',       province:'Kalimantan Selatan',  region:'Kalimantan',    contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-05', potential_monthly:5000000,  notes:'IG: @pelangi_babykotabaru' },
    { name:'Baby Wear by Adit',          type:'Independent Store', city:'Banjarmasin',     province:'Kalimantan Selatan',  region:'Kalimantan',    contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-05', potential_monthly:5000000,  notes:'IG: @babywearbyadit' },
    { name:'Famili Baby Shop',           type:'Independent Store', city:'Gresik',          province:'Jawa Timur',          region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-05', potential_monthly:6000000,  notes:'IG: @familibabyshop' },
    { name:'Tododo Kupang',              type:'Independent Store', city:'Kupang',          province:'Nusa Tenggara Timur', region:'Papua & Maluku',contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-05', potential_monthly:5000000,  notes:'IG: @tododo.kupang' },
    { name:'Starlight Baby Shop',        type:'Independent Store', city:'Mataram',         province:'Nusa Tenggara Barat', region:'Bali',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-05', potential_monthly:5000000,  notes:'IG: @starlightbabyshop.ntb' },
    { name:'DO RE MI Baby Shop',         type:'Independent Store', city:'Palangkaraya',    province:'Kalimantan Tengah',   region:'Kalimantan',    contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-05', potential_monthly:5000000,  notes:'IG: @doremipalangka.sampit' },
    { name:'Bebimart',                   type:'Independent Store', city:'Karang Anyar',    province:'Jawa Tengah',         region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Bohopana',     assigned:'Fhatia', last_contact:'2025-06-10', potential_monthly:6000000,  notes:'IG: @bebimart' },

    // ── CONTACTED — sumber: Kiekeboo ─────────────────────────────────────────
    { name:'Sansan Baby Kids',           type:'Independent Store', city:'Pekanbaru',       province:'Riau',                region:'Sumatera',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kiekeboo',     assigned:'Fhatia', last_contact:'2025-05-31', potential_monthly:7000000,  notes:'IG: @sansan_babynkids_pku' },
    { name:'Baby Land Kudus',            type:'Independent Store', city:'Kudus',           province:'Jawa Tengah',         region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kiekeboo',     assigned:'Fhatia', last_contact:'2025-05-31', potential_monthly:6000000,  notes:'IG: @babyland_kudus' },
    { name:'Kira Kids Shop',             type:'Independent Store', city:'Denpasar',        province:'Bali',                region:'Bali',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kiekeboo',     assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:7000000,  notes:'IG: @kirakidsshop' },
    { name:'Baby Fash Cash',             type:'Independent Store', city:'Depok',           province:'Jawa Barat',          region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kiekeboo',     assigned:'Fhatia', last_contact:'2025-05-31', potential_monthly:6000000,  notes:'IG: @babyfashcash.id' },
    { name:'bondsbabyid',                type:'Independent Store', city:'Jakarta Barat',   province:'DKI Jakarta',         region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Kiekeboo',     assigned:'Fhatia', last_contact:'2025-05-31', potential_monthly:6000000,  notes:'IG: @babykidslab' },

    // ── CONTACTED — sumber: Ichigo ───────────────────────────────────────────
    { name:'Vinolia',                    type:'Independent Store', city:'Yogyakarta',      province:'DI Yogyakarta',       region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Ichigo',       assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:7000000,  notes:'IG: @vinolia.id' },
    { name:'Buchi Kids',                 type:'Independent Store', city:'Malang',          province:'Jawa Timur',          region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Ichigo',       assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:6000000,  notes:'IG: @buchikidsonline' },
    { name:'GenyC Babyshop',             type:'Independent Store', city:'Denpasar',        province:'Bali',                region:'Bali',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Ichigo',       assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:7000000,  notes:'IG: @genycbabyshop' },
    { name:'Baby House Balikpapan',      type:'Independent Store', city:'Balikpapan',      province:'Kalimantan Timur',    region:'Kalimantan',    contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Ichigo',       assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:6000000,  notes:'IG: @babyhousebalikpapan' },
    { name:'Nagatomi',                   type:'Independent Store', city:'Semarang',        province:'Jawa Tengah',         region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Ichigo',       assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:6000000,  notes:'IG: @nagatomi114' },

    // ── CONTACTED — Outbound / no source ────────────────────────────────────
    { name:'Milk Baby Shop',             type:'Independent Store', city:'Makassar',        province:'Sulawesi Selatan',    region:'Sulawesi',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:7000000,  notes:'IG: @milkbabyonline' },
    { name:'Anak Kecil Jambi',           type:'Independent Store', city:'Jambi',           province:'Jambi',               region:'Sumatera',      contact_name:'',          contact_wa:'628536903708',  stage:'Contacted',     source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:6000000,  notes:'IG: @anakkecil_babynkids' },
    { name:'Macadamia Little Glamz',     type:'Boutique Store',    city:'Bandung',         province:'Jawa Barat',          region:'Jawa',          contact_name:'',          contact_wa:'6289541282006', stage:'Contacted',     source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:8000000,  notes:'IG: @macadamialittleglamz' },
    { name:'Little Baby House Cibubur',  type:'Independent Store', city:'Cibubur',         province:'Jawa Barat',          region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:7000000,  notes:'IG: @littlebabyhouse.cibubur' },
    { name:'Little Baby House Kota Wisata',type:'Independent Store',city:'Bogor',          province:'Jawa Barat',          region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:7000000,  notes:'IG: @littlebabyhouse.kotawisata' },
    { name:'Sangirta Laud Hertasning',   type:'Independent Store', city:'Makassar',        province:'Sulawesi Selatan',    region:'Sulawesi',      contact_name:'',          contact_wa:'6282393666690', stage:'Contacted',     source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:6000000,  notes:'IG: @sangirtalaudhertasning' },
    { name:'Zora',                       type:'Independent Store', city:'Tangerang',       province:'Banten',              region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:7000000,  notes:'IG: @shopzora.id' },
    { name:'Lavie Baby House',           type:'Independent Store', city:'Bandung',         province:'Jawa Barat',          region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:7000000,  notes:'IG: @lavie_babyhouse' },
    { name:'Fluvvy Baby Shop',           type:'Independent Store', city:'Serpong',         province:'Banten',              region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:7000000,  notes:'IG: @fluvvy_babyshop' },
    { name:'Yens Baby Shop',             type:'Independent Store', city:'Bandung',         province:'Jawa Barat',          region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:6000000,  notes:'IG: @yensbabyshop' },
    { name:'Bebe Story',                 type:'Independent Store', city:'Balikpapan',      province:'Kalimantan Timur',    region:'Kalimantan',    contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:6000000,  notes:'IG: @bebestory_mtharyono' },
    { name:'Saidah Shop',                type:'Independent Store', city:'Makassar',        province:'Sulawesi Selatan',    region:'Sulawesi',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:6000000,  notes:'IG: @saidahalhabsyishop' },
    { name:'Dean Baby Official',         type:'Independent Store', city:'Tarakan',         province:'Kalimantan Utara',    region:'Kalimantan',    contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-27', potential_monthly:5000000,  notes:'IG: @deanbaby.official' },
    { name:'Mommy Baby Queen',           type:'Independent Store', city:'Denpasar',        province:'Bali',                region:'Bali',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-31', potential_monthly:6000000,  notes:'IG: @mommybabyqueen' },
    { name:'Toko Shaci',                 type:'Independent Store', city:'Bima',            province:'Nusa Tenggara Barat', region:'Bali',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-31', potential_monthly:5000000,  notes:'IG: @tokoshaci' },
    { name:'Bebelove',                   type:'Independent Store', city:'Bintaro',         province:'Banten',              region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-31', potential_monthly:7000000,  notes:'IG: @bebelove.id' },
    { name:'Baby Shop Stores Indonesia', type:'Chain Store',       city:'Bandung',         province:'Jawa Barat',          region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-31', potential_monthly:15000000, notes:'Multi-kota: Bandung, Surabaya, Depok, Jakarta. IG: @babyshopstores_indonesia' },
    { name:'Bahagia Baby Shop',          type:'Independent Store', city:'Makassar',        province:'Sulawesi Selatan',    region:'Sulawesi',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-31', potential_monthly:6000000,  notes:'IG: @bahagiababyshop' },
    { name:'Athena Babyshop',            type:'Independent Store', city:'Medan',           province:'Sumatera Utara',      region:'Sumatera',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:7000000,  notes:'IG: @athenababyshop' },
    { name:'Alan Baby Kids',             type:'Independent Store', city:'Tanjung Pandan',  province:'Bangka Belitung',     region:'Sumatera',      contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:5000000,  notes:'IG: @alanbabykids' },
    { name:'Aneka Kids',                 type:'Independent Store', city:'Malang',          province:'Jawa Timur',          region:'Jawa',          contact_name:'',          contact_wa:'',              stage:'Contacted',     source:'Outbound',     assigned:'Fhatia', last_contact:'2025-05-28', potential_monthly:7000000,  notes:'IG outreach via link.' },

    // ── COLD LEAD ────────────────────────────────────────────────────────────
    { name:'Kidzone Merauke',            type:'Independent Store', city:'Merauke',         province:'Papua',               region:'Papua & Maluku',contact_name:'',          contact_wa:'',              stage:'Cold Lead',     source:'Outbound',     assigned:'',       last_contact:'',           potential_monthly:5000000,  notes:'Found via Facebook. Belum dikontaksi. https://facebook.com/Kidzone-Merauke' },
  ],

  // ── KOL Program ──────────────────────────────────────────────
  kolSheetId: '',           // Fill: Google Sheet ID (from URL after /d/)
  kolGid:     '',           // Fill: GID of the KOL_Database tab
  kolFormUrl: '',           // Fill: Google Form URL for Hasna & Rahmi to submit entries
  kolBudgetCeiling: 15000000, // Rp 15 juta / month max
  kolCPMThresholds: { green: 5000, blue: 10000, amber: 15000 },

  // KOL base data — sourced from kol-pool-data.js (loaded before this file).
  // Run scripts/excel-to-web.py to regenerate from DEPLOY-KOL-Dashboard.xlsx.
  sampleKOL: (typeof KOL_POOL_DATA !== 'undefined') ? KOL_POOL_DATA : [],

  sampleTargets: [
    // May 2026
    { month:'2026-05', channel:'Shopee',      revenue_target:180000000, revenue_actual:166000000, orders_target:2200, orders_actual:2450 },
    { month:'2026-05', channel:'Tokopedia',   revenue_target:90000000,  revenue_actual:82000000,  orders_target:1200, orders_actual:1290 },
    { month:'2026-05', channel:'TikTok Shop', revenue_target:120000000, revenue_actual:114000000, orders_target:1500, orders_actual:1700 },
    { month:'2026-05', channel:'Meta CPAS',   revenue_target:125000000, revenue_actual:117000000, orders_target:1900, orders_actual:1780 },
    { month:'2026-05', channel:'Offline',     revenue_target:200000000, revenue_actual:175000000, orders_target:0,    orders_actual:0    },
    // April 2026
    { month:'2026-04', channel:'Shopee',      revenue_target:160000000, revenue_actual:138000000, orders_target:2000, orders_actual:2050 },
    { month:'2026-04', channel:'Tokopedia',   revenue_target:80000000,  revenue_actual:68000000,  orders_target:1100, orders_actual:1060 },
    { month:'2026-04', channel:'TikTok Shop', revenue_target:100000000, revenue_actual:94000000,  orders_target:1300, orders_actual:1400 },
    { month:'2026-04', channel:'Meta CPAS',   revenue_target:110000000, revenue_actual:98000000,  orders_target:1700, orders_actual:1490 },
    { month:'2026-04', channel:'Offline',     revenue_target:230000000, revenue_actual:210000000, orders_target:0,    orders_actual:0    },
    // January 2026 (from B2B Sales Report — 22 customers, nett Rp 320jt)
    { month:'2026-01', channel:'Shopee',      revenue_target:150000000, revenue_actual:132000000, orders_target:1800, orders_actual:1920 },
    { month:'2026-01', channel:'Tokopedia',   revenue_target:70000000,  revenue_actual:58000000,  orders_target:950,  orders_actual:880  },
    { month:'2026-01', channel:'TikTok Shop', revenue_target:90000000,  revenue_actual:78000000,  orders_target:1100, orders_actual:1180 },
    { month:'2026-01', channel:'Meta CPAS',   revenue_target:100000000, revenue_actual:86000000,  orders_target:1500, orders_actual:1310 },
    { month:'2026-01', channel:'Offline',     revenue_target:350000000, revenue_actual:320116754, orders_target:0,    orders_actual:0    },
  ],
};
