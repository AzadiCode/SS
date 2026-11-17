// ═══ منطق بازی: منابع، Eras، Catalog، اقتصاد ═══
import { fa } from './engine.js';

export const ERAS = [
  { id: 'stone',   name: 'عصر سنگی',       icon: '🪨', color: '#8b7355', desc: 'با چوب و سنگ زنده می‌مانی. آتش را روشن نگه دار!' },
  { id: 'farm',    name: 'عصر کشاورزی',    icon: '🌾', color: '#6b8e23', desc: 'کشاورزی و دامداری آغاز شد؛ جمعیت رو به رشد است.' },
  { id: 'bronze',  name: 'عصر برنز',       icon: '⚒️', color: '#cd7f32', desc: 'فلزات را کشف کردی! ابزار و سلاح بهتر بساز.' },
  { id: 'medieval',name: 'قرون وسطی',      icon: '🏰', color: '#8b4513', desc: 'قلعه‌ها و بازارها شهر را آباد می‌کنند.' },
  { id: 'industrial', name: 'عصر صنعتی',   icon: '🏭', color: '#708090', desc: 'کارخانه‌ها دود می‌کنند و راه‌آهن می‌دوندند…' },
  { id: 'modern',  name: 'عصر مدرن',       icon: '🏙️', color: '#4682b4', desc: 'برق، ماشین و آسمان‌خراش! تمدن تو به اوج رسید.' },
];

export const CATALOG = [
  // Era 0: Stone
  { id: 'campfire',  name: 'آتش‌گاه',      icon: '🔥',  era: 0, max: 1,  cost: { wood: 15 },                    prod: { science: 0.05 },         desc: 'قلب اردوگاه. شب‌ها گرمی و نور می‌دهد!' },
  { id: 'tent',      name: 'چادر',         icon: '⛺',   era: 0, max: 20, cost: { wood: 10, food: 5 },            prod: { popMax: 2 },             desc: '+۲ ظرفیت جمعیت' },
  { id: 'woodcutter',name: 'چوبکوب',       icon: '🪓',  era: 0, max: 15, cost: { food: 8 },                      prod: { wood: 0.3 },             desc: 'چوب می‌آورد' },
  { id: 'quarry',    name: 'معدن سنگ',     icon: '⛏️',  era: 0, max: 8,  cost: { wood: 25 },                     prod: { stone: 0.2 },            desc: 'سنگ می‌آورد' },
  { id: 'forager',   name: 'جویای غذا',    icon: '🍓',  era: 0, max: 10, cost: { food: 5 },                      prod: { food: 0.25 },            desc: 'غذا می‌یابد' },
  
  // Era 1: Farm
  { id: 'farm',      name: 'مزرعه',        icon: '🌾',  era: 1, max: 15, cost: { wood: 40, stone: 15 },          prod: { food: 1.0, popMax: 1 },  desc: 'غذا و +۱ جمعیت' },
  { id: 'well',      name: 'چاه',          icon: '💧',  era: 1, max: 4,  cost: { stone: 20 },                    prod: { food: 0.3, popMax: 2 },  desc: 'آب سالم، زندگی سالم' },
  { id: 'granary',   name: 'انبار غذا',    icon: '🏚️', era: 1, max: 3,  cost: { wood: 60 },                      prod: { foodMax: 300 },          desc: '+۳۰۰ سقف غذا' },
  { id: 'hut',       name: 'کولبه',        icon: '🏠',  era: 1, max: 30, cost: { wood: 30, fiber: 10 },          prod: { popMax: 3 },             desc: '+۳ جمعیت' },
  
  // Era 2: Bronze
  { id: 'forge',     name: 'فورج',         icon: '⚒️',  era: 2, max: 6,  cost: { wood: 80, stone: 50 },          prod: { science: 0.5, gold: 0.15 }, desc: 'فلزکاری و علم' },
  { id: 'mine',      name: 'معدن فلز',     icon: '⛏️',  era: 2, max: 6,  cost: { wood: 100, stone: 80 },         prod: { metal: 0.3, stone: 0.2 }, desc: 'فلز و سنگ' },
  { id: 'barracks',  name: 'ارتشگاه',      icon: '⚔️',  era: 2, max: 3,  cost: { wood: 120, metal: 30 },         prod: { gold: 0.5, popMax: 2 },  desc: 'دفاع و طلا' },
  { id: 'workshop',  name: 'کارگاه',       icon: '🔧',  era: 2, max: 5,  cost: { wood: 90, metal: 20 },          prod: { science: 0.4 },          desc: 'اختراعات و علم' },
  
  // Era 3: Medieval
  { id: 'wall',      name: 'دیوار شهر',    icon: '🧱',  era: 3, max: 8,  cost: { stone: 150, metal: 30 },        prod: { science: 0.4, popMax: 4 }, desc: 'امنیت و افتخار' },
  { id: 'market',    name: 'بازار',        icon: '🏪',  era: 3, max: 4,  cost: { wood: 160, gold: 50 },          prod: { gold: 1.2 },             desc: 'تجارت پرسود' },
  { id: 'mill',      name: 'آسیاب بادی',   icon: '🌬️', era: 3, max: 4,  cost: { wood: 140, stone: 60 },          prod: { food: 1.5, science: 0.3 }, desc: 'غذا و علم' },
  { id: 'keep',      name: 'قلعه',         icon: '🏰',  era: 3, max: 1,  cost: { stone: 300, gold: 100 },        prod: { gold: 2, popMax: 10 },   desc: 'مرکز قدرت' },
  
  // Era 4: Industrial
  { id: 'factory',   name: 'کارخانه',      icon: '🏭',  era: 4, max: 6,  cost: { metal: 200, stone: 200 },       prod: { gold: 3, science: 1 },   desc: 'تولید انبوه' },
  { id: 'railway',   name: 'ایستگاه قطار', icon: '🚉',  era: 4, max: 1,  cost: { gold: 500, metal: 300 },       prod: { gold: 4 },               desc: 'قطار طلا می‌آورد' },
  { id: 'powerplant',name: 'نیروگاه',      icon: '⚡',  era: 4, max: 2,  cost: { metal: 250, gold: 200 },        prod: { gold: 2, science: 1.5 }, desc: 'برق برای شهر' },
  { id: 'apartment', name: 'آپارتمان',     icon: '🏢',  era: 4, max: 10, cost: { metal: 150, stone: 100 },       prod: { popMax: 8 },             desc: '+۸ جمعیت' },
  
  // Era 5: Modern
  { id: 'lab',       name: 'آزمایشگاه',    icon: '🔬',  era: 5, max: 4,  cost: { gold: 400, science: 200 },      prod: { science: 3 },            desc: 'علم پیشرفته' },
  { id: 'solar',     name: 'مزرعه خورشیدی',icon: '☀️',  era: 5, max: 6,  cost: { gold: 300, metal: 100 },        prod: { gold: 2, science: 1 },   desc: 'انرژی پاک' },
  { id: 'skyscraper',name: 'آسمان‌خراش',   icon: '🏢',  era: 5, max: 8,  cost: { gold: 600, science: 300 },      prod: { gold: 5, popMax: 15 },   desc: 'بلندترین ساختمان‌ها' },
  { id: 'spacelift', name: 'پرتگاه فضا',   icon: '🚀',  era: 5, max: 1,  cost: { gold: 1000, science: 500 },     prod: { science: 10 },           desc: 'مرزهایش را بشکن!' },
];

