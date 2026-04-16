// ============================================================
// KCIB App v2.0 — Google Sheet backed, Google Login
// ============================================================

/* ====================================================
   CATEGORY CONFIG (display-only, not data source)
   ==================================================== */
const CAT_CONFIG = {
  instrument: {
    id: 'instrument', name: 'เครื่องมือ / เครื่องวิเคราะห์', nameShort: 'เครื่องมือ',
    icon: '🔬', bgColor: '#e0f2fe', textColor: '#0369a1',
    desc: 'เครื่องมือวิเคราะห์และทดสอบสำหรับงานวิจัยและการเรียนการสอน',
    bookingType: 'timed', advanceDays: 3, weekdayOnly: true,
    hours: { start: 9, end: 16 }, maxHours: 2
  },
  glassware: {
    id: 'glassware', name: 'เครื่องแก้ว', nameShort: 'เครื่องแก้ว',
    icon: '🧪', bgColor: '#f3e8ff', textColor: '#7c3aed',
    desc: 'อุปกรณ์เครื่องแก้วสำหรับการทดลองในห้องปฏิบัติการ',
    bookingType: 'quantity'
  },
  scientific: {
    id: 'scientific', name: 'อุปกรณ์วิทยาศาสตร์', nameShort: 'อุปกรณ์วิทย์',
    icon: '⚗️', bgColor: '#dcfce7', textColor: '#16a34a',
    desc: 'อุปกรณ์วิทยาศาสตร์ทั่วไป เช่น จุกยาง, แคลมป์, ขาตั้ง',
    bookingType: 'quantity'
  },
  chemical: {
    id: 'chemical', name: 'สารเคมี', nameShort: 'สารเคมี',
    icon: '🧫', bgColor: '#fff7ed', textColor: '#c2410c',
    desc: 'สารเคมีสำหรับการทดลองในห้องปฏิบัติการ',
    bookingType: 'quantity'
  }
};

