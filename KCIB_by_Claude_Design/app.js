/* ═══════════════════════════════════════════════════════════════════════════
   KCIB — app.js
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Data ─────────────────────────────────────────────────────── */
const INVENTORY = [
  // instruments (timed)
  { id:'inst_01', category:'instrument', name:'Gas Chromatograph (GC)', model:'Shimadzu GC-2010 Plus', location:'ห้องวิเคราะห์ 301', desc:'วิเคราะห์สารอินทรีย์ระเหยง่าย (VOCs) พร้อมหัววัด FID', isAvailable:true, bookingType:'timed', maxQuantity:1, totalQuantity:1 },
  { id:'inst_02', category:'instrument', name:'HPLC System', model:'Agilent 1260 Infinity II', location:'ห้องวิเคราะห์ 302', desc:'โครมาโทกราฟีของเหลวสมรรถนะสูง สำหรับงานวิเคราะห์เชิงปริมาณ', isAvailable:true, bookingType:'timed', maxQuantity:1, totalQuantity:1 },
  { id:'inst_03', category:'instrument', name:'FTIR Spectrometer', model:'Thermo Nicolet iS5', location:'ห้อง Instrument 205', desc:'วิเคราะห์หมู่ฟังก์ชันโมเลกุลด้วยอินฟราเรด', isAvailable:true, bookingType:'timed', maxQuantity:1, totalQuantity:1 },
  { id:'inst_04', category:'instrument', name:'UV-Vis Spectrophotometer', model:'Shimadzu UV-1800', location:'ห้องปฏิบัติการ 1', desc:'วัดการดูดกลืนแสงในช่วง 190–1100 nm', isAvailable:false, bookingType:'timed', maxQuantity:1, totalQuantity:1 },
  { id:'inst_05', category:'instrument', name:'Atomic Absorption', model:'PerkinElmer PinAAcle 900', location:'ห้องวิเคราะห์ 303', desc:'วิเคราะห์ปริมาณโลหะหนักในตัวอย่าง', isAvailable:true, bookingType:'timed', maxQuantity:1, totalQuantity:1 },
  { id:'inst_06', category:'instrument', name:'Rotary Evaporator', model:'Büchi R-300', location:'ห้องปฏิบัติการ 2', desc:'ระเหยตัวทำละลายภายใต้สุญญากาศ', isAvailable:true, bookingType:'timed', maxQuantity:2, totalQuantity:2 },

  // glassware (quantity)
  { id:'gl_01', category:'glassware', name:'Beaker 250 mL', model:'Pyrex · Borosilicate', location:'ตู้เก็บแก้ว A', desc:'บีกเกอร์ขนาดกลาง สำหรับการผสมและให้ความร้อน', isAvailable:true, bookingType:'quantity', maxQuantity:40, totalQuantity:50, unit:'ชิ้น' },
  { id:'gl_02', category:'glassware', name:'Volumetric Flask 100 mL', model:'DURAN Class A', location:'ตู้เก็บแก้ว B', desc:'ขวดวัดปริมาตร ใช้เตรียมสารละลายมาตรฐาน', isAvailable:true, bookingType:'quantity', maxQuantity:20, totalQuantity:24, unit:'ชิ้น' },
  { id:'gl_03', category:'glassware', name:'Burette 50 mL', model:'Schellbach · Class A', location:'ตู้เก็บแก้ว C', desc:'บิวเรตสำหรับไทเทรต ละเอียด 0.1 mL', isAvailable:true, bookingType:'quantity', maxQuantity:12, totalQuantity:16, unit:'ชิ้น' },
  { id:'gl_04', category:'glassware', name:'Erlenmeyer Flask 500 mL', model:'Pyrex', location:'ตู้เก็บแก้ว A', desc:'ฟลาสก์ทรงกรวย คอกว้าง สำหรับการผสม', isAvailable:true, bookingType:'quantity', maxQuantity:28, totalQuantity:30, unit:'ชิ้น' },
  { id:'gl_05', category:'glassware', name:'Graduated Cylinder 100 mL', model:'DURAN', location:'ตู้เก็บแก้ว B', desc:'กระบอกตวงปริมาตร พร้อมฐานหกเหลี่ยม', isAvailable:true, bookingType:'quantity', maxQuantity:18, totalQuantity:22, unit:'ชิ้น' },
  { id:'gl_06', category:'glassware', name:'Condenser (Liebig)', model:'Ground joint 24/40', location:'ตู้เก็บแก้ว D', desc:'คอนเดนเซอร์สำหรับการกลั่น', isAvailable:false, bookingType:'quantity', maxQuantity:0, totalQuantity:6, unit:'ชิ้น' },

  // scientific supplies
  { id:'sc_01', category:'scientific', name:'Filter Paper (Whatman No.1)', model:'125 mm, 100/pack', location:'ห้องจ่ายของ', desc:'กระดาษกรองชนิดเนื้อปานกลาง ใช้งานทั่วไป', isAvailable:true, bookingType:'quantity', maxQuantity:50, totalQuantity:80, unit:'แพ็ค' },
  { id:'sc_02', category:'scientific', name:'Nitrile Gloves (M)', model:'Ansell TouchNTuff', location:'ห้องจ่ายของ', desc:'ถุงมือยางไนไตร ปลอดผง ไม่ก่อภูมิแพ้', isAvailable:true, bookingType:'quantity', maxQuantity:200, totalQuantity:240, unit:'คู่' },
  { id:'sc_03', category:'scientific', name:'Safety Goggles', model:'Uvex Ultra-spec 2000', location:'ห้อง PPE', desc:'แว่นนิรภัย ครอบเต็ม กันสารเคมีกระเด็น', isAvailable:true, bookingType:'quantity', maxQuantity:30, totalQuantity:40, unit:'ชิ้น' },
  { id:'sc_04', category:'scientific', name:'Kimwipes', model:'Kimtech 34155', location:'ห้องจ่ายของ', desc:'กระดาษเช็ดเลนส์และอุปกรณ์แก้ว', isAvailable:true, bookingType:'quantity', maxQuantity:60, totalQuantity:80, unit:'กล่อง' },
  { id:'sc_05', category:'scientific', name:'Lab Coat (Cotton, size L)', model:'White · long sleeve', location:'ห้อง PPE', desc:'เสื้อกาวน์ปฏิบัติการ ซักทำความสะอาดแล้ว', isAvailable:true, bookingType:'quantity', maxQuantity:12, totalQuantity:20, unit:'ตัว' },

  // chemicals
  { id:'ch_01', category:'chemical', name:'Ethanol Absolute', model:'AR grade, 2.5 L', location:'ตู้สารเคมี A1', desc:'เอทานอลความบริสุทธิ์ ≥ 99.8% สำหรับงานวิเคราะห์', isAvailable:true, bookingType:'quantity', maxQuantity:8, totalQuantity:10, unit:'ขวด', hazard:false },
  { id:'ch_02', category:'chemical', name:'Sulfuric Acid 98%', model:'Sigma-Aldrich, 500 mL', location:'ตู้สารเคมี B2', desc:'กรดซัลฟิวริกเข้มข้น — สารอันตราย', isAvailable:true, bookingType:'quantity', maxQuantity:4, totalQuantity:6, unit:'ขวด', hazard:true },
  { id:'ch_03', category:'chemical', name:'Sodium Hydroxide (NaOH)', model:'Pellets, 1 kg', location:'ตู้สารเคมี A2', desc:'โซเดียมไฮดรอกไซด์เม็ด ≥ 97%', isAvailable:true, bookingType:'quantity', maxQuantity:10, totalQuantity:12, unit:'ขวด', hazard:true },
  { id:'ch_04', category:'chemical', name:'Acetone HPLC Grade', model:'Merck, 4 L', location:'ตู้สารเคมี A1', desc:'อะซีโตนสำหรับ HPLC, ≥ 99.9%', isAvailable:true, bookingType:'quantity', maxQuantity:6, totalQuantity:8, unit:'ขวด', hazard:false },
  { id:'ch_05', category:'chemical', name:'Hexane (n-Hexane)', model:'AR, 2.5 L', location:'ตู้สารเคมี B1', desc:'เฮกเซนสำหรับการสกัด', isAvailable:false, bookingType:'quantity', maxQuantity:0, totalQuantity:5, unit:'ขวด', hazard:true },
  { id:'ch_06', category:'chemical', name:'Potassium Permanganate', model:'ACS Grade, 500 g', location:'ตู้สารเคมี A3', desc:'สารออกซิไดเซอร์เข้มข้น', isAvailable:true, bookingType:'quantity', maxQuantity:5, totalQuantity:6, unit:'ขวด', hazard:true },
];

