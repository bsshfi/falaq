/* فَلَق | FALAQ — واجهة التطبيق */
(function () {
  'use strict';
  const VERSION = '1.0';
  const A = window.Astro;
  const $ = s => document.querySelector(s);
  const DAY = 864e5;

  /* ---------- الإعدادات ---------- */
  const DEFAULTS = {
    method: 'umm_alqura', asr: 1, h24: false, digits: 'latn',
    adjust: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    compassOffset: 0,
    loc: { lat: 24.7136, lng: 46.6753, name: 'الرياض', tz: 'Asia/Riyadh', source: 'default' },
    installSeen: false
  };
  let S;
  try { S = Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem('falaq') || '{}')); } catch (e) { S = Object.assign({}, DEFAULTS); }
  S.adjust = Object.assign({}, DEFAULTS.adjust, S.adjust || {});
  const save = () => { try { localStorage.setItem('falaq', JSON.stringify(S)); } catch (e) {} };

  const deviceTZ = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } };
  const TZ = () => (S.loc.source === 'city' && S.loc.tz) ? S.loc.tz : deviceTZ();

  /* ---------- المدن ---------- */
  const CITIES = [
    ['الرياض', 24.7136, 46.6753, 'Asia/Riyadh'], ['مكة المكرمة', 21.4225, 39.8262, 'Asia/Riyadh'], ['المدينة المنورة', 24.4672, 39.6111, 'Asia/Riyadh'],
    ['جدة', 21.4858, 39.1925, 'Asia/Riyadh'], ['الدمام', 26.4207, 50.0888, 'Asia/Riyadh'], ['الخبر', 26.2172, 50.1971, 'Asia/Riyadh'],
    ['الأحساء', 25.3833, 49.5864, 'Asia/Riyadh'], ['الطائف', 21.2703, 40.4158, 'Asia/Riyadh'], ['بريدة', 26.3592, 43.9818, 'Asia/Riyadh'],
    ['عنيزة', 26.0840, 43.9940, 'Asia/Riyadh'], ['حائل', 27.5114, 41.7208, 'Asia/Riyadh'], ['تبوك', 28.3835, 36.5662, 'Asia/Riyadh'],
    ['أبها', 18.2164, 42.5053, 'Asia/Riyadh'], ['خميس مشيط', 18.3000, 42.7333, 'Asia/Riyadh'], ['جازان', 16.8892, 42.5511, 'Asia/Riyadh'],
    ['نجران', 17.5650, 44.2289, 'Asia/Riyadh'], ['الباحة', 20.0129, 41.4677, 'Asia/Riyadh'], ['سكاكا', 29.9697, 40.2064, 'Asia/Riyadh'],
    ['عرعر', 30.9753, 41.0381, 'Asia/Riyadh'], ['حفر الباطن', 28.4328, 45.9708, 'Asia/Riyadh'], ['ينبع', 24.0895, 38.0618, 'Asia/Riyadh'],
    ['الجبيل', 27.0174, 49.6225, 'Asia/Riyadh'], ['الخرج', 24.1556, 47.3120, 'Asia/Riyadh'], ['المجمعة', 25.9039, 45.3456, 'Asia/Riyadh'],
    ['الكويت', 29.3759, 47.9774, 'Asia/Kuwait'], ['المنامة', 26.2285, 50.5860, 'Asia/Bahrain'], ['الدوحة', 25.2854, 51.5310, 'Asia/Qatar'],
    ['أبوظبي', 24.4539, 54.3773, 'Asia/Dubai'], ['دبي', 25.2048, 55.2708, 'Asia/Dubai'], ['مسقط', 23.5880, 58.3829, 'Asia/Muscat'],
    ['عمّان', 31.9454, 35.9284, 'Asia/Amman'], ['القاهرة', 30.0444, 31.2357, 'Africa/Cairo'], ['إسطنبول', 41.0082, 28.9784, 'Europe/Istanbul'],
    ['طرابزون', 41.0027, 39.7168, 'Europe/Istanbul'], ['أوزنجول', 40.6181, 40.2867, 'Europe/Istanbul'], ['لندن', 51.5072, -0.1276, 'Europe/London'],
    ['باريس', 48.8566, 2.3522, 'Europe/Paris'], ['كوالالمبور', 3.1390, 101.6869, 'Asia/Kuala_Lumpur'], ['جاكرتا', -6.2088, 106.8456, 'Asia/Jakarta'],
    ['نيويورك', 40.7128, -74.0060, 'America/New_York']
  ];
  function nearestName(lat, lng) {
    let best = null;
    CITIES.forEach(c => { const d = A.distanceKm(lat, lng, c[1], c[2]); if (!best || d < best.d) best = { d, n: c[0] }; });
    return best && best.d < 35 ? best.n : null;
  }

  /* ---------- التنسيق ---------- */
  const AR_DIG = '٠١٢٣٤٥٦٧٨٩';
  const num = x => S.digits === 'arab' ? String(x).replace(/[0-9]/g, d => AR_DIG[d]) : String(x);
  const pad = n => String(n).padStart(2, '0');
  const G_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const WD = { Sun: 'الأحد', Mon: 'الإثنين', Tue: 'الثلاثاء', Wed: 'الأربعاء', Thu: 'الخميس', Fri: 'الجمعة', Sat: 'السبت' };
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
    return num(h + ':' + pad(p.mi)) + (opt.short ? '' : ' ' + (p.h < 12 ? 'ص' : 'م'));
  }
  function fmtDate(date, opt) {
    opt = opt || {};
    const p = parts(date, opt.tz);
    return (opt.wd === false ? '' : WD[p.wd] + ' ') + num(p.d) + ' ' + G_MONTHS[p.m - 1] + (opt.year ? ' ' + num(p.y) : '');
  }
  const ymdAdd = (o, n) => { const t = new Date(Date.UTC(o.y, o.m - 1, o.d + n)); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; };
  const hijriOf = ymd => A.hijri(new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d, 12)), 'UTC');
  const hijriStr = h => h ? num(h.day) + ' ' + A.HIJRI_MONTHS[h.month - 1] + ' ' + num(h.year) + 'هـ' : '';
  const wdOf = ymd => WD[['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d)).getUTCDay()]];
  const gregStr = ymd => wdOf(ymd) + ' ' + num(ymd.d) + ' ' + G_MONTHS[ymd.m - 1] + ' ' + num(ymd.y);
  function countdown(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return num((h ? h + ':' + pad(m) : m) + ':' + pad(x));
  }
  function durTxt(ms) {
    const mins = Math.round(ms / 6e4), d = Math.floor(mins / 1440), h = Math.floor(mins % 1440 / 60), m = mins % 60;
    const out = [];
    if (d) out.push(num(d) + (d === 1 ? ' يوم' : d === 2 ? ' يومين' : d <= 10 ? ' أيام' : ' يوماً'));
    if (h) out.push(num(h) + (h === 1 ? ' ساعة' : h === 2 ? ' ساعتين' : h <= 10 ? ' ساعات' : ' ساعة'));
    if (!d && m) out.push(minTxt(m));
    return out.join(' و') || 'أقل من دقيقة';
  }
  const minTxt = m => num(m) + (m === 1 ? ' دقيقة' : m === 2 ? ' دقيقتين' : m <= 10 ? ' دقائق' : ' دقيقة');
  const deg = x => num(Math.round(x)) + '°';
  const DIRS = ['الشمال', 'الشمال الشرقي', 'الشرق', 'الجنوب الشرقي', 'الجنوب', 'الجنوب الغربي', 'الغرب', 'الشمال الغربي'];
  const dirOf = b => DIRS[Math.round(b / 45) % 8];
  const norm180 = a => ((a % 360) + 540) % 360 - 180;

  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }

  /* ---------- حساب اليوم ---------- */
  const NAMES = { fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' };
  const KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  function timesFor(ymd) {
    const h = hijriOf(ymd);
    return A.prayerTimes(ymd.y, ymd.m, ymd.d, S.loc.lat, S.loc.lng, { method: S.method, asr: S.asr, adjust: S.adjust, ramadan: h && h.month === 9 });
  }
  const todayYMD = () => { const p = parts(new Date()); return { y: p.y, m: p.m, d: p.d }; };
  function nextEvent(now) {
    const t0 = todayYMD();
    for (const off of [0, 1]) {
      const ymd = ymdAdd(t0, off), T = timesFor(ymd);
      for (const k of KEYS) if (T[k] && T[k] > now) return { key: k, time: T[k], ymd, prevTimes: off ? null : T };
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
    const h = hijriOf(ymd);
    const isFri = wdOf(ymd) === 'الجمعة';

    $('#hijriDate').textContent = hijriStr(h);
    $('#gregDate').textContent = gregStr(ymd);
    $('#todayBtn').classList.toggle('show', !isToday);

    // القائمة
    const nxt = nextEvent(now);
    const list = $('#timesList'); list.innerHTML = '';
    KEYS.forEach(k => {
      const li = document.createElement('li');
      const name = k === 'dhuhr' && isFri ? 'الجمعة' : NAMES[k];
      li.innerHTML = '<span class="n">' + name + '</span><span class="v">' + fmtTime(T[k]) + '</span>';
      if (isToday) { if (nxt && nxt.key === k && nxt.ymd.d === ymd.d) li.className = 'next'; else if (T[k] && T[k] < now) li.className = 'past'; }
      list.appendChild(li);
    });
    const night = Tn.fajr - T.maghrib;
    [['منتصف الليل', new Date(T.maghrib.valueOf() + night / 2)], ['بداية الثلث الأخير', new Date(T.maghrib.valueOf() + night * 2 / 3)]].forEach(([n, v], i) => {
      const li = document.createElement('li'); li.className = 'minor';
      if (i === 0) { const s = document.createElement('li'); s.className = 'sep'; s.style.borderBottom = '0'; list.appendChild(s); }
      li.innerHTML = '<span class="n">' + n + '</span><span class="v">' + fmtTime(v) + '</span>';
      list.appendChild(li);
    });

    drawDial(T, ymd, isToday, now);
    renderCenter();
  }

  function drawDial(T, ymd, isToday, now) {
    const svg = $('#dial'); svg.innerHTML = '';
    const noon = T.solarNoon.valueOf(), R = 116;
    const ang = t => (t - noon) / DAY * 360;
    // حلقة السماء
    const N = 144;
    for (let i = 0; i < N; i++) {
      const t0 = noon - DAY / 2 + i * DAY / N, t1 = t0 + DAY / N;
      const alt = A.sunPos(new Date((t0 + t1) / 2), S.loc.lat, S.loc.lng).altitude;
      const a0 = ang(t0) - 0.3, a1 = ang(t1) + 0.3;
      const [x0, y0] = polar(a0, R), [x1, y1] = polar(a1, R);
      el('path', { d: `M${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1}`, stroke: skyColor(alt), 'stroke-width': 18, fill: 'none' }, svg);
    }
    // الأفق
    if (T.sunrise && T.maghrib) {
      const [ax, ay] = polar(ang(T.sunrise.valueOf()), R - 13), [bx, by] = polar(ang(T.maghrib.valueOf()), R - 13);
      el('line', { x1: ax, y1: ay, x2: bx, y2: by, stroke: 'rgba(233,228,216,.22)', 'stroke-width': 1, 'stroke-dasharray': '2 5' }, svg);
    }
    // ساعات
    for (let hr = 0; hr < 24; hr++) {
      const mid = localMidnightGuess(ymd) + hr * 36e5;
      const a = ang(mid);
      const [x0, y0] = polar(a, R + 11), [x1, y1] = polar(a, R + (hr % 6 === 0 ? 16 : 13));
      el('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: hr % 6 === 0 ? 'rgba(233,228,216,.45)' : 'rgba(233,228,216,.18)', 'stroke-width': 1 }, svg);
    }
    // مواقيت
    const labels = [];
    KEYS.forEach(k => {
      if (!T[k]) return;
      const a = ang(T[k].valueOf());
      const [x0, y0] = polar(a, R - 9), [x1, y1] = polar(a, R + 9);
      el('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: '#0F1830', 'stroke-width': 3 }, svg);
      el('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: 'rgba(237,231,218,.9)', 'stroke-width': 1.2 }, svg);
      labels.push({ a, k });
    });
    labels.forEach(({ a, k }) => {
      const [x, y] = polar(a, R + 31);
      const t = el('text', { x, y: y + 4, 'text-anchor': 'middle', fill: 'rgba(237,231,218,.75)', 'font-size': 11.5, 'font-family': 'Readex Pro, system-ui' }, svg);
      t.textContent = NAMES[k];
    });
    // اللحظة الحالية
    if (isToday) {
      const a = ang(now.valueOf());
      const alt = A.sunPos(now, S.loc.lat, S.loc.lng).altitude;
      const [x, y] = polar(a, R);
      if (alt > -0.83) {
        el('circle', { cx: x, cy: y, r: 17, fill: 'rgba(240,194,106,.18)' }, svg);
        el('circle', { cx: x, cy: y, r: 9.5, fill: '#F6D48A', stroke: '#0F1830', 'stroke-width': 2.5 }, svg);
      } else {
        el('circle', { cx: x, cy: y, r: 9, fill: '#E9E4D8', stroke: '#0F1830', 'stroke-width': 2.5 }, svg);
        el('circle', { cx: x + 4, cy: y - 3, r: 7, fill: skyColor(alt) }, svg);
      }
    }
  }
  function localMidnightGuess(ymd) { const t = Date.UTC(ymd.y, ymd.m - 1, ymd.d); return t - tzOffsetMin(new Date(t + 12 * 36e5), TZ()) * 6e4; }

  function renderCenter() {
    const c = $('#dialCenter');
    if (dayOffset !== 0) {
      const ymd = ymdAdd(todayYMD(), dayOffset);
      c.innerHTML = '<div class="name">' + wdOf(ymd) + '</div><div class="k">' + (dayOffset > 0 ? 'بعد ' + durTxt(dayOffset * DAY) : 'قبل ' + durTxt(-dayOffset * DAY)) + '</div>';
      return;
    }
    const now = new Date(), n = nextEvent(now);
    if (!n) { c.innerHTML = ''; return; }
    const ymd = todayYMD();
    const name = n.key === 'dhuhr' && wdOf(n.ymd) === 'الجمعة' ? 'الجمعة' : NAMES[n.key];
    c.innerHTML = '<div class="name">' + name + '</div><div class="t">' + fmtTime(n.time) + (n.ymd.d !== ymd.d ? ' غداً' : '') + '</div><div class="cd">' + countdown(n.time - now) + '</div>';
  }

  function openMonth() {
    const base = ymdAdd(todayYMD(), dayOffset);
    const days = new Date(Date.UTC(base.y, base.m, 0)).getUTCDate();
    const today = todayYMD();
    let rows = '';
    for (let d = 1; d <= days; d++) {
      const ymd = { y: base.y, m: base.m, d }, T = timesFor(ymd), h = hijriOf(ymd);
      const cls = (ymd.y === today.y && ymd.m === today.m && d === today.d) ? ' class="today"' : '';
      rows += '<tr' + cls + '><td class="d">' + wdOf(ymd).replace('ال', '').slice(0, 3) + ' ' + num(d) + '</td><td>' + (h ? num(h.day) : '') + '</td>' +
        KEYS.map(k => '<td>' + fmtTime(T[k], { short: true }) + '</td>').join('') + '</tr>';
    }
    sheet('<h2>' + G_MONTHS[base.m - 1] + ' ' + num(base.y) + '</h2><p>' + esc(S.loc.name || '') + ' — ' + A.METHODS[S.method].name + '</p>' +
      '<table class="month" style="direction:rtl"><thead><tr><th>اليوم</th><th>هـ</th><th>الفجر</th><th>الشروق</th><th>الظهر</th><th>العصر</th><th>المغرب</th><th>العشاء</th></tr></thead><tbody>' + rows + '</tbody></table>', () => {
      const r = $('#sheet .today'); if (r) r.scrollIntoView({ block: 'center' });
    });
  }

  /* ---------- القبلة ---------- */
  let heading = null, compassOn = false, wasAligned = false, gotAbsolute = false;
  function qiblaInfo() { return A.qibla(S.loc.lat, S.loc.lng); }
  function buildCompass() {
    const svg = $('#compass'); svg.innerHTML = '';
    el('circle', { r: 160, fill: 'none', stroke: 'rgba(240,194,106,0)', 'stroke-width': 3, id: 'cAlign' }, svg);
    const rose = el('g', { id: 'rose' }, svg);
    el('circle', { r: 150, fill: '#16213F', stroke: 'rgba(190,205,255,.14)', 'stroke-width': 1 }, rose);
    for (let a = 0; a < 360; a += 5) {
      const long = a % 30 === 0;
      const [x0, y0] = polar(a, 150 - (long ? 14 : 7)), [x1, y1] = polar(a, 148);
      el('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: long ? 'rgba(237,231,218,.6)' : 'rgba(237,231,218,.2)', 'stroke-width': long ? 1.4 : 1 }, rose);
    }
    [['ش', 0], ['ق', 90], ['ج', 180], ['غ', 270]].forEach(([t, a]) => {
      const [x, y] = polar(a, 117);
      const tx = el('text', { x, y: y + 7, 'text-anchor': 'middle', fill: a === 0 ? '#E59C93' : 'rgba(237,231,218,.8)', 'font-size': 20, 'font-family': 'Reem Kufi, system-ui', 'font-weight': 600, class: 'upright' }, rose);
      tx.textContent = t;
    });
    const q = qiblaInfo().bearing;
    const [qx, qy] = polar(q, 128);
    el('line', { x1: 0, y1: 0, x2: qx, y2: qy, stroke: '#F0C26A', 'stroke-width': 2.5, 'stroke-linecap': 'round' }, rose);
    const kg = el('g', { class: 'upright', 'data-x': qx, 'data-y': qy }, rose);
    el('rect', { x: qx - 13, y: qy - 13, width: 26, height: 26, rx: 3, fill: '#0F1830', stroke: '#F0C26A', 'stroke-width': 2 }, kg);
    el('rect', { x: qx - 13, y: qy - 6, width: 26, height: 4, fill: '#F0C26A' }, kg);
    el('circle', { r: 5, fill: '#F0C26A' }, rose);
    el('g', { id: 'skyMarks' }, rose);
    // مؤشر الجوال
    el('path', { d: 'M0 -168 L-9 -152 L9 -152 Z', fill: '#EDE7DA' }, svg);
    updateSkyMarks();
  }
  function updateSkyMarks() {
    const g = $('#skyMarks'); if (!g) return;
    g.innerHTML = '';
    const now = new Date();
    const s = A.sunPos(now, S.loc.lat, S.loc.lng), m = A.moonPos(now, S.loc.lat, S.loc.lng);
    if (s.altitude > -0.5) {
      const [x, y] = polar(s.azimuth, 92);
      el('circle', { cx: x, cy: y, r: 12, fill: 'rgba(240,194,106,.2)' }, g);
      el('circle', { cx: x, cy: y, r: 7, fill: '#F6D48A' }, g);
    }
    if (m.altitude > 0) {
      const [x, y] = polar(m.azimuth, 92);
      el('circle', { cx: x, cy: y, r: 6.5, fill: '#E9E4D8', opacity: .9 }, g);
    }
    $('#sunCalBtn').hidden = !(compassOn && s.altitude > 3 && s.altitude < 70);
  }
  function renderCompass() {
    const q = qiblaInfo();
    const rose = $('#rose'); if (!rose) return;
    const hd = heading === null ? 0 : ((heading + S.compassOffset) % 360 + 360) % 360;
    rose.setAttribute('transform', 'rotate(' + (-hd) + ')');
    rose.querySelectorAll('.upright').forEach(n => {
      const x = n.getAttribute('x') !== null ? +n.getAttribute('x') : +n.dataset.x;
      const y = n.getAttribute('x') !== null ? +n.getAttribute('y') - 7 : +n.dataset.y;
      n.setAttribute('transform', 'rotate(' + hd + ' ' + x + ' ' + y + ')');
    });
    $('#qBearing').textContent = deg(q.bearing);
    $('#qDist').textContent = num(Math.round(q.distance).toLocaleString('en-US')) + ' كم';
    $('#qHeading').textContent = heading === null ? '—' : deg(hd);
    const st = $('#qStatus');
    if (heading === null) {
      st.className = 'q-status';
      st.innerHTML = '<div class="big">القبلة باتجاه ' + dirOf(q.bearing) + '</div><div class="small">' + deg(q.bearing) + ' من الشمال الحقيقي</div>';
      return;
    }
    const diff = norm180(q.bearing - hd);
    const aligned = Math.abs(diff) <= 3;
    st.className = 'q-status' + (aligned ? ' aligned' : '');
    st.innerHTML = aligned ? '<div class="big">أنت باتجاه القبلة</div><div class="small">ثبّت الجوال على هذا الاتجاه</div>'
      : '<div class="big">استدر ' + (diff > 0 ? 'يميناً' : 'يساراً') + ' ' + deg(Math.abs(diff)) + '</div><div class="small">حتى يصل المؤشر إلى الكعبة</div>';
    $('#cAlign').setAttribute('stroke', aligned ? 'rgba(240,194,106,.9)' : 'rgba(240,194,106,0)');
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
  }
  let rafOn = false;
  function loop() { if (!rafOn) return; renderCompass(); requestAnimationFrame(loop); }
  function startCompass() {
    const go = () => {
      window.addEventListener('deviceorientationabsolute', onOrient, true);
      window.addEventListener('deviceorientation', onOrient, true);
      compassOn = true;
      $('#compassBtn').hidden = true;
      updateSkyMarks();
      setTimeout(() => { if (heading === null) toast('لم تصل قراءة البوصلة. جرّب من الجوال وليس الكمبيوتر.'); }, 2500);
    };
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then(r => r === 'granted' ? go() : toast('يلزم السماح بالوصول إلى الحركة والاتجاه')).catch(() => toast('تعذر تشغيل البوصلة'));
    } else if ('DeviceOrientationEvent' in window) go();
    else toast('هذا الجهاز لا يدعم البوصلة');
  }
  function renderSunQibla() {
    const q = qiblaInfo(), ymd = todayYMD(), T = timesFor(ymd);
    const r = A.sunQiblaTimes(T.sunrise, T.maghrib, S.loc.lat, S.loc.lng, q.bearing);
    const tr = A.kaabaTransits(new Date());
    let html = '';
    html += '<div><dt>الشمس في اتجاه القبلة اليوم</dt><dd>' + (r.toward ? fmtTime(r.toward) : 'لا يحدث اليوم') + '</dd></div>';
    html += '<div><dt>ظل الأشياء يشير إلى القبلة</dt><dd>' + (r.shadow ? fmtTime(r.shadow) : 'لا يحدث اليوم') + '</dd></div>';
    tr.forEach((d, i) => {
      html += '<div><dt>' + (i === 0 ? 'تعامد الشمس على الكعبة' : 'التعامد التالي') + '</dt><dd>' + fmtDate(d, { tz: 'Asia/Riyadh', wd: false, year: true }) + '، ' + fmtTime(d, { tz: 'Asia/Riyadh' }) + ' بتوقيت مكة</dd></div>';
    });
    $('#sunQibla').innerHTML = html;
    const note = $('#sunQiblaNote') || (() => { const p = document.createElement('p'); p.className = 'note'; p.id = 'sunQiblaNote'; $('#sunQibla').after(p); return p; })();
    note.textContent = 'في وقت التعامد تكون الشمس فوق الكعبة تماماً، فمن يرى الشمس في أي مكان يستقبلها فهو مستقبل القبلة.';
  }
  function sunCalibrate() {
    sheet('<h2>اضبط البوصلة بالشمس</h2><p>وجّه أعلى الجوال نحو الشمس وأنت تمسكه مستوياً، بدون أن تنظر إليها مباشرة. حين يشير ظلّ الجوال إلى جسمك تماماً اضغط «اضبط».</p>' +
      '<button class="link-btn primary" id="calNow">اضبط</button><button class="link-btn" id="calReset">إلغاء التصحيح (' + deg(S.compassOffset) + ')</button>', () => {
      $('#calNow').onclick = () => {
        if (heading === null) { toast('شغّل البوصلة أولاً'); return; }
        const s = A.sunPos(new Date(), S.loc.lat, S.loc.lng);
        S.compassOffset = Math.round(norm180(s.azimuth - heading));
        save(); closeSheet(); renderSettings(); toast('تم الضبط: ' + deg(S.compassOffset));
      };
      $('#calReset').onclick = () => { S.compassOffset = 0; save(); closeSheet(); renderSettings(); toast('أُلغي التصحيح'); };
    });
  }

  /* ---------- القمر ---------- */
  const MARIA = [[-0.32, -0.38, 0.27, 0.22], [0.05, -0.32, 0.16, 0.15], [0.28, -0.08, 0.2, 0.17], [0.58, -0.25, 0.12, 0.11], [0.5, 0.18, 0.13, 0.16], [-0.12, 0.36, 0.2, 0.13],
    [-0.5, 0.05, 0.25, 0.38], [0.1, 0.12, 0.12, 0.09], [-0.15, 0.62, 0.05, 0.05]];
  function drawMoon(fraction, rot) {
    const cv = $('#moonCanvas'), ctx = cv.getContext('2d'), size = cv.width, r = size / 2 - 22;
    ctx.clearRect(0, 0, size, size);
    ctx.save(); ctx.translate(size / 2, size / 2);
    // هالة
    const halo = ctx.createRadialGradient(0, 0, r * 0.9, 0, 0, r * 1.18);
    halo.addColorStop(0, 'rgba(233,228,216,' + (0.16 * fraction) + ')'); halo.addColorStop(1, 'rgba(233,228,216,0)');
    ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, r * 1.18, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(rot);
    // القرص
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.closePath(); ctx.save(); ctx.clip();
    const g = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#F5F0E4'); g.addColorStop(0.7, '#DCD5C6'); g.addColorStop(1, '#B9B2A4');
    ctx.fillStyle = g; ctx.fillRect(-r, -r, 2 * r, 2 * r);
    ctx.rotate(-rot); // البحار ثابتة على وجه القمر
    MARIA.forEach(([x, y, rx, ry]) => {
      const mg = ctx.createRadialGradient(x * r, y * r, 0, x * r, y * r, Math.max(rx, ry) * r);
      mg.addColorStop(0, 'rgba(140,136,128,.34)'); mg.addColorStop(0.65, 'rgba(140,136,128,.2)'); mg.addColorStop(1, 'rgba(128,124,116,0)');
      ctx.fillStyle = mg; ctx.beginPath(); ctx.ellipse(x * r, y * r, rx * r, ry * r, 0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.rotate(rot);
    // الظل
    const k = fraction, rx = Math.abs(2 * k - 1) * r;
    ctx.beginPath();
    ctx.arc(0, 0, r + 2, Math.PI / 2, Math.PI * 1.5);
    ctx.ellipse(0, 0, Math.max(rx, 0.01), r + 2, 0, -Math.PI / 2, Math.PI / 2, k > 0.5);
    ctx.closePath();
    ctx.fillStyle = 'rgba(14,22,44,.9)'; ctx.fill();
    ctx.restore();
    ctx.restore();
  }
  function phaseName(il) {
    const e = il.elongation;
    if (il.fraction < 0.015) return 'محاق';
    if (e < 83) return 'هلال متزايد';
    if (e < 97) return 'تربيع أول';
    if (e < 172) return 'أحدب متزايد';
    if (e < 188) return 'بدر';
    if (e < 263) return 'أحدب متناقص';
    if (e < 277) return 'تربيع ثانٍ';
    return 'هلال متناقص';
  }
  function phaseIcon(type) {
    const s = '<svg viewBox="-12 -12 24 24"><circle r="10" fill="#26335C" stroke="rgba(237,231,218,.35)"/>';
    if (type === 0) return s + '</svg>';
    if (type === 2) return s + '<circle r="10" fill="#E9E4D8"/></svg>';
    if (type === 1) return s + '<path d="M0 -10 A10 10 0 0 1 0 10 Z" fill="#E9E4D8"/></svg>';
    return s + '<path d="M0 -10 A10 10 0 0 0 0 10 Z" fill="#E9E4D8"/></svg>';
  }
  function renderMoon() {
    const now = new Date(), lat = S.loc.lat, lng = S.loc.lng;
    const il = A.moonIllumination(now), mp = A.moonPos(now, lat, lng), ph = A.moonPhases(now);
    const up = mp.altitude > 0;
    const rot = up ? -(il.brightLimbAngle - mp.parallacticAngle) - Math.PI / 2 : (il.waxing ? 0 : Math.PI);
    drawMoon(il.fraction, rot);
    $('#moonCap').textContent = up ? 'كما يبدو الآن من موقعك' : 'القمر تحت الأفق الآن';
    $('#moonPhase').textContent = phaseName(il);
    const t = todayYMD(), h = hijriOf(t);
    $('#moonSub').textContent = h ? 'ليلة ' + num(h.day) + ' من ' + A.HIJRI_MONTHS[h.month - 1] : '';

    const mid = new Date(localMidnightGuess(t));
    const mt = A.moonTimes(mid, lat, lng);
    const age = ph.lastNew ? now - ph.lastNew : null;
    const rows = [
      ['الإضاءة', num(Math.round(il.fraction * 100)) + '٪'],
      ['عمر القمر', age !== null ? durTxt(age) : '—'],
      ['شروق القمر اليوم', mt.rise ? fmtTime(mt.rise) : (mt.alwaysUp ? 'فوق الأفق طوال اليوم' : 'لا يشرق اليوم')],
      ['غروب القمر اليوم', mt.set ? fmtTime(mt.set) : (mt.alwaysDown ? 'تحت الأفق طوال اليوم' : 'لا يغرب اليوم')],
      ['ارتفاعه الآن', up ? deg(mp.altitude) + ' باتجاه ' + dirOf(mp.azimuth) : 'تحت الأفق'],
      ['البعد عن الأرض', num(Math.round(mp.distance).toLocaleString('en-US')) + ' كم']
    ];
    $('#moonRows').innerHTML = rows.map(([a, b]) => '<div><dt>' + a + '</dt><dd>' + b + '</dd></div>').join('');

    const ps = [[0, ph.nextNew, 'محاق'], [1, ph.nextFirst, 'تربيع أول'], [2, ph.nextFull, 'بدر'], [3, ph.nextLast, 'تربيع ثانٍ']].filter(x => x[1]).sort((a, b) => a[1] - b[1]);
    $('#phases').innerHTML = ps.map(([ty, d, n]) => '<div>' + phaseIcon(ty) + '<b>' + n + '</b><span>' + fmtDate(d, { wd: false }) + '</span><span>' + fmtTime(d) + '</span></div>').join('');

    // المنازل
    const mm = A.moonMansion(now);
    const svg = $('#mansionRing'); svg.innerHTML = '';
    const Rr = 52, segA = 360 / 28;
    const lonA = lon => ((lon - mm.startLon) % 360 + 360) % 360;
    const arc = (i, color, w) => {
      const [x0, y0] = polar(i * segA + 1, Rr), [x1, y1] = polar((i + 1) * segA - 1, Rr);
      el('path', { d: `M${x0} ${y0} A${Rr} ${Rr} 0 0 1 ${x1} ${y1}`, stroke: color, 'stroke-width': w, fill: 'none', 'stroke-linecap': 'round' }, svg);
    };
    for (let i = 0; i < 28; i++) arc(i, 'rgba(190,205,255,.16)', 6);
    arc(mm.sun, 'rgba(240,194,106,.55)', 6);
    arc(mm.moon, 'rgba(233,228,216,.75)', 6);
    const [sx, sy] = polar(lonA(mm.sunLon), Rr), [mx, my] = polar(lonA(mm.moonLon), Rr);
    el('line', { x1: sx * 0.62, y1: sy * 0.62, x2: mx * 0.62, y2: my * 0.62, stroke: 'rgba(237,231,218,.15)', 'stroke-width': 1 }, svg);
    el('circle', { cx: sx, cy: sy, r: 7, fill: '#F6D48A', stroke: '#16213F', 'stroke-width': 2 }, svg);
    el('circle', { cx: mx, cy: my, r: 6, fill: '#E9E4D8', stroke: '#16213F', 'stroke-width': 2 }, svg);
    el('circle', { r: 3, fill: 'rgba(156,195,230,.7)' }, svg);
    $('#mansionTxt').innerHTML = '<div class="lbl">القمر الليلة في منزلة</div><div class="m">' + A.MANSIONS[mm.moon] + '</div><div class="s">المنزلة ' + num(mm.moon + 1) + ' من ' + num(28) + '، والشمس في ' + A.MANSIONS[mm.sun] + '</div>';

    renderHilal(ph, h);
    renderWhite(h);
    renderStar();
  }

  function renderHilal(ph, h) {
    const conj = ph.nextNew, lat = S.loc.lat, lng = S.loc.lng;
    if (!conj) return;
    const nextMonth = h ? A.HIJRI_MONTHS[h.month % 12] : '';
    const p = parts(conj);
    let ymd = { y: p.y, m: p.m, d: p.d };
    let T = timesFor(ymd);
    if (T.sunsetExact < conj) { ymd = ymdAdd(ymd, 1); T = timesFor(ymd); }
    const evenings = [ymd, ymdAdd(ymd, 1)].map(e => {
      const Te = timesFor(e), ss = Te.sunsetExact;
      const mt = A.moonTimes(new Date(ss.valueOf() - 6 * 36e5), lat, lng);
      const set = mt.set && mt.set > new Date(ss.valueOf() - 6 * 36e5) ? mt.set : null;
      const lag = set ? Math.round((set - ss) / 6e4) : null;
      const age = (ss - conj) / 36e5;
      let txt;
      if (lag === null) txt = '—';
      else if (lag <= 0) txt = 'يغرب القمر قبل الشمس بـ ' + minTxt(-lag);
      else txt = 'يمكث بعد الغروب ' + minTxt(lag) + '، وعمره ' + num(Math.max(0, Math.round(age))) + ' ساعة';
      return '<div><dt>مساء ' + wdOf(e) + ' ' + num(e.d) + ' ' + G_MONTHS[e.m - 1] + '</dt><dd>' + txt + '</dd></div>';
    }).join('');
    $('#hilalBlock').innerHTML = '<h2 style="font-family:var(--display);font-size:20px;font-weight:600;margin:0 0 2px">هلال ' + nextMonth + '</h2>' +
      '<p class="note" style="margin:0 0 6px">الاقتران ' + fmtDate(conj) + ' الساعة ' + fmtTime(conj) + '</p><dl class="rows">' + evenings + '</dl>' +
      '<p class="note" style="margin-bottom:10px">كلما طال مكث القمر بعد الغروب وزاد عمره، سهلت رؤية الهلال.</p>';
  }

  function renderWhite(h) {
    const b = $('#whiteBlock');
    if (!h) { b.hidden = true; return; }
    const t0 = todayYMD();
    let txt;
    if (h.day >= 13 && h.day <= 15) txt = 'اليوم ' + num(h.day) + ' ' + A.HIJRI_MONTHS[h.month - 1] + ' من الأيام البيض' + (h.day === 13 ? '، وتنتهي بعد يومين' : h.day === 14 ? '، وتنتهي غداً' : '، وهو آخرها');
    else {
      let start = null;
      for (let i = 1; i < 45; i++) { const y = ymdAdd(t0, i), hh = hijriOf(y); if (hh && hh.day === 13) { start = y; break; } }
      txt = start ? 'تبدأ الأيام البيض ' + wdOf(start) + ' ' + num(start.d) + ' ' + G_MONTHS[start.m - 1] + '، بعد ' + durTxt((Date.UTC(start.y, start.m - 1, start.d) - Date.UTC(t0.y, t0.m - 1, t0.d))) : '';
    }
    b.innerHTML = '<h2 style="font-family:var(--display);font-size:20px;font-weight:600;margin:0 0 2px">الأيام البيض</h2><p class="note" style="margin:0">' + txt + '</p>';
  }

  function renderStar() {
    const t = todayYMD(), s = A.najdiStar(t.y, t.m, t.d), b = $('#starBlock');
    if (!s) { b.hidden = true; return; }
    const pct = n => Math.min(100, Math.round(n * 100));
    b.innerHTML = '<p class="note" style="margin:0">الطالع حسب حساب النجوم</p>' +
      '<div class="star-name">' + s.star + '</div>' +
      '<div class="bar"><i style="width:' + pct(s.day / s.len) + '%"></i></div>' +
      '<div class="bar-meta"><span>اليوم ' + num(s.day) + ' من ' + num(s.len) + '</span><span>يليه ' + s.next + ' ' + fmtDate(s.nextStart, { tz: 'UTC', wd: false }) + '</span></div>' +
      '<dl class="rows" style="margin-top:10px"><div><dt>الموسم</dt><dd>' + s.season + '، اليوم ' + num(s.seasonDay) + ' من ' + num(s.seasonLen) + '</dd></div>' +
      '<div><dt>الموسم القادم</dt><dd>' + s.nextSeason + ' ' + fmtDate(s.nextSeasonStart, { tz: 'UTC', wd: false }) + '</dd></div></dl>' +
      '<p class="note" style="margin:0 0 12px">' + s.seasonDesc + '</p>';
  }

  /* ---------- الإعدادات ---------- */
  function seg(id, val, cb) {
    const box = $(id);
    box.querySelectorAll('button').forEach(b => {
      b.classList.toggle('on', b.dataset.v === String(val));
      b.onclick = () => { cb(b.dataset.v); renderAll(); };
    });
  }
  function renderSettings() {
    const sel = $('#setMethod');
    if (!sel.options.length) for (const k in A.METHODS) { const o = document.createElement('option'); o.value = k; o.textContent = A.METHODS[k].name; sel.appendChild(o); }
    sel.value = S.method;
    sel.onchange = () => { S.method = sel.value; save(); renderAll(); };
    seg('#setAsr', S.asr, v => { S.asr = +v; save(); });
    seg('#setH24', S.h24 ? 1 : 0, v => { S.h24 = v === '1'; save(); });
    seg('#setDigits', S.digits, v => { S.digits = v; save(); });
    const adj = $('#setAdjust');
    adj.innerHTML = KEYS.map(k => '<div><span class="lbl">' + NAMES[k] + '</span><span class="stepper" data-k="' + k + '"><button data-d="1" aria-label="زيادة">+</button><output>' + (S.adjust[k] > 0 ? '+' : '') + num(S.adjust[k]) + '</output><button data-d="-1" aria-label="إنقاص">−</button></span></div>').join('');
    adj.querySelectorAll('.stepper button').forEach(b => b.onclick = () => {
      const k = b.parentNode.dataset.k; S.adjust[k] = Math.max(-30, Math.min(30, S.adjust[k] + +b.dataset.d)); save(); renderSettings(); renderPrayer();
    });
    const off = $('#setOffset');
    off.querySelector('output').textContent = (S.compassOffset > 0 ? '+' : '') + num(S.compassOffset) + '°';
    off.querySelectorAll('button').forEach(b => b.onclick = () => { S.compassOffset = norm180(S.compassOffset + +b.dataset.d); save(); renderSettings(); });
    $('#setLocVal').textContent = S.loc.source === 'gps' ? (S.loc.name || coordTxt()) : (S.loc.source === 'city' ? S.loc.name : 'افتراضي');
    $('#verVal').textContent = 'الإصدار ' + num(VERSION);
    $('#aboutVer').textContent = 'فَلَق — الإصدار ' + num(VERSION);
  }
  const coordTxt = () => num(S.loc.lat.toFixed(3)) + '، ' + num(S.loc.lng.toFixed(3));

  /* ---------- الموقع ---------- */
  function renderLoc() {
    $('#locName').textContent = S.loc.name || coordTxt();
    $('#locBanner').hidden = S.loc.source !== 'default';
  }
  function useGPS(silent) {
    if (!navigator.geolocation) { if (!silent) toast('الموقع غير مدعوم في هذا المتصفح'); return; }
    if (!silent) toast('جاري تحديد موقعك…');
    navigator.geolocation.getCurrentPosition(p => {
      const lat = p.coords.latitude, lng = p.coords.longitude;
      S.loc = { lat, lng, name: nearestName(lat, lng), tz: deviceTZ(), source: 'gps', at: Date.now() };
      save(); renderAll(); buildCompass();
      if (!silent) toast('تم تحديد موقعك' + (S.loc.name ? ': ' + S.loc.name : ''));
    }, err => {
      if (!silent) toast(err.code === 1 ? 'لم يُسمح بالوصول إلى الموقع' : 'تعذر تحديد الموقع، حاول مرة أخرى');
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  }
  function openLocation() {
    sheet('<h2>الموقع</h2><p>المواقيت والقبلة تُحسب من إحداثيات موقعك.</p>' +
      '<button class="link-btn primary" id="lGps">استخدم موقعي الحالي (GPS)</button>' +
      '<div class="field"><input id="lLat" inputmode="decimal" placeholder="خط العرض" value="' + S.loc.lat.toFixed(4) + '"><input id="lLng" inputmode="decimal" placeholder="خط الطول" value="' + S.loc.lng.toFixed(4) + '"></div>' +
      '<button class="link-btn" id="lUse" style="margin-top:4px">استخدم هذه الإحداثيات</button>' +
      '<h2 style="font-size:18px;margin-top:20px">مدن</h2><div class="city-list">' +
      CITIES.map((c, i) => '<button data-i="' + i + '">' + c[0] + '<span>' + num(c[1].toFixed(2)) + '، ' + num(c[2].toFixed(2)) + '</span></button>').join('') + '</div>', () => {
      $('#lGps').onclick = () => { closeSheet(); useGPS(false); };
      $('#lUse').onclick = () => {
        const lat = parseFloat($('#lLat').value), lng = parseFloat($('#lLng').value);
        if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) { toast('إحداثيات غير صحيحة'); return; }
        S.loc = { lat, lng, name: nearestName(lat, lng), tz: deviceTZ(), source: 'gps' }; save(); closeSheet(); renderAll(); buildCompass();
      };
      document.querySelectorAll('.city-list button').forEach(b => b.onclick = () => {
        const c = CITIES[+b.dataset.i];
        S.loc = { lat: c[1], lng: c[2], name: c[0], tz: c[3], source: 'city' }; save(); closeSheet(); renderAll(); buildCompass();
        toast('المواقيت بتوقيت ' + c[0]);
      });
    });
  }

  /* ---------- النوافذ ---------- */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
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
  const SHARE_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CC3E6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  function openInstall() {
    let body;
    if (isStandalone()) body = '<p>فَلَق مضاف إلى شاشتك الرئيسية ويعمل الآن كتطبيق.</p>';
    else if (isIOS()) body = '<ol class="steps"><li>اضغط زر المشاركة ' + SHARE_ICON + ' في Safari</li><li>اختر «إضافة إلى الشاشة الرئيسية»</li><li>اضغط «إضافة»، وافتح فَلَق من أيقونته</li></ol>';
    else if (deferredPrompt) body = '<p>يُضاف فَلَق كأيقونة على شاشتك ويعمل بدون إنترنت.</p><button class="link-btn primary" id="doInstall">أضف فَلَق إلى الشاشة الرئيسية</button>';
    else body = '<ol class="steps"><li>افتح قائمة المتصفح ⋮</li><li>اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»</li></ol>';
    sheet('<h2>أضف فَلَق إلى شاشتك</h2><p>تفتحه بلمسة مثل أي تطبيق، ويعمل كاملاً بدون إنترنت.</p>' + body + '<button class="link-btn" id="instLater">' + (isStandalone() ? 'إغلاق' : 'لاحقاً') + '</button>', () => {
      const d = $('#doInstall');
      if (d) d.onclick = () => { deferredPrompt.prompt(); deferredPrompt.userChoice.finally(() => { deferredPrompt = null; closeSheet(); }); };
      $('#instLater').onclick = closeSheet;
    });
    S.installSeen = true; save();
  }

  /* ---------- التنقل ---------- */
  let current = 'prayer';
  function show(v) {
    current = v;
    document.querySelectorAll('.tabs button').forEach(b => { b.classList.toggle('on', b.dataset.v === v); b.setAttribute('aria-current', b.dataset.v === v ? 'page' : 'false'); });
    document.querySelectorAll('.view').forEach(s => s.classList.toggle('on', s.id === 'v-' + v));
    rafOn = v === 'qibla';
    if (v === 'qibla') { renderSunQibla(); updateSkyMarks(); requestAnimationFrame(loop); }
    if (v === 'moon') renderMoon();
    if (v === 'settings') renderSettings();
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => show(b.dataset.v));

  function renderAll() {
    renderLoc(); setGlow(); renderPrayer(); renderSettings();
    if (current === 'moon') renderMoon();
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
    if (!('serviceWorker' in navigator)) { toast('أنت على آخر إصدار'); return; }
    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg) { toast('أنت على آخر إصدار'); return; }
      reg.update().then(() => {
        if (reg.installing || reg.waiting) toast('يُحمَّل الإصدار الجديد…'); else toast('أنت على آخر إصدار ' + num(VERSION));
      }).catch(() => toast('لا يوجد اتصال للتحقق من التحديث'));
    });
  };

  // سحب للتنقل بين الأيام
  let tx = null;
  $('.dial-wrap').addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  $('.dial-wrap').addEventListener('touchend', e => {
    if (tx === null) return; const dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 50) { dayOffset += dx > 0 ? 1 : -1; renderPrayer(); }
  });

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
      if (dk !== lastDay) { lastDay = dk; if (current === 'qibla') renderSunQibla(); }
    }
  }, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { lastMinute = -1; renderAll(); } });

  /* ---------- البداية ---------- */
  buildCompass();
  renderAll();
  renderCompass();

  if (S.loc.source === 'gps' && navigator.permissions && navigator.permissions.query) {
    navigator.permissions.query({ name: 'geolocation' }).then(r => { if (r.state === 'granted') useGPS(true); }).catch(() => {});
  }
  if (!isStandalone() && !S.installSeen && /mobi|iphone|ipad|android/i.test(navigator.userAgent)) setTimeout(openInstall, 1200);

  if ('serviceWorker' in navigator) {
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  }
})();