// ============================================================
// STATE
// ============================================================
window.App = {
  state: {
    user:        null,     // { email, name, picture, role, roleLabel }
    inventory:   [],       // raw items from GSheet
    holidays:    new Set(),// Set<"yyyy-MM-dd">
    staffConfig: {},       // { ROLE: [{email, name}] }
    bookings:    [],       // cached my-bookings
    initLoaded:  false
  },


  /* -------------------------------------------------- BOOT */
  async boot() {
    // Try restore session
    this._restoreSession();

    // Attach navbar events
    this._initNavbar();

    // Hash routing
    window.addEventListener('hashchange', () => this._route());
    window.addEventListener('scroll', () => this._handleScroll(), { passive: true });

    // Load data from Apps Script
    try {
      await this._loadInit();
    } catch (e) {
      console.error('Failed to load init data:', e);
      showToast('error', 'โหลดข้อมูลไม่สำเร็จ', 'กรุณาตรวจสอบ SCRIPT_URL ในไฟล์ index.html');
    }

    // Hide loading overlay
    const overlay = document.getElementById('loading-overlay');
    overlay.classList.add('hidden');
    setTimeout(() => overlay.remove(), 600);

    // Route
    this._route();
    this._renderNavRight();
    this._renderGSI();
  },

  /* -------------------------------------------------- INIT DATA */
  async _loadInit() {
    const data = await apiGet('init');
    const inv = data.inventory || [];
    this.state.inventory = inv.map(normalizeItem);

    const holidays = data.holidays || [];
    this.state.holidays = new Set(holidays.map(h => h.date).filter(Boolean));

    this.state.staffConfig = data.staffConfig || {};
    this.state.initLoaded  = true;

    // Re-determine role if user already logged in
    if (this.state.user) {
      this.state.user.role      = this._determineRole(this.state.user.email);
      this.state.user.roleLabel = this._roleLabel(this.state.user.role);
    }
  },

  /* -------------------------------------------------- GOOGLE LOGIN */
  handleGoogleLogin(response) {
    const credential = jwtDecode(response.credential);
    if (!credential) { showToast('error', 'เกิดข้อผิดพลาด', 'ไม่สามารถตรวจสอบ credential ได้'); return; }

    // Restrict to kmitl.ac.th (or comment out for any domain)
    // if (credential.hd !== 'kmitl.ac.th') {
    //   showToast('error', 'ไม่สามารถเข้าสู่ระบบได้', 'ต้องใช้อีเมลสถาบัน @kmitl.ac.th เท่านั้น');
    //   return;
    // }

    localStorage.setItem('kcib_token', response.credential);

    this.state.user = {
      email:     credential.email.toLowerCase().trim(),
      name:      credential.name || `${credential.given_name} ${credential.family_name}`,
      givenName: credential.given_name || '',
      picture:   credential.picture || '',
      role:      this._determineRole(credential.email),
    };
    this.state.user.roleLabel = this._roleLabel(this.state.user.role);

    this._renderNavRight();
    this._updateAuthLinks();
    showToast('success', 'เข้าสู่ระบบสำเร็จ', `ยินดีต้อนรับ ${this.state.user.givenName}`);

    // Navigate to current page (refresh view)
    this._route();
  },

  logout() {
    localStorage.removeItem('kcib_token');
    this.state.user    = null;
    this.state.bookings = [];
    if (window.google?.accounts?.id) google.accounts.id.disableAutoSelect();
    this._renderNavRight();
    this._renderGSI();
    this._updateAuthLinks();
    showToast('info', 'ออกจากระบบแล้ว', '');
    this.navigate('home');
  },

  _restoreSession() {
    const token = localStorage.getItem('kcib_token');
    if (!token) return;
    const cred = jwtDecode(token);
    if (!cred || cred.exp * 1000 < Date.now()) {
      localStorage.removeItem('kcib_token');
      return;
    }
    this.state.user = {
      email:     cred.email.toLowerCase().trim(),
      name:      cred.name || `${cred.given_name} ${cred.family_name}`,
      givenName: cred.given_name || '',
      picture:   cred.picture || '',
      role:      'STUDENT', // will be updated after init loads
      roleLabel: 'นักศึกษา'
    };
  },

  /* -------------------------------------------------- ROLE */
  _determineRole(email) {
    const lc = (email || '').toLowerCase().trim();
    const cfg = this.state.staffConfig;
    for (const [role, members] of Object.entries(cfg)) {
      if (members.some(m => (m.email || '').toLowerCase().trim() === lc)) return role;
    }
    return 'STUDENT';
  },

  _roleLabel(role) {
    const map = {
      ADVISORS:        'อาจารย์ที่ปรึกษา',
      STAFF_FLOOR_1:   'เจ้าหน้าที่ห้องปฏิบัติการ',
      STAFF_PROJECT_2: 'เจ้าหน้าที่ TEAM PROJECT 2',
      VIEWERS:         'ผู้ดูแลระบบ',
      STUDENT:         'นักศึกษา'
    };
    return map[role] || role;
  },

  _isStaff() {
    const r = this.state.user?.role;
    return r && r !== 'STUDENT';
  },

  /* -------------------------------------------------- NAVBAR */
  _initNavbar() {
    const ham = document.getElementById('nav-hamburger');
    if (!ham) return;
    ham.addEventListener('click', navToggle);
  },

  _renderNavRight() {
    const el = document.getElementById('nav-right');
    if (!el) return;
    const u = this.state.user;

    if (!u) {
      el.innerHTML = `<div class="nav-signin-btn"><div id="g_id_signin_button"></div></div>`;
      this._renderGSI();
    } else {
      const avatarHtml = u.picture
        ? `<img class="user-avatar-img" src="${u.picture}" alt="${u.givenName}" referrerpolicy="no-referrer">`
        : `<div class="user-avatar-init">${(u.givenName || u.name || 'U').charAt(0).toUpperCase()}</div>`;

      el.innerHTML = `
        <div class="user-menu" id="user-menu-btn">
          ${avatarHtml}
          <div>
            <div class="user-name">${u.givenName || u.name.split(' ')[0]}</div>
            <div class="user-role">${u.roleLabel}</div>
          </div>
          <div class="user-caret">▾</div>
        </div>`;

      document.getElementById('user-menu-btn').addEventListener('click', e => {
        e.stopPropagation();
        this._toggleUserDropdown();
      });
    }
    this._updateAuthLinks();
  },

  _toggleUserDropdown() {
    const existing = document.getElementById('user-dropdown');
    if (existing) { existing.remove(); return; }

    const u = this.state.user;
    if (!u) return;

    const isStaff = this._isStaff();
    const menu = document.createElement('div');
    menu.id = 'user-dropdown';
    menu.innerHTML = `
      <div class="dropdown-header">
        <div class="dropdown-user-name">${u.name}</div>
        <div class="dropdown-user-role">${u.roleLabel}</div>
        <div class="dropdown-user-email">${u.email}</div>
      </div>
      <div class="dropdown-items">
        <div class="dropdown-item" onclick="closeDropdown();App.navigate('my-bookings');">
          <span>📋</span> การจองของฉัน
        </div>
        ${isStaff ? `<div class="dropdown-item" onclick="closeDropdown();App.navigate('dashboard');">
          <span>📊</span> แดชบอร์ด
        </div>` : ''}
        <div class="dropdown-divider"></div>
        <div class="dropdown-item danger" onclick="closeDropdown();App.logout();">
          <span>🚪</span> ออกจากระบบ
        </div>
      </div>`;
    document.body.appendChild(menu);

    const menuBtn = document.getElementById('user-menu-btn');
    if (menuBtn) menuBtn.classList.add('open');

    setTimeout(() => {
      document.addEventListener('click', closeDropdown, { once: true });
    }, 0);
  },

  _updateAuthLinks() {
    const u  = this.state.user;
    const is = this._isStaff();
    document.querySelectorAll('.auth-only').forEach(el => {
      el.style.display = u ? '' : 'none';
    });
    document.querySelectorAll('.staff-only').forEach(el => {
      el.style.display = (u && is) ? '' : 'none';
    });
  },

  _renderGSI() {
    const el = document.getElementById('g_id_signin_button');
    if (!el) return;
    const tryRender = () => {
      if (window.google?.accounts?.id) {
        google.accounts.id.initialize({
          client_id: window.GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID,
          callback:  handleCredentialResponse,
          auto_prompt: false
        });
        google.accounts.id.renderButton(el, {
          theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with'
        });
        clearInterval(timer);
      }
    };
    const timer = setInterval(tryRender, 60);
    tryRender();
  },

  _handleScroll() {
    const nav = document.getElementById('navbar');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 60);
  },

  /* -------------------------------------------------- ROUTING */
  navigate(page) {
    window.location.hash = '#' + page;
  },

  _route() {
    const hash  = window.location.hash.slice(1) || 'home';
    const page  = hash.split('?')[0];
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));

    switch (page) {
      case 'home':        this._renderHome();             showPage('page-home');         break;
      case 'instrument':  this._renderEquipment('instrument'); showPage('page-equipment');  break;
      case 'glassware':   this._renderEquipment('glassware');  showPage('page-equipment');  break;
      case 'scientific':  this._renderEquipment('scientific'); showPage('page-equipment');  break;
      case 'chemical':    this._renderEquipment('chemical');   showPage('page-equipment');  break;
      case 'my-bookings': this._renderMyBookings();         showPage('page-my-bookings'); break;
      case 'dashboard':   this._renderDashboard();          showPage('page-dashboard');   break;
      default:            this._renderHome();             showPage('page-home');
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  },

  /* ================================================== HOME PAGE */
  _renderHome() {
    const el   = document.getElementById('page-home');
    const inv  = this.state.inventory;
    const u    = this.state.user;

    const countFor = cat => inv.filter(i => i.category === cat).length;
    const availFor = cat => inv.filter(i => i.category === cat && i.available).length;

    el.innerHTML = `
      <!-- HERO -->
      <section class="hero">
        <div class="hero-particles" id="hero-particles"></div>
        <img src="logo.png" alt="KCIB" class="hero-logo">
        <h1 class="hero-title">ระบบจองเครื่องมือ<br><span>ภาควิชาวิศวกรรมเคมี</span></h1>
        <p class="hero-sub">KMITL ChE Inventory &amp; Booking System<br>สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง</p>
        ${u
          ? `<div class="hero-welcome">
               ${u.picture ? `<img src="${u.picture}" alt="" referrerpolicy="no-referrer">` : ''}
               ยินดีต้อนรับ, ${u.givenName || u.name.split(' ')[0]}
             </div>`
          : `<a href="#instrument" class="hero-cta" onclick="App.navigate('instrument');return false;">
               ดูเครื่องมือทั้งหมด <span>→</span>
             </a>`
        }
        <div class="hero-scroll">↓</div>
      </section>

      <!-- NOTICE -->
      <div class="notice-bar">
        ⚠️ การจองเครื่องมือ/เครื่องวิเคราะห์ต้องล่วงหน้า <strong>3 วันทำการ</strong> &nbsp;|&nbsp; จันทร์–ศุกร์ 09:00–16:00 น. เท่านั้น
      </div>

      <!-- STATS -->
      <section class="section">
        <div class="section-inner">
          <div class="stats-row stagger">
            ${[
              { num: countFor('instrument'), label: 'เครื่องมือ/วิเคราะห์' },
              { num: countFor('glassware'),  label: 'เครื่องแก้ว' },
              { num: countFor('scientific'), label: 'อุปกรณ์วิทยาศาสตร์' },
              { num: inv.filter(i => i.available).length, label: 'รายการพร้อมใช้' },
            ].map(s => `
              <div class="stat-card card-enter">
                <div class="stat-num" data-target="${s.num}">0</div>
                <div class="stat-label">${s.label}</div>
              </div>`).join('')}
          </div>

          <div class="section-label">หมวดหมู่อุปกรณ์</div>
          <h2 class="section-title">เลือกประเภทที่ต้องการจอง</h2>
          <p class="section-desc">ข้อมูลแสดงผลแบบ Real-time จาก Google Sheets ของภาควิชา</p>

          <div class="cat-grid stagger">
            ${Object.values(CAT_CONFIG).map(cat => `
              <a class="cat-card card-enter" href="#${cat.id}" onclick="App.navigate('${cat.id}');return false;">
                <div class="cat-card-top">
                  <div class="cat-icon" style="background:${cat.bgColor};color:${cat.textColor};">${cat.icon}</div>
                  <div class="cat-info">
                    <div class="cat-name" style="color:${cat.textColor};">${cat.name}</div>
                    <div class="cat-desc">${cat.desc}</div>
                  </div>
                </div>
                <div class="cat-card-bottom">
                  <div class="cat-count">
                    <span class="cat-count-num">${availFor(cat.id)}</span>
                    <span>จาก ${countFor(cat.id)} พร้อมใช้</span>
                  </div>
                  <div class="cat-arrow">→</div>
                </div>
              </a>`).join('')}
          </div>
        </div>
      </section>

      <!-- HOW TO -->
      <section class="section section-alt">
        <div class="section-inner">
          <div class="section-label">วิธีการใช้งาน</div>
          <h2 class="section-title">ขั้นตอนการจอง</h2>
          <div class="steps-grid stagger">
            ${[
              { n:'1', icon:'🔑', title:'เข้าสู่ระบบด้วย Google', desc:'ใช้อีเมลสถาบัน @kmitl.ac.th เข้าสู่ระบบผ่าน Google' },
              { n:'2', icon:'🔍', title:'เลือกอุปกรณ์', desc:'ค้นหาและเลือกอุปกรณ์ที่ต้องการ ตรวจสอบสถานะพร้อมใช้' },
              { n:'3', icon:'📋', title:'กรอกใบจอง', desc:'ระบุวันเวลา วิชา/โครงการ และเลือกอาจารย์ที่ปรึกษา' },
              { n:'4', icon:'✅', title:'รอการอนุมัติ', desc:'รอการอนุมัติผ่านอีเมล ติดตามสถานะได้ที่ "การจองของฉัน"' },
            ].map(s => `
              <div class="step-card card-enter">
                <div class="step-num">${s.n}</div>
                <div class="step-icon">${s.icon}</div>
                <div class="step-title">${s.title}</div>
                <div class="step-desc">${s.desc}</div>
              </div>`).join('')}
          </div>
        </div>
      </section>
    `;

    // Animate particles
    this._initParticles();
    // Count-up animation
    this._animateCounters();
  },

  _initParticles() {
    const container = document.getElementById('hero-particles');
    if (!container) return;
    const sizes = [4, 6, 8, 5, 7];
    const speeds = [8, 12, 15, 10, 18];
    for (let i = 0; i < 12; i++) {
      const p = document.createElement('div');
      const size  = sizes[i % sizes.length];
      const speed = speeds[i % speeds.length];
      p.className = 'particle';
      p.style.cssText = `
        width:${size}px;height:${size}px;
        left:${Math.random()*100}%;
        animation-duration:${speed + Math.random()*8}s;
        animation-delay:${Math.random()*10}s;
      `;
      container.appendChild(p);
    }
  },

  _animateCounters() {
    document.querySelectorAll('[data-target]').forEach(el => {
      const target = parseInt(el.dataset.target) || 0;
      const duration = 1200;
      const start = performance.now();
      const update = now => {
        const pct = Math.min((now - start) / duration, 1);
        el.textContent = Math.round(pct * target);
        if (pct < 1) requestAnimationFrame(update);
      };
      requestAnimationFrame(update);
    });
  },

  /* ================================================== EQUIPMENT PAGE */
  _currentCategory:    '',
  _currentFilter:      '',
  _currentSearch:      '',

  _renderEquipment(catId) {
    this._currentCategory = catId;
    this._currentFilter   = '';
    this._currentSearch   = '';
    const cat = CAT_CONFIG[catId];
    if (!cat) { this.navigate('home'); return; }

    const el = document.getElementById('page-equipment');
    el.innerHTML = `
      <div class="equip-header">
        <div class="equip-header-inner">
          <button class="equip-back" onclick="App.navigate('home')">← กลับ</button>
          <div class="equip-title-row">
            <div class="equip-cat-icon">${cat.icon}</div>
            <div>
              <div class="equip-cat-name">${cat.name}</div>
              <div class="equip-cat-desc">${cat.desc}</div>
            </div>
          </div>
          <div class="equip-search">
            <svg class="equip-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input type="search" placeholder="ค้นหา..." id="equip-search-input"
              oninput="App._onSearch(this.value)">
          </div>
        </div>
      </div>
      <div id="equip-filters" class="equip-filters"></div>
      <div class="equip-content">
        <div class="equip-grid stagger" id="equip-grid"></div>
      </div>`;

    if (!this.state.initLoaded) {
      document.getElementById('equip-grid').innerHTML = this._skeletonGrid(6);
      return;
    }
    this._renderEquipGrid();
  },

  _onSearch(val) {
    this._currentSearch = val.toLowerCase();
    this._renderEquipGrid();
  },

  _renderEquipGrid() {
    const catId  = this._currentCategory;
    const search = this._currentSearch;
    const cat    = CAT_CONFIG[catId];
    const grid   = document.getElementById('equip-grid');
    if (!grid) return;

    let items = this.state.inventory.filter(i => i.category === catId);

    if (search) {
      items = items.filter(i =>
        i.name.toLowerCase().includes(search) ||
        (i.model   || '').toLowerCase().includes(search) ||
        (i.detail  || '').toLowerCase().includes(search) ||
        (i.id      || '').toLowerCase().includes(search)
      );
    }

    if (items.length === 0) {
      grid.innerHTML = `
        <div class="equip-empty" style="grid-column:1/-1;">
          <div class="equip-empty-icon">${cat.icon}</div>
          <div class="equip-empty-msg">${search ? 'ไม่พบผลการค้นหา' : 'ยังไม่มีรายการในหมวดนี้'}</div>
        </div>`;
      return;
    }

    grid.innerHTML = items.map((item, i) => this._equipCardHTML(item, cat, i)).join('');
  },

  _equipCardHTML(item, cat, idx) {
    const isRAD   = item.isRAD;
    const canBook = item.available && this.state.user;
    const availBadge = item.available
      ? `<span class="eq-avail-badge available">พร้อมใช้</span>`
      : `<span class="eq-avail-badge unavailable">ไม่ว่าง</span>`;

    return `
      <div class="eq-card card-enter fade-in" style="animation-delay:${idx*0.05}s">
        <div class="eq-card-head">
          <div class="eq-card-icon" style="background:${cat.bgColor};color:${cat.textColor};">${cat.icon}</div>
          <div class="eq-card-info">
            <div class="eq-card-name">${escHtml(item.name)}</div>
            ${item.id ? `<div class="eq-card-id">${escHtml(item.id)}</div>` : ''}
          </div>
          ${availBadge}
        </div>
        <div class="eq-card-body">
          ${item.location ? `<div class="eq-meta"><span class="eq-meta-icon">📍</span><span>${escHtml(item.location)}</span></div>` : ''}
          ${item.detail   ? `<div class="eq-detail">${escHtml(item.detail)}</div>` : ''}
          ${isRAD         ? `<div class="eq-rad-badge">📅 จองข้ามวันได้ (RAD)</div>` : ''}
        </div>
        <div class="eq-card-foot">
          <div class="eq-model">${item.model ? escHtml(item.model) : ''}</div>
          ${canBook
            ? `<button class="btn-book" onclick="App.openBookingModal('${escHtml(item.id)}')">จอง</button>`
            : this.state.user
              ? `<button class="btn-book" disabled>ไม่ว่าง</button>`
              : `<button class="btn-book" onclick="App._promptLogin()" style="background:var(--dark);">เข้าสู่ระบบ</button>`
          }
        </div>
      </div>`;
  },

  _promptLogin() {
    showToast('info', 'กรุณาเข้าสู่ระบบก่อน', 'คลิกปุ่ม Sign in with Google บน Navbar');
  },

  _skeletonGrid(n) {
    return Array.from({ length: n }, () => `
      <div style="background:#fff;border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-xs);">
        <div style="padding:20px;border-bottom:1px solid var(--border);display:flex;gap:14px;">
          <div class="skeleton" style="width:48px;height:48px;border-radius:8px;flex-shrink:0;"></div>
          <div style="flex:1;"><div class="skeleton" style="height:16px;width:70%;margin-bottom:8px;"></div><div class="skeleton" style="height:12px;width:40%;"></div></div>
        </div>
        <div style="padding:16px 20px;"><div class="skeleton" style="height:12px;width:60%;margin-bottom:10px;"></div><div class="skeleton" style="height:12px;width:80%;"></div></div>
        <div style="padding:14px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;"><div class="skeleton" style="height:36px;width:72px;border-radius:8px;"></div></div>
      </div>`).join('');
  },

  /* ================================================== BOOKING MODAL */
  openBookingModal(itemId) {
    if (!this.state.user) { this._promptLogin(); return; }
    const item = this.state.inventory.find(i => i.id == itemId);
    if (!item) { showToast('error', 'ไม่พบอุปกรณ์', ''); return; }

    const cat       = CAT_CONFIG[item.category] || {};
    const advisors  = (this.state.staffConfig['ADVISORS'] || []);
    const isTimed   = cat.bookingType === 'timed' && !item.isRAD;
    const isRAD     = item.isRAD;
    const isQty     = cat.bookingType === 'quantity';

    const advisorOptions = advisors.map(a =>
      `<option value="${escHtml(a.email)}">${escHtml(a.name)}</option>`
    ).join('');

    const today   = todayISO();
    const minDate = isTimed ? this._minBookingDate() : today;
    const maxDate = dateAddDays(today, 180);

    let dateFields = '';
    if (isTimed) {
      dateFields = `
        <div class="form-group">
          <label class="form-label">วันที่จอง <span class="required">*</span></label>
          <input type="date" class="form-input" id="bf-date" min="${minDate}" max="${maxDate}"
            onchange="App._onDateChange(this.value)">
          <div class="form-hint">จองล่วงหน้าอย่างน้อย 3 วันทำการ • จ–ศ เท่านั้น</div>
        </div>
        <div class="form-group" id="bf-slots-group" style="display:none;">
          <label class="form-label">เลือกช่วงเวลา <span class="required">*</span></label>
          <div class="time-slots" id="bf-slots"></div>
        </div>`;
    } else if (isRAD) {
      dateFields = `
        <div class="info-box accent">📅 อุปกรณ์นี้รองรับการจองข้ามวัน (Reserve Across the Day) — เลือกช่วงวันที่ต้องการ</div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">วันที่เริ่ม <span class="required">*</span></label>
            <input type="date" class="form-input" id="bf-start-date" min="${today}" max="${maxDate}">
          </div>
          <div class="form-group">
            <label class="form-label">วันที่สิ้นสุด <span class="required">*</span></label>
            <input type="date" class="form-input" id="bf-end-date" min="${today}" max="${maxDate}">
          </div>
        </div>`;
    } else {
      // Quantity-based
      dateFields = `
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">วันที่รับ <span class="required">*</span></label>
            <input type="date" class="form-input" id="bf-start-date" min="${today}" max="${maxDate}">
          </div>
          <div class="form-group">
            <label class="form-label">วันที่คืน <span class="required">*</span></label>
            <input type="date" class="form-input" id="bf-end-date" min="${today}" max="${maxDate}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">จำนวนที่ต้องการ <span class="required">*</span></label>
          <input type="number" class="form-input" id="bf-qty" min="1" value="1" placeholder="จำนวน">
        </div>`;
    }

    const modalHTML = `
      <div class="modal-head">
        <div class="modal-head-icon" style="background:${cat.bgColor};color:${cat.textColor};">${cat.icon}</div>
        <div class="modal-head-info">
          <div class="modal-title">${escHtml(item.name)}</div>
          <div class="modal-subtitle">${item.id ? item.id + ' • ' : ''}${escHtml(item.location || '')}</div>
        </div>
        <button class="modal-close" onclick="App.closeModal()">✕</button>
      </div>
      <div class="modal-body">
        ${item.detail ? `<div class="info-box" style="margin-bottom:20px;">${escHtml(item.detail)}</div>` : ''}

        ${dateFields}

        <div class="form-group">
          <label class="form-label">อาจารย์ที่ปรึกษา <span class="required">*</span></label>
          <select class="form-select" id="bf-advisor">
            <option value="">-- เลือกอาจารย์ที่ปรึกษา --</option>
            ${advisorOptions}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">วิชา / โครงการ</label>
          <select class="form-select" id="bf-course">
            <option value="ทั่วไป">ทั่วไป</option>
            <option value="TEAM PROJECT 2">TEAM PROJECT 2</option>
            <option value="ปฏิบัติการวิศวกรรมเคมี">ปฏิบัติการวิศวกรรมเคมี</option>
            <option value="การออกแบบกระบวนการเคมี">การออกแบบกระบวนการเคมี</option>
            <option value="Senior Project / โครงงานนักศึกษา">Senior Project / โครงงานนักศึกษา</option>
            <option value="งานวิจัย">งานวิจัย</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">หมายเหตุ (ถ้ามี)</label>
          <textarea class="form-textarea" id="bf-note" placeholder="รายละเอียดเพิ่มเติม..."></textarea>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-secondary" onclick="App.closeModal()">ยกเลิก</button>
        <button class="btn btn-primary" id="bf-submit-btn" onclick="App._submitBooking('${item.id}', '${item.category}', '${item.name}', '${isTimed ? 'timed' : isRAD ? 'rad' : 'qty'}')">
          ยืนยันการจอง
        </button>
      </div>`;

    this.openModal(modalHTML);

    // Pre-fill advisor if user IS an advisor
    if (this.state.user?.role === 'ADVISORS') {
      const sel = document.getElementById('bf-advisor');
      if (sel) {
        const opt = Array.from(sel.options).find(o => o.value === this.state.user.email);
        if (opt) opt.selected = true;
      }
    }
  },

  _minBookingDate() {
    let d = new Date();
    d.setDate(d.getDate() + 3);
    let tries = 0;
    while (tries < 30) {
      const iso = d.toISOString().split('T')[0];
      const day = d.getDay();
      if (day !== 0 && day !== 6 && !this.state.holidays.has(iso)) return iso;
      d.setDate(d.getDate() + 1);
      tries++;
    }
    return d.toISOString().split('T')[0];
  },

  _onDateChange(dateStr) {
    const slotsGroup = document.getElementById('bf-slots-group');
    const slotsEl    = document.getElementById('bf-slots');
    if (!slotsGroup || !slotsEl) return;

    if (!dateStr) { slotsGroup.style.display = 'none'; return; }

    const d   = new Date(dateStr);
    const day = d.getDay();
    if (day === 0 || day === 6 || this.state.holidays.has(dateStr)) {
      slotsGroup.style.display = 'none';
      showToast('warning', 'วันที่เลือกไม่ถูกต้อง', 'กรุณาเลือกวันจันทร์–ศุกร์ที่ไม่ใช่วันหยุด');
      return;
    }

    slotsGroup.style.display = '';
    // Generate 1h slots from 09:00–16:00 and 2h slots
    const slots = [];
    for (let h = 9; h <= 14; h++) {
      slots.push({ start: `${h}:00`, end: `${h+2}:00`, label: `${pad(h)}:00 – ${pad(h+2)}:00 (2 ชม.)` });
    }
    for (let h = 9; h <= 15; h++) {
      slots.push({ start: `${h}:00`, end: `${h+1}:00`, label: `${pad(h)}:00 – ${pad(h+1)}:00 (1 ชม.)` });
    }
    slots.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));

    slotsEl.innerHTML = slots.map(s => `
      <div class="time-slot" data-start="${dateStr}T${pad2(s.start)}:00" data-end="${dateStr}T${pad2(s.end)}:00"
           onclick="App._selectSlot(this)">${s.label}</div>`).join('');
  },

  _selectSlot(el) {
    document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
  },

  async _submitBooking(itemId, category, itemName, bookingType) {
    const btn = document.getElementById('bf-submit-btn');
    const u   = this.state.user;
    if (!u) return;

    // Gather fields
    const advisor  = document.getElementById('bf-advisor')?.value;
    const course   = document.getElementById('bf-course')?.value || 'ทั่วไป';
    const note     = document.getElementById('bf-note')?.value || '';
    let   start    = '';
    let   end      = '';
    let   quantity = '';

    if (bookingType === 'timed') {
      const selected = document.querySelector('.time-slot.selected');
      if (!selected) { showToast('warning', 'กรุณาเลือกช่วงเวลา', ''); return; }
      start = selected.dataset.start;
      end   = selected.dataset.end;
    } else if (bookingType === 'rad' || bookingType === 'qty') {
      start = document.getElementById('bf-start-date')?.value;
      end   = document.getElementById('bf-end-date')?.value;
      if (bookingType === 'qty') {
        quantity = document.getElementById('bf-qty')?.value || '1';
      }
    }

    // Validate
    if (!advisor)   { showToast('warning', 'กรุณาเลือกอาจารย์ที่ปรึกษา', ''); return; }
    if (!start)     { showToast('warning', 'กรุณาเลือกวันเวลาเริ่มต้น', ''); return; }
    if (!end && bookingType !== 'timed') { showToast('warning', 'กรุณาเลือกวันสิ้นสุด', ''); return; }

    // Disable button
    btn.classList.add('btn-loading');
    btn.disabled = true;

    try {
      const result = await apiPost({
        action:      'submitBooking',
        email:       u.email,
        name:        u.name,
        category,
        itemId,
        itemName,
        course,
        quantity,
        start,
        end,
        note,
        advisorEmail: advisor
      });

      if (result.success) {
        this.closeModal();
        showToast('success', 'ส่งคำขอจองสำเร็จ!', `BookingID: ${result.bookingId}`);
        this.state.bookings = []; // Clear cache
      } else {
        throw new Error(result.error || 'เกิดข้อผิดพลาด');
      }
    } catch (e) {
      showToast('error', 'ส่งคำขอไม่สำเร็จ', e.message);
    } finally {
      btn.classList.remove('btn-loading');
      btn.disabled = false;
    }
  },

  /* ================================================== MY BOOKINGS */
  _myBookingsFilter: 'all',

  async _renderMyBookings() {
    const el = document.getElementById('page-my-bookings');
    const u  = this.state.user;

    if (!u) {
      el.innerHTML = `
        <div style="max-width:700px;margin:0 auto;padding:60px 20px;">
          <div class="bk-empty">
            <div class="bk-empty-icon">🔑</div>
            <div class="bk-empty-title">กรุณาเข้าสู่ระบบก่อน</div>
            <div class="bk-empty-desc">เข้าสู่ระบบด้วยบัญชี Google ของสถาบัน</div>
          </div>
        </div>`;
      return;
    }

    this._myBookingsFilter = 'all';
    el.innerHTML = `
      <div class="bk-page">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
          <h1 style="font-size:22px;font-weight:800;">📋 การจองของฉัน</h1>
          <button class="btn btn-secondary btn-sm" onclick="App._refreshMyBookings()">↻ รีเฟรช</button>
        </div>
        <div id="bk-filter-bar" class="bk-filter-bar"></div>
        <div id="bookings-list">${this._skeletonBookings(3)}</div>
      </div>`;

    await this._fetchAndRenderMyBookings();
  },

  async _refreshMyBookings() {
    this.state.bookings = [];
    const listEl = document.getElementById('bookings-list');
    if (listEl) listEl.innerHTML = this._skeletonBookings(3);
    await this._fetchAndRenderMyBookings();
  },

  async _fetchAndRenderMyBookings() {
    const u = this.state.user;
    if (!u) return;
    const listEl = document.getElementById('bookings-list');
    if (!listEl) return;
    try {
      if (this.state.bookings.length === 0) {
        this.state.bookings = await apiGet('getMyBookings', { email: u.email });
      }
      this._renderBookingsList();
    } catch (e) {
      listEl.innerHTML = `<div class="bk-empty"><div class="bk-empty-icon">⚠️</div><div class="bk-empty-title">โหลดไม่สำเร็จ</div><div class="bk-empty-desc">${escHtml(e.message)}</div></div>`;
    }
  },

  _renderBookingsList() {
    const bookings   = this.state.bookings;
    const filterBar  = document.getElementById('bk-filter-bar');
    const listEl     = document.getElementById('bookings-list');
    if (!filterBar || !listEl) return;

    const f = this._myBookingsFilter;
    const counts = {
      all:      bookings.length,
      pending:  bookings.filter(b => [STATUS_P1, STATUS_P2].includes(b.Status || '')).length,
      approved: bookings.filter(b => b.Status === STATUS_OK).length,
      rejected: bookings.filter(b => [STATUS_REJ, STATUS_CAN].includes(b.Status || '')).length,
    };

    filterBar.innerHTML = [
      { id: 'all',      label: 'ทั้งหมด' },
      { id: 'pending',  label: 'รอดำเนินการ' },
      { id: 'approved', label: 'อนุมัติแล้ว' },
      { id: 'rejected', label: 'ปฏิเสธ/ยกเลิก' },
    ].map(tab => `
      <div class="bk-filter-tab ${f === tab.id ? 'active' : ''}"
           onclick="App._setMyBookingsFilter('${tab.id}')">
        ${tab.label}
        ${counts[tab.id] > 0 ? `<span class="bk-filter-count">${counts[tab.id]}</span>` : ''}
      </div>`).join('');

    let filtered = bookings;
    if (f === 'pending')  filtered = bookings.filter(b => [STATUS_P1, STATUS_P2].includes(b.Status || ''));
    if (f === 'approved') filtered = bookings.filter(b => b.Status === STATUS_OK);
    if (f === 'rejected') filtered = bookings.filter(b => [STATUS_REJ, STATUS_CAN].includes(b.Status || ''));

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="bk-empty">
          <div class="bk-empty-icon">📭</div>
          <div class="bk-empty-title">ไม่มีรายการ</div>
          <div class="bk-empty-desc">ยังไม่มีรายการจองในหมวดนี้</div>
          <button class="btn btn-primary" onclick="App.navigate('instrument')">จองอุปกรณ์</button>
        </div>`;
      return;
    }

    listEl.innerHTML = filtered.map(b => this._bookingItemHTML(b, false)).join('');
  },

  _setMyBookingsFilter(filter) {
    this._myBookingsFilter = filter;
    this._renderBookingsList();
  },

  _bookingItemHTML(b, showStudentName) {
    const { badge, icon } = statusStyle(b.Status || '');
    const cat  = CAT_CONFIG[String(b.Category || '').toLowerCase()] || {};
    const steps = this._wfSteps();
    const cur   = this._wfStep(b.Status || '');
    const isRej = b.Status === STATUS_REJ || b.Status === STATUS_CAN;
    const start = b.Start ? formatDateTime(b.Start) : '-';
    const end   = b.End   ? formatDateTime(b.End)   : '-';

    const progressHtml = steps.map((step, i) => {
      let state = 'waiting';
      if (isRej) {
        state = i === 0 ? 'done' : (i === cur ? 'rejected' : 'waiting');
      } else if (i < cur) state = 'done';
      else if (i === cur) state = 'current';

      const circleInner = state === 'done' ? '✓' : state === 'rejected' ? '✗' : step.icon;
      return `
        ${i > 0 ? `<div class="bk-prog-line ${(i <= cur && !isRej) ? 'done' : ''}"></div>` : ''}
        <div class="bk-prog-step ${state}">
          <div class="bk-prog-circle">${circleInner}</div>
          <div class="bk-prog-label">${step.label}</div>
        </div>`;
    }).join('');

    const isCancellable = ![STATUS_OK, STATUS_REJ, STATUS_CAN].includes(b.Status || '');

    return `
      <div class="bk-item">
        <div class="bk-item-head">
          <div>
            <div class="bk-item-title">${cat.icon || '📦'} ${escHtml(b.ItemName || '-')}</div>
            <div class="bk-item-meta">
              <span>${escHtml(b.BookingID || '')}</span>
              ${showStudentName ? `<span>· 👤 ${escHtml(b.Name || '-')}</span>` : ''}
            </div>
          </div>
          <span class="booking-badge ${badge}">${icon} ${escHtml(b.Status || 'N/A')}</span>
        </div>
        <div class="bk-item-body">
          <div class="bk-meta-row">
            <span class="bk-meta-item">📅 ${start}</span>
            ${end !== start && end !== '-' ? `<span class="bk-meta-item">↩ ${end}</span>` : ''}
            <span class="bk-meta-item">📚 ${escHtml(b.Course || 'ทั่วไป')}</span>
            ${b.CurrentApproverName ? `<span class="bk-meta-item">👤 ${escHtml(b.CurrentApproverName)}</span>` : ''}
          </div>
          <div class="bk-progress">${progressHtml}</div>
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
            ${isCancellable ? `<button class="btn-cancel" onclick="App._cancelBooking('${escHtml(b.BookingID)}')">ยกเลิกการจอง</button>` : ''}
          </div>
        </div>
      </div>`;
  },

  _wfSteps() {
    return [
      { icon: '📝', label: 'ส่งคำขอ' },
      { icon: '👨‍🏫', label: 'อ.ที่ปรึกษา' },
      { icon: '📋', label: 'เจ้าหน้าที่' },
      { icon: '✅', label: 'เสร็จสิ้น' },
    ];
  },

  _wfStep(status) {
    switch (status) {
      case STATUS_P1:  return 1;
      case STATUS_P2:  return 2;
      case STATUS_OK:  return 3;
      case STATUS_REJ: return 2;
      case STATUS_CAN: return 1;
      default:         return 0;
    }
  },

  async _cancelBooking(bookingId) {
    if (!confirm('ยืนยันการยกเลิกการจองนี้?')) return;
    const u = this.state.user;
    try {
      await apiPost({ action: 'cancelBooking', bookingId, email: u.email });
      this.state.bookings = [];
      showToast('success', 'ยกเลิกการจองแล้ว', '');
      this._fetchAndRenderMyBookings();
    } catch (e) {
      showToast('error', 'ยกเลิกไม่สำเร็จ', e.message);
    }
  },

  _skeletonBookings(n) {
    return Array.from({ length: n }, () => `
      <div style="background:#fff;border-radius:var(--radius);border:1.5px solid var(--border);margin-bottom:14px;overflow:hidden;">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;gap:12px;align-items:center;">
          <div style="flex:1;"><div class="skeleton" style="height:14px;width:55%;margin-bottom:8px;"></div><div class="skeleton" style="height:12px;width:35%;"></div></div>
          <div class="skeleton" style="height:24px;width:90px;border-radius:999px;"></div>
        </div>
        <div style="padding:14px 18px;"><div class="skeleton" style="height:12px;width:80%;margin-bottom:10px;"></div><div class="skeleton" style="height:30px;width:100%;border-radius:4px;"></div></div>
      </div>`).join('');
  },

  /* ================================================== DASHBOARD */
  _allBookings: [],

  async _renderDashboard() {
    const el = document.getElementById('page-dashboard');
    const u  = this.state.user;

    if (!u || !this._isStaff()) {
      el.innerHTML = `
        <div style="max-width:700px;margin:0 auto;padding:60px 20px;">
          <div class="bk-empty">
            <div class="bk-empty-icon">🔒</div>
            <div class="bk-empty-title">ไม่มีสิทธิ์เข้าถึง</div>
            <div class="bk-empty-desc">เฉพาะเจ้าหน้าที่และอาจารย์เท่านั้น</div>
          </div>
        </div>`;
      return;
    }

    el.innerHTML = `
      <div class="dash-v2-page">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
          <h1 style="font-size:22px;font-weight:800;">📊 แดชบอร์ด</h1>
          <button class="btn btn-secondary btn-sm" onclick="App._loadDashboard()">↻ รีเฟรช</button>
        </div>
        <div id="dash-stats" class="dash-v2-stats">
          ${Array.from({length:4}, () => `
            <div class="dash-v2-stat-card">
              <div class="skeleton" style="width:48px;height:48px;border-radius:var(--radius-sm);flex-shrink:0;"></div>
              <div style="flex:1;"><div class="skeleton" style="height:26px;width:50%;margin-bottom:6px;"></div><div class="skeleton" style="height:12px;width:70%;"></div></div>
            </div>`).join('')}
        </div>
        <div id="dash-tabs" class="dash-v2-tab-nav" style="display:none;">
          <button class="dash-v2-tab-btn active" onclick="App._switchDashTab('pending', this)">
            ⏳ รอฉันอนุมัติ <span id="dash-needs-badge" style="background:var(--danger);color:#fff;border-radius:10px;padding:1px 6px;font-size:11px;margin-left:4px;display:none;"></span>
          </button>
          <button class="dash-v2-tab-btn" onclick="App._switchDashTab('all', this)">📋 ทั้งหมด</button>
        </div>
        <div id="dash-content">
          <div class="skeleton" style="height:300px;border-radius:var(--radius);"></div>
        </div>
      </div>`;

    await this._loadDashboard();
  },

  async _loadDashboard() {
    try {
      this._allBookings = await apiGet('getAllBookings');
      this._renderDashStats();
      this._renderDashTabContent('pending');
      document.getElementById('dash-tabs').style.display = '';
    } catch (e) {
      showToast('error', 'โหลด dashboard ไม่สำเร็จ', e.message);
    }
  },

  _renderDashStats() {
    const el  = document.getElementById('dash-stats');
    if (!el) return;
    const all     = this._allBookings;
    const total   = all.length;
    const pending = all.filter(b => [STATUS_P1, STATUS_P2].includes(b.Status || '')).length;
    const approv  = all.filter(b => b.Status === STATUS_OK).length;
    const needsMe = all.filter(b => this._canApprove(b)).length;

    const badge = document.getElementById('dash-needs-badge');
    if (badge) {
      badge.textContent = needsMe;
      badge.style.display = needsMe > 0 ? '' : 'none';
    }

    el.innerHTML = [
      { icon: '📋', bg: '#eff6ff', color: 'var(--info)',    num: total,   label: 'รายการทั้งหมด' },
      { icon: '⏳', bg: '#fff7ed', color: 'var(--warning)', num: pending, label: 'รอดำเนินการ' },
      { icon: '✅', bg: '#f0fdf4', color: 'var(--success)', num: approv,  label: 'อนุมัติแล้ว' },
      { icon: '🔔', bg: '#fef2f2', color: 'var(--danger)',  num: needsMe, label: 'รอฉันดำเนินการ' },
    ].map(s => `
      <div class="dash-v2-stat-card">
        <div class="dash-v2-stat-icon" style="background:${s.bg};color:${s.color};">${s.icon}</div>
        <div class="dash-v2-stat-info">
          <div class="dash-v2-stat-num" style="color:${s.color};">${s.num}</div>
          <div class="dash-v2-stat-label">${s.label}</div>
        </div>
      </div>`).join('');
  },

  _switchDashTab(tab, btn) {
    document.querySelectorAll('.dash-v2-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    this._renderDashTabContent(tab);
  },

  _renderDashTabContent(tab) {
    const el   = document.getElementById('dash-content');
    if (!el) return;
    const all  = this._allBookings;
    const items = tab === 'pending'
      ? all.filter(b => this._canApprove(b))
      : all.slice().reverse().slice(0, 200);

    if (items.length === 0) {
      el.innerHTML = `<div class="bk-empty"><div class="bk-empty-icon">🎉</div><div class="bk-empty-title">ไม่มีรายการที่รอดำเนินการ</div></div>`;
      return;
    }

    const rows = items.map(b => {
      const { badge } = statusStyle(b.Status || '');
      const cat     = CAT_CONFIG[String(b.Category || '').toLowerCase()] || {};
      const start   = b.Start ? String(b.Start).substring(0, 16).replace('T', ' ') : '-';
      const canAct  = this._canApprove(b);

      return `
        <tr>
          <td>
            <div style="font-weight:700;font-size:14px;">${cat.icon || ''} ${escHtml(b.ItemName || '-')}</div>
            <div style="font-size:12px;color:var(--text-3);">${escHtml(b.BookingID || '')}</div>
          </td>
          <td>
            <div style="font-size:14px;">${escHtml(b.Name || '-')}</div>
            <div style="font-size:11px;color:var(--text-3);">${escHtml(b.Email || '-')}</div>
          </td>
          <td style="font-size:13px;">${escHtml(b.Course || '-')}</td>
          <td style="font-size:13px;">${start}</td>
          <td><span class="booking-badge ${badge}">${escHtml(b.Status || '-')}</span></td>
          <td>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              ${canAct ? `
                <button class="btn btn-sm" style="background:#f0fdf4;color:var(--success);border:1px solid #86efac;" onclick="App._approveBooking('${escHtml(b.BookingID)}')">✅ อนุมัติ</button>
                <button class="btn btn-sm" style="background:#fef2f2;color:var(--danger);border:1px solid #fecaca;" onclick="App._rejectBooking('${escHtml(b.BookingID)}')">❌ ปฏิเสธ</button>
              ` : `<span style="font-size:12px;color:var(--text-3);">${escHtml(b.CurrentApproverName || '-')}</span>`}
            </div>
          </td>
        </tr>`;
    }).join('');

    el.innerHTML = `
      <div class="dash-v2-table-wrap">
        <table class="dash-v2-table">
          <thead>
            <tr>
              <th>อุปกรณ์ / BookingID</th>
              <th>ผู้จอง</th>
              <th>วิชา</th>
              <th>วันเวลาเริ่ม</th>
              <th>สถานะ</th>
              <th>การดำเนินการ</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  },

  _canApprove(b) {
    const u = this.state.user;
    if (!u || !this._isStaff()) return false;
    const role   = u.role;
    const status = b.Status || '';
    if (role === 'ADVISORS' && status === STATUS_P1) {
      return (b.AdvisorEmail || '').toLowerCase().trim() === u.email;
    }
    if (status === STATUS_P2) {
      const cat    = (b.Category || '').toLowerCase();
      const course = (b.Course   || '').toLowerCase();
      if (/instrument|analyt/.test(cat))    return role === 'VIEWERS';
      if (/team.?project.?2/.test(course))  return role === 'STAFF_PROJECT_2';
      return role === 'STAFF_FLOOR_1';
    }
    return false;
  },

  async _approveBooking(bookingId) {
    if (!confirm('ยืนยันการอนุมัติการจองนี้?')) return;
    try {
      const result = await apiPost({ action: 'approveBooking', bookingId });
      if (!result.success) throw new Error(result.error || 'เกิดข้อผิดพลาด');
      showToast('success', 'อนุมัติสำเร็จ', '');
      this._allBookings = [];
      await this._loadDashboard();
    } catch (e) {
      showToast('error', 'อนุมัติไม่สำเร็จ', e.message);
    }
  },

  async _rejectBooking(bookingId) {
    if (!confirm('ยืนยันการปฏิเสธการจองนี้?')) return;
    try {
      const result = await apiPost({ action: 'rejectBooking', bookingId });
      if (!result.success) throw new Error(result.error || 'เกิดข้อผิดพลาด');
      showToast('info', 'ปฏิเสธการจองแล้ว', '');
      this._allBookings = [];
      await this._loadDashboard();
    } catch (e) {
      showToast('error', 'ปฏิเสธไม่สำเร็จ', e.message);
    }
  },

  /* ================================================== MODAL */
  openModal(html) {
    const box = document.getElementById('modal-box');
    if (!box) return;
    box.innerHTML = html;
    document.getElementById('modal-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
    document.body.style.overflow = '';
  }
};