const ADVISORS = [
  { email:'adv1@kmitl.ac.th', name:'รศ.ดร. สมชาย รัตนพงษ์' },
  { email:'adv2@kmitl.ac.th', name:'ผศ.ดร. วิภาดา กุลวานิช' },
  { email:'adv3@kmitl.ac.th', name:'ดร. ปกรณ์ ศิริเดช' },
  { email:'adv4@kmitl.ac.th', name:'ผศ.ดร. อรุณี ธรรมใจ' },
];

const COURSES = [
  { v:'all', l:'ทั่วไป / ทุกวิชา' },
  { v:'team2', l:'TEAM PROJECT 2' },
  { v:'che_lab', l:'ปฏิบัติการวิศวกรรมเคมี' },
  { v:'process_design', l:'การออกแบบกระบวนการเคมี' },
  { v:'senior', l:'Senior Project' },
  { v:'research', l:'งานวิจัย' },
];

const MY_BOOKINGS = [
  { id:'BK-20260418-001', itemId:'inst_01', category:'instrument', status:'pending-1', createdAt:'18/04/2026', startDate:'22/04/2026', startTime:'09:00', endTime:'11:00', advisor:'รศ.ดร. สมชาย รัตนพงษ์', course:'Senior Project', qty:1, notes:'โครงงานวิเคราะห์สารระเหยในน้ำเสีย' },
  { id:'BK-20260416-002', itemId:'gl_01', category:'glassware', status:'pending-2', createdAt:'16/04/2026', startDate:'20/04/2026', endDate:'25/04/2026', advisor:'ผศ.ดร. วิภาดา กุลวานิช', course:'ปฏิบัติการวิศวกรรมเคมี', qty:8 },
  { id:'BK-20260410-003', itemId:'ch_01', category:'chemical', status:'approved', createdAt:'10/04/2026', startDate:'15/04/2026', endDate:'20/04/2026', advisor:'ดร. ปกรณ์ ศิริเดช', course:'งานวิจัย', qty:2 },
  { id:'BK-20260405-004', itemId:'inst_03', category:'instrument', status:'rejected', createdAt:'05/04/2026', startDate:'08/04/2026', startTime:'14:00', endTime:'16:00', advisor:'ผศ.ดร. อรุณี ธรรมใจ', course:'TEAM PROJECT 2', qty:1, rejectReason:'ช่วงเวลานี้มีการจองซ้อน' },
];

