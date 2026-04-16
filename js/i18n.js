// ============================================================
// KCIB i18n — TH / EN translations
// ============================================================

const TRANSLATIONS = {
  th: {
    // Nav
    'nav.home':       'หน้าแรก',
    'nav.instrument': 'เครื่องมือ',
    'nav.glassware':  'เครื่องแก้ว',
    'nav.scientific': 'อุปกรณ์วิทย์',
    'nav.chemical':   'สารเคมี',
    'nav.myBookings': 'การจองของฉัน',
    'nav.dashboard':  'แดชบอร์ด',
    'nav.bookingList':'📋 รายการจอง',
    // Hero
    'hero.eyebrow':   'KMITL ChE · ระบบจองอุปกรณ์',
    'hero.title1':    'ระบบจองเครื่องมือ',
    'hero.title2':    'ภาควิชาวิศวกรรมเคมี',
    'hero.sub':       'KMITL ChE Inventory &amp; Booking System<br>สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง',
    'hero.cta':       'ดูเครื่องมือทั้งหมด',
    'hero.welcome':   'ยินดีต้อนรับ',
    // Notice
    'notice': '⚠️ การจองเครื่องมือ/เครื่องวิเคราะห์ต้องล่วงหน้า <strong>3 วันทำการ</strong> &nbsp;|&nbsp; จันทร์–ศุกร์ 09:00–16:00 น. เท่านั้น',
    // Stats
    'stat.instrument': 'เครื่องมือ/วิเคราะห์',
    'stat.glassware':  'เครื่องแก้ว',
    'stat.scientific': 'อุปกรณ์วิทยาศาสตร์',
    'stat.available':  'รายการพร้อมใช้',
    // Section
    'section.catLabel': 'หมวดหมู่อุปกรณ์',
    'section.catTitle': 'เลือกประเภทที่ต้องการจอง',
    'section.catDesc':  'ข้อมูลแสดงผลแบบ Real-time จาก Google Sheets ของภาควิชา',
    'section.updatedAt':'อัปเดตล่าสุด',
    'section.howLabel': 'วิธีการใช้งาน',
    'section.howTitle': 'ขั้นตอนการจอง',
    // Cat card
    'cat.availOf': 'จาก',
    'cat.ready':   'พร้อมใช้',
    // How-to steps
    'step1.title': 'เข้าสู่ระบบด้วย Google',
    'step1.desc':  'ใช้อีเมลสถาบัน @kmitl.ac.th เข้าสู่ระบบผ่าน Google',
    'step2.title': 'เลือกอุปกรณ์',
    'step2.desc':  'ค้นหาและเลือกอุปกรณ์ที่ต้องการ ตรวจสอบสถานะพร้อมใช้',
    'step3.title': 'กรอกใบจอง',
    'step3.desc':  'ระบุวันเวลา วิชา/โครงการ และเลือกอาจารย์ที่ปรึกษา',
    'step4.title': 'รอการอนุมัติ',
    'step4.desc':  'รอการอนุมัติผ่านอีเมล ติดตามสถานะได้ที่ "การจองของฉัน"',
    // Equipment page
    'equip.back':        '← กลับ',
    'equip.search':      'ค้นหา...',
    'equip.noResults':   'ไม่พบผลการค้นหา',
    'equip.empty':       'ยังไม่มีรายการในหมวดนี้',
    'equip.available':   'พร้อมใช้',
    'equip.unavailable': 'ไม่ว่าง',
    'equip.addToCart':   '+ เพิ่มลงรายการ',
    'equip.inCart':      '✓ ในรายการ',
    'equip.inStock':     'มีในคลัง',
    'equip.filterAll':   'ทั้งหมด',
    'equip.unit.timed':  'เครื่อง',
    'equip.unit.qty':    'ชิ้น',
    // Cart
    'cart.title':   'รายการจอง',
    'cart.submit':  'ส่งคำขอจอง',
    'cart.clear':   'ล้างทั้งหมด',
    'cart.remove':  'ลบ',
    // My Bookings
    'mybook.title':       '📋 การจองของฉัน',
    'mybook.refresh':     '↻ รีเฟรช',
    'mybook.loginFirst':  'กรุณาเข้าสู่ระบบก่อน',
    'mybook.loginDesc':   'เข้าสู่ระบบด้วยบัญชี Google ของสถาบัน',
    'mybook.tab.all':     'ทั้งหมด',
    'mybook.tab.pending': 'รอดำเนินการ',
    'mybook.tab.approved':'อนุมัติแล้ว',
    'mybook.tab.rejected':'ปฏิเสธ/ยกเลิก',
    'mybook.empty':       'ไม่มีรายการ',
    'mybook.emptyDesc':   'ยังไม่มีรายการจองในหมวดนี้',
    'mybook.bookNow':     'จองอุปกรณ์',
    'mybook.loadFail':    'โหลดไม่สำเร็จ',
    'mybook.cancel':      'ยกเลิกการจอง',
    // Dashboard
    'dash.title':       '📊 แดชบอร์ด',
    'dash.viewSheets':  'ดูข้อมูลการจอง (Sheets)',
    'dash.refresh':     '↻ รีเฟรช',
    'dash.noAccess':    'ไม่มีสิทธิ์เข้าถึง',
    'dash.noAccessDesc':'เฉพาะเจ้าหน้าที่และอาจารย์เท่านั้น',
    'dash.tab.pending': '⏳ รอฉันอนุมัติ',
    'dash.tab.all':     '📋 ทั้งหมด',
    'dash.stat.total':  'รายการทั้งหมด',
    'dash.stat.pending':'รอดำเนินการ',
    'dash.stat.approved':'อนุมัติแล้ว',
    'dash.stat.needsMe':'รอฉันดำเนินการ',
    // Logout
    'logout': 'ออกจากระบบ',
    // CAT (locale-specific names and descriptions)
    'cat.instrument.name':      'เครื่องมือ / เครื่องวิเคราะห์',
    'cat.instrument.nameShort': 'เครื่องมือ',
    'cat.instrument.desc':      'เครื่องมือวิเคราะห์และทดสอบสำหรับงานวิจัยและการเรียนการสอน',
    'cat.glassware.name':       'เครื่องแก้ว',
    'cat.glassware.nameShort':  'เครื่องแก้ว',
    'cat.glassware.desc':       'อุปกรณ์เครื่องแก้วสำหรับการทดลองในห้องปฏิบัติการ',
    'cat.scientific.name':      'อุปกรณ์วิทยาศาสตร์',
    'cat.scientific.nameShort': 'อุปกรณ์วิทย์',
    'cat.scientific.desc':      'อุปกรณ์วิทยาศาสตร์ทั่วไป เช่น จุกยาง, แคลมป์, ขาตั้ง',
    'cat.chemical.name':        'สารเคมี',
    'cat.chemical.nameShort':   'สารเคมี',
    'cat.chemical.desc':        'สารเคมีสำหรับการทดลองในห้องปฏิบัติการ',
  },
  en: {
    // Nav
    'nav.home':       'Home',
    'nav.instrument': 'Instruments',
    'nav.glassware':  'Glassware',
    'nav.scientific': 'Scientific',
    'nav.chemical':   'Chemicals',
    'nav.myBookings': 'My Bookings',
    'nav.dashboard':  'Dashboard',
    'nav.bookingList':'📋 Booking List',
    // Hero
    'hero.eyebrow':   'KMITL ChE · Equipment Booking',
    'hero.title1':    'Equipment Booking System',
    'hero.title2':    'Dept. of Chemical Engineering',
    'hero.sub':       'KMITL ChE Inventory &amp; Booking System<br>King Mongkut\'s Institute of Technology Ladkrabang',
    'hero.cta':       'Browse Equipment',
    'hero.welcome':   'Welcome',
    // Notice
    'notice': '⚠️ Instrument bookings require <strong>3 business days</strong> advance notice &nbsp;|&nbsp; Mon–Fri 09:00–16:00 only',
    // Stats
    'stat.instrument': 'Instruments',
    'stat.glassware':  'Glassware',
    'stat.scientific': 'Scientific Equip.',
    'stat.available':  'Available Items',
    // Section
    'section.catLabel': 'Equipment Categories',
    'section.catTitle': 'Choose a category to book',
    'section.catDesc':  'Real-time data from the department\'s Google Sheets',
    'section.updatedAt':'Last updated',
    'section.howLabel': 'How it works',
    'section.howTitle': 'Booking Process',
    // Cat card
    'cat.availOf': 'of',
    'cat.ready':   'available',
    // How-to steps
    'step1.title': 'Sign in with Google',
    'step1.desc':  'Use your institutional @kmitl.ac.th email to sign in via Google',
    'step2.title': 'Choose Equipment',
    'step2.desc':  'Search and select what you need, check availability status',
    'step3.title': 'Fill Booking Form',
    'step3.desc':  'Specify date/time, course/project, and select your advisor',
    'step4.title': 'Await Approval',
    'step4.desc':  'Approval sent by email. Track status in "My Bookings"',
    // Equipment page
    'equip.back':        '← Back',
    'equip.search':      'Search...',
    'equip.noResults':   'No results found',
    'equip.empty':       'No items in this category',
    'equip.available':   'Available',
    'equip.unavailable': 'Unavailable',
    'equip.addToCart':   '+ Add to list',
    'equip.inCart':      '✓ In list',
    'equip.inStock':     'In stock',
    'equip.filterAll':   'All',
    'equip.unit.timed':  'unit(s)',
    'equip.unit.qty':    'pc(s)',
    // Cart
    'cart.title':   'Booking List',
    'cart.submit':  'Submit Booking Request',
    'cart.clear':   'Clear All',
    'cart.remove':  'Remove',
    // My Bookings
    'mybook.title':       '📋 My Bookings',
    'mybook.refresh':     '↻ Refresh',
    'mybook.loginFirst':  'Please sign in first',
    'mybook.loginDesc':   'Sign in with your institutional Google account',
    'mybook.tab.all':     'All',
    'mybook.tab.pending': 'Pending',
    'mybook.tab.approved':'Approved',
    'mybook.tab.rejected':'Rejected/Cancelled',
    'mybook.empty':       'No bookings',
    'mybook.emptyDesc':   'No bookings in this category yet',
    'mybook.bookNow':     'Book Equipment',
    'mybook.loadFail':    'Load failed',
    'mybook.cancel':      'Cancel Booking',
    // Dashboard
    'dash.title':        '📊 Dashboard',
    'dash.viewSheets':   'View Bookings (Sheets)',
    'dash.refresh':      '↻ Refresh',
    'dash.noAccess':     'Access Denied',
    'dash.noAccessDesc': 'Staff and instructors only',
    'dash.tab.pending':  '⏳ Needs My Approval',
    'dash.tab.all':      '📋 All Bookings',
    'dash.stat.total':   'Total Bookings',
    'dash.stat.pending': 'Pending',
    'dash.stat.approved':'Approved',
    'dash.stat.needsMe': 'Needs My Action',
    // Logout
    'logout': 'Sign Out',
    // CAT
    'cat.instrument.name':      'Instruments / Analyzers',
    'cat.instrument.nameShort': 'Instruments',
    'cat.instrument.desc':      'Analysis and testing instruments for research and teaching',
    'cat.glassware.name':       'Glassware',
    'cat.glassware.nameShort':  'Glassware',
    'cat.glassware.desc':       'Laboratory glassware for experiments',
    'cat.scientific.name':      'Scientific Equipment',
    'cat.scientific.nameShort': 'Scientific',
    'cat.scientific.desc':      'General lab supplies: stoppers, clamps, stands, etc.',
    'cat.chemical.name':        'Chemicals',
    'cat.chemical.nameShort':   'Chemicals',
    'cat.chemical.desc':        'Chemical reagents for laboratory experiments',
  }
};

window.LANG = localStorage.getItem('kcib_lang') || 'th';

window.t = function(key) {
  return (TRANSLATIONS[window.LANG] || TRANSLATIONS.th)[key]
      || TRANSLATIONS.th[key]
      || key;
};

window.setLang = function(lang) {
  if (lang === window.LANG) return;
  window.LANG = lang;
  localStorage.setItem('kcib_lang', lang);
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === lang);
  });
  _updateNavLinks();
  if (window.App) App._route();
};

function _updateNavLinks() {
  const map = {
    'home':       t('nav.home'),
    'instrument': t('nav.instrument'),
    'glassware':  t('nav.glassware'),
    'scientific': t('nav.scientific'),
    'chemical':   t('nav.chemical'),
    'my-bookings':t('nav.myBookings'),
    'dashboard':  t('nav.dashboard'),
  };
  document.querySelectorAll('.nav-link[data-page]').forEach(el => {
    const k = el.dataset.page;
    if (map[k]) el.textContent = map[k];
  });
}

// Apply saved language on load
(function() {
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lang === window.LANG);
  });
  _updateNavLinks();
})();