/* ====================================================
   STATUS CONSTANTS
   ==================================================== */
const STATUS_P1  = 'รอที่ปรึกษาอนุมัติ';
const STATUS_P2  = 'รออนุมัติขั้นที่ 2';
const STATUS_OK  = 'อนุมัติแล้ว';
const STATUS_REJ = 'ปฏิเสธ';
const STATUS_CAN = 'ยกเลิก';

/* ====================================================
   UTILITY FUNCTIONS
   ==================================================== */
function normalizeItem(raw) {
  const detail  = String(raw.Detail || raw.detail || '');
  const catRaw  = String(raw.Category || raw.category || '');
  const cat     = catRaw.toLowerCase();

  // Map Thai/English category strings → internal key
  let catKey = 'instrument';
  if      (cat.includes('แก้ว')    || cat.includes('glass'))      catKey = 'glassware';
  else if (cat.includes('สารเคมี') || cat.includes('chemical'))   catKey = 'chemical';
  else if (cat.includes('วิทยาศาสตร์') || cat.includes('scientific') || cat.includes('อุปกรณ์')) catKey = 'scientific';
  // เครื่องมือ / เครื่องมือวิเคราะห์ / instrument → default 'instrument' ✓

  // Use MaxQuantity to determine availability (no Available column in sheet)
  const maxQty = parseInt(String(raw.MaxQuantity || raw.maxQuantity || 0)) || 0;

  // No ID column → fall back to _row (row number from sheet)
  const id = String(raw.ID || raw.Id || raw.id || raw.ItemID || raw._row || '');

  return {
    id,
    name:        String(raw.ItemName || raw.Name || raw.name || ''),
    category:    catKey,
    detail,
    location:    String(raw.Location || raw.location || ''),
    available:   maxQty > 0,
    model:       String(raw.ItemBrand || raw.Model || raw.model || ''),
    maxQty,
    courseLimit: String(raw.CourseLimit || raw.courselimit || ''),
    isRAD:       detail.toUpperCase().includes('RAD')
  };
}