const DASH_ROWS = [
  { id:'BK-20260418-001', user:'สมชาย ใจดี', email:'somchai@kmitl.ac.th', item:'Gas Chromatograph', cat:'instrument', date:'22/04/2026', status:'pending-1', needMe:true },
  { id:'BK-20260418-002', user:'ศิริพร นามดี', email:'siriporn@kmitl.ac.th', item:'Ethanol Absolute', cat:'chemical', date:'20/04/2026', status:'pending-1', needMe:true },
  { id:'BK-20260417-003', user:'ธนา วัฒนศรี', email:'thana@kmitl.ac.th', item:'Beaker 250 mL × 8', cat:'glassware', date:'20/04/2026', status:'pending-1', needMe:true },
  { id:'BK-20260417-004', user:'มนัสชยา สินไชย', email:'manat@kmitl.ac.th', item:'FTIR Spectrometer', cat:'instrument', date:'22/04/2026', status:'pending-1', needMe:true },
  { id:'BK-20260416-005', user:'กิตติ บัณฑิต', email:'kitti@kmitl.ac.th', item:'Safety Goggles × 3', cat:'scientific', date:'19/04/2026', status:'pending-1', needMe:true },
  { id:'BK-20260416-006', user:'ปวีณา จิตใส', email:'paweena@kmitl.ac.th', item:'HPLC System', cat:'instrument', date:'25/04/2026', status:'pending-2', needMe:false },
  { id:'BK-20260415-007', user:'วรกร ปัญญา', email:'worakorn@kmitl.ac.th', item:'Sulfuric Acid 98%', cat:'chemical', date:'21/04/2026', status:'approved', needMe:false },
];

/* ── i18n ─────────────────────────────────────────────────────── */
const I18N = {
  th: {
    'brand.sub':'ระบบจองอุปกรณ์',
    'nav.home':'หน้าหลัก','nav.instruments':'เครื่องมือ','nav.glassware':'แก้ว','nav.scientific':'วิทยาศาสตร์','nav.chemicals':'เคมี',
    'nav.myBookings':'การจองของฉัน','nav.dashboard':'แดชบอร์ด','nav.login':'เข้าสู่ระบบ','nav.logout':'ออกจากระบบ',
    'hero.badge':'ภาควิชาวิศวกรรมเคมี · KMITL',
    'hero.titleA':'ระบบ','hero.titleB':'จองอุปกรณ์','hero.titleC':'ห้องปฏิบัติการ',
    'hero.subtitle':'จองเครื่องมือ แก้ว และสารเคมี ได้อย่างรวดเร็ว — ผ่านระบบออนไลน์ที่ออกแบบมาเพื่อนักศึกษาและคณาจารย์',
    'hero.cta':'เริ่มต้นจองอุปกรณ์','hero.secondary':'วิธีการใช้งาน','hero.scroll':'เลื่อนลง',
    'hero.trust':'จากนักศึกษาและคณาจารย์ในภาควิชา',
    'stat.instruments':'เครื่องมือ','stat.glassware':'อุปกรณ์แก้ว','stat.chemicals':'สารเคมี','stat.total':'การจองทั้งหมด',
    'cat.eyebrow':'หมวดหมู่','cat.title':'เลือกหมวดหมู่ที่ต้องการ','cat.sub':'ทุกหมวดอัปเดตสถานะความพร้อมใช้งานแบบเรียลไทม์ จากฐานข้อมูลของภาควิชา',
    'cat.instruments':'เครื่องมือวิเคราะห์','cat.instruments.desc':'GC, HPLC, FTIR, UV-Vis และเครื่องมือวิเคราะห์ขั้นสูง สำหรับงานวิจัยและปฏิบัติการ',
    'cat.glassware':'อุปกรณ์แก้ว','cat.glassware.desc':'บีกเกอร์ ฟลาสก์ บิวเรต ไพเพต คอนเดนเซอร์ และเครื่องแก้วสำหรับทุกปฏิบัติการ',
    'cat.scientific':'วัสดุสิ้นเปลือง','cat.scientific.desc':'กระดาษกรอง ถุงมือ PPE ผ้าเช็ด และวัสดุเสริมสำหรับงานห้องปฏิบัติการ',
    'cat.chemicals':'สารเคมี','cat.chemicals.desc':'ตัวทำละลาย เกลือ กรด เบส และสารเคมีวิเคราะห์ พร้อมการควบคุมความปลอดภัย',
    'cf.title':'จองล่วงหน้า · อนุมัติ 3 ขั้น','cf.sub':'ที่ปรึกษา → ประธาน → เจ้าหน้าที่ — ติดตามสถานะได้แบบเรียลไทม์',
    'how.eyebrow':'วิธีใช้งาน','how.title':'จองอุปกรณ์ใน 3 ขั้นตอน','how.sub':'ตั้งแต่ค้นหาอุปกรณ์จนถึงรับของที่ห้องแล็บ — เรียบง่าย ตรวจสอบได้',
    'how.s1.t':'เลือกอุปกรณ์','how.s1.d':'เรียกดูรายการตามหมวดหมู่ กรองตามสถานที่และสถานะพร้อมใช้งาน',
    'how.s2.t':'กรอกข้อมูล','how.s2.d':'เลือกวันที่ ช่วงเวลา จำนวน พร้อมระบุรายวิชา ที่ปรึกษา และวัตถุประสงค์',
    'how.s3.t':'รอการอนุมัติ','how.s3.d':'ระบบแจ้งเตือนทุกขั้นตอน — จากที่ปรึกษา สู่เจ้าหน้าที่ห้องแล็บ',
    'how.tip.e':'เคล็ดลับ','how.tip.t':'จองล่วงหน้าอย่างน้อย 3 วันทำการ สำหรับเครื่องมือวิเคราะห์','how.tip.cta':'ดูเครื่องมือทั้งหมด',
  },
  en: {
    'brand.sub':'Booking System',
    'nav.home':'Home','nav.instruments':'Instruments','nav.glassware':'Glassware','nav.scientific':'Scientific','nav.chemicals':'Chemicals',
    'nav.myBookings':'My Bookings','nav.dashboard':'Dashboard','nav.login':'Sign In','nav.logout':'Sign Out',
    'hero.badge':'Dept. of Chemical Engineering · KMITL',
    'hero.titleA':'Laboratory','hero.titleB':'Equipment Booking','hero.titleC':'System',
    'hero.subtitle':'Book instruments, glassware, and chemicals — an online system designed for students and faculty.',
    'hero.cta':'Start Booking','hero.secondary':'How it works','hero.scroll':'Scroll',
    'hero.trust':'from students & faculty in the department',
    'stat.instruments':'Instruments','stat.glassware':'Glassware','stat.chemicals':'Chemicals','stat.total':'Total Bookings',
    'cat.eyebrow':'Categories','cat.title':'Choose a category','cat.sub':'All categories reflect real-time availability from the department database.',
    'cat.instruments':'Analytical','cat.instruments.desc':'GC, HPLC, FTIR, UV-Vis and more — for research and teaching labs.',
    'cat.glassware':'Glassware','cat.glassware.desc':'Beakers, flasks, burettes, pipettes, condensers — the lab essentials.',
    'cat.scientific':'Supplies','cat.scientific.desc':'Filter paper, PPE, wipes, and consumables for daily lab work.',
    'cat.chemicals':'Chemicals','cat.chemicals.desc':'Solvents, acids, bases, and analytical chemicals — with safety controls.',
    'cf.title':'3-step approval workflow','cf.sub':'Advisor → Head → Staff. Track your status in real time.',
    'how.eyebrow':'How it works','how.title':'Book in 3 simple steps','how.sub':'From browsing to pickup at the lab — clean, auditable, clear.',
    'how.s1.t':'Browse','how.s1.d':'Filter by category, location, and availability.',
    'how.s2.t':'Fill details','how.s2.d':'Select dates, times, quantities, advisor, course, purpose.',
    'how.s3.t':'Get approved','how.s3.d':'Notifications at every step — from advisor to lab staff.',
    'how.tip.e':'Tip','how.tip.t':'Book at least 3 business days ahead for analytical instruments.','how.tip.cta':'See all instruments',
  }
};

