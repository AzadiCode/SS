/* ══════════════════════════════════════════════════════════════════════════
   لایه‌ی قبیله (tribe.js) — اتصال بازی به کانال یوتیوب
   • هر عضو کانال = یک شهروند نام‌دار (کارگر واقعی با اسم) + خانه‌ی شخصی‌سازی‌شده
   • شغل‌ها: چوب‌بر، کشاورز، سنگ‌تراش، معدنچی، بازرگان (بازار) — برای شغل جدید فقط JOB_DEFS
   • شهر پر شد → رای‌گیری (کامنت #N + رای داخل بازی) → مدیرعامل شهر جدید از صفر می‌سازد
   index.html فقط ۴ قلاب دارد: TRIBE.draw / TRIBE.tick / TRIBE.capBonus / TRIBE.count
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  const q = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MAXC = 28;                         // حداکثر شهروند زنده روی صحنه (برای لپ‌تاپ‌های ضعیف)
  const JOB_DEFS = {                       // ← شغل جدید: یک خط اینجا + یک اسم در JOBS سمت tribe.py
    free:   { n: 'آزاد',               i: '🧍' },
    wood:   { n: 'چوب‌بر',             i: '🪵', node: 'tree' },
    food:   { n: 'کشاورز / شکارچی',    i: '🍖', node: 'bush' },
    stone:  { n: 'سنگ‌تراش',           i: '🪨', node: 'rock' },
    metal:  { n: 'معدنچی',             i: '⛓️', node: 'ore', era: 1 },
    trader: { n: 'بازرگان (بازار)',    i: '🏪' }
  };
  let X = null, S = null, ME = null, TOKEN = '', panelTab = 'me', lastLog = 0, lastReady = false, busy = false;
  try { TOKEN = localStorage.vx_tt || '' } catch (_) { }
  let HOUSE = {}; try { HOUSE = JSON.parse(localStorage.vx_th || '{}') } catch (_) { }
  const CIT = new Map();                   // cid → {u, rt}
  const SITES = [];                        // مختصات شهرهای جدید (قطعی، از روی زمین)
  const num = id => parseInt(String(id).slice(1)) || 0;

  async function api(path, body) {
    try {
      const r = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
      return await r.json();
    } catch (_) { return { error: 'اینترنت' } }
  }

  /* ───── جای شهرهای جدید: از روی زمین و به‌صورت قطعی (همه‌ی کلاینت‌ها یک جای یکسان می‌گیرند) ───── */
  function landOK(i, j, w, h) {
    let mn = 9, mx = -9;
    for (let a = 0; a < w; a++) for (let b = 0; b < h; b++) {
      const ii = i + a, jj = j + b; if (!X.inb(ii, jj) || ii < 4 || jj < 4 || ii > X.N - 5 || jj > X.N - 5) return false;
      const k = X.ix(ii, jj); if (X.WAT[k]) return false; mn = Math.min(mn, X.HT[k]); mx = Math.max(mx, X.HT[k]);
    }
    return mx - mn <= 1;
  }
  function siteFor(k) {                    // k = شماره‌ی شهر (۱ = شهر دوم)
    while (SITES.length < k) {
      const n = SITES.length + 1, base = [-.5, 1, 2.4, 3.6, 4.8, 5.8, .3, 1.8, 3, 4.2][(n - 1) % 10];
      let got = null;
      for (let r = 22; r <= 46 && !got; r += 2) for (let da = 0; da <= 1.3 && !got; da += .15) for (const sg of [1, -1]) {
        const a = base + sg * da, i = Math.round(X.START[0] + Math.cos(a) * r), j = Math.round(X.START[1] + Math.sin(a) * r);
        if (Math.hypot(i - X.ENEMY[0], j - X.ENEMY[1]) < 32) continue;
        if (SITES.some(s => Math.hypot(s[0] - i, s[1] - j) < 16)) continue;
        if (landOK(i, j, 3, 3) && landOK(i - 3, j - 3, 9, 9)) { got = [i, j]; break }
      }
      SITES.push(got || [X.START[0] + 20 + n * 3, X.START[1] - 20]);
    }
    return SITES[k - 1];
  }
  const hqAt = (i, j) => X.blds.find(b => b.type === 'hq' && b.team === 0 && !b.dead && b.i0 === i && b.j0 === j);
  function cityHQ(idx) {                   // idx = اندیس شهر در S.cities
    if (idx === 0) return X.myHQ();
    const s = siteFor(idx); let b = hqAt(s[0], s[1]);
    if (!b) {
      for (let a = 0; a < 3; a++) for (let c = 0; c < 3; c++) if (X.BLK[X.ix(s[0] + a, s[1] + c)]) return null;
      b = X.addBuilding('hq', s[0], s[1], 0, true);
    }
    return b;
  }
  const cityIdx = cid => Math.max(0, S.cities.findIndex(c => c.id === cid));

  /* ───── خانه‌ی شهروندها ───── */
  function houseOK(i, j) {
    if (!landOK(i, j, 2, 2)) return false;
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) if (X.BLK[X.ix(i + a, j + b)]) return false;
    return Math.hypot(i - X.ENEMY[0], j - X.ENEMY[1]) > 22;
  }
  function findHouseCell(hq, c) {
    const ci = hq.i0 + 1, cj = hq.j0 + 1, pts = [];
    for (const r of [4.5, 7.5, 10.5, 13.5]) for (let a = 0; a < 9; a++) { const an = a * .698 + r * .3; pts.push([Math.round(ci + Math.cos(an) * r), Math.round(cj + Math.sin(an) * r)]) }
    const st = (num(c.id) * 7) % pts.length;
    for (let n = 0; n < pts.length; n++) { const p = pts[(st + n) % pts.length]; if (houseOK(p[0], p[1]) && !Object.values(HOUSE).some(h => Math.abs(h[0] - p[0]) < 2 && Math.abs(h[1] - p[1]) < 2)) return p }
    return null;
  }
  function ensureHouse(c) {
    const idx = cityIdx(c.city), hq = cityHQ(idx); if (!hq) return;
    let h = HOUSE[c.id];
    if (!h) { h = findHouseCell(hq, c); if (!h) { HOUSE[c.id] = [-1, -1]; return } HOUSE[c.id] = h; try { localStorage.vx_th = JSON.stringify(HOUSE) } catch (_) { } }
    if (h[0] < 0) return;
    let b = X.blds.find(x => x.type === 'house' && x.team === 0 && !x.dead && x.i0 === h[0] && x.j0 === h[1]);
    if (!b && houseOK(h[0], h[1])) b = X.addBuilding('house', h[0], h[1], 0, true);
    if (b) b.cit = c.id;
  }

  /* ───── شبیه‌سازی شهروندها ───── */
  function visible() {
    const l = S.citizens.slice(0, 400), mine = ME && l.find(c => c.id === ME.id), out = [];
    if (mine) out.push(mine);
    for (const c of l) { if (out.length >= MAXC) break; if (c !== mine) out.push(c) }
    return out;
  }
  function spawnCit(c) {
    const hq = cityHQ(cityIdx(c.city)); if (!hq) return null;
    let p = null; try { p = X.openTiles(hq.cx, hq.cz + 2.2, 1, 1)[0] } catch (_) { }
    if (!p) p = [hq.cx + 2, hq.cz + 2.5];
    const u = X.spawnUnit('worker', 0, p[0], p[1]); u.cit = c.id; return u;
  }
  function work(u, c) {
    const d = JOB_DEFS[c.job] || JOB_DEFS.free;
    if (d.node) {
      const t = (d.era && X.G.era < d.era) ? 'tree' : d.node, n = X.nearestNode(u.x, u.z, t, 48);
      if (n) { X.orderGather(u, n); return }
    }
    if (Math.random() < .35) {             // آزاد/بازرگان: دور خونه قدم می‌زنه
      const h = HOUSE[c.id], hq = cityHQ(cityIdx(c.city)), bx = h && h[0] >= 0 ? X.T2W(h[0]) + 2.5 : (hq ? hq.cx : u.x), bz = h && h[0] >= 0 ? X.T2W(h[1]) + 2.5 : (hq ? hq.cz + 3 : u.z);
      X.orderMove(u, bx + (Math.random() - .5) * 5, bz + (Math.random() - .5) * 5);
    }
  }
  let tk = 0, tkB = 0, tkM = 0, tkA = 0, tkP = 0;
  function tick(dt) {
    if (!X || !S || X.G.paused) return;
    tk -= dt; tkB -= dt; tkM -= dt; tkA -= dt; tkP -= dt;
    if (tk <= 0) {
      tk = 1.3; const now = performance.now() / 1000; let houses = 0;
      for (const c of visible()) {
        let r = CIT.get(c.id);
        if (!r || r.u.dead) {
          if (r && r.u.dead && !r.rt) r.rt = now + 20;
          if (!r || now > r.rt) { const u = spawnCit(c); if (u) CIT.set(c.id, { u, rt: 0 }) }
          continue;
        }
        r.c = c;
        if (houses < 2 && !HOUSE[c.id]) { ensureHouse(c); houses++ }
        if (r.u.st === 'idle') work(r.u, c);
      }
    }
    if (tkB <= 0) { tkB = 15; bazaar() }
    if (tkA <= 0) { tkA = 10; const n = Math.min(8, Math.floor((S.anon || 0) / 20)); if (n > 0) { X.G.res.food += n; X.G.res.wood += n } }
    if (tkM <= 0) { tkM = 1200; for (const c of S.citizens) if (ME && c.id === ME.id) { } }
    if (tkP <= 0) { tkP = 300; if (TOKEN) api('/api/tribe/ping', { token: TOKEN }) }
  }
  /* بازار: هر بازرگان از منبع اضافه‌ی قبیله می‌خره و منبع کم‌یاب رو تأمین می‌کنه (کارمزد ۲۵٪) */
  function bazaar() {
    const T = Math.min(10, S.citizens.filter(c => c.job === 'trader').length); if (!T) return;
    const R = X.G.res, keys = ['food', 'wood', 'stone'].concat(X.G.era >= 1 ? ['metal'] : []);
    keys.sort((a, b) => R[b] - R[a]); const hi = keys[0], lo = keys[keys.length - 1];
    if (R[hi] < 60 || R[hi] - R[lo] < 40) return;
    const amt = Math.min(6 * T, Math.floor(R[hi] / 3)); R[hi] -= amt; R[lo] += Math.round(amt * .75);
    X.toast('🏪 بازار: ' + amt + ' ' + RN(hi) + ' ← ' + Math.round(amt * .75) + ' ' + RN(lo));
  }
  const RN = r => ({ food: 'غذا', wood: 'چوب', stone: 'سنگ', metal: 'فلز' }[r]);

  /* ───── نام‌ها و برچسب‌ها روی صحنه ───── */
  function draw(oc, scr) {
    if (!X || !S) return; const dist = X.CAM.dist, W = innerWidth, H = innerHeight;
    oc.textAlign = 'center'; oc.font = 'bold 11px Vazirmatn,sans-serif'; oc.lineJoin = 'round';
    const txt = (t, x, y, col, sz) => { oc.font = 'bold ' + (sz || 11) + 'px Vazirmatn,sans-serif'; oc.lineWidth = 3; oc.strokeStyle = 'rgba(8,12,24,.9)'; oc.strokeText(t, x, y); oc.fillStyle = col || '#fff'; oc.fillText(t, x, y) };
    if (dist < 90) S.cities.forEach((c, i) => {
      const hq = i === 0 ? X.myHQ() : (SITES[i - 1] ? hqAt(SITES[i - 1][0], SITES[i - 1][1]) : null); if (!hq || !hq.mesh || !hq.mesh.visible) return;
      const p = scr(hq.cx, hq.y + 7.5, hq.cz); if (!p[2] || p[0] < -80 || p[0] > W + 80 || p[1] < -40 || p[1] > H + 40) return;
      txt('🏰 ' + c.name, p[0], p[1], '#ffc04a', 13); if (c.ceo) txt('👑 ' + c.ceo, p[0], p[1] + 15, '#fff0a0', 11);
    });
    if (dist < 46) {
      let n = 0;
      for (const r of CIT.values()) {
        const u = r.u; if (u.dead || !u.mesh || !u.mesh.visible || !r.c || n > 40) continue;
        const p = scr(u.x, u.y + 1.75, u.z); if (!p[2] || p[0] < -40 || p[0] > W + 40 || p[1] < -20 || p[1] > H + 20) continue; n++;
        const city = S.cities[cityIdx(r.c.city)], ceo = city && city.ceo_id === r.c.id || (city && city.ceo === r.c.name);
        oc.fillStyle = r.c.color; oc.fillRect(p[0] - 3, p[1] + 3, 6, 3);
        txt((ceo ? '👑 ' : '') + r.c.name, p[0], p[1], ceo ? '#ffe27a' : '#fff');
      }
    }
    if (dist < 32) for (const b of X.blds) {
      if (!b.cit || b.dead || !b.mesh || !b.mesh.visible) continue; const c = S.citizens.find(x => x.id === b.cit); if (!c) continue;
      const hh = b.mesh.geometry.boundingBox.max.y * b.mesh.scale.y, p = scr(b.cx, b.y + hh + .5, b.cz); if (!p[2]) continue;
      oc.fillStyle = c.color; oc.fillRect(p[0] - 5, p[1] - 14, 10, 7); oc.strokeStyle = '#000'; oc.lineWidth = 1; oc.strokeRect(p[0] - 5, p[1] - 14, 10, 7);
      txt(c.hname || ('خانه‌ی ' + c.name), p[0], p[1] + 2, '#ffe9c0', 10);
    }
  }

  /* ───── رابط: پنجره‌ی قبیله ───── */
  const focus = (x, z) => { X.CAM.x = x; X.CAM.z = z; X.CAM.dist = Math.min(X.CAM.dist, 26) };
  function go(id) {
    const r = CIT.get(id); if (r && !r.u.dead) { focus(r.u.x, r.u.z); close(); return }
    const c = S.citizens.find(x => x.id === id), hq = c && cityHQ(cityIdx(c.city)); if (hq) { focus(hq.cx, hq.cz); close() }
  }
  const close = () => q('mod').classList.remove('on');
  function tabs() {
    const T = [['me', '🧍 من'], ['people', '👥 اهالی'], ['vote', '🗳️ رای‌گیری'], ['cities', '🏙️ شهرها']];
    return '<div class="opt" style="flex-wrap:wrap">' + T.map(t => `<button class="act ${panelTab === t[0] ? 'on' : ''}" data-tr="tab" data-v="${t[0]}">${t[1]}</button>`).join('') + '</div>';
  }
  function render() {
    if (!S) return; const mb = q('mb'); let h = `<h3>👥 قبیله <small style="opacity:.7">${S.total.toLocaleString('fa-IR')} نفر${S.anon ? ' + ' + S.anon.toLocaleString('fa-IR') + ' ساکن' : ''}</small></h3>` + tabs();
    if (panelTab === 'me') h += meTab(); else if (panelTab === 'people') h += peopleTab(); else if (panelTab === 'vote') h += voteTab(); else h += citiesTab();
    h += '<div class="row" style="margin-top:8px"><button class="act pri" data-tr="close">بستن</button></div>';
    const keep = mb.querySelector('input'); const kv = keep ? keep.value : null, kid = keep ? keep.id : null;
    mb.innerHTML = h; q('mod').classList.add('on');
    if (kid && q(kid) && kv) q(kid).value = kv;
  }
  function meTab() {
    if (!ME) return `<p style="line-height:1.9;font-size:12.5px">با هر عضو جدید کانال، یه شهروند تازه تو این شهر ظاهر می‌شه. تو هم می‌تونی شهروند بشی: اسمی که تو یوتیوب داری رو بنویس (یا زیر هر ویدیو کامنت <b>!join</b> بذار تا خودکار تأیید بشی).</p>
      <div class="opt"><input id="trName" maxlength="20" placeholder="اسم تو یوتیوب" style="flex:1;padding:8px;background:#0d1322;border:2px solid #34446c;color:#fff;font:inherit"><button class="act pri" data-tr="join">عضو قبیله شو</button></div>`;
    if (ME.status === 'pending') return `<p style="line-height:1.9;font-size:12.5px">درخواستت ثبت شد، <b>${esc(ME.name)}</b>. به‌محض تأیید (یا دیدن کامنت !join تو) شهروند می‌شی ✅</p><div class="opt"><button class="act" data-tr="refresh">بررسی دوباره</button></div>`;
    const city = S.cities[cityIdx(ME.city)];
    return `<p style="font-size:12.5px;margin:4px 0">${esc(ME.name)} · ${esc(city ? city.name : '')} · امتیاز ${ME.xp}</p><div style="font-size:11px;opacity:.8">شغل (کارگرت همین کار رو انجام می‌ده و برای قبیله منبع می‌یاره):</div>
      <div class="opt" style="flex-wrap:wrap">${S.jobs.map(j => { const d = JOB_DEFS[j] || { n: j, i: '❔' }; return `<button class="act ${ME.job === j ? 'on' : ''}" data-tr="job" data-v="${j}">${d.i} ${d.n}</button>` }).join('')}</div>
      <div style="font-size:11px;opacity:.8;margin-top:6px">رنگ پرچم خونه:</div><div class="opt" style="flex-wrap:wrap">${S.colors.map(c => `<button class="act" data-tr="color" data-v="${c}" style="min-width:34px;background:${c};${ME.color === c ? 'outline:3px solid #fff' : ''}">&nbsp;</button>`).join('')}</div>
      <div class="opt" style="margin-top:6px"><input id="trHome" maxlength="18" value="${esc(ME.hname)}" placeholder="اسم خونه‌ت" style="flex:1;padding:8px;background:#0d1322;border:2px solid #34446c;color:#fff;font:inherit"><button class="act" data-tr="hname">ذخیره</button></div>
      <div class="opt"><button class="act" data-tr="go" data-v="${ME.id}">📍 برو سمت شهروندم</button></div>`;
  }
  function peopleTab() {
    const log = S.log.slice(-5).reverse().map(l => `<div style="font-size:11px;opacity:.85">${esc(l.m)}</div>`).join('');
    const l = S.citizens.slice().reverse().slice(0, 60).map(c => `<div class="row" style="padding:3px 0;border-bottom:1px solid #1c2640;align-items:center"><span style="width:10px;height:10px;background:${c.color};display:inline-block"></span><span style="flex:1;font-size:12px">${esc(c.name)} <small style="opacity:.6">${(JOB_DEFS[c.job] || {}).i || ''} ${esc((S.cities[cityIdx(c.city)] || {}).name || '')}</small></span><button class="act" data-tr="go" data-v="${c.id}" style="min-width:34px">📍</button></div>`).join('');
    return `<div style="margin:6px 0">${log}</div><div style="max-height:44vh;overflow:auto">${l || '<div style="opacity:.7;padding:8px">هنوز کسی نیست؛ اولین شهروند باش!</div>'}</div>`;
  }
  function voteTab() {
    const v = S.vote, cur = S.cities[S.cities.length - 1], cnt = S.citizens.filter(c => c.city === cur.id).length;
    if (!v.open) return `<p style="line-height:1.9;font-size:12.5px">ظرفیت ${esc(cur.name)}: <b>${cnt}/${S.cap}</b></p><div class="hb"><i style="width:${Math.min(100, cnt / S.cap * 100)}%;background:#ffc04a"></i></div>
      <p style="line-height:1.9;font-size:12px;opacity:.9">${S.ready ? '🏙️ شهر پر شده! به‌زودی رای‌گیری شروع می‌شه تا مردم یه مدیرعامل انتخاب کنن که شهر جدیدی رو از صفر بسازه.' : 'وقتی شهر پر بشه، مردم (با کامنت زیر ویدیو و رای تو بازی) مدیرعامل شهر جدید رو انتخاب می‌کنن؛ اون از صفر یه شهر نو کنار این شهر می‌سازه و با کمک ما رشد می‌کنه.'}</p>`;
    const tot = Object.values(v.tally).reduce((a, b) => a + b, 0) || 1;
    return `<p style="font-size:13px;margin:4px 0"><b>${esc(v.title)}</b></p>${v.cands.map((id, i) => { const c = S.citizens.find(x => x.id === id), n = v.tally[id] || 0; return `<div class="row" style="padding:4px 0;align-items:center"><span style="flex:1;font-size:12.5px">#${i + 1} ${esc(c ? c.name : '؟')} <small style="opacity:.7">(${n.toLocaleString('fa-IR')} رای در بازی)</small><div class="hb" style="margin:2px 0"><i style="width:${n / tot * 100}%;background:#4be08a"></i></div></span><button class="act pri" data-tr="vote" data-v="${id}">رای می‌دم</button></div>` }).join('')}
      <p style="font-size:11px;opacity:.85;line-height:1.8">${v.video ? 'می‌تونی زیر ویدیو هم کامنت <b>#۱</b> تا <b>#' + v.cands.length + '</b> بذاری. ' : ''}هر نفر یک رای.${ME && ME.status === 'ok' ? '' : ' (برای رای دادن اول عضو قبیله شو)'}</p>`;
  }
  function citiesTab() {
    return S.cities.map((c, i) => `<div class="row" style="padding:6px 0;border-bottom:1px solid #1c2640;align-items:center"><span style="flex:1;font-size:12.5px">🏰 ${esc(c.name)}<br><small style="opacity:.75">${c.ceo ? '👑 مدیرعامل: ' + esc(c.ceo) : 'مدیرعامل: —'} · ${S.citizens.filter(x => x.city === c.id).length.toLocaleString('fa-IR')} شهروند</small></span><button class="act" data-tr="city" data-v="${i}">📍</button></div>`).join('')
      + '<p style="font-size:11px;opacity:.8;line-height:1.8;margin-top:8px">شهر جدید از صفر شروع می‌شه و برای رشد به شهر مادر وابسته‌ست.</p>';
  }
  function open(tab) { if (tab) panelTab = tab; if (!S) { refresh().then(render); return } render(); refresh().then(() => { if (q('mod').classList.contains('on') && q('mb').querySelector('[data-tr]')) render() }) }

  document.addEventListener('click', async e => {
    const a = e.target.closest('[data-tr]'); if (!a || !X) return; const A = a.dataset.tr, v = a.dataset.v;
    if (A === 'tab') { panelTab = v; render() } else if (A === 'close') close();
    else if (A === 'go') go(v);
    else if (A === 'city') { const hq = cityHQ(+v); if (hq) { focus(hq.cx, hq.cz); close() } }
    else if (A === 'refresh') { await refresh(); render() }
    else if (A === 'join') {
      const nm = (q('trName') || {}).value || ''; if (nm.trim().length < 2) return X.toast('اسمت رو بنویس', 'bad');
      const j = await api('/api/tribe/join', { name: nm, token: TOKEN }); if (j.error) return X.toast(j.error, 'bad');
      if (j.token) { TOKEN = j.token; try { localStorage.vx_tt = TOKEN } catch (_) { } } ME = j.me; X.toast(ME.status === 'ok' ? '🎉 شهروند شدی!' : '✅ ثبت شد؛ منتظر تأیید'); await refresh(); render()
    }
    else if (A === 'job' || A === 'color' || A === 'hname') {
      const d = A === 'hname' ? { hname: (q('trHome') || {}).value } : { [A]: v }; const j = await api('/api/tribe/set', { token: TOKEN, ...d });
      if (j.me) { ME = j.me; const c = S.citizens.find(x => x.id === ME.id); if (c) Object.assign(c, { job: ME.job, color: ME.color, hname: ME.hname }); const r = CIT.get(ME.id); if (r) r.u.st = 'idle'; render() } else X.toast(j.error || 'خطا', 'bad')
    }
    else if (A === 'vote') { const j = await api('/api/tribe/vote', { token: TOKEN, cand: v }); X.toast(j.ok ? '🗳️ رایت ثبت شد' : (j.error || 'خطا'), j.ok ? 'ok' : 'bad'); await refresh(); render() }
  });

  /* ───── همگام‌سازی با سرور ───── */
  async function refresh() {
    if (busy) return; busy = true;
    try {
      const s = await api('/api/tribe'); if (s.error) return; S = s;
      if (TOKEN) { const m = await api('/api/tribe/me', { token: TOKEN }); ME = m.me || null; if (!ME) { TOKEN = ''; try { delete localStorage.vx_tt } catch (_) { } } }
      for (let i = 1; i < S.cities.length; i++) cityHQ(i);
      for (const l of S.log) if (l.t > lastLog) { if (lastLog) X.toast(l.m); }
      if (S.log.length) lastLog = Math.max(lastLog, S.log[S.log.length - 1].t);
      if (S.ready && !lastReady && lastReady !== null) { X.toast('🏙️ شهر پر شد! به‌زودی رای‌گیری مدیرعامل شهر جدید') } lastReady = S.ready;
    } finally { busy = false }
  }

  window.TRIBE = {
    draw, tick, open,
    count: () => S ? S.total : 0,
    capBonus: () => S ? Math.min(MAXC, S.total) : 0
  };

  const iv = setInterval(() => {
    if (!window.__G || !window.__G.myHQ || !window.__G.myHQ()) return; clearInterval(iv); X = window.__G;
    const b = q('bTribe'); if (b) b.onclick = () => open();
    refresh().then(() => { if (!ME && S) X.toast('👥 دکمه‌ی قبیله رو بزن و شهروند شو') });
    setInterval(() => { if (!document.hidden) refresh().then(() => { if (q('mod').classList.contains('on') && q('mb').querySelector('[data-tr="tab"]') && (panelTab === 'vote' || panelTab === 'people') && !q('mb').querySelector('input:focus')) render() }) }, 30000);
  }, 400);
})();