function statusStyle(status) {
  switch (status) {
    case STATUS_P1:  return { cls: 'pending',   badge: 'status-pending-1', icon: '⏳' };
    case STATUS_P2:  return { cls: 'pending',   badge: 'status-pending-2', icon: '🔄' };
    case STATUS_OK:  return { cls: 'approved',  badge: 'status-approved',  icon: '✅' };
    case STATUS_REJ: return { cls: 'rejected',  badge: 'status-rejected',  icon: '❌' };
    case STATUS_CAN: return { cls: 'cancelled', badge: 'status-cancelled', icon: '🚫' };
    default:         return { cls: '',          badge: 'status-cancelled', icon: '❓' };
  }
}

function jwtDecode(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64));
  } catch { return null; }
}

function apiGet(func, params = {}) {
  if (!SCRIPT_URL || SCRIPT_URL.includes('YOUR_')) {
    return Promise.reject(new Error('กรุณาตั้งค่า SCRIPT_URL ในไฟล์ index.html'));
  }
  const url = new URL(SCRIPT_URL);
  url.searchParams.set('func', func);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return fetch(url.toString())
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then(d => { if (d && d.error) throw new Error(d.error); return d; });
}

function apiPost(payload) {
  if (!SCRIPT_URL || SCRIPT_URL.includes('YOUR_')) {
    return Promise.reject(new Error('กรุณาตั้งค่า SCRIPT_URL ในไฟล์ index.html'));
  }
  return fetch(SCRIPT_URL, {
    method:  'POST',
    body:    JSON.stringify(payload),
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
  }).then(r => r.json())
    .then(d => { if (d && d.error) throw new Error(d.error); return d; });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function dateAddDays(isoDate, days) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function pad(n)  { return String(n).padStart(2, '0'); }
function pad2(t) { return t.length === 4 ? '0' + t : t; } // "9:00" → "09:00"

function formatDateTime(isoStr) {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Bangkok'
    });
  } catch { return String(isoStr).substring(0, 16).replace('T', ' '); }
}

