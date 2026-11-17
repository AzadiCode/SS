// ═══ منطق بازی: منابع، سوروایوال، کاتالوگ ساختمان‌ها، ادوار تکامل ═══
'use strict';
import { fa } from './engine.js';

export const ERAS = [
  { id: 'stone',   name: 'عصر سنگی',       icon: '🪨', desc: 'با چوب و سنگ زنده می‌مانی. آتش را روشن نگه دار!' },
  { id: 'farm',    name: 'عصر کشاورزی',    icon: '🌾', desc: 'کشاورزی و دامداری آغاز شد؛ جمعیت رو به رشد است.' },
  { id: 'bronze',  name: 'عصر فلزی',       icon: '⚒️', desc: 'فلزات را کشف کردی! ابزار و سلاح بهتر بساز.' },
  { id: 'medival', name: 'قرون وسطی',      icon: '🏰', desc: 'قلعه‌ها و بازارها شهر را آباد می‌کنند.' },
  { id: 'industry',name: 'عصر صنعتی',      icon: '🏭', desc: 'کارخانه‌ها دود می‌کنند و قطارها می‌دوندند…' },
  { id: 'modern',  name: 'عصر مدرن',       icon: '🏙️', desc: 'برق، ماشین و آسمان‌خراش! تمدن تو به اوج رسید.' },
];

// هر ساختمان: بهای ساخت، تولید بر ثانیه، محدودیت عصر/تعداد
export const CATALOG = [
  { id: 'fire',    name: 'آتش‌گاه',   icon: '🔥', era: 0, max: 1,  cost: { wood: 15 },                  prod: { sci: .05 },            desc: 'قلب دهکده. بدونش شب‌ها سرد است!' },
  { id: 'tent',    name: 'چادر',      icon: '⛺', era: 0, max: 99, cost: { wood: 10, food: 5 },          prod: { popMax: 2 },            desc: '+۲ جمعیت ظرفیت' },
  { id: 'woodman', name: 'جمع‌کننده چوب', icon: '🪓', era: 0, max: 20, cost: { food: 8 },                prod: { wood: .25 },            desc: 'چوب می‌آورد' },
  { id: 'quarry',  name: 'معدن سنگ',  icon: '⛏️', era: 0, max: 10, cost: { wood: 25 },                  prod: { stone: .15 },            desc: 'سنگ می‌آورد' },
  { id: 'farm',    name: 'مزرعه',     icon: '🌾', era: 1, max: 20, cost: { wood: 40, stone: 10 },        prod: { food: .8, popMax: 1 },   desc: 'غذا و جمعیت' },
  { id: 'well',    name: 'چاه آب',    icon: '💧', era: 1, max: 5,  cost: { stone: 20 },                 prod: { food: .2, popMax: 2 },   desc: 'آبِ سالم، زندگی سالم' },
  { id: 'barn',    name: 'انبار غذا', icon: '🏚️', era: 1, max: 5,  cost: { wood: 60 },                  prod: { foodMax: 300 },          desc: '+۳۰۰ سقف غذا' },
  { id: 'forge',   name: 'فورج',      icon: '⚒️', era: 2, max: 8,  cost: { wood: 90, stone: 60 },        prod: { sci: .4, gold: .1 },      desc: 'فلزکاری و علم' },
  { id: 'mine',    name: 'معدن فلز',  icon: '⛏️', era: 2, max: 8,  cost: { wood: 120, stone: 80 },       prod: { gold: .35, stone: .2 },  desc: 'فلز و سنگ' },
  { id: 'wall',    name: 'دیوار دفاع',icon: '🧱', era: 3, max: 4,  cost: { stone: 150, gold: 30 },      prod: { sci: .3, popMax: 4 },     desc: 'امنیت و افتخار' },
  { id: 'market',  name: 'بازار',     icon: '🏪', era: 3, max: 6,  cost: { wood: 160, gold: 40 },       prod: { gold: .8 },              desc: 'تجارت پرسود' },
  { id: 'mill',    name: 'آسیاب بادی',icon: '🌬️', era: 3, max: 6,  cost: { wood: 140, stone: 60 },      prod: { food: 1.2, sci: .2 },    desc: 'غذای بیشتر، علم بیشتر' },
  { id: 'factory', name: 'کارخانه',   icon: '🏭', era: 4, max: 8,  cost: { gold: 200, stone: 200 },     prod: { gold: 2.5, sci: .8 },    desc: 'دود و طلا' },
  { id: 'rail',    name: 'ایستگاه قطار', icon: '🚉', era: 4, max: 1, cost: { gold: 500, wood: 300 },    prod: { gold: 3 },               desc: 'قطار از دهکده رد می‌شود' },
  { id: 'lab',     name: 'آزمایشگاه', icon: '🔬', era: 5, max: 6,  cost: { gold: 400, sci: 150 },       prod: { sci: 2.5 },              desc: 'علم آینده' },
  { id: 'tower',   name: 'برج برق',   icon: '🗼', era: 5, max: 6,  cost: { gold: 350 },                 prod: { gold: 1.5, popMax: 3 },   desc: 'شب‌ها روشن' },
  { id: 'skyscraper', name: 'آسمان‌خراش', icon: '🏢', era: 5, max: 10, cost: { gold: 600, sci: 300 },   prod: { gold: 4, popMax: 10 },   desc: 'بلندتر و بلندتر!' },
];

// هزینهٔ رفتن به عصر بعدی
export const ERA_COST = [
  { food: 60, wood: 60, stone: 40, sci: 10 },
  { food: 150, wood: 150, stone: 100, sci: 40 },
  { wood: 250, stone: 200, gold: 60, sci: 120 },
  { gold: 200, stone: 300, sci: 250 },
  { gold: 800, sci: 600 },
];

export const G = {
  pid: null,
  era: 0,
  res: { food: 30, wood: 25, stone: 0, sci: 0, gold: 0 },
  caps: { food: 200 },
  pop: 3, popMax: 3,
  built: {},          // id -> count
  ts: Date.now(),
};

export const countOf = id => G.built[id] || 0;
export const canAfford = c => Object.entries(c).every(([k, v]) => G.res[k] >= v);
export const eraItems = () => CATALOG.filter(b => b.era <= G.era);

export function buy(id) {
  const b = CATALOG.find(x => x.id === id);
  if (!b || b.era > G.era || countOf(id) >= b.max || !canAfford(b.cost)) return false;
  for (const [k, v] of Object.entries(b.cost)) G.res[k] -= v;
  G.built[id] = countOf(id) + 1;
  if (b.prod.popMax) G.popMax += b.prod.popMax;
  if (b.prod.foodMax) G.caps.food += b.prod.foodMax;
  G.pop = Math.min(G.pop, G.popMax);
  return true;
}

export function eraUp() {
  if (G.era >= ERAS.length - 1) return false;
  const c = ERA_COST[G.era];
  if (!canAfford(c)) return false;
  for (const [k, v] of Object.entries(c)) G.res[k] -= v;
  G.era++;
  return true;
}

// تیک اقتصادی: تولید، مصرف غذا (سوروایوال)، رشد جمعیت
export function tick(dt) {
  const p = { food: 0, wood: 0, stone: 0, sci: 0, gold: 0 };
  for (const b of CATALOG) {
    const n = countOf(b.id); if (!n) continue;
    for (const [k, v] of Object.entries(b.prod)) if (G.res[k] !== undefined) p[k] += v * n;
  }
  // جمعیت هم کندکند کار می‌کند
  const workers = Math.min(G.pop, 10);
  p.wood += workers * .04; p.food += workers * .02;

  for (const k of Object.keys(p)) {
    G.res[k] = Math.min(k === 'food' ? G.caps.food : 99999, G.res[k] + p[k] * dt);
  }

  // مصرف غذا: هر نفر ۰/۰۵ در ثانیه — اگر غذا تمام شد، جمعیت کم می‌شود (سوروایوال!)
  G.res.food -= G.pop * .05 * dt;
  if (G.res.food <= 0) {
    G.res.food = 0;
    if (G.pop > 1 && Math.random() < dt * .1) { G.pop--; onStarve(); }
  } else if (G.pop < G.popMax && Math.random() < dt * .12 * (G.res.food > 20 ? 1 : .2)) {
    G.pop++; // غذای کافی → نوزاد جدید!
  }
  return p;
}

let starveCb = null;
export const onStarve = (cb) => { if (cb) starveCb = cb; else starveCb && starveCb(); };
export const fmtCost = c => Object.entries(c).map(([k, v]) => `${{ food: '🍖', wood: '🪵', stone: '🪨', sci: '📜', gold: '🪙' }[k]}${fa(v)}`).join(' ');