/* ── State ────────────────────────────────────────────────────── */
const state = {
  lang: localStorage.getItem('kcib.lang') || 'th',
  cart: JSON.parse(localStorage.getItem('kcib.cart') || '[]'),
  user: JSON.parse(localStorage.getItem('kcib.user') || 'null'),
  route: (location.hash || '#home').replace('#',''),
  tab: 'all',
};

const CAT_META = {
  instrument: { c:'#0369a1', bg:'#e0f2fe', ic:'🔬', name:'Instruments' },
  glassware:  { c:'#7c3aed', bg:'#f3e8ff', ic:'🧪', name:'Glassware' },
  scientific: { c:'#16a34a', bg:'#dcfce7', ic:'🧫', name:'Scientific' },
  chemical:   { c:'#c2410c', bg:'#fff7ed', ic:'⚗️', name:'Chemicals' },
};

/* ── Helpers ──────────────────────────────────────────────────── */
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const t  = (k) => (I18N[state.lang] && I18N[state.lang][k]) || I18N.th[k] || k;

function save(){
  localStorage.setItem('kcib.lang', state.lang);
  localStorage.setItem('kcib.cart', JSON.stringify(state.cart));
  localStorage.setItem('kcib.user', JSON.stringify(state.user));
}

function applyI18n(){
  $$('[data-i18n]').forEach(el => { const k = el.dataset.i18n; const v = t(k); if (v) el.textContent = v; });
  document.documentElement.lang = state.lang;
}

/* ── Splash ───────────────────────────────────────────────────── */
setTimeout(() => $('#splash').classList.add('is-hidden'), 1400);

/* ── Routing (hash-based) ─────────────────────────────────────── */
function go(to){
  if (!to) to = 'home';
  state.route = to;
  // show page
  $$('.page').forEach(p => p.classList.toggle('is-active', p.dataset.page === to));
  // active link
  $$('.nav-link').forEach(a => a.classList.toggle('is-active', a.dataset.section === to));
  // close drawer & cart
  closeDrawer(); closeCart();
  window.scrollTo({ top: 0, behavior: 'instant' });

  // render per-page content
  if (['instrument','glassware','scientific','chemical'].includes(to)) renderBrowse(to);
  if (to === 'my-bookings') renderMy();
  if (to === 'dashboard') renderDash();
}
window.addEventListener('hashchange', () => go((location.hash||'#home').replace('#','')));

/* ── Navbar scroll state ──────────────────────────────────────── */
window.addEventListener('scroll', () => {
  $('#nav').classList.toggle('is-scrolled', window.scrollY > 6);
}, { passive: true });

/* ── Hero interactive ─────────────────────────────────────────── */
(function hero(){
  const spot = $('#hero-spot'); const wrap = $('.hero');
  if (!spot || !wrap) return;
  wrap.addEventListener('mousemove', (e) => {
    const r = wrap.getBoundingClientRect();
    spot.style.setProperty('--mx', ((e.clientX - r.left)/r.width*100)+'%');
    spot.style.setProperty('--my', ((e.clientY - r.top)/r.height*100)+'%');
  });
  // particles
  const p = $('#particles');
  for (let i=0; i<28; i++){
    const el = document.createElement('div');
    el.className = 'particle';
    el.style.left = Math.random()*100 + '%';
    el.style.bottom = '-10px';
    el.style.animationDelay = (Math.random()*12) + 's';
    el.style.setProperty('--d', (8 + Math.random()*10) + 's');
    el.style.setProperty('--dx', (Math.random()*120 - 60) + 'px');
    el.style.opacity = (.3 + Math.random()*.5);
    p.appendChild(el);
  }
})();

/* ── Stat counters ────────────────────────────────────────────── */
const counterObs = new IntersectionObserver((entries) => {
  entries.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target;
    const target = +el.dataset.count;
    let cur = 0; const step = Math.max(1, Math.ceil(target/60));
    const tick = () => { cur += step; if (cur >= target){ el.textContent = target; } else { el.textContent = cur; requestAnimationFrame(tick); } };
    tick();
    counterObs.unobserve(el);
  });
}, { threshold: .4 });
$$('[data-count]').forEach(el => counterObs.observe(el));

/* ── Reveal on scroll ─────────────────────────────────────────── */
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(en => { if (en.isIntersecting){ en.target.classList.add('in'); revealObs.unobserve(en.target); } });
}, { threshold: .1 });
function observeReveal(root=document){
  $$('.section, .cat-card, .step, .stat, .cat-feature', root).forEach(el => { el.classList.add('reveal'); revealObs.observe(el); });
}
observeReveal();

/* ── Language toggle ─────────────────────────────────────────── */
$$('.lang-btn').forEach(b => b.addEventListener('click', () => {
  state.lang = b.dataset.lang;
  $$('.lang-btn').forEach(x => x.classList.toggle('is-active', x===b));
  applyI18n();
  save();
}));
applyI18n();

/* ── Burger / drawer ─────────────────────────────────────────── */
function openDrawer(){ $('#drawer').classList.add('is-open'); $('#drawer-scrim').classList.add('is-open'); $('#burger').classList.add('is-open'); $('#burger').setAttribute('aria-expanded','true'); }
function closeDrawer(){ $('#drawer').classList.remove('is-open'); $('#drawer-scrim').classList.remove('is-open'); $('#burger').classList.remove('is-open'); $('#burger').setAttribute('aria-expanded','false'); }
$('#burger').addEventListener('click', () => $('#drawer').classList.contains('is-open') ? closeDrawer() : openDrawer());
$('#drawer-scrim').addEventListener('click', closeDrawer);
$$('#drawer a').forEach(a => a.addEventListener('click', closeDrawer));

/* ── Auth (mock Google) ──────────────────────────────────────── */
function renderAuth(){
  const logged = !!state.user;
  $$('[data-auth="1"]').forEach(el => el.style.display = logged ? '' : 'none');
  $$('[data-auth="0"]').forEach(el => el.style.display = logged ? 'none' : '');
  $$('[data-auth="staff"]').forEach(el => el.style.display = (logged && state.user?.staff) ? '' : 'none');
  $$('[data-staff="1"]').forEach(el => el.style.display = (logged && state.user?.staff) ? '' : 'none');
  if (logged){
    const init = state.user.name.split(' ').map(s=>s[0]).slice(0,2).join('');
    $('#avatar-initial').textContent = init;
    $('#am-avatar').textContent = init;
    $('#am-name').textContent = state.user.name;
    $('#am-email').textContent = state.user.email;
    $('#am-role').textContent = state.user.staff ? 'Staff · ' + (state.user.role||'ADVISOR') : 'Student';
    $('#drawer-avatar').textContent = init;
    $('#drawer-name').textContent = state.user.name;
    $('#drawer-email').textContent = state.user.email;
  }
}
$('#signin-btn').addEventListener('click', () => {
  // mock student sign-in
  state.user = { name:'สมชาย ใจดี', email:'somchai.j@kmitl.ac.th', staff:true, role:'ADVISOR' };
  save(); renderAuth();
  showToast('success','เข้าสู่ระบบสำเร็จ','ยินดีต้อนรับสู่ KCIB');
});
$('#signout-btn').addEventListener('click', () => {
  state.user = null; save(); renderAuth();
  $('#avatar-menu').classList.remove('is-open');
  showToast('info','ออกจากระบบแล้ว','แล้วพบกันใหม่');
});
$('#avatar-btn').addEventListener('click', (e) => { e.stopPropagation(); $('#avatar-menu').classList.toggle('is-open'); });
document.addEventListener('click', (e) => { if (!e.target.closest('#avatar-menu') && !e.target.closest('#avatar-btn')) $('#avatar-menu').classList.remove('is-open'); });

renderAuth();

/* ── Browse pages ─────────────────────────────────────────────── */
const filterState = {};
function getFs(cat){ return filterState[cat] || (filterState[cat] = { q:'', loc:'', av:'all' }); }

function buildLocations(cat){
  const locs = [...new Set(INVENTORY.filter(i=>i.category===cat).map(i=>i.location))];
  const sel = $(`.page[data-page="${cat}"] [data-role="location"]`);
  if (!sel) return;
  sel.innerHTML = '<option value="">📍 ทุกสถานที่</option>' + locs.map(l=>`<option value="${l}">${l}</option>`).join('');
  sel.onchange = () => { getFs(cat).loc = sel.value; renderBrowse(cat); };
  const search = $(`.page[data-page="${cat}"] [data-role="search"]`);
  search.oninput = () => { getFs(cat).q = search.value.trim().toLowerCase(); renderBrowse(cat); };
  $$(`.page[data-page="${cat}"] [data-role="availability"] .f-chip`).forEach(c => {
    c.onclick = () => {
      $$(`.page[data-page="${cat}"] [data-role="availability"] .f-chip`).forEach(x => x.classList.toggle('is-active', x===c));
      getFs(cat).av = c.dataset.v; renderBrowse(cat);
    };
  });
}

function renderBrowse(cat){
  if (!$(`.page[data-page="${cat}"]`).dataset.built){
    buildLocations(cat);
    $(`.page[data-page="${cat}"]`).dataset.built = '1';
  }
  const fs = getFs(cat);
  const items = INVENTORY.filter(i => i.category===cat)
    .filter(i => !fs.q || i.name.toLowerCase().includes(fs.q) || i.model.toLowerCase().includes(fs.q))
    .filter(i => !fs.loc || i.location===fs.loc)
    .filter(i => fs.av==='all' || (fs.av==='yes' ? i.isAvailable : !i.isAvailable));

  const meta = CAT_META[cat];
  const grid = $(`.page[data-page="${cat}"] [data-role="grid"]`);
  const empty = $(`.page[data-page="${cat}"] [data-role="empty"]`);
  const count = $(`.page[data-page="${cat}"] [data-role="count"]`);
  count.textContent = items.length;

  if (!items.length){ grid.innerHTML = ''; empty.hidden = false; return; }
  empty.hidden = true;

  grid.innerHTML = items.map(i => {
    const inCart = state.cart.some(c => c.id === i.id);
    const btnCls = !i.isAvailable ? 'is-disabled' : (inCart ? 'is-added' : '');
    const btnTxt = !i.isAvailable ? 'ไม่ว่าง' : (inCart ? '✓ ในตะกร้าแล้ว' : '+ เพิ่มลงตะกร้า');
    return `
    <article class="item-card" style="--cat-c:${meta.c};--cat-bg:${meta.bg}">
      <header class="ic-head">
        <div class="ic-icon">${meta.ic}</div>
        <div style="min-width:0;flex:1">
          <h3 class="ic-name">${i.name}</h3>
          <p class="ic-model">${i.model}</p>
        </div>
      </header>
      <div class="ic-body">
        <div class="ic-row">📍 <span>${i.location}</span></div>
        <p class="ic-desc">${i.desc}</p>
        <div class="ic-badges">
          <span class="ic-badge ${i.isAvailable?'avail-yes':'avail-no'}">${i.isAvailable?'● พร้อมใช้':'● ไม่ว่าง'}</span>
          ${i.bookingType==='quantity' ? `<span class="ic-badge qty">มี ${i.maxQuantity} ${i.unit||'ชิ้น'}</span>` : ''}
          ${i.hazard ? `<span class="ic-badge hazard">⚠ สารอันตราย</span>` : ''}
        </div>
      </div>
      <footer class="ic-foot">
        <button class="btn-cart ${btnCls}" data-add="${i.id}" ${!i.isAvailable||inCart?'disabled':''}>${btnTxt}</button>
      </footer>
    </article>`;
  }).join('');

  grid.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => {
    addToCart(b.dataset.add);
    renderBrowse(cat);
  }));
  observeReveal(grid);
}

/* ── Cart ─────────────────────────────────────────────────────── */
function addToCart(id){
  if (state.cart.some(c => c.id===id)) return;
  const it = INVENTORY.find(i=>i.id===id);
  if (!it || !it.isAvailable) return;
  state.cart.push({ id, addedAt: Date.now() });
  save(); updateCartBadge();
  showToast('success','เพิ่มลงตะกร้าแล้ว', it.name);
}
function removeFromCart(id){ state.cart = state.cart.filter(c=>c.id!==id); save(); updateCartBadge(); renderCart(); if (['instrument','glassware','scientific','chemical'].includes(state.route)) renderBrowse(state.route); }
function updateCartBadge(){
  $('#cart-count').textContent = state.cart.length;
  $('#cart-count2').textContent = state.cart.length;
  $('#cart-count').style.display = state.cart.length ? '' : 'none';
}
function openCart(){ $('#cart').classList.add('is-open'); $('#cart-scrim').classList.add('is-open'); renderCart(); }
function closeCart(){ $('#cart').classList.remove('is-open'); $('#cart-scrim').classList.remove('is-open'); }
$('#cart-btn').addEventListener('click', openCart);
$('#cart-close').addEventListener('click', closeCart);
$('#cart-scrim').addEventListener('click', closeCart);

function renderCart(){
  const body = $('#cart-body'); const foot = $('#cart-foot'); const empty = $('#cart-empty');
  if (!state.cart.length){ empty.style.display=''; body.querySelectorAll('.ci').forEach(n=>n.remove()); foot.hidden = true; return; }
  empty.style.display = 'none';
  const html = state.cart.map(c => {
    const i = INVENTORY.find(x=>x.id===c.id); if (!i) return '';
    const m = CAT_META[i.category];
    return `<div class="ci">
      <div class="ci-ic" style="background:${m.bg};color:${m.c}">${m.ic}</div>
      <div class="ci-body">
        <div class="ci-name">${i.name}</div>
        <div class="ci-meta">${i.model} · ${i.location}</div>
      </div>
      <button class="ci-rm" data-rm="${i.id}" aria-label="ลบ">×</button>
    </div>`;
  }).join('');
  // remove old ci, keep empty element
  body.querySelectorAll('.ci').forEach(n=>n.remove());
  body.insertAdjacentHTML('beforeend', html);
  body.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => removeFromCart(b.dataset.rm));
  foot.hidden = false;
  $('#cart-sum-count').textContent = state.cart.length + ' รายการ';
}
updateCartBadge();

/* ── Booking modal ────────────────────────────────────────────── */
$('#cart-confirm').addEventListener('click', () => {
  if (!state.user){ showToast('warning','กรุณาเข้าสู่ระบบ','เข้าสู่ระบบเพื่อยืนยันการจอง'); return; }
  if (!state.cart.length) return;
  openModal();
});
function openModal(){
  renderModal();
  $('#modal').classList.add('is-open');
  closeCart();
}
function closeModal(){ $('#modal').classList.remove('is-open'); }
$('#modal-close').addEventListener('click', closeModal);
$('#modal-cancel').addEventListener('click', closeModal);
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