function showPage(id) {
  document.getElementById(id)?.classList.add('active');
}

/* ====================================================
   TOAST
   ==================================================== */
function showToast(type, title, msg, duration = 4000) {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const el    = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
    <div class="toast-body">
      <div class="toast-title">${escHtml(title)}</div>
      ${msg ? `<div class="toast-msg">${escHtml(msg)}</div>` : ''}
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
  document.getElementById('toast-container')?.appendChild(el);
  setTimeout(() => {
    el.style.opacity  = '0';
    el.style.transform = 'translateX(120%)';
    setTimeout(() => el.remove(), 350);
  }, duration);
}

/* ====================================================
   NAVBAR HELPERS (global for onclick)
   ==================================================== */
function navToggle() {
  const links = document.getElementById('nav-links');
  const ham   = document.getElementById('nav-hamburger');
  const over  = document.getElementById('nav-overlay');
  if (!links) return;
  const open = links.classList.toggle('open');
  if (ham)  ham.classList.toggle('open', open);
  if (over) over.classList.toggle('active', open);
}

function navClose() {
  const links = document.getElementById('nav-links');
  const ham   = document.getElementById('nav-hamburger');
  const over  = document.getElementById('nav-overlay');
  if (links) links.classList.remove('open');
  if (ham)   ham.classList.remove('open');
  if (over)  over.classList.remove('active');
}

function closeDropdown() {
  document.getElementById('user-dropdown')?.remove();
  document.getElementById('user-menu-btn')?.classList.remove('open');
}

/* ====================================================
   BOOT
   ==================================================== */
document.addEventListener('DOMContentLoaded', () => App.boot());
