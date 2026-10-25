/* فَلَق | FALAQ — محرك الحسابات الفلكية (بدون إنترنت)
   مواقيت الصلاة، الشمس، القمر، القبلة، المنازل، التقويم الهجري */
(function (root) {
  'use strict';
  const PI = Math.PI, rad = PI / 180, deg = 180 / PI;
  const dsin = d => Math.sin(d * rad), dcos = d => Math.cos(d * rad), dtan = d => Math.tan(d * rad);
  const dasin = x => Math.asin(x) * deg, dacos = x => Math.acos(x) * deg;
  const datan2 = (y, x) => Math.atan2(y, x) * deg, dacot = x => Math.atan(1 / x) * deg;
  const fix = (a, b) => { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; };
  const fixAngle = a => fix(a, 360), fixHour = h => fix(h, 24);
  const DAY = 864e5;

  const KAABA = { lat: 21.422487, lng: 39.826206 };

  /* ---------- طرق الحساب ---------- */
  const METHODS = {
    umm_alqura: { name: 'أم القرى — السعودية', fajr: 18.5, isha: { min: 90 }, ramadanIsha: 120 },
    mwl:        { name: 'رابطة العالم الإسلامي', fajr: 18, isha: 17 },
    egypt:      { name: 'الهيئة المصرية العامة للمساحة', fajr: 19.5, isha: 17.5 },
    gulf:       { name: 'منطقة الخليج', fajr: 19.5, isha: { min: 90 } },
    kuwait:     { name: 'الكويت', fajr: 18, isha: 17.5 },
    qatar:      { name: 'قطر', fajr: 18, isha: { min: 90 } },
    dubai:      { name: 'الإمارات', fajr: 18.2, isha: 18.2 },
    turkey:     { name: 'تركيا — رئاسة الشؤون الدينية', fajr: 18, isha: 17, adj: { sunrise: -7, dhuhr: 5, asr: 4, maghrib: 7 } },
    karachi:    { name: 'جامعة العلوم الإسلامية — كراتشي', fajr: 18, isha: 18 },
    isna:       { name: 'أمريكا الشمالية (ISNA)', fajr: 15, isha: 15 }
  };

  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  function sunPosition(jd) {
    const D = jd - 2451545.0;
    const g = fixAngle(357.529 + 0.98560028 * D);
    const q = fixAngle(280.459 + 0.98564736 * D);
    const L = fixAngle(q + 1.915 * dsin(g) + 0.020 * dsin(2 * g));
    const e = 23.439 - 0.00000036 * D;
    const RA = datan2(dcos(e) * dsin(L), dcos(L)) / 15;
    const eqt = q / 15 - fixHour(RA);
    const decl = dasin(dsin(e) * dsin(L));
    return { declination: decl, equation: eqt };
  }

  /* مواقيت الصلاة ليوم (y,m,d) — تُرجع كائنات Date حقيقية (لحظات مطلقة) */
  function prayerTimes(y, m, d, lat, lng, opt) {
    opt = opt || {};
    const method = METHODS[opt.method] || METHODS.umm_alqura;
    const asrFactor = opt.asr === 2 ? 2 : 1;
    const jDate = julian(y, m, d) - lng / (15 * 24);

    const midDay = t => fixHour(12 - sunPosition(jDate + t).equation);
    const sunAngleTime = (angle, t, ccw) => {
      const decl = sunPosition(jDate + t).declination;
      const noon = midDay(t);
      const T = dacos((-dsin(angle) - dsin(decl) * dsin(lat)) / (dcos(decl) * dcos(lat))) / 15;
      return noon + (ccw ? -T : T);
    };
    const asrTime = (factor, t) => {
      const decl = sunPosition(jDate + t).declination;
      const angle = -dacot(factor + dtan(Math.abs(lat - decl)));
      return sunAngleTime(angle, t);
    };

    let T = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, sunset: 18, isha: 18 };
    const ishaAngle = typeof method.isha === 'number';
    for (let i = 0; i < 2; i++) {
      T = {
        fajr: sunAngleTime(method.fajr, T.fajr / 24, true),
        sunrise: sunAngleTime(0.833, T.sunrise / 24, true),
        dhuhr: midDay(T.dhuhr / 24),
        asr: asrTime(asrFactor, T.asr / 24),
        sunset: sunAngleTime(0.833, T.sunset / 24),
        isha: ishaAngle ? sunAngleTime(method.isha, T.isha / 24) : T.sunset
      };
    }
    // إلى توقيت UTC
    for (const k in T) T[k] += -lng / 15;

    // العروض العالية: الطريقة الزاوية
    const night = fixHour(T.sunrise - T.sunset);
    const portion = a => a / 60 * night;
    if (isNaN(T.fajr) || fixHour(T.sunrise - T.fajr) > portion(method.fajr)) T.fajr = T.sunrise - portion(method.fajr);
    if (ishaAngle && (isNaN(T.isha) || fixHour(T.isha - T.sunset) > portion(method.isha))) T.isha = T.sunset + portion(method.isha);
    if (!ishaAngle) {
      const mins = (opt.ramadan && method.ramadanIsha) ? method.ramadanIsha : method.isha.min;
      T.isha = T.sunset + mins / 60;
    }
    T.maghrib = T.sunset;

    const adj = Object.assign({}, method.adj || {});
    const user = opt.adjust || {};
    const base = Date.UTC(y, m - 1, d);
    const out = {};
    ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach(k => {
      const mins = T[k] * 60 + (adj[k] || 0) + (user[k] || 0);
      // تقريب لأقرب دقيقة
      out[k] = isNaN(mins) ? null : new Date(base + Math.round(mins) * 6e4);
    });
    out.solarNoon = new Date(base + T.dhuhr * 36e5);
    out.sunsetExact = new Date(base + T.sunset * 36e5);
    return out;
  }

  /* ---------- الشمس والقمر (موقع لحظي) ---------- */
  const J1970 = 2440588, J2000 = 2451545, OBL = rad * 23.4397;
  const toJulian = date => date.valueOf() / DAY - 0.5 + J1970;
  const fromJulian = j => new Date((j + 0.5 - J1970) * DAY);
  const toDays = date => toJulian(date) - J2000;
  const raOf = (l, b) => Math.atan2(Math.sin(l) * Math.cos(OBL) - Math.tan(b) * Math.sin(OBL), Math.cos(l));
  const decOf = (l, b) => Math.asin(Math.sin(b) * Math.cos(OBL) + Math.cos(b) * Math.sin(OBL) * Math.sin(l));
  const azimuthRaw = (H, phi, dec) => Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
  const altitudeRaw = (H, phi, dec) => Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const sidereal = (d, lw) => rad * (280.16 + 360.9856235 * d) - lw;
  const refraction = h => { if (h < 0) h = 0; return 0.0002967 / Math.tan(h + 0.00312536 / (h + 0.08901179)); };

  function sunCoords(d) {
    const M = rad * (357.5291 + 0.98560028 * d);
    const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    const L = M + C + rad * 102.9372 + PI;
    return { dec: decOf(L, 0), ra: raOf(L, 0), lon: L };
  }

  function moonCoords(d) {
    const Lp = rad * (218.3165 + 13.17639648 * d);
    const D = rad * (297.8502 + 12.19074912 * d);
    const M = rad * (134.9634 + 13.06499295 * d);
    const F = rad * (93.2721 + 13.22935024 * d);
    const Ms = rad * (357.5291 + 0.98560028 * d);
    const s = Math.sin, c = Math.cos;
    const l = Lp + rad * (6.289 * s(M) + 1.274 * s(2 * D - M) + 0.658 * s(2 * D) + 0.214 * s(2 * M)
      - 0.186 * s(Ms) - 0.059 * s(2 * D - 2 * M) - 0.057 * s(2 * D - M - Ms) + 0.053 * s(2 * D + M)
      + 0.046 * s(2 * D - Ms) + 0.041 * s(M - Ms) - 0.035 * s(D) - 0.031 * s(M + Ms)
      - 0.015 * s(2 * F - 2 * D) + 0.011 * s(M - 4 * D));
    const b = rad * (5.128 * s(F) + 0.281 * s(M + F) + 0.278 * s(M - F) + 0.173 * s(2 * D - F)
      + 0.055 * s(2 * D - M + F) + 0.046 * s(2 * D - M - F) + 0.033 * s(2 * D + F) + 0.017 * s(2 * M + F));
    const dist = 385001 - 20905 * c(M) - 3699 * c(2 * D - M) - 2956 * c(2 * D) - 570 * c(2 * M)
      + 246 * c(2 * M - 2 * D) - 205 * c(Ms - 2 * D) - 171 * c(M + 2 * D) - 152 * c(M + Ms - 2 * D);
    return { ra: raOf(l, b), dec: decOf(l, b), dist, lon: l, lat: b };
  }

  // الزوايا بالدرجات، السمت من الشمال باتجاه عقارب الساعة
  function sunPos(date, lat, lng) {
    const lw = rad * -lng, phi = rad * lat, d = toDays(date), c = sunCoords(d);
    const H = sidereal(d, lw) - c.ra;
    return { azimuth: fixAngle(azimuthRaw(H, phi, c.dec) * deg + 180), altitude: altitudeRaw(H, phi, c.dec) * deg };
  }

  function moonPos(date, lat, lng) {
    const lw = rad * -lng, phi = rad * lat, d = toDays(date), c = moonCoords(d);
    const H = sidereal(d, lw) - c.ra;
    let h = altitudeRaw(H, phi, c.dec);
    const pa = Math.atan2(Math.sin(H), Math.tan(phi) * Math.cos(c.dec) - Math.sin(c.dec) * Math.cos(H));
    h += refraction(h);
    return { azimuth: fixAngle(azimuthRaw(H, phi, c.dec) * deg + 180), altitude: h * deg, distance: c.dist, parallacticAngle: pa };
  }

  function moonIllumination(date) {
    const d = toDays(date), s = sunCoords(d), m = moonCoords(d), sdist = 149598000;
    const phi = Math.acos(Math.sin(s.dec) * Math.sin(m.dec) + Math.cos(s.dec) * Math.cos(m.dec) * Math.cos(s.ra - m.ra));
    const inc = Math.atan2(sdist * Math.sin(phi), m.dist - sdist * Math.cos(phi));
    const angle = Math.atan2(Math.cos(s.dec) * Math.sin(s.ra - m.ra),
      Math.sin(s.dec) * Math.cos(m.dec) - Math.cos(s.dec) * Math.sin(m.dec) * Math.cos(s.ra - m.ra));
    const elong = fixAngle((m.lon - s.lon) * deg); // 0 = محاق، 180 = بدر
    return { fraction: (1 + Math.cos(inc)) / 2, elongation: elong, waxing: elong < 180, brightLimbAngle: angle };
  }

  // أوقات شروق وغروب القمر في نافذة 24 ساعة تبدأ من start
  function moonTimes(start, lat, lng) {
    const hc = 0.133 * rad;
    const alt = t => moonPos(new Date(start.valueOf() + t * 36e5), lat, lng).altitude * rad - hc;
    let h0 = alt(0), rise = null, set = null, ye = 0;
    for (let i = 1; i <= 24; i += 2) {
      const h1 = alt(i), h2 = alt(i + 1);
      const a = (h0 + h2) / 2 - h1, b = (h2 - h0) / 2, xe = -b / (2 * a);
      ye = (a * xe + b) * xe + h1;
      const dd = b * b - 4 * a * h1;
      let roots = 0, x1 = 0, x2 = 0;
      if (dd >= 0) {
        const dx = Math.sqrt(dd) / (Math.abs(a) * 2);
        x1 = xe - dx; x2 = xe + dx;
        if (Math.abs(x1) <= 1) roots++;
        if (Math.abs(x2) <= 1) roots++;
        if (x1 < -1) x1 = x2;
      }
      if (roots === 1) { if (h0 < 0) rise = i + x1; else set = i + x1; }
      else if (roots === 2) { rise = i + (ye < 0 ? x2 : x1); set = i + (ye < 0 ? x1 : x2); }
      if (rise !== null && set !== null) break;
      h0 = h2;
    }
    const at = h => h === null ? null : new Date(start.valueOf() + h * 36e5);
    return { rise: at(rise), set: at(set), alwaysUp: rise === null && set === null && ye > 0, alwaysDown: rise === null && set === null && ye <= 0 };
  }

  /* ---------- أطوار القمر (ميوس، الفصل 49) ---------- */
  function phaseJDE(k, type) { // type: 0 محاق، 1 تربيع أول، 2 بدر، 3 تربيع ثاني
    k = k + type / 4;
    const T = k / 1236.85;
    let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T - 0.00000015 * T * T * T;
    const E = 1 - 0.002516 * T - 0.0000074 * T * T;
    const M = rad * fixAngle(2.5534 + 29.1053567 * k - 0.0000014 * T * T);
    const Mp = rad * fixAngle(201.5643 + 385.81693528 * k + 0.0107582 * T * T);
    const F = rad * fixAngle(160.7108 + 390.67050284 * k - 0.0016118 * T * T);
    const Om = rad * fixAngle(124.7746 - 1.56375588 * k + 0.0020672 * T * T);
    const s = Math.sin, c = Math.cos;
    let corr;
    if (type === 0) {
      corr = -0.40720 * s(Mp) + 0.17241 * E * s(M) + 0.01608 * s(2 * Mp) + 0.01039 * s(2 * F) + 0.00739 * E * s(Mp - M)
        - 0.00514 * E * s(Mp + M) + 0.00208 * E * E * s(2 * M) - 0.00111 * s(Mp - 2 * F) - 0.00057 * s(Mp + 2 * F)
        + 0.00056 * E * s(2 * Mp + M) - 0.00042 * s(3 * Mp) + 0.00042 * E * s(M + 2 * F) + 0.00038 * E * s(M - 2 * F)
        - 0.00024 * E * s(2 * Mp - M) - 0.00017 * s(Om) - 0.00007 * s(Mp + 2 * M) + 0.00004 * s(2 * Mp - 2 * F) + 0.00004 * s(3 * M);
    } else if (type === 2) {
      corr = -0.40614 * s(Mp) + 0.17302 * E * s(M) + 0.01614 * s(2 * Mp) + 0.01043 * s(2 * F) + 0.00734 * E * s(Mp - M)
        - 0.00515 * E * s(Mp + M) + 0.00209 * E * E * s(2 * M) - 0.00111 * s(Mp - 2 * F) - 0.00057 * s(Mp + 2 * F)
        + 0.00056 * E * s(2 * Mp + M) - 0.00042 * s(3 * Mp) + 0.00042 * E * s(M + 2 * F) + 0.00038 * E * s(M - 2 * F)
        - 0.00024 * E * s(2 * Mp - M) - 0.00017 * s(Om) - 0.00007 * s(Mp + 2 * M) + 0.00004 * s(2 * Mp - 2 * F) + 0.00004 * s(3 * M);
    } else {
      corr = -0.62801 * s(Mp) + 0.17172 * E * s(M) - 0.01183 * E * s(Mp + M) + 0.00862 * s(2 * Mp) + 0.00804 * s(2 * F)
        + 0.00454 * E * s(Mp - M) + 0.00204 * E * E * s(2 * M) - 0.00180 * s(Mp - 2 * F) - 0.00070 * s(Mp + 2 * F)
        - 0.00040 * s(3 * Mp) - 0.00034 * E * s(2 * Mp - M) + 0.00032 * E * s(M + 2 * F) + 0.00032 * E * s(M - 2 * F)
        - 0.00028 * E * E * s(Mp + 2 * M) + 0.00027 * E * s(2 * Mp + M) - 0.00017 * s(Om);
      const W = 0.00306 - 0.00038 * E * c(M) + 0.00026 * c(Mp) - 0.00002 * c(Mp - M) + 0.00002 * c(Mp + M) + 0.00002 * c(2 * F);
      corr += type === 1 ? W : -W;
    }
    jde += corr;
    const dT = 70 / 86400; // فرق التوقيت الديناميكي التقريبي
    return fromJulian(jde - dT);
  }

  // أقرب الأطوار حول تاريخ معين
  function moonPhases(date) {
    const yearFrac = date.getUTCFullYear() + (date - Date.UTC(date.getUTCFullYear(), 0, 1)) / (365.25 * DAY);
    let k = Math.floor((yearFrac - 2000) * 12.3685) - 2;
    const list = [];
    for (let i = 0; i < 6; i++, k++) for (let t = 0; t < 4; t++) list.push({ type: t, date: phaseJDE(k, t) });
    list.sort((a, b) => a.date - b.date);
    const next = {};
    let lastNew = null;
    list.forEach(p => {
      if (p.date <= date) { if (p.type === 0) lastNew = p.date; }
      else if (!next[p.type]) next[p.type] = p.date;
    });
    return { lastNew, nextNew: next[0], nextFirst: next[1], nextFull: next[2], nextLast: next[3] };
  }

  /* ---------- القبلة ---------- */
  function qibla(lat, lng) {
    const p1 = lat * rad, p2 = KAABA.lat * rad, dl = (KAABA.lng - lng) * rad;
    const brg = fixAngle(Math.atan2(Math.sin(dl), Math.cos(p1) * Math.tan(p2) - Math.sin(p1) * Math.cos(dl)) * deg);
    return { bearing: brg, distance: distanceKm(lat, lng, KAABA.lat, KAABA.lng) };
  }
  function distanceKm(a1, o1, a2, o2) {
    const R = 6371.0088, p1 = a1 * rad, p2 = a2 * rad, dp = (a2 - a1) * rad, dl = (o2 - o1) * rad;
    const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  // أوقات اليوم التي تكون فيها الشمس باتجاه القبلة (أو ظلّ الشيء باتجاهها)
  function sunQiblaTimes(sunrise, sunset, lat, lng, bearing) {
    const res = { toward: null, shadow: null };
    if (!sunrise || !sunset) return res;
    const diff = (a, b) => ((a - b + 540) % 360) - 180;
    let prevT = sunrise.valueOf(), prevA = diff(sunPos(sunrise, lat, lng).azimuth, bearing), prevB = diff(sunPos(sunrise, lat, lng).azimuth, bearing + 180);
    for (let t = prevT + 6e4; t <= sunset.valueOf(); t += 6e4) {
      const az = sunPos(new Date(t), lat, lng).azimuth;
      const a = diff(az, bearing), b = diff(az, bearing + 180);
      if (!res.toward && prevA * a <= 0 && Math.abs(a - prevA) < 90) res.toward = new Date(t);
      if (!res.shadow && prevB * b <= 0 && Math.abs(b - prevB) < 90) res.shadow = new Date(t);
      prevA = a; prevB = b;
    }
    return res;
  }

  // تعامد الشمس على الكعبة (رصد القبلة) — التاريخان القادمان
  function kaabaTransits(fromDate) {
    const out = [];
    for (let yr = fromDate.getUTCFullYear(); yr <= fromDate.getUTCFullYear() + 1 && out.length < 2; yr++) {
      [[4, 1, 5, 20], [6, 1, 7, 15]].forEach(([m1, d1, m2, d2]) => {
        let best = null;
        for (let t = Date.UTC(yr, m1, d1); t <= Date.UTC(yr, m2, d2); t += DAY) {
          const dt = new Date(t);
          const pt = prayerTimes(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), KAABA.lat, KAABA.lng, {});
          const alt = sunPos(pt.solarNoon, KAABA.lat, KAABA.lng).altitude;
          if (!best || alt > best.alt) best = { alt, date: pt.solarNoon };
        }
        if (best && best.date > fromDate) out.push(best.date);
      });
    }
    return out.sort((a, b) => a - b).slice(0, 2);
  }

  /* ---------- المنازل والنجوم ---------- */
  const MANSIONS = ['الشرطين', 'البطين', 'الثريا', 'الدبران', 'الهقعة', 'الهنعة', 'الذراع', 'النثرة', 'الطرف', 'الجبهة',
    'الزبرة', 'الصرفة', 'العواء', 'السماك', 'الغفر', 'الزبانا', 'الإكليل', 'القلب', 'الشولة', 'النعائم', 'البلدة',
    'سعد الذابح', 'سعد بلع', 'سعد السعود', 'سعد الأخبية', 'المقدم', 'المؤخر', 'الرشا'];
  // بداية الشرطين مثبّتة على النجوم (متمركزة على نجومها) مع تصحيح المبادرة
  function mansionIndex(lonDeg, date) {
    const yrs = (date - Date.UTC(2000, 0, 1, 12)) / (365.25 * DAY);
    const start = 27.85 + yrs * 0.013969;
    return Math.floor(fixAngle(lonDeg - start) / (360 / 28));
  }
  function moonMansion(date) {
    const d = toDays(date);
    const m = moonCoords(d), s = sunCoords(d);
    return { moon: mansionIndex(m.lon * deg, date), sun: mansionIndex(s.lon * deg, date), moonLon: fixAngle(m.lon * deg), sunLon: fixAngle(s.lon * deg),
      startLon: fixAngle(27.85 + (date - Date.UTC(2000, 0, 1, 12)) / (365.25 * DAY) * 0.013969) };
  }

  // الحساب النجدي — بداية كل نجم (شهر، يوم)
  const STAR_STARTS = [[5, 12], [5, 25], [6, 7], [6, 20], [7, 3], [7, 16], [7, 29], [8, 11], [8, 24], [9, 6], [9, 20], [10, 3], [10, 16],
    [10, 29], [11, 11], [11, 24], [12, 7], [12, 20], [1, 2], [1, 15], [1, 28], [2, 10], [2, 23], [3, 8], [3, 21], [4, 3], [4, 16], [4, 29]];
  const SEASONS = [
    { name: 'الوسم', first: 12, n: 4, desc: 'بداية الأمطار الوسمية واعتدال الجو، وبعد مطره تظهر نباتات البر والفقع.' },
    { name: 'المربعانية', first: 16, n: 3, desc: 'أشد فترات البرد في نجد، يطول فيها الليل ويقصر النهار.' },
    { name: 'الشبط', first: 19, n: 2, desc: 'برد قارس جاف، وقد يتجمد الماء في الليالي الصافية.' },
    { name: 'العقارب', first: 21, n: 3, desc: 'يبدأ البرد بالانكسار مع تقلبات ورياح، ويسري الماء في عود الشجر.' },
    { name: 'الحميمين', first: 24, n: 2, desc: 'بداية الدفء، وتكثر فيه أمطار الربيع والرعد.' },
    { name: 'الذراعين', first: 26, n: 2, desc: 'يزداد الدفء ويقترب الصيف، وتنشط الرياح.' },
    { name: 'الكنة', first: 0, n: 2, desc: 'تستتر الثريا عن الأنظار، ويبدأ الحر بالظهور.' },
    { name: 'القيظ', first: 2, n: 2, desc: 'دخول الصيف الحار مع طلوع الثريا فجراً، ويبدأ نضج الرطب.' },
    { name: 'جمرة القيظ', first: 4, n: 2, desc: 'أشد أيام الصيف حرارة.' },
    { name: 'الكليبين', first: 6, n: 2, desc: 'حر شديد مع رطوبة، وتسكن فيه الرياح.' },
    { name: 'سهيل', first: 8, n: 4, desc: 'طلوع نجم سهيل، تبرد الليالي تدريجياً وينكسر الحر.' }
  ];
  function starStartDate(i, y) { return Date.UTC(y, STAR_STARTS[i][0] - 1, STAR_STARTS[i][1]); }
  // y,m,d = التاريخ المحلي
  function najdiStar(y, m, d) {
    const t = Date.UTC(y, m - 1, d);
    let found = null;
    for (const yy of [y - 1, y]) for (let i = 0; i < 28; i++) {
      const s = starStartDate(i, yy);
      let e = starStartDate((i + 1) % 28, i === 27 ? yy : yy);
      if (e <= s) e = starStartDate((i + 1) % 28, yy + 1);
      if (t >= s && t < e) found = { index: i, start: s, end: e };
    }
    if (!found) return null;
    const day = Math.round((t - found.start) / DAY) + 1, len = Math.round((found.end - found.start) / DAY);
    const si = SEASONS.findIndex(S => { for (let j = 0; j < S.n; j++) if ((S.first + j) % 28 === found.index) return true; return false; });
    const S = SEASONS[si];
    let sStart = null;
    for (const yy of [y - 1, y]) { const s = starStartDate(S.first, yy); if (s <= t && (!sStart || s > sStart)) sStart = s; }
    const sEnd = (() => { const n = SEASONS[(si + 1) % SEASONS.length]; let e = starStartDate(n.first, y - 1); while (e <= sStart) e = starStartDate(n.first, new Date(e).getUTCFullYear() + 1); return e; })();
    return {
      star: MANSIONS[found.index], index: found.index, day, len,
      next: MANSIONS[(found.index + 1) % 28], nextStart: new Date(found.end),
      season: S.name, seasonDesc: S.desc, seasonDay: Math.round((t - sStart) / DAY) + 1, seasonLen: Math.round((sEnd - sStart) / DAY),
      nextSeason: SEASONS[(si + 1) % SEASONS.length].name, nextSeasonStart: new Date(sEnd)
    };
  }

  /* ---------- الهجري (أم القرى عبر Intl) ---------- */
  let hijriFmt = null;
  function hijri(date, timeZone) {
    try {
      hijriFmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: timeZone || undefined });
      const p = {}; hijriFmt.formatToParts(date).forEach(x => { p[x.type] = x.value; });
      return { day: +p.day, month: +p.month, year: parseInt(p.year, 10) };
    } catch (e) { return null; }
  }
  const HIJRI_MONTHS = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];

  root.Astro = {
    KAABA, METHODS, MANSIONS, SEASONS, HIJRI_MONTHS,
    prayerTimes, sunPos, moonPos, moonIllumination, moonTimes, moonPhases, phaseJDE,
    qibla, distanceKm, sunQiblaTimes, kaabaTransits, moonMansion, najdiStar, hijri
  };
})(typeof window !== 'undefined' ? window : globalThis);