function renderModal(){
  $('#modal-count').textContent = state.cart.length;
  const hasChem = state.cart.some(c => INVENTORY.find(i=>i.id===c.id)?.category === 'chemical');

  const advisorOpts = ADVISORS.map(a => `<option value="${a.email}">${a.name}</option>`).join('');
  const courseOpts = COURSES.map(c => `<option value="${c.v}">${c.l}</option>`).join('');

  const itemsHtml = state.cart.map(c => {
    const i = INVENTORY.find(x=>x.id===c.id); if (!i) return '';
    const m = CAT_META[i.category];
    if (i.bookingType === 'timed'){
      const slots = ['09:00','10:00','11:00','13:00','14:00','15:00','16:00'];
      return `<div class="item-block">
        <div class="ib-head">
          <div class="ib-ic" style="background:${m.bg};color:${m.c}">${m.ic}</div>
          <div><div class="ib-name">${i.name}</div><div class="ib-model">${i.model}</div></div>
        </div>
        <div class="fld-grid-2">
          <div class="fld"><label>วันที่ <span class="req">*</span></label><input type="date" min="${minDate()}" required></div>
          <div class="fld"><label>ช่วงเวลา <span class="req">*</span></label>
            <div class="slot-grid">
              ${slots.map(s => `<button type="button" class="slot">${s}</button>`).join('')}
            </div>
          </div>
        </div>
      </div>`;
    }
    return `<div class="item-block">
      <div class="ib-head">
        <div class="ib-ic" style="background:${m.bg};color:${m.c}">${m.ic}</div>
        <div><div class="ib-name">${i.name}</div><div class="ib-model">${i.model}</div></div>
      </div>
      <div class="fld-grid-2">
        <div class="fld"><label>วันที่เริ่ม <span class="req">*</span></label><input type="date" min="${minDate()}" required></div>
        <div class="fld"><label>วันที่สิ้นสุด <span class="req">*</span></label><input type="date" min="${minDate()}" required></div>
      </div>
      <div class="fld-grid-2">
        <div class="fld"><label>จำนวน <span class="req">*</span></label><input type="number" min="1" max="${i.maxQuantity}" value="1"><small style="color:var(--text-3);font-size:12px;margin-top:4px">สูงสุด ${i.maxQuantity} ${i.unit||'ชิ้น'}</small></div>
        ${i.category==='chemical' ? `<div class="fld"><label>วัตถุประสงค์ <span class="req">*</span></label><input type="text" placeholder="เช่น ทำปฏิกิริยาสังเคราะห์..."></div>` : ''}
      </div>
    </div>`;
  }).join('');

  $('#modal-body').innerHTML = `
    <section class="form-sec">
      <div class="form-sec-t">ข้อมูลการจอง</div>
      <div class="fld-grid-2">
        <div class="fld"><label>ที่ปรึกษา <span class="req">*</span></label><select required><option value="">— เลือกที่ปรึกษา —</option>${advisorOpts}</select></div>
        <div class="fld"><label>รายวิชา/โครงการ <span class="req">*</span></label><select required><option value="">— เลือกรายวิชา —</option>${courseOpts}</select></div>
      </div>
      <div class="fld"><label>หมายเหตุ (ถ้ามี)</label><textarea placeholder="ข้อมูลเพิ่มเติม เช่น วัตถุประสงค์การใช้งาน..."></textarea></div>
    </section>
    <section class="form-sec">
      <div class="form-sec-t">รายละเอียดแต่ละรายการ · ${state.cart.length} ชิ้น</div>
      ${itemsHtml}
    </section>
    ${hasChem ? `<section class="form-sec">
      <div class="form-sec-t">ความปลอดภัยสารเคมี</div>
      <div class="check-row">
        <input type="checkbox" id="safety-ok" required>
        <div>
          <label for="safety-ok" class="check-row-t">ข้าพเจ้ายืนยันว่าได้ศึกษาข้อควรระวังและวิธีการใช้สารเคมีแล้ว</label>
          <div class="check-row-d">และจะปฏิบัติตามแนวทางความปลอดภัยของห้องปฏิบัติการอย่างเคร่งครัด</div>
        </div>
      </div>
    </section>` : ''}
  `;

  // slot toggle
  $$('.slot', $('#modal-body')).forEach(s => s.addEventListener('click', () => {
    const siblings = [...s.parentElement.children];
    siblings.forEach(x => x.classList.toggle('is-active', x===s));
  }));
}

function minDate(){
  const d = new Date(); d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0,10);
}

$('#modal-submit').addEventListener('click', () => {
  const btn = $('#modal-submit');
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> กำลังส่ง...';
  setTimeout(() => {
    btn.disabled = false; btn.innerHTML = 'ยืนยันการจอง';
    closeModal();
    state.cart = []; save(); updateCartBadge();
    showToast('success','ส่งคำขอสำเร็จ','การจองของคุณถูกส่งไปยังที่ปรึกษาแล้ว');
    location.hash = '#my-bookings';
  }, 900);
});

/* ── My Bookings ──────────────────────────────────────────────── */
const STATUS_LABEL = {
  'pending-1':'รอที่ปรึกษาอนุมัติ',
  'pending-2':'รอประธานอนุมัติ',
  'pending-3':'รอเจ้าหน้าที่อนุมัติ',
  'approved' :'อนุมัติแล้ว',
  'rejected' :'ปฏิเสธ',
  'cancelled':'ยกเลิก',
};

function progressFor(status){
  const steps = ['ที่ปรึกษา','ประธาน','เจ้าหน้าที่'];
  const map = { 'pending-1':0, 'pending-2':1, 'pending-3':2, 'approved':3, 'rejected':-1, 'cancelled':-2 };
  const state2 = map[status];
  return steps.map((l, i) => {
    let cls = '';
    if (state2 === -1) cls = i===0 ? 'reject' : '';
    else if (state2 === -2) cls = '';
    else if (state2 > i) cls = 'done';
    else if (state2 === i) cls = 'now';
    return { l, cls };
  });
}

function bkColor(status){
  return {
    'pending-1':'#d97706','pending-2':'#2563eb','pending-3':'#c2410c',
    'approved':'#16a34a','rejected':'#e11d48','cancelled':'#94a3b8'
  }[status] || '#d97706';
}