export const ERA_COST = [
  { food: 60, wood: 60, stone: 30, science: 10 },
  { food: 150, wood: 120, stone: 100, science: 50 },
  { wood: 250, stone: 200, metal: 60, science: 150 },
  { gold: 200, stone: 300, metal: 150, science: 300 },
  { gold: 800, science: 600, metal: 400 },
];

export const G = {
  era: 0,
  res: { food: 30, wood: 25, stone: 0, fiber: 0, metal: 0, gold: 0, science: 0 },
  caps: { food: 200 },
  pop: 3, popMax: 3,
  built: {},
  day: 1,
  totalBuilt: 0,
};

export const countOf = id => G.built[id] || 0;
export const canAfford = c => Object.entries(c).every(([k, v]) => (G.res[k] ?? 0) >= v);
export const eraItems = () => CATALOG.filter(b => b.era <= G.era);

export function buy(id) {
  const b = CATALOG.find(x => x.id === id);
  if (!b || b.era > G.era || countOf(id) >= b.max || !canAfford(b.cost)) return false;
  for (const [k, v] of Object.entries(b.cost)) G.res[k] -= v;
  G.built[id] = countOf(id) + 1;
  if (b.prod.popMax) G.popMax += b.prod.popMax;
  if (b.prod.foodMax) G.caps.food += b.prod.foodMax;
  G.pop = Math.min(G.pop, G.popMax);
  G.totalBuilt++;
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

export function tick(dt) {
  const p = { food: 0, wood: 0, stone: 0, fiber: 0, metal: 0, gold: 0, science: 0 };
  
  for (const b of CATALOG) {
    const n = countOf(b.id); if (!n) continue;
    for (const [k, v] of Object.entries(b.prod)) if (p[k] !== undefined) p[k] += v * n;
  }
  
  // کارگران
  const workers = Math.min(G.pop, 20);
  p.wood += workers * 0.05;
  p.food += workers * 0.02;
  p.stone += workers * 0.01;
  
  for (const k of Object.keys(p)) {
    const cap = k === 'food' ? G.caps.food : 99999;
    G.res[k] = Math.min(cap, (G.res[k] ?? 0) + p[k] * dt);
  }
  
  // مصرف غذا
  G.res.food -= G.pop * 0.05 * dt;
  if (G.res.food <= 0) {
    G.res.food = 0;
    if (G.pop > 1 && Math.random() < dt * 0.1) { G.pop--; return { starved: true }; }
  } else if (G.pop < G.popMax && Math.random() < dt * 0.15 * (G.res.food > 30 ? 1 : 0.3)) {
    G.pop++;
    return { born: true };
  }
  return p;
}

let starveCb = null;
export const onStarve = (cb) => { starveCb = cb; };
export const notifyStarve = () => starveCb && starveCb();

export const ICONS = { food: '🍖', wood: '🪵', stone: '🪨', fiber: '🌿', metal: '⚒️', gold: '🪙', science: '📜' };
export const fmtCost = c => Object.entries(c).map(([k, v]) => `${ICONS[k] || ''}${fa(v)}`).join(' ');
export const fmtRes = (k, v) => `${ICONS[k] || ''}${fa(Math.floor(v))}`;

export function save() {
  localStorage.setItem('pixelSurvival', JSON.stringify(G));
}
export function load() {
  const s = localStorage.getItem('pixelSurvival');
  if (s) Object.assign(G, JSON.parse(s));
}