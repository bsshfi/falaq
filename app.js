/* فَلَق | FALAQ — واجهة التطبيق */
(function () {
  'use strict';
  const VERSION = '1.7';
  const A = window.Astro;
  const $ = s => document.querySelector(s);
  const DAY = 864e5;

  /* ---------- الإعدادات ---------- */
  const DEFAULTS = {
    lang: 'ar', theme: 'auto',
    method: 'umm_alqura', asr: 1, h24: false, digits: 'latn',
    adjust: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    compassOffset: 0,
    notify: { on: false, news: true, prayers: { fajr: true, sunrise: false, dhuhr: true, asr: true, maghrib: true, isha: true } },
    loc: { lat: 24.7136, lng: 46.6753, city: 0, tz: 'Asia/Riyadh', source: 'default' },
    installSeen: false
  };
  let S;
  try { S = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem('falaq') || '{}')); } catch (e) { S = Object.assign({}, DEFAULTS); }
  S.adjust = Object.assign({}, DEFAULTS.adjust, S.adjust || {});
  S.notify = Object.assign({}, DEFAULTS.notify, S.notify || {});
  S.notify.prayers = Object.assign({}, DEFAULTS.notify.prayers, S.notify.prayers || {});
  const save = () => { try { localStorage.setItem('falaq', JSON.stringify(S)); } catch (e) {} if (typeof pushSync === 'function') pushSync(); };

  const deviceTZ = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } };
  const TZ = () => (S.loc.source === 'city' && S.loc.tz) ? S.loc.tz : deviceTZ();

  /* ---------- اللغة ---------- */
  let D;
  const L = (k, ...a) => { const v = D.s[k]; return typeof v === 'function' ? v(...a) : v; };
  const isEn = () => S.lang === 'en';

  /* ---------- المدن [عربي، إنجليزي، عرض، طول، منطقة زمنية] ---------- */
  const CITIES = [
    ['الرياض', 'Riyadh', 24.7136, 46.6753, 'Asia/Riyadh'], ['مكة المكرمة', 'Makkah', 21.4225, 39.8262, 'Asia/Riyadh'], ['المدينة المنورة', 'Madinah', 24.4672, 39.6111, 'Asia/Riyadh'],
    ['جدة', 'Jeddah', 21.4858, 39.1925, 'Asia/Riyadh'], ['الدمام', 'Dammam', 26.4207, 50.0888, 'Asia/Riyadh'], ['الخبر', 'Khobar', 26.2172, 50.1971, 'Asia/Riyadh'],
    ['الأحساء', 'Al-Ahsa', 25.3833, 49.5864, 'Asia/Riyadh'], ['الطائف', 'Taif', 21.2703, 40.4158, 'Asia/Riyadh'], ['بريدة', 'Buraydah', 26.3592, 43.9818, 'Asia/Riyadh'],
    ['عنيزة', 'Unaizah', 26.0840, 43.9940, 'Asia/Riyadh'], ['حائل', 'Hail', 27.5114, 41.7208, 'Asia/Riyadh'], ['تبوك', 'Tabuk', 28.3835, 36.5662, 'Asia/Riyadh'],
    ['أبها', 'Abha', 18.2164, 42.5053, 'Asia/Riyadh'], ['خميس مشيط', 'Khamis Mushait', 18.3000, 42.7333, 'Asia/Riyadh'], ['جازان', 'Jazan', 16.8892, 42.5511, 'Asia/Riyadh'],
    ['نجران', 'Najran', 17.5650, 44.2289, 'Asia/Riyadh'], ['الباحة', 'Al-Baha', 20.0129, 41.4677, 'Asia/Riyadh'], ['سكاكا', 'Sakaka', 29.9697, 40.2064, 'Asia/Riyadh'],
    ['عرعر', 'Arar', 30.9753, 41.0381, 'Asia/Riyadh'], ['حفر الباطن', 'Hafar Al-Batin', 28.4328, 45.9708, 'Asia/Riyadh'], ['ينبع', 'Yanbu', 24.0895, 38.0618, 'Asia/Riyadh'],
    ['الجبيل', 'Jubail', 27.0174, 49.6225, 'Asia/Riyadh'], ['الخرج', 'Al-Kharj', 24.1556, 47.3120, 'Asia/Riyadh'], ['المجمعة', 'Majmaah', 25.9039, 45.3456, 'Asia/Riyadh'],
    ['الكويت', 'Kuwait City', 29.3759, 47.9774, 'Asia/Kuwait'], ['المنامة', 'Manama', 26.2285, 50.5860, 'Asia/Bahrain'], ['الدوحة', 'Doha', 25.2854, 51.5310, 'Asia/Qatar'],
    ['أبوظبي', 'Abu Dhabi', 24.4539, 54.3773, 'Asia/Dubai'], ['دبي', 'Dubai', 25.2048, 55.2708, 'Asia/Dubai'], ['مسقط', 'Muscat', 23.5880, 58.3829, 'Asia/Muscat'],
    ['عمّان', 'Amman', 31.9454, 35.9284, 'Asia/Amman'], ['القاهرة', 'Cairo', 30.0444, 31.2357, 'Africa/Cairo'], ['إسطنبول', 'Istanbul', 41.0082, 28.9784, 'Europe/Istanbul'],
    ['طرابزون', 'Trabzon', 41.0027, 39.7168, 'Europe/Istanbul'], ['أوزنجول', 'Uzungol', 40.6181, 40.2867, 'Europe/Istanbul'], ['لندن', 'London', 51.5072, -0.1276, 'Europe/London'],
    ['باريس', 'Paris', 48.8566, 2.3522, 'Europe/Paris'], ['كوالالمبور', 'Kuala Lumpur', 3.1390, 101.6869, 'Asia/Kuala_Lumpur'], ['جاكرتا', 'Jakarta', -6.2088, 106.8456, 'Asia/Jakarta'],
    ['نيويورك', 'New York', 40.7128, -74.0060, 'America/New_York']
  ];
  const cityName = i => (i === null || i === undefined || !CITIES[i]) ? null : CITIES[i][isEn() ? 1 : 0];
  function nearestCity(lat, lng) {
    let best = null;
    CITIES.forEach((c, i) => { const d = A.distanceKm(lat, lng, c[2], c[3]); if (!best || d < best.d) best = { d, i }; });
    return best && best.d < 35 ? best.i : null;
  }
  const locLabel = () => cityName(S.loc.city) || coordTxt();
  // ترحيل من الإصدار 1.0 (كان يخزن الاسم)
  if (S.loc && S.loc.city === undefined) { S.loc.city = nearestCity(S.loc.lat, S.loc.lng); delete S.loc.name; save(); }

  /* ---------- التنسيق ---------- */
  const AR_DIG = '٠١٢٣٤٥٦٧٨٩';
  const num = x => S.digits === 'arab' ? String(x).replace(/[0-9]/g, d => AR_DIG[d]) : String(x);
  const pad = n => String(n).padStart(2, '0');
  const fmts = {};
  function parts(date, tz) {
    tz = tz || TZ();
    if (!fmts[tz]) fmts[tz] = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', weekday: 'short', hourCycle: 'h23' });
    const p = {}; fmts[tz].formatToParts(date).forEach(x => { p[x.type] = x.value; });
    return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour % 24, mi: +p.minute, s: +p.second, wd: p.weekday };
  }
  function tzOffsetMin(date, tz) { const p = parts(date, tz); return (Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(date / 1000) * 1000) / 6e4; }
  function fmtTime(date, opt) {
    if (!date) return '—';
    opt = opt || {};
    const p = parts(date, opt.tz);
    if (S.h24) return num(pad(p.h) + ':' + pad(p.mi));
    const h = p.h % 12 || 12;
    return num(h + ':' + pad(p.mi)) + (opt.short ? '' : ' ' + (p.h < 12 ? D.am : D.pm));
  }
  const dm = (d, m, y) => num(d) + ' ' + D.gMonths[m - 1] + (y ? ' ' + num(y) : '');
  function fmtDate(date, opt) {
    opt = opt || {};
    const p = parts(date, opt.tz);
    return (opt.wd === false ? '' : D.wd[p.wd] + (isEn() ? ', ' : ' ')) + dm(p.d, p.m, opt.year ? p.y : 0);
  }
  const ymdAdd = (o, n) => { const t = new Date(Date.UTC(o.y, o.m - 1, o.d + n)); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; };
  const hijriOf = ymd => A.hijri(new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d, 12)), 'UTC');
  const hijriStr = h => h ? num(h.day) + ' ' + D.hMonths[h.month - 1] + ' ' + num(h.year) + D.ah : '';
  const wdKey = ymd => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d)).getUTCDay()];
  const wdOf = ymd => D.wd[wdKey(ymd)];
  const ymdStr = (ymd, y) => wdOf(ymd) + (isEn() ? ', ' : ' ') + dm(ymd.d, ymd.m, y ? ymd.y : 0);
  function countdown(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return num((h ? h + ':' + pad(m) : m) + ':' + pad(x));
  }
  const minTxt = m => num(D.min(m));
  function durTxt(ms) {
    const mins = Math.round(ms / 6e4), d = Math.floor(mins / 1440), h = Math.floor(mins % 1440 / 60), m = mins % 60;
    const out = [];
    if (d) out.push(D.day(d));
    if (h) out.push(D.hour(h));
    if (!d && m) out.push(D.min(m));
    return num(out.join(D.and)) || D.lessMin;
  }
  const deg = x => num(Math.round(x)) + '°';
  const dirOf = b => D.dirs[Math.round(b / 45) % 8];
  const norm180 = a => ((a % 360) + 540) % 360 - 180;
  const coordTxt = () => num(S.loc.lat.toFixed(3)) + D.comma + num(S.loc.lng.toFixed(3));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- المظهر ---------- */
  const lightMQ = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const ink = a => 'rgba(' + cssVar('--text-rgb') + ',' + a + ')';
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', S.theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', cssVar('--night'));
  }
  function applyLang() {
    D = window.I18N[S.lang === 'en' ? 'en' : 'ar'];
    const h = document.documentElement;
    h.lang = isEn() ? 'en' : 'ar'; h.dir = isEn() ? 'ltr' : 'rtl';
    document.title = isEn() ? 'Falaq' : 'فَلَق';
    document.querySelectorAll('[data-t]').forEach(e => { e.textContent = L(e.dataset.t); });
    document.querySelectorAll('[data-ta]').forEach(e => { e.setAttribute('aria-label', L(e.dataset.ta)); });
    $('#dial').setAttribute('aria-label', L('dialLabel'));
    $('#wamdTag').hidden = isEn();
    $('#setMethod').innerHTML = '';
  }

  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2800); }

  /* ---------- حساب اليوم ---------- */
  const KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const pName = (k, ymd) => k === 'dhuhr' && ymd && wdKey(ymd) === 'Fri' ? D.prayers.jumuah : D.prayers[k];
  function timesFor(ymd) {
    const h = hijriOf(ymd);
    return A.prayerTimes(ymd.y, ymd.m, ymd.d, S.loc.lat, S.loc.lng, { method: S.method, asr: S.asr, adjust: S.adjust, ramadan: h && h.month === 9 });
  }
  const todayYMD = () => { const p = parts(new Date()); return { y: p.y, m: p.m, d: p.d }; };
  function nextEvent(now) {
    const t0 = todayYMD();
    for (const off of [0, 1]) {
      const ymd = ymdAdd(t0, off), T = timesFor(ymd);
      for (const k of KEYS) if (T[k] && T[k] > now) return { key: k, time: T[k], ymd };
    }
    return null;
  }

  /* ---------- لون السماء ---------- */
  const SKY = [[-90, [20, 29, 58]], [-18, [24, 34, 74]], [-12, [42, 47, 104]], [-6, [91, 74, 138]], [-2, [194, 120, 142]], [1, [240, 163, 106]], [6, [240, 194, 106]], [15, [191, 211, 224]], [40, [156, 195, 230]], [90, [140, 185, 228]]];
  function skyColor(alt) {
    for (let i = 1; i < SKY.length; i++) if (alt <= SKY[i][0]) {
      const [a0, c0] = SKY[i - 1], [a1, c1] = SKY[i], f = (alt - a0) / (a1 - a0);
      return 'rgb(' + c0.map((c, j) => Math.round(c + (c1[j] - c) * f)).join(',') + ')';
    }
    return 'rgb(140,185,228)';
  }
  function setGlow() {
    const alt = A.sunPos(new Date(), S.loc.lat, S.loc.lng).altitude;
    const r = document.documentElement.style;
    // وهج بنفسجي أعلى الصفحة: أقوى عند الفجر والمغرب
    r.setProperty('--wash', (0.16 + 0.42 * Math.max(0, 1 - Math.abs(alt + 4) / 14)).toFixed(2));
    if (alt > 8) { r.setProperty('--glow', '.22'); r.setProperty('--glow-c', '156,195,230'); }
    else { r.setProperty('--glow', String(Math.max(0, 1 - Math.abs(alt + 3) / 13).toFixed(2))); r.setProperty('--glow-c', alt < -1 ? '229,156,147' : '240,194,106'); }
  }

  /* ---------- الصلاة ---------- */
  let dayOffset = 0;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const polar = (a, r) => [r * Math.sin(a * Math.PI / 180), -r * Math.cos(a * Math.PI / 180)];

  function renderPrayer() {
    const now = new Date();
    const ymd = ymdAdd(todayYMD(), dayOffset);
    const T = timesFor(ymd), Tn = timesFor(ymdAdd(ymd, 1));
    const isToday = dayOffset === 0;

    $('#hijriDate').textContent = hijriStr(hijriOf(ymd));
    $('#gregDate').textContent = ymdStr(ymd, true);
    $('#todayBtn').classList.toggle('show', !isToday);

    const nxt = nextEvent(now);
    const list = $('#timesList'); list.innerHTML = '';
    KEYS.forEach(k => {
      const li = document.createElement('li');
      li.innerHTML = '<span class="n">' + pName(k, ymd) + '</span><span class="v">' + fmtTime(T[k]) + '</span>';
      if (isToday) { if (nxt && nxt.key === k && nxt.ymd.d === ymd.d) li.className = 'next'; else if (T[k] && T[k] < now) li.className = 'past'; }
      list.appendChild(li);
    });
    const night = Tn.fajr - T.maghrib;
    const s = document.createElement('li'); s.className = 'sep'; s.style.borderBottom = '0'; list.appendChild(s);
    [[L('midnight'), night / 2], [L('lastThird'), night * 2 / 3]].forEach(([n, off]) => {
      const li = document.createElement('li'); li.className = 'minor';
      li.innerHTML = '<span class="n">' + n + '</span><span class="v">' + fmtTime(new Date(T.maghrib.valueOf() + off)) + '</span>';
      list.appendChild(li);
    });

    drawDial(T, ymd, isToday, now);
    renderCenter();
  }

  function drawDial(T, ymd, isToday, now) {
    const svg = $('#dial'); svg.innerHTML = '';
    const noon = T.solarNoon.valueOf(), R = 116, bg = cssVar('--night');
    const ang = t => (t - noon) / DAY * 360;
    // توهج داخلي خفيف داخل القرص
    const di = cssVar('--dial-in') || '120,86,180';
    const defs = el('defs', {}, svg), rg = el('radialGradient', { id: 'dialIn', cx: '50%', cy: '50%', r: '50%' }, defs);
    el('stop', { offset: '55%', 'stop-color': 'rgb(' + di + ')', 'stop-opacity': 0 }, rg);
    el('stop', { offset: '88%', 'stop-color': 'rgb(' + di + ')', 'stop-opacity': .16 }, rg);
    el('stop', { offset: '100%', 'stop-color': 'rgb(' + di + ')', 'stop-opacity': .34 }, rg);
    el('circle', { r: R - 9, fill: 'url(#dialIn)' }, svg);
    const N = 144;
    for (let i = 0; i < N; i++) {
      const t0 = noon - DAY / 2 + i * DAY / N, t1 = t0 + DAY / N;
      const alt = A.sunPos(new Date((t0 + t1) / 2), S.loc.lat, S.loc.lng).altitude;
      const [x0, y0] = polar(ang(t0) - 0.3, R), [x1, y1] = polar(ang(t1) + 0.3, R);
      el('path', { d: `M${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1}`, stroke: skyColor(alt), 'stroke-width': 18, fill: 'none' }, svg);
    }
    if (T.sunrise && T.maghrib) {
      const [ax, ay] = polar(ang(T.sunrise.valueOf()), R - 13), [bx, by] = polar(ang(T.maghrib.valueOf()), R - 13);
      el('line', { x1: ax, y1: ay, x2: bx, y2: by, stroke: ink(.25), 'stroke-width': 1, 'stroke-dasharray': '2 5' }, svg);
    }
    const mid0 = localMidnight(ymd);
    for (let hr = 0; hr < 24; hr++) {
      const a = ang(mid0 + hr * 36e5);
      const [x0, y0] = polar(a, R + 11), [x1, y1] = polar(a, R + (hr % 6 === 0 ? 16 : 13));
      el('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: hr % 6 === 0 ? ink(.45) : ink(.18), 'stroke-width': 1 }, svg);
    }
    KEYS.forEach(k => {
      if (!T[k]) return;
      const a = ang(T[k].valueOf());
      const [x0, y0] = polar(a, R - 9), [x1, y1] = polar(a, R + 9);
      el('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: bg, 'stroke-width': 3 }, svg);
      el('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: 'rgba(237,231,218,.95)', 'stroke-width': 1.2 }, svg);
      const [x, y] = polar(a, R + 22);
      const anchor = x > 20 ? 'start' : x < -20 ? 'end' : 'middle';
      el('text', { x, y: y + 4 + (anchor === 'middle' ? (y < 0 ? -6 : 8) : 0), 'text-anchor': anchor, fill: ink(.75), 'font-size': isEn() ? 11 : 11.5, 'font-family': 'IBM Plex Sans Arabic, system-ui' }, svg).textContent = D.prayers[k];
    });
    if (isToday) {
      const a = ang(now.valueOf());
      const alt = A.sunPos(now, S.loc.lat, S.loc.lng).altitude;
      const [x, y] = polar(a, R);
      if (alt > -0.83) {
        el('circle', { cx: x, cy: y, r: 17, fill: 'rgba(240,194,106,.22)' }, svg);
        el('circle', { cx: x, cy: y, r: 9.5, fill: '#F6D48A', stroke: bg, 'stroke-width': 2.5 }, svg);
      } else {
        el('circle', { cx: x, cy: y, r: 9, fill: '#E9E4D8', stroke: bg, 'stroke-width': 2.5 }, svg);
        el('circle', { cx: x + 4, cy: y - 3, r: 7, fill: skyColor(alt) }, svg);
      }
    }
  }
  function localMidnight(ymd) { const t = Date.UTC(ymd.y, ymd.m - 1, ymd.d); return t - tzOffsetMin(new Date(t + 12 * 36e5), TZ()) * 6e4; }

  function renderCenter() {
    const c = $('#dialCenter');
    if (dayOffset !== 0) {
      const ymd = ymdAdd(todayYMD(), dayOffset);
      c.innerHTML = '<div class="name">' + wdOf(ymd) + '</div><div class="k">' + (dayOffset > 0 ? L('inTime', durTxt(dayOffset * DAY)) : L('agoTime', durTxt(-dayOffset * DAY))) + '</div>';
      return;
    }
    const now = new Date(), n = nextEvent(now);
    if (!n) { c.innerHTML = ''; return; }
    const ymd = todayYMD();
    c.innerHTML = '<div class="name">' + pName(n.key, n.ymd) + '</div><div class="t">' + fmtTime(n.time) + (n.ymd.d !== ymd.d ? L('tomorrow') : '') + '</div><div class="cd">' + countdown(n.time - now) + '</div>';
  }

  function openMonth() {
    const base = ymdAdd(todayYMD(), dayOffset);
    const days = new Date(Date.UTC(base.y, base.m, 0)).getUTCDate();
    const today = todayYMD();
    let rows = '';
    for (let d = 1; d <= days; d++) {
      const ymd = { y: base.y, m: base.m, d }, T = timesFor(ymd), h = hijriOf(ymd);
      const cls = (ymd.y === today.y && ymd.m === today.m && d === today.d) ? ' class="today"' : '';
      rows += '<tr' + cls + '><td class="d">' + D.wdShort[wdKey(ymd)] + ' ' + num(d) + '</td><td>' + (h ? num(h.day) : '') + '</td>' +
        KEYS.map(k => '<td>' + fmtTime(T[k], { short: true }) + '</td>').join('') + '</tr>';
    }
    const head = L('monthHead').concat(KEYS.map(k => D.prayers[k]));
    sheet('<h2>' + D.gMonths[base.m - 1] + ' ' + num(base.y) + '</h2><p>' + esc(locLabel()) + ' — ' + D.methods[S.method] + '</p>' +
      '<table class="month"><thead><tr>' + head.map(x => '<th>' + x + '</th>').join('') + '</tr></thead><tbody>' + rows + '</tbody></table>', () => {
      const r = $('#sheet .today'); if (r) r.scrollIntoView({ block: 'center' });
    });
  }

  /* ---------- القبلة ---------- */
  let heading = null, compassOn = false, wasAligned = false, gotAbsolute = false;
  const qiblaInfo = () => A.qibla(S.loc.lat, S.loc.lng);
  function buildCompass() {
    const svg = $('#compass'); svg.innerHTML = '';
    const gold = cssVar('--gold');
    el('circle', { r: 160, fill: 'none', stroke: 'transparent', 'stroke-width': 3, id: 'cAlign' }, svg);
    const rose = el('g', { id: 'rose' }, svg);
    el('circle', { r: 150, fill: cssVar('--night-2'), stroke: ink(.14), 'stroke-width': 1 }, rose);
    for (let a = 0; a < 360; a += 5) {
      const long = a % 30 === 0;
      const [x0, y0] = polar(a, 150 - (long ? 14 : 7)), [x1, y1] = polar(a, 148);
      el('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: long ? ink(.6) : ink(.2), 'stroke-width': long ? 1.4 : 1 }, rose);
    }
    D.cardinals.forEach((t, i) => {
      const a = i * 90, [x, y] = polar(a, 117);
      el('text', { x, y: y + 7, 'text-anchor': 'middle', fill: a === 0 ? cssVar('--rose') : ink(.8), 'font-size': 20, 'font-family': 'IBM Plex Sans Arabic, system-ui', 'font-weight': 600, class: 'upright' }, rose).textContent = t;
    });
    const q = qiblaInfo().bearing;
    const [qx, qy] = polar(q, 128);
    el('line', { x1: 0, y1: 0, x2: qx, y2: qy, stroke: gold, 'stroke-width': 2.5, 'stroke-linecap': 'round' }, rose);
    const kg = el('g', { class: 'upright', 'data-x': qx, 'data-y': qy }, rose);
    el('rect', { x: qx - 13, y: qy - 13, width: 26, height: 26, rx: 3, fill: '#0F1830', stroke: gold, 'stroke-width': 2 }, kg);
    el('rect', { x: qx - 13, y: qy - 6, width: 26, height: 4, fill: gold }, kg);
    el('circle', { r: 5, fill: gold }, rose);
    el('g', { id: 'skyMarks' }, rose);
    el('path', { d: 'M0 -168 L-9 -152 L9 -152 Z', fill: cssVar('--text') }, svg);
    updateSkyMarks();
    renderCompass();
  }
  function updateSkyMarks() {
    const g = $('#skyMarks'); if (!g) return;
    g.innerHTML = '';
    const now = new Date();
    const s = A.sunPos(now, S.loc.lat, S.loc.lng), m = A.moonPos(now, S.loc.lat, S.loc.lng);
    if (s.altitude > -0.5) {
      const [x, y] = polar(s.azimuth, 92);
      el('circle', { cx: x, cy: y, r: 12, fill: 'rgba(240,194,106,.25)' }, g);
      el('circle', { cx: x, cy: y, r: 7, fill: '#F2C25E' }, g);
    }
    if (m.altitude > 0) {
      const [x, y] = polar(m.azimuth, 92);
      el('circle', { cx: x, cy: y, r: 6.5, fill: cssVar('--moon-lit'), stroke: ink(.3), 'stroke-width': .8 }, g);
    }
    $('#sunCalBtn').hidden = !(compassOn && s.altitude > 3 && s.altitude < 70);
  }
  function renderCompass() {
    const q = qiblaInfo();
    const rose = $('#rose'); if (!rose) return;
    const hd = heading === null ? 0 : ((heading + S.compassOffset) % 360 + 360) % 360;
    rose.setAttribute('transform', 'rotate(' + (-hd) + ')');
    rose.querySelectorAll('.upright').forEach(n => {
      const isText = n.getAttribute('x') !== null;
      const x = isText ? +n.getAttribute('x') : +n.dataset.x;
      const y = isText ? +n.getAttribute('y') - 7 : +n.dataset.y;
      n.setAttribute('transform', 'rotate(' + hd + ' ' + x + ' ' + y + ')');
    });
    $('#qBearing').textContent = deg(q.bearing);
    $('#qDist').textContent = num(Math.round(q.distance).toLocaleString('en-US')) + L('km');
    $('#qHeading').textContent = heading === null ? '—' : deg(hd);
    const st = $('#qStatus');
    if (heading === null) {
      st.className = 'q-status';
      st.innerHTML = '<div class="big">' + L('qiblaToward', dirOf(q.bearing)) + '</div><div class="small">' + L('fromTrueNorth', deg(q.bearing)) + '</div>';
      return;
    }
    const diff = norm180(q.bearing - hd);
    const aligned = Math.abs(diff) <= 3;
    st.className = 'q-status' + (aligned ? ' aligned' : '');
    st.innerHTML = aligned ? '<div class="big">' + L('aligned') + '</div><div class="small">' + L('holdSteady') + '</div>'
      : '<div class="big">' + L('turn', diff > 0, deg(Math.abs(diff))) + '</div><div class="small">' + L('untilKaaba') + '</div>';
    $('#cAlign').setAttribute('stroke', aligned ? cssVar('--gold') : 'transparent');
    if (aligned && !wasAligned && navigator.vibrate) navigator.vibrate(30);
    wasAligned = aligned;
  }
  function onOrient(e) {
    let h = null;
    if (typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading)) h = e.webkitCompassHeading;
    else if (e.type === 'deviceorientationabsolute' && e.alpha !== null) { gotAbsolute = true; h = 360 - e.alpha; }
    else if (!gotAbsolute && e.absolute && e.alpha !== null) h = 360 - e.alpha;
    if (h === null) return;
    const so = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    heading = ((h + so) % 360 + 360) % 360; // قراءة خام بدون تنعيم
    // بيانات تقدير الجودة فقط — لا تغيّر القراءة المعروضة
    if (typeof e.webkitCompassAccuracy === 'number') compassAcc = e.webkitCompassAccuracy;
    if (e.beta !== null && e.gamma !== null) tilt = Math.max(Math.abs(e.beta), Math.abs(e.gamma));
    const now = performance.now();
    samples.push([now, heading]);
    while (samples.length && now - samples[0][0] > 1500) samples.shift();
  }
  let compassAcc = null, tilt = 0, samples = [], lastQual = 0;
  // الجودة: 4 ممتازة، 3 جيدة، 2 متوسطة، 1 ضعيفة
  function compassQuality() {
    let q;
    if (compassAcc !== null) {
      q = compassAcc < 0 ? 1 : compassAcc <= 10 ? 4 : compassAcc <= 20 ? 3 : compassAcc <= 35 ? 2 : 1;
    } else {
      if (samples.length < 4) return null;
      // تذبذب القراءات خلال ثانية ونصف (انحراف دائري)
      let sx = 0, sy = 0;
      samples.forEach(([, h]) => { sx += Math.cos(h * Math.PI / 180); sy += Math.sin(h * Math.PI / 180); });
      const R = Math.min(1, Math.hypot(sx, sy) / samples.length);
      const sd = Math.sqrt(-2 * Math.log(Math.max(R, 1e-9))) * 180 / Math.PI;
      q = sd < 2 ? 4 : sd < 5 ? 3 : sd < 10 ? 2 : 1;
      if (!gotAbsolute) q = Math.min(q, 2);
    }
    if (tilt > 35) q = Math.max(1, q - 1);
    return q;
  }
  function renderQuality() {
    const box = $('#qQuality'), hint = $('#qHint');
    if (heading === null) { box.hidden = true; hint.hidden = true; return; }
    const now = performance.now();
    if (now - lastQual < 500) return;
    lastQual = now;
    const q = compassQuality();
    if (q === null) return;
    box.hidden = false; box.dataset.q = q;
    $('#qQualTxt').textContent = D.s.qual[q];
    const h = q <= 2 ? L('hintCalib') : tilt > 35 ? L('hintTilt') : '';
    hint.hidden = !h; hint.textContent = h;
  }
  let rafOn = false;
  function loop() { if (!rafOn) return; renderCompass(); renderQuality(); requestAnimationFrame(loop); }
  function startCompass() {
    const go = () => {
      window.addEventListener('deviceorientationabsolute', onOrient, true);
      window.addEventListener('deviceorientation', onOrient, true);
      compassOn = true;
      $('#compassBtn').hidden = true;
      updateSkyMarks();
      setTimeout(() => { if (heading === null) toast(L('noCompassReading')); }, 2500);
    };
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then(r => r === 'granted' ? go() : toast(L('needMotion'))).catch(() => toast(L('compassFailed')));
    } else if ('DeviceOrientationEvent' in window) go();
    else toast(L('noCompass'));
  }
  function renderSunQibla() {
    const q = qiblaInfo(), T = timesFor(todayYMD());
    const r = A.sunQiblaTimes(T.sunrise, T.maghrib, S.loc.lat, S.loc.lng, q.bearing);
    let html = '<div><dt>' + L('sunToward') + '</dt><dd>' + (r.toward ? fmtTime(r.toward) : L('notToday')) + '</dd></div>' +
      '<div><dt>' + L('shadowToward') + '</dt><dd>' + (r.shadow ? fmtTime(r.shadow) : L('notToday')) + '</dd></div>';
    A.kaabaTransits(new Date()).forEach((d, i) => {
      html += '<div><dt>' + L(i === 0 ? 'transit1' : 'transit2') + '</dt><dd>' + fmtDate(d, { tz: 'Asia/Riyadh', wd: false, year: true }) + D.comma + fmtTime(d, { tz: 'Asia/Riyadh' }) + L('meccaTime') + '</dd></div>';
    });
    $('#sunQibla').innerHTML = html;
  }
  function sunCalibrate() {
    sheet('<h2>' + L('calTitle') + '</h2><p>' + L('calText') + '</p>' +
      '<button class="link-btn primary" id="calNow">' + L('calNow') + '</button><button class="link-btn" id="calReset">' + L('calReset', deg(S.compassOffset)) + '</button>', () => {
      $('#calNow').onclick = () => {
        if (heading === null) { toast(L('startFirst')); return; }
        const s = A.sunPos(new Date(), S.loc.lat, S.loc.lng);
        S.compassOffset = Math.round(norm180(s.azimuth - heading));
        save(); closeSheet(); renderSettings(); toast(L('calDone', deg(S.compassOffset)));
      };
      $('#calReset').onclick = () => { S.compassOffset = 0; save(); closeSheet(); renderSettings(); toast(L('calCleared')); };
    });
  }

  /* ---------- القمر ---------- */
  const MARIA = [[-0.32, -0.38, 0.27, 0.22], [0.05, -0.32, 0.16, 0.15], [0.28, -0.08, 0.2, 0.17], [0.58, -0.25, 0.12, 0.11], [0.5, 0.18, 0.13, 0.16], [-0.12, 0.36, 0.2, 0.13],
    [-0.5, 0.05, 0.25, 0.38], [0.1, 0.12, 0.12, 0.09], [-0.15, 0.62, 0.05, 0.05]];
  function drawMoon(fraction, rot) {
    const cv = $('#moonCanvas'), ctx = cv.getContext('2d'), size = cv.width, r = size / 2 - 22;
    ctx.clearRect(0, 0, size, size);
    ctx.save(); ctx.translate(size / 2, size / 2);
    const hc = cssVar('--moon-halo');
    const halo = ctx.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 1.18);
    halo.addColorStop(0, 'rgba(' + hc + ',' + (0.18 * fraction) + ')'); halo.addColorStop(1, 'rgba(' + hc + ',0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, r * 1.18, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(rot);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.closePath(); ctx.save(); ctx.clip();
    const g = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#F5F0E4'); g.addColorStop(0.7, '#DCD5C6'); g.addColorStop(1, '#B9B2A4');
    ctx.fillStyle = g; ctx.fillRect(-r, -r, 2 * r, 2 * r);
    ctx.rotate(-rot);
    MARIA.forEach(([x, y, rx, ry]) => {
      const mg = ctx.createRadialGradient(x * r, y * r, 0, x * r, y * r, Math.max(rx, ry) * r);
      mg.addColorStop(0, 'rgba(140,136,128,.34)'); mg.addColorStop(0.65, 'rgba(140,136,128,.2)'); mg.addColorStop(1, 'rgba(128,124,116,0)');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(x * r, y * r, rx * r, ry * r, 0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.rotate(rot);
    const k = fraction, rx = Math.abs(2 * k - 1) * r;
    ctx.beginPath();
    ctx.arc(0, 0, r + 2, Math.PI / 2, Math.PI * 1.5);
    ctx.ellipse(0, 0, Math.max(rx, 0.01), r + 2, 0, -Math.PI / 2, Math.PI / 2, k > 0.5);
    ctx.closePath();
    ctx.fillStyle = cssVar('--moon-shadow'); ctx.fill();
    ctx.restore();
    ctx.restore();
  }
  function phaseKey(il) {
    const e = il.elongation;
    if (il.fraction < 0.015) return 'new';
    if (e < 83) return 'waxCres';
    if (e < 97) return 'first';
    if (e < 172) return 'waxGib';
    if (e < 188) return 'full';
    if (e < 263) return 'wanGib';
    if (e < 277) return 'last';
    return 'wanCres';
  }
  function phaseIcon(type) {
    const lit = 'style="fill:var(--moon-lit)"';
    const s = '<svg viewBox="-12 -12 24 24"><circle r="10" style="fill:var(--moon-dark);stroke:var(--line-2)"/>';
    if (type === 0) return s + '</svg>';
    if (type === 2) return s + '<circle r="10" ' + lit + '/></svg>';
    if (type === 1) return s + '<path d="M0 -10 A10 10 0 0 1 0 10 Z" ' + lit + '/></svg>';
    return s + '<path d="M0 -10 A10 10 0 0 0 0 10 Z" ' + lit + '/></svg>';
  }
  function renderMoon() {
    const now = new Date(), lat = S.loc.lat, lng = S.loc.lng;
    const il = A.moonIllumination(now), mp = A.moonPos(now, lat, lng), ph = A.moonPhases(now);
    const up = mp.altitude > 0;
    drawMoon(il.fraction, up ? -(il.brightLimbAngle - mp.parallacticAngle) - Math.PI / 2 : (il.waxing ? 0 : Math.PI));
    $('#moonCap').textContent = up ? L('asSeen') : L('belowHorizon');
    $('#moonPhase').textContent = D.phases[phaseKey(il)];
    const t = todayYMD(), h = hijriOf(t);
    $('#moonSub').textContent = h ? L('nightOf', num(h.day), D.hMonths[h.month - 1]) : '';

    const mt = A.moonTimes(new Date(localMidnight(t)), lat, lng);
    const age = ph.lastNew ? now - ph.lastNew : null;
    const rows = [
      [L('illum'), num(Math.round(il.fraction * 100)) + (isEn() ? '%' : '٪')],
      [L('age'), age !== null ? durTxt(age) : '—'],
      [L('moonrise'), mt.rise ? fmtTime(mt.rise) : (mt.alwaysUp ? L('alwaysUp') : L('noRise'))],
      [L('moonset'), mt.set ? fmtTime(mt.set) : (mt.alwaysDown ? L('alwaysDown') : L('noSet'))],
      [L('altNow'), up ? L('altDir', deg(mp.altitude), dirOf(mp.azimuth)) : L('below')],
      [L('dist'), num(Math.round(mp.distance).toLocaleString('en-US')) + L('km')]
    ];
    $('#moonRows').innerHTML = rows.map(([a, b]) => '<div><dt>' + a + '</dt><dd>' + b + '</dd></div>').join('');

    const ps = [[0, ph.nextNew, 'new'], [1, ph.nextFirst, 'first'], [2, ph.nextFull, 'full'], [3, ph.nextLast, 'last']].filter(x => x[1]).sort((a, b) => a[1] - b[1]);
    $('#phases').innerHTML = ps.map(([ty, d, k]) => '<div>' + phaseIcon(ty) + '<b>' + D.phases[k] + '</b><span>' + fmtDate(d, { wd: false }) + '</span><span>' + fmtTime(d) + '</span></div>').join('');

    const mm = A.moonMansion(now);
    const svg = $('#mansionRing'); svg.innerHTML = '';
    const Rr = 52, segA = 360 / 28, surf = cssVar('--night-2');
    const lonA = lon => ((lon - mm.startLon) % 360 + 360) % 360;
    const arc = (i, color) => {
      const [x0, y0] = polar(i * segA + 1, Rr), [x1, y1] = polar((i + 1) * segA - 1, Rr);
      el('path', { d: `M${x0} ${y0} A${Rr} ${Rr} 0 0 1 ${x1} ${y1}`, stroke: color, 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' }, svg);
    };
    for (let i = 0; i < 28; i++) arc(i, ink(.13));
    arc(mm.sun, 'rgba(240,194,106,.6)');
    arc(mm.moon, ink(.55));
    const [sx, sy] = polar(lonA(mm.sunLon), Rr), [mx, my] = polar(lonA(mm.moonLon), Rr);
    el('line', { x1: sx * 0.62, y1: sy * 0.62, x2: mx * 0.62, y2: my * 0.62, stroke: ink(.15), 'stroke-width': 1 }, svg);
    el('circle', { cx: sx, cy: sy, r: 7, fill: '#F2C25E', stroke: surf, 'stroke-width': 2 }, svg);
    el('circle', { cx: mx, cy: my, r: 6, fill: cssVar('--moon-lit'), stroke: surf, 'stroke-width': 2 }, svg);
    el('circle', { r: 3, fill: 'rgba(120,170,220,.8)' }, svg);
    $('#mansionTxt').innerHTML = '<div class="lbl">' + L('mansionLbl') + '</div><div class="m">' + D.mansions[mm.moon] + '</div><div class="s">' + L('mansionSub', num(mm.moon + 1), D.mansions[mm.sun]) + '</div>';

    renderHilal(ph, h);
    renderWhite(h);
    renderStar();
  }

  function renderHilal(ph, h) {
    const conj = ph.nextNew, lat = S.loc.lat, lng = S.loc.lng;
    if (!conj) return;
    const nextMonth = h ? D.hMonths[h.month % 12] : '';
    const p = parts(conj);
    let ymd = { y: p.y, m: p.m, d: p.d };
    if (timesFor(ymd).sunsetExact < conj) ymd = ymdAdd(ymd, 1);
    const evenings = [ymd, ymdAdd(ymd, 1)].map(e => {
      const ss = timesFor(e).sunsetExact, from = new Date(ss.valueOf() - 6 * 36e5);
      const mt = A.moonTimes(from, lat, lng);
      const lag = mt.set && mt.set > from ? Math.round((mt.set - ss) / 6e4) : null;
      const age = Math.max(0, Math.round((ss - conj) / 36e5));
      const txt = lag === null ? '—' : lag <= 0 ? L('setsBefore', minTxt(-lag)) : L('stays', minTxt(lag), num(age));
      return '<div><dt>' + L('evening', ymdStr(e)) + '</dt><dd>' + txt + '</dd></div>';
    }).join('');
    $('#hilalBlock').innerHTML = '<h2>' + L('hilal', nextMonth) + '</h2>' +
      '<p class="note" style="margin:0 0 6px">' + L('conj', fmtDate(conj), fmtTime(conj)) + '</p><dl class="rows">' + evenings + '</dl>' +
      '<p class="note" style="margin-bottom:10px">' + L('hilalNote') + '</p>';
  }

  function renderWhite(h) {
    const b = $('#whiteBlock');
    if (!h) { b.hidden = true; return; }
    const t0 = todayYMD();
    let txt = '';
    if (h.day >= 13 && h.day <= 15) txt = L('whiteToday', num(h.day), D.hMonths[h.month - 1], 15 - h.day);
    else {
      for (let i = 1; i < 45; i++) {
        const y = ymdAdd(t0, i), hh = hijriOf(y);
        if (hh && hh.day === 13) { txt = L('whiteStart', ymdStr(y), durTxt(i * DAY)); break; }
      }
    }
    b.innerHTML = '<h2>' + L('whiteTitle') + '</h2><p class="note" style="margin:0">' + txt + '</p>';
  }

  function renderStar() {
    const t = todayYMD(), s = A.najdiStar(t.y, t.m, t.d), b = $('#starBlock');
    if (!s) { b.hidden = true; return; }
    const pct = Math.min(100, Math.round(s.day / s.len * 100));
    b.innerHTML = '<p class="note" style="margin:0">' + L('starLbl') + '</p>' +
      '<div class="star-name">' + D.mansions[s.index] + '</div>' +
      '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="bar-meta"><span>' + L('dayOf', num(s.day), num(s.len)) + '</span><span>' + L('followedBy', D.mansions[(s.index + 1) % 28], fmtDate(s.nextStart, { tz: 'UTC', wd: false })) + '</span></div>' +
      '<dl class="rows" style="margin-top:10px"><div><dt>' + L('season') + '</dt><dd>' + L('seasonVal', D.seasons[s.seasonIndex], num(s.seasonDay), num(s.seasonLen)) + '</dd></div>' +
      '<div><dt>' + L('nextSeason') + '</dt><dd>' + D.seasons[s.nextSeasonIndex] + D.comma + fmtDate(s.nextSeasonStart, { tz: 'UTC', wd: false }) + '</dd></div></dl>' +
      '<p class="note" style="margin:0 0 12px">' + D.seasonDesc[s.seasonIndex] + '</p>';
  }

  /* ---------- الأذكار ---------- */
  const ZK = window.AZKAR;
  let zkCat = null;
  const zkDayKey = () => { const t = todayYMD(); return t.y + '-' + t.m + '-' + t.d; };
  let ZS;
  try { ZS = JSON.parse(localStorage.getItem('falaq-zk') || '{}'); } catch (e) { ZS = {}; }
  const zkSave = () => { try { localStorage.setItem('falaq-zk', JSON.stringify(ZS)); } catch (e) {} };
  function zkRemain(cat) {
    if (ZS.day !== zkDayKey()) ZS = { day: zkDayKey() };
    if (!Array.isArray(ZS[cat]) || ZS[cat].length !== ZK[cat].length) ZS[cat] = ZK[cat].map(x => x.c);
    return ZS[cat];
  }
  function zkDefault() {
    const now = new Date(), T = timesFor(todayYMD());
    if (now >= T.fajr && now < T.asr) return 'morning';
    if (now >= T.asr && now < new Date(T.isha.valueOf() + 2 * 36e5)) return 'evening';
    return 'sleep';
  }
  const zkCatName = c => L(c === 'morning' ? 'zkMorning' : c === 'evening' ? 'zkEvening' : 'zkSleep');
  function zkCtr(total, r) {
    const C = 2 * Math.PI * 24, frac = r === 0 ? 1 : (total - r) / total;
    return '<svg viewBox="0 0 54 54" aria-hidden="true"><circle cx="27" cy="27" r="24" fill="none" stroke="var(--line-2)" stroke-width="3"/>' +
      '<circle cx="27" cy="27" r="24" fill="none" stroke="var(--gold)" stroke-width="3" stroke-linecap="round" stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + (C * (1 - frac)).toFixed(2) + '"/></svg>' +
      '<b>' + (r === 0 ? '✓' : num(r)) + '</b>';
  }
  function zkCard(x, i, r) {
    return '<article class="zk' + (r === 0 ? ' done' : '') + '" dir="rtl" data-i="' + i + '" role="button" tabindex="0">' +
      (x.r ? '<div class="ref">' + esc(x.r) + '</div>' : '') +
      '<div class="txt">' + esc(x.t) + '</div>' +
      (x.f ? '<div class="fadl">' + esc(x.f) + '</div>' : '') +
      '<div class="foot"><span class="times-lbl">' + num(L('zkTimes', x.c)) + '</span><div class="ctr">' + zkCtr(x.c, r) + '</div></div></article>';
  }
  function zkProgress() {
    const rem = zkRemain(zkCat), total = rem.length, done = rem.filter(n => n === 0).length;
    $('#zkBar').style.width = Math.round(done / total * 100) + '%';
    $('#zkCount').textContent = L('zkProgress', num(done), num(total));
    const all = $('#zkDoneAll');
    all.hidden = done !== total;
    all.textContent = L('zkDone', zkCatName(zkCat));
  }
  function renderAzkar() {
    if (!zkCat) zkCat = zkDefault();
    seg('#zkSeg', zkCat, v => { zkCat = v; renderAzkar(); window.scrollTo(0, 0); });
    document.documentElement.style.setProperty('--zk-size', (S.zkSize || 22) + 'px');
    const rem = zkRemain(zkCat);
    $('#zkList').innerHTML = ZK[zkCat].map((x, i) => zkCard(x, i, rem[i])).join('');
    $('#zkList').querySelectorAll('.zk').forEach(card => {
      card.onclick = () => zkTap(+card.dataset.i);
      card.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zkTap(+card.dataset.i); } };
    });
    zkProgress();
  }
  function zkTap(i) {
    const rem = zkRemain(zkCat);
    if (rem[i] === 0) return;
    rem[i]--; zkSave();
    const card = $('.zk[data-i="' + i + '"]');
    card.querySelector('.ctr').innerHTML = zkCtr(ZK[zkCat][i].c, rem[i]);
    if (navigator.vibrate) navigator.vibrate(rem[i] === 0 ? 35 : 8);
    if (rem[i] === 0) {
      card.classList.add('done');
      let j = rem.findIndex((n, k) => k > i && n > 0);
      if (j < 0) j = rem.findIndex(n => n > 0);
      const smooth = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
      if (j >= 0) setTimeout(() => $('.zk[data-i="' + j + '"]').scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' }), 220);
      else setTimeout(() => window.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' }), 220);
    }
    zkProgress();
  }
  $('#zkReset').onclick = () => { ZS[zkCat] = ZK[zkCat].map(x => x.c); zkSave(); renderAzkar(); window.scrollTo(0, 0); };
  $('#zkSmaller').onclick = () => { S.zkSize = Math.max(16, (S.zkSize || 22) - 2); save(); renderAzkar(); };
  $('#zkBigger').onclick = () => { S.zkSize = Math.min(34, (S.zkSize || 22) + 2); save(); renderAzkar(); };

  /* ---------- الإعدادات ---------- */
  function seg(id, val, cb) {
    $(id).querySelectorAll('button').forEach(b => {
      b.classList.toggle('on', b.dataset.v === String(val));
      b.onclick = () => { cb(b.dataset.v); };
    });
  }
  function renderSettings() {
    const sel = $('#setMethod');
    if (!sel.options.length) for (const k in A.METHODS) { const o = document.createElement('option'); o.value = k; o.textContent = D.methods[k]; sel.appendChild(o); }
    sel.value = S.method;
    sel.onchange = () => { S.method = sel.value; save(); renderAll(); };
    seg('#setLang', S.lang, v => { S.lang = v; save(); applyLang(); buildCompass(); renderAll(); renderGate(); });
    seg('#setTheme', S.theme, v => { S.theme = v; save(); applyTheme(); buildCompass(); renderAll(); });
    seg('#setAsr', S.asr, v => { S.asr = +v; save(); renderAll(); });
    seg('#setH24', S.h24 ? 1 : 0, v => { S.h24 = v === '1'; save(); renderAll(); });
    seg('#setDigits', S.digits, v => { S.digits = v; save(); buildCompass(); renderAll(); });
    const adj = $('#setAdjust');
    adj.innerHTML = KEYS.map(k => '<div><span class="lbl">' + D.prayers[k] + '</span><span class="stepper" data-k="' + k + '"><button data-d="1" aria-label="' + L('inc') + '">+</button><output>' + (S.adjust[k] > 0 ? '+' : '') + num(S.adjust[k]) + '</output><button data-d="-1" aria-label="' + L('dec') + '">−</button></span></div>').join('');
    adj.querySelectorAll('.stepper button').forEach(b => b.onclick = () => {
      const k = b.parentNode.dataset.k; S.adjust[k] = Math.max(-30, Math.min(30, S.adjust[k] + +b.dataset.d)); save(); renderSettings(); renderPrayer();
    });
    const off = $('#setOffset');
    off.querySelector('output').textContent = (S.compassOffset > 0 ? '+' : '') + num(S.compassOffset) + '°';
    off.querySelectorAll('button').forEach(b => b.onclick = () => { S.compassOffset = norm180(S.compassOffset + +b.dataset.d); save(); renderSettings(); });
    renderNotify();
    $('#setLocVal').textContent = S.loc.source === 'default' ? L('defaultLoc') : locLabel();
    $('#verVal').textContent = L('version', num(VERSION));
    $('#aboutVer').textContent = L('aboutVer', num(VERSION));
  }

  /* ---------- الإشعارات (عبر wamd-push.js المشترك مع سهم وخُطى) ---------- */
  const P = window.WamdPush;
  function ntfStatus() {
    const st = P.status();
    return st === 'granted' || st === 'default' ? 'ok' : st;
  }
  const falaqCfg = () => ({ lat: S.loc.lat, lng: S.loc.lng, tz: TZ(), method: S.method, asr: S.asr, adjust: S.adjust, prayers: S.notify.prayers, lang: S.lang, prefs: { news: S.notify.news !== false } });
  let ntfBusy = false;
  function renderNotify() {
    const box = $('#ntfSet'); if (!box) return;
    const st = ntfStatus(), on = S.notify.on && st === 'ok' && P.status() === 'granted';
    const sw = (k, lbl, val) => '<div><span class="lbl">' + lbl + '</span><button class="switch" role="switch" data-k="' + k + '" aria-checked="' + !!val + '" aria-label="' + lbl + '"></button></div>';
    let html = '<div><span class="lbl">' + L('ntfOn') + '</span><button class="switch" id="ntfToggle" role="switch" aria-checked="' + on + '" aria-label="' + L('ntfOn') + '"' + (ntfBusy ? ' disabled' : '') + '></button></div>';
    if (on) {
      KEYS.forEach(k => { html += sw(k, D.prayers[k], S.notify.prayers[k]); });
      html += sw('news', L('ntfNews'), S.notify.news !== false);
    }
    box.innerHTML = html;
    $('#ntfNote').textContent = ntfBusy ? L('ntfWorking') : st === 'ok' ? L(on ? 'ntfOnNote' : 'ntfOffNote') :
      L({ needInstall: 'ntfNeedInstall', unsupported: 'ntfUnsupported', blocked: 'ntfBlocked' }[st]);
    $('#ntfToggle').onclick = () => {
      if (st === 'needInstall') { openInstall(); return; }
      if (st !== 'ok') { toast($('#ntfNote').textContent); return; }
      if (on) ntfDisable(); else ntfEnable();
    };
    box.querySelectorAll('.switch[data-k]').forEach(b => b.onclick = () => {
      const k = b.dataset.k;
      if (k === 'news') S.notify.news = S.notify.news === false; else S.notify.prayers[k] = !S.notify.prayers[k];
      save(); renderNotify();
    });
  }
  // after: دالة تُنفّذ بعد انتهاء طلب الإذن (مثل طلب الموقع في بطاقة الترحيب)
  function ntfEnable(after) {
    const ask = P.request();          // مباشرة داخل الضغطة
    ntfBusy = true; renderNotify();
    return ask.then(perm => {
      if (perm !== 'granted') { if (!after) toast(L('ntfDenied')); return; }
      return P.subscribe('falaq', falaqCfg(), true).then(() => { S.notify.on = true; save(); toast(L('ntfOnToast')); });
    }).catch(() => toast(L('ntfFail'))).finally(() => { ntfBusy = false; renderNotify(); if (after) after(); });
  }
  function ntfDisable() {
    S.notify.on = false; save(); renderNotify(); toast(L('ntfOffToast'));
    P.unsubscribe();
  }
  function pushSync() {
    try { if (!S.notify.on || ntfBusy || P.status() !== 'granted') return; } catch (e) { return; }
    P.sync('falaq', falaqCfg);
  }
  // بطاقة الترحيب: أول فتح من الشاشة الرئيسية (وللمستخدمين الحاليين مرة بعد التحديث)
  function maybeWelcome() {
    if (!isStandalone() || S.notify.on || !P.shouldAsk(S)) return;
    setTimeout(() => {
      if ($('#sheetBg').classList.contains('on')) return;
      const needLoc = S.loc.source === 'default';
      sheet('<div class="welcome"><img src="icons/icon-192.png" alt="" width="72" height="72"><h2>' + L('wlTitle') + '</h2><p>' + L(needLoc ? 'wlTextLoc' : 'wlText') + '</p></div>' +
        '<button class="link-btn primary" id="wlGo">' + L('wlGo') + '</button><button class="link-btn" id="wlLater">' + L('later') + '</button>', () => {
        $('#wlGo').onclick = () => {
          P.markAsked(S); save();
          closeSheet();
          ntfEnable(() => { if (needLoc) useGPS(false); });
        };
        $('#wlLater').onclick = () => { P.markAsked(S); save(); closeSheet(); };
      });
    }, 900);
  }

  /* ---------- الموقع ---------- */
  // locState: 'ok' | 'denied' | 'off' | 'unknown'
  let locState = 'unknown', promptedThisSession = false, permStatus = null;
  function renderLoc() {
    $('#locName').textContent = S.loc.source === 'default' ? cityName(0) : locLabel();
    let mode = null;
    if (S.loc.source === 'default') mode = 'default';
    else if (S.loc.source === 'gps' && (locState === 'denied' || locState === 'off')) mode = 'off';
    const b = $('#locBanner');
    b.hidden = !mode;
    if (mode === 'default') { $('#locBannerTxt').textContent = L('bannerDefault'); $('#locBannerBtn').textContent = L('bannerDefaultBtn'); }
    if (mode === 'off') { $('#locBannerTxt').textContent = L('bannerOff', locLabel()); $('#locBannerBtn').textContent = L('bannerOffBtn'); }
  }
  function useGPS(silent) {
    if (!navigator.geolocation) { locState = 'off'; renderLoc(); if (!silent) toast(L('geoUnsupported')); return; }
    if (!silent) toast(L('locating'));
    promptedThisSession = true;
    navigator.geolocation.getCurrentPosition(p => {
      const lat = p.coords.latitude, lng = p.coords.longitude;
      S.loc = { lat, lng, city: nearestCity(lat, lng), tz: deviceTZ(), source: 'gps', at: Date.now() };
      locState = 'ok';
      save(); buildCompass(); renderAll();
      if (!silent) toast(L('located', cityName(S.loc.city)));
    }, err => {
      if (err.code === 1) locState = 'denied';
      else if (err.code === 2) locState = 'off';
      renderLoc();
      if (!silent) { if (err.code === 1 || err.code === 2) openGeoHelp(); else toast(L('geoFailed')); }
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  }
  function applyPerm(state) {
    if (S.loc.source === 'city') return;
    if (state === 'granted') {
      if (S.loc.source === 'default' || !S.loc.at || Date.now() - S.loc.at > 10 * 6e4) useGPS(true);
      else { locState = 'ok'; renderLoc(); }
    } else if (state === 'denied') { locState = 'denied'; renderLoc(); }
    else if (state === 'prompt' && S.loc.source === 'gps') {
      if (!promptedThisSession) useGPS(true); else { locState = 'off'; renderLoc(); }
    }
  }
  function checkLocation() {
    if (S.loc.source === 'city') { renderLoc(); return; }
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then(r => {
        if (!permStatus) { permStatus = r; r.onchange = () => applyPerm(r.state); }
        applyPerm(r.state);
      }).catch(() => { if (S.loc.source === 'gps' && !promptedThisSession) useGPS(true); });
    } else if (S.loc.source === 'gps' && !promptedThisSession) useGPS(true);
  }
  function openGeoHelp() {
    const steps = isIOS() ? L('geoIOS') : L('geoAndroid');
    sheet('<h2>' + L('geoHelpTitle') + '</h2><p>' + L('geoHelp') + '</p><ol class="steps">' + steps.map(x => '<li>' + x + '</li>').join('') + '</ol>' +
      '<button class="link-btn primary" id="geoRetry">' + L('tryAgain') + '</button><button class="link-btn" id="geoClose">' + L('close') + '</button>', () => {
      $('#geoRetry').onclick = () => { closeSheet(); useGPS(false); };
      $('#geoClose').onclick = closeSheet;
    });
  }
  function openLocation() {
    sheet('<h2>' + L('locTitle') + '</h2><p>' + L('locSub') + '</p>' +
      '<button class="link-btn primary" id="lGps">' + L('useGps') + '</button>' +
      '<div class="field"><input id="lLat" inputmode="decimal" aria-label="' + L('lat') + '" placeholder="' + L('lat') + '" value="' + S.loc.lat.toFixed(4) + '"><input id="lLng" inputmode="decimal" aria-label="' + L('lng') + '" placeholder="' + L('lng') + '" value="' + S.loc.lng.toFixed(4) + '"></div>' +
      '<button class="link-btn" id="lUse" style="margin-top:4px">' + L('useCoords') + '</button>' +
      '<h2 style="font-size:18px;margin-top:20px">' + L('cities') + '</h2><div class="city-list">' +
      CITIES.map((c, i) => '<button data-i="' + i + '">' + c[isEn() ? 1 : 0] + '<span>' + num(c[2].toFixed(2)) + D.comma + num(c[3].toFixed(2)) + '</span></button>').join('') + '</div>', () => {
      $('#lGps').onclick = () => { closeSheet(); useGPS(false); };
      $('#lUse').onclick = () => {
        const lat = parseFloat($('#lLat').value), lng = parseFloat($('#lLng').value);
        if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) { toast(L('badCoords')); return; }
        S.loc = { lat, lng, city: nearestCity(lat, lng), tz: deviceTZ(), source: 'city' }; save(); closeSheet(); buildCompass(); renderAll();
      };
      document.querySelectorAll('.city-list button').forEach(b => b.onclick = () => {
        const i = +b.dataset.i, c = CITIES[i];
        S.loc = { lat: c[2], lng: c[3], city: i, tz: c[4], source: 'city' }; save(); closeSheet(); buildCompass(); renderAll();
        toast(L('cityTz', c[isEn() ? 1 : 0]));
      });
    });
  }

  /* ---------- النوافذ ---------- */
  function sheet(html, after) {
    $('#sheet').innerHTML = '<div class="grip"></div>' + html;
    $('#sheetBg').classList.add('on');
    $('#sheet').scrollTop = 0;
    if (after) after();
  }
  function closeSheet() { $('#sheetBg').classList.remove('on'); }
  $('#sheetBg').addEventListener('click', e => { if (e.target.id === 'sheetBg') closeSheet(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

  /* ---------- التثبيت ---------- */
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const SHARE_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A9BD8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  const isMobile = () => isIOS() || /android|mobi/i.test(navigator.userAgent);
  const inAppBrowser = () => /Instagram|FBAN|FBAV|FB_IAB|Snapchat|TikTok|musical_ly|Twitter|LinkedInApp|Line\//i.test(navigator.userAgent);
  const iosChrome = () => /CriOS|FxiOS|EdgiOS/i.test(navigator.userAgent);
  const ua = navigator.userAgent;
  const deskChromium = () => !isMobile() && /Chrome|Chromium|Edg\//.test(ua) && !/OPR\/|Firefox/.test(ua);
  const deskSafari = () => !isMobile() && /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg\/|Firefox/.test(ua);
  const gateSupported = () => isMobile() || deskChromium() || deskSafari();
  const INSTALL_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A9BD8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 7.5v6M9.5 11l2.5 2.5 2.5-2.5"/></svg>';
  const DOTS_ICON = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="none" stroke="#5A9BD8" stroke-width="1.6"/><circle cx="7.5" cy="12" r="1.5" fill="#5A9BD8"/><circle cx="12" cy="12" r="1.5" fill="#5A9BD8"/><circle cx="16.5" cy="12" r="1.5" fill="#5A9BD8"/></svg>';
  const ADD_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A9BD8" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
  // شاشة الترحيب: تظهر كل مرة يُفتح فيها فَلَق من متصفح الجوال
  function renderGate() {
    const g = $('#gate'); if (!g || g.hidden) return;
    const ol = arr => '<ol class="steps">' + arr.map(x => '<li><span>' + x + '</span></li>').join('') + '</ol>';
    let steps = '', arrow = '';
    const btn = $('#gateInstall'), copy = $('#gateCopy');
    btn.hidden = true; copy.hidden = true;
    if (inAppBrowser()) { steps = ol(L('gateInApp')); copy.hidden = false; arrow = 'top'; }
    else if (isIOS() && iosChrome()) { steps = ol(L('gateIOSChrome', SHARE_ICON, ADD_ICON)); arrow = 'top'; }
    else if (isIOS()) { steps = ol(L('gateIOS', DOTS_ICON, SHARE_ICON, ADD_ICON)); arrow = 'bottom'; }
    else if (deskChromium()) { if (deferredPrompt) btn.hidden = false; steps = ol(L('gateDesk', INSTALL_ICON)); arrow = 'top'; }
    else if (deskSafari()) { steps = ol(L('gateMac')); }
    else if (deferredPrompt) { btn.hidden = false; }
    else { steps = ol(L('gateAndroid')); arrow = 'top'; }
    $('#gateSteps').innerHTML = steps;
    $('#gateSub').textContent = L(isMobile() ? 'gateSub' : 'gateSubDesk');
    const a = $('#gateArrow');
    a.className = 'gate-arrow ' + arrow; a.hidden = !arrow;
  }
  function openGate() {
    if (isStandalone()) { sheet('<h2>' + L('instTitle') + '</h2><p>' + L('instDone') + '</p><button class="link-btn" id="instLater">' + L('close') + '</button>', () => { $('#instLater').onclick = closeSheet; }); return; }
    closeSheet();
    $('#gate').hidden = false; document.body.classList.add('gated');
    renderGate();
  }
  function closeGate() {
    $('#gate').hidden = true; document.body.classList.remove('gated');
    try { sessionStorage.setItem('falaq-browse', '1'); } catch (e) {}
  }
  const openInstall = openGate;
  window.addEventListener('beforeinstallprompt', () => setTimeout(renderGate, 0));
  window.addEventListener('appinstalled', () => { $('#gate').hidden = true; document.body.classList.remove('gated'); });
  $('#gateSkip').onclick = closeGate;
  $('#gateInstall').onclick = () => { if (!deferredPrompt) return; deferredPrompt.prompt(); deferredPrompt.userChoice.finally(() => { deferredPrompt = null; renderGate(); }); };
  $('#gateCopy').onclick = () => {
    const url = location.href.split('#')[0];
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast(L('gateCopied'))).catch(() => toast(url));
  };

  /* ---------- التنقل ---------- */
  let current = 'prayer';
  function show(v) {
    current = v;
    document.querySelectorAll('.tabs button').forEach(b => { b.classList.toggle('on', b.dataset.v === v); b.setAttribute('aria-current', b.dataset.v === v ? 'page' : 'false'); });
    document.querySelectorAll('.view').forEach(s => s.classList.toggle('on', s.id === 'v-' + v));
    rafOn = v === 'qibla';
    if (v === 'qibla') { renderSunQibla(); updateSkyMarks(); requestAnimationFrame(loop); }
    if (v === 'moon') renderMoon();
    if (v === 'azkar') renderAzkar();
    if (v === 'settings') renderSettings();
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => show(b.dataset.v));

  function renderAll() {
    renderLoc(); setGlow(); renderPrayer(); renderSettings();
    if (current === 'moon') renderMoon();
    if (current === 'azkar') renderAzkar();
    if (current === 'qibla') { renderSunQibla(); updateSkyMarks(); renderCompass(); }
  }

  $('#dayPrev').onclick = () => { dayOffset--; renderPrayer(); };
  $('#dayNext').onclick = () => { dayOffset++; renderPrayer(); };
  $('#todayBtn').onclick = () => { dayOffset = 0; renderPrayer(); };
  $('#monthBtn').onclick = openMonth;
  $('#locBtn').onclick = openLocation;
  $('#locBannerBtn').onclick = () => useGPS(false);
  $('#setGps').onclick = () => useGPS(false);
  $('#setCity').onclick = openLocation;
  $('#setInstall').onclick = openInstall;
  $('#compassBtn').onclick = startCompass;
  $('#sunCalBtn').onclick = sunCalibrate;
  $('#setUpdate').onclick = () => {
    if (!('serviceWorker' in navigator)) { toast(L('upToDate')); return; }
    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg) { toast(L('upToDate')); return; }
      reg.update().then(() => {
        if (reg.installing || reg.waiting) toast(L('updating')); else toast(L('upToDate') + ' ' + num(VERSION));
      }).catch(() => toast(L('noNet')));
    });
  };

  // سحب للتنقل بين الأيام: في العربية السحب يميناً = اليوم التالي
  let tx = null;
  $('.dial-wrap').addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  $('.dial-wrap').addEventListener('touchend', e => {
    if (tx === null) return; const dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 50) { dayOffset += (dx > 0) === !isEn() ? 1 : -1; renderPrayer(); }
  });

  if (lightMQ) {
    const onScheme = () => { if (S.theme === 'auto') { applyTheme(); buildCompass(); renderAll(); } };
    if (lightMQ.addEventListener) lightMQ.addEventListener('change', onScheme); else if (lightMQ.addListener) lightMQ.addListener(onScheme);
  }

  /* ---------- الدورة الزمنية ---------- */
  let lastMinute = -1, lastDay = '';
  setInterval(() => {
    const now = new Date(), p = parts(now);
    if (current === 'prayer') renderCenter();
    if (p.mi !== lastMinute) {
      lastMinute = p.mi;
      const dk = p.y + '-' + p.m + '-' + p.d;
      setGlow();
      if (current === 'prayer') renderPrayer();
      if (current === 'qibla') updateSkyMarks();
      if (current === 'moon' && (p.mi % 5 === 0 || dk !== lastDay)) renderMoon();
      if (dk !== lastDay) { const first = !lastDay; lastDay = dk; if (current === 'qibla') renderSunQibla(); if (current === 'azkar' && !first) renderAzkar(); }
    }
  }, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { lastMinute = -1; renderAll(); checkLocation(); pushSync(); } });

  // رسالة بعد التحديث
  try {
    const prev = localStorage.getItem('falaq-ver');
    if (prev && prev !== VERSION) setTimeout(() => toast(L('updated', num(VERSION))), 600);
    localStorage.setItem('falaq-ver', VERSION);
  } catch (e) {}

  /* منع التكبير بالضغط المزدوج أو القرص */
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => document.addEventListener(ev, e => e.preventDefault(), { passive: false }));
  document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
  document.addEventListener('touchmove', e => { if (e.touches && e.touches.length > 1) e.preventDefault(); }, { passive: false });

  /* ---------- البداية ---------- */
  applyTheme();
  applyLang();
  buildCompass();
  renderAll();
  checkLocation();
  pushSync();
  maybeWelcome();
  let browsing = false; try { browsing = sessionStorage.getItem('falaq-browse') === '1'; } catch (e) {}
  if (!isStandalone() && gateSupported() && !browsing) openGate();

  if ('serviceWorker' in navigator) {
    const hadController = !!navigator.serviceWorker.controller;
    // التحديث التلقائي: يتحقق عند الفتح وكل 15 دقيقة، وبدون إنترنت يكمل على النسخة المحفوظة
    navigator.serviceWorker.register('sw.js').then(reg => {
      const check = () => { if (navigator.onLine !== false) reg.update().catch(() => {}); };
      setInterval(check, 15 * 6e4);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
      window.addEventListener('online', check);
    }).catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  }
})();