function renderMy(){
  const list = $('#my-list');
  const rows = MY_BOOKINGS.filter(b => {
    if (state.tab === 'all') return true;
    if (state.tab === 'pending') return b.status.startsWith('pending');
    if (state.tab === 'approved') return b.status === 'approved';
    if (state.tab === 'rejected') return b.status === 'rejected';
    return true;
  });

  if (!rows.length){
    list.innerHTML = `<div class="empty"><div class="empty-ic">📋</div><h3>ยังไม่มีการจอง</h3><p>ลองเลือกอุปกรณ์ที่ต้องการจอง</p></div>`;
    return;
  }

  list.innerHTML = rows.map(b => {
    const i = INVENTORY.find(x => x.id === b.itemId); const m = CAT_META[b.category];
    const prog = progressFor(b.status);
    const dateRange = b.startTime
      ? `${b.startDate} · ${b.startTime}–${b.endTime}`
      : `${b.startDate} → ${b.endDate}`;
    return `
    <article class="booking" style="--bk:${bkColor(b.status)}">
      <div class="bk-left">
        <div class="bk-head">
          <span class="bk-id">${b.id}</span>
          <span class="status-badge st-${b.status}">${STATUS_LABEL[b.status]}</span>
          <span class="bk-date">ส่งเมื่อ ${b.createdAt}</span>
        </div>
        <div class="bk-item">
          <div class="bk-item-ic" style="background:${m.bg};color:${m.c}">${m.ic}</div>
          <div>
            <div class="bk-item-name">${i?.name || b.itemId}${b.qty>1?` × ${b.qty}`:''}</div>
            <div class="bk-item-model">${i?.model || ''}</div>
          </div>
        </div>
        <div class="bk-meta">
          <span>📅 ${dateRange}</span>
          <span>👤 ${b.advisor}</span>
          <span>📚 ${b.course}</span>
        </div>
        ${b.notes ? `<div class="bk-notes">📝 ${b.notes}</div>` : ''}
        ${b.rejectReason ? `<div class="bk-notes" style="border-left-color:var(--danger);color:#be123c">❌ ${b.rejectReason}</div>` : ''}
      </div>
      <div class="bk-right">
        <div class="bk-progress">
          ${prog.map((p, i) => `
            <div class="pstep ${p.cls}">
              <div class="pstep-c">${p.cls==='done'?'✓':p.cls==='reject'?'✕':p.cls==='now'?'⏳':i+1}</div>
              <div class="pstep-l">${p.l}</div>
            </div>
            ${i<2 ? `<div class="pline ${p.cls==='done'?'done':''}"></div>` : ''}
          `).join('')}
        </div>
        ${b.status.startsWith('pending') ? `<div class="bk-actions"><button class="btn-cancel" data-cancel="${b.id}">ยกเลิกการจอง</button></div>` : ''}
      </div>
    </article>`;
  }).join('');

  list.querySelectorAll('[data-cancel]').forEach(b => b.onclick = () => {
    if (confirm('ยืนยันยกเลิกการจองนี้?')){
      showToast('info','ยกเลิกแล้ว','คำขอ ' + b.dataset.cancel + ' ถูกยกเลิก');
    }
  });
}

/* tabs */
function moveInk(btn){
  const ink = $('#tab-ink'); if (!ink) return;
  const r = btn.getBoundingClientRect(); const pr = btn.parentElement.getBoundingClientRect();
  ink.style.width = r.width + 'px';
  ink.style.left = (r.left - pr.left) + 'px';
}
$$('.tab').forEach(b => b.addEventListener('click', () => {
  $$('.tab').forEach(x => x.classList.toggle('is-active', x===b));
  state.tab = b.dataset.tab;
  moveInk(b);
  renderMy();
}));
// initial ink
setTimeout(() => { const a = $('.tab.is-active'); if (a) moveInk(a); }, 100);

/* ── Dashboard ────────────────────────────────────────────────── */
let dashTab = 'mine';
$$('.dtab').forEach(b => b.addEventListener('click', () => {
  $$('.dtab').forEach(x => x.classList.toggle('is-active', x===b));
  dashTab = b.dataset.dtab;
  renderDash();
}));

function renderDash(){
  const rows = DASH_ROWS.filter(r => dashTab==='mine' ? r.needMe : true);
  const tbody = $('#dash-tbody');
  tbody.innerHTML = rows.map(r => {
    const m = CAT_META[r.cat];
    const init = r.user.split(' ').map(s=>s[0]).slice(0,2).join('');
    return `<tr>
      <td><span class="cell-id">${r.id}</span></td>
      <td><div class="cell-user"><div class="av">${init}</div><div><div class="cell-user-n">${r.user}</div><div class="cell-user-e">${r.email}</div></div></div></td>
      <td>${r.item}</td>
      <td><span class="cell-cat" style="background:${m.bg};color:${m.c}">${m.ic} ${m.name}</span></td>
      <td>${r.date}</td>
      <td><span class="status-badge st-${r.status}">${STATUS_LABEL[r.status]}</span></td>
      <td class="cell-act">
        ${r.needMe ? `
          <button class="btn btn-outline btn-green btn-icon-sm">อนุมัติ</button>
          <button class="btn btn-outline btn-red btn-icon-sm">ปฏิเสธ</button>
        ` : `<span style="color:var(--text-3);font-size:12px">—</span>`}
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.btn-green').forEach(b => b.onclick = () => showToast('success','อนุมัติเรียบร้อย','คำขอถูกส่งต่อไปยังขั้นถัดไป'));
  tbody.querySelectorAll('.btn-red').forEach(b => b.onclick = () => showToast('warning','ปฏิเสธคำขอ','ผู้ขอจะได้รับการแจ้งเตือน'));
}

/* ── Toast ────────────────────────────────────────────────────── */
function showToast(kind, title, msg){
  const ic = { success:'✓', error:'✕', warning:'⚠', info:'ℹ' }[kind] || 'ℹ';
  const el = document.createElement('div');
  el.className = `toast t-${kind}`;
  el.innerHTML = `
    <div class="toast-ic">${ic}</div>
    <div class="toast-b"><div class="toast-t">${title}</div><div class="toast-m">${msg||''}</div></div>
    <button class="toast-x" aria-label="close">×</button>
    <div class="toast-bar"></div>`;
  $('#toasts').appendChild(el);
  const kill = () => { el.classList.add('is-out'); setTimeout(()=>el.remove(), 300); };
  el.querySelector('.toast-x').onclick = kill;
  setTimeout(kill, 4200);
}

/* ── Spinner tiny style ───────────────────────────────────────── */
const st = document.createElement('style');
st.textContent = `.spinner{width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;display:inline-block;animation:sp-spin .7s linear infinite;margin-right:6px}`;
document.head.appendChild(st);

/* ── Init ─────────────────────────────────────────────────────── */
go(state.route);
