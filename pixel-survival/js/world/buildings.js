// ═══ ساختمان‌ها: 배치، رندر، انیمیشن ═══
import { TILE, HALF, iso, rnd, pick } from '../core/engine.js';
import { CATALOG, countOf } from '../core/state.js';
import { buildSpots } from './terrain.js';

export const buildings = []; // { id, type, x, y, gx, gy, health, anim, builtAt }

const BUILD_SPRITES = {
  // تعریف شکل‌های پیکسلی برای هر ساختمان
  campfire: drawCampfire,
  tent: drawTent,
  woodcutter: drawWoodcutter,
  quarry: drawQuarry,
  forager: drawForager,
  farm: drawFarm,
  well: drawWell,
  granary: drawGranary,
  hut: drawHut,
  forge: drawForge,
  mine: drawMine,
  barracks: drawBarracks,
  workshop: drawWorkshop,
  wall: drawWall,
  market: drawMarket,
  mill: drawMill,
  keep: drawKeep,
  factory: drawFactory,
  railway: drawRailway,
  powerplant: drawPowerplant,
  apartment: drawApartment,
  lab: drawLab,
  solar: drawSolar,
  skyscraper: drawSkyscraper,
  spacelift: drawSpacelift,
};

export function placeBuilding(type) {
  // پیدا کردن محل خالی
  let spot = buildSpots.find(s => !s.used);
  if (!spot) return false;
  
  spot.used = true;
  const b = CATALOG.find(c => c.id === type);
  const animOffset = rnd(0, 1000);
  
  buildings.push({
    id: type,
    type: b,
    x: spot.x, y: spot.y,
    gx: spot.gx, gy: spot.gy,
    health: 1,
    anim: animOffset,
    builtAt: Date.now(),
    progress: 1,
  });
  return true;
}

export function getBuildingAt(gx, gy) {
  return buildings.find(b => b.gx === gx && b.gy === gy);
}

export function renderBuildings(ctx, cam, dt) {
  const light = getLightLevel();
  const time = Date.now() * 0.001;
  
  // مرتب‌سازی بر اساس عمق
  buildings.sort((a, b) => (a.gy + a.gx) - (b.gy + b.gx));
  
  for (const b of buildings) {
    const p = iso(b.x, b.y, 4);
    const cx = p.x + innerWidth / 2, cy = p.y + innerHeight / 2;
    
    // سایه
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, TILE * 0.6, TILE * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // انیمیشن ساخت
    if (b.progress < 1) {
      b.progress += dt * 0.5;
      ctx.globalAlpha = b.progress;
    }
    
    // رسم ساختمان
    const drawFn = BUILD_SPRITES[b.id];
    if (drawFn) drawFn(ctx, cx, cy, time, light, b);
    
    ctx.globalAlpha = 1;
    
    // افکت‌های خاص
    if (b.id === 'campfire') drawFireParticles(ctx, cx, cy - 10, time);
    if (b.id === 'forge') drawForgeParticles(ctx, cx, cy - 10, time);
    if (b.id === 'factory') drawFactorySmoke(ctx, cx, cy - 20, time);
    if (b.id === 'powerplant') drawPowerParticles(ctx, cx, cy - 15, time);
    if (b.id === 'spacelift') drawRocketParticles(ctx, cx, cy - 40, time);
  }
}

// ========== توابع رسم ساختمان‌ها ==========
function drawBase(ctx, x, y, w, h, baseCol, roofCol, accentCol) {
  // بدنه
  ctx.fillStyle = baseCol;
  ctx.fillRect(x - w/2, y - h, w, h);
  // سقف
  ctx.fillStyle = roofCol;
  ctx.beginPath();
  ctx.moveTo(x, y - h - 4);
  ctx.lineTo(x + w/2 + 2, y - h + 2);
  ctx.lineTo(x + w/2 + 2, y + 2);
  ctx.lineTo(x - w/2 - 2, y + 2);
  ctx.lineTo(x - w/2 - 2, y - h + 2);
  ctx.closePath();
  ctx.fill();
  // در
  ctx.fillStyle = accentCol;
  ctx.fillRect(x - 3, y - 8, 6, 8);
}

function drawCampfire(ctx, x, y, t, light) {
  // سنگ‌ها
  ctx.fillStyle = '#444';
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * 8, y + Math.sin(a) * 4, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // آتش
  for (let i = 0; i < 8; i++) {
    const h = 8 + Math.sin(t * 10 + i) * 4;
    const w = 4 + Math.sin(t * 8 + i) * 2;
    const col = `hsl(${15 + Math.sin(t * 5 + i) * 20}, 100%, ${50 + light * 20}%)`;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(x, y - h, w, h * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTent(ctx, x, y, t, light) {
  ctx.fillStyle = `#${['8b4513','a0522d','cd853f'][Math.floor(Math.random()*3)]}`;
  ctx.beginPath();
  ctx.moveTo(x, y - 14);
  ctx.lineTo(x + 10, y + 2);
  ctx.lineTo(x - 10, y + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff8';
  ctx.fillRect(x - 3, y - 2, 6, 4);
}

function drawWoodcutter(ctx, x, y, t, light) {
  drawBase(ctx, x, y, 20, 16, '#5d4037', '#3e2723', '#8d6e63');
  // چوب‌ها
  ctx.fillStyle = '#6d4c41';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x - 8 + i * 5, y - 20, 3, 10);
  }
  // انیمیشن کوبیدن
  if (Math.sin(t * 3) > 0.5) {
    ctx.fillStyle = '#ff6b35';
    ctx.fillRect(x, y - 22, 4, 6);
  }
}

function drawQuarry(ctx, x, y, t, light) {
  drawBase(ctx, x, y, 24, 14, '#555', '#444', '#777');
  // سنگ‌های شکسته
  ctx.fillStyle = '#666';
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(x - 10 + (i%3)*7, y - 8 + Math.floor(i/3)*6, 5, 5);
  }
}

function drawForager(ctx, x, y, t, light) {
  drawBase(ctx, x, y, 18, 14, '#4a7c2e', '#3a6b1e', '#6b9c3f');
  // توت‌ها
  ctx.fillStyle = '#e03030';
  for (let i = 0; i < 4; i++) {
    const bx = x - 6 + (i%2)*12;
    const by = y - 10 + Math.floor(i/2)*6;
    ctx.beginPath();
    ctx.arc(bx, by, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawFarm(ctx, x, y, t, light) {
  // زمین‌های کشت
  const colors = ['#8fbc8f', '#7fa87f', '#6fa06f'];
  for (let row = 0; row < 3; row++) {
    ctx.fillStyle = colors[row % 3];
    ctx.fillRect(x - 14, y - 4 + row * 6, 28, 5);
    // گیاهان
    ctx.fillStyle = '#3a7a22';
    for (let i = 0; i < 7; i++) {
      const h = 4 + Math.sin(t * 2 + i + row * 3) * 2;
      ctx.fillRect(x - 12 + i * 4, y - 4 + row * 6 - h, 2, h);
    }
  }
  // کپه
  drawBase(ctx, x + 18, y, 12, 14, '#5d4037', '#3e2723', '#8d6e63');
}

function drawWell(ctx, x, y, t, light) {
  // ستون چاه
  ctx.fillStyle = '#555';
  ctx.fillRect(x - 6, y - 14, 12, 16);
  // سقف
  ctx.fillStyle = '#8b4513';
  ctx.fillRect(x - 8, y - 18, 16, 6);
  ctx.fillStyle = '#654321';
  ctx.fillRect(x - 2, y - 22, 4, 8);
  // آب
  ctx.fillStyle = `rgba(30,144,255,${0.6 + light * 0.3})`;
  ctx.beginPath();
  ctx.arc(x, y - 6, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawGranary(ctx, x, y, t, light) {
  drawBase(ctx, x, y, 26, 18, '#8b6914', '#b8860b', '#daa520');
  // در بزرگ
  ctx.fillStyle = '#654321';
  ctx.fillRect(x - 6, y - 12, 12, 12);
  // گله‌گله روی سقف
  ctx.fillStyle = '#f5deb3';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(x - 6 + i * 6, y - 20, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHut(ctx, x, y, t, light) {
  drawBase(ctx, x, y, 20, 16, '#6b4423', '#4a2c1a', '#8b6914');
  // دود
  if (Math.sin(t) > 0) {
    ctx.fillStyle = 'rgba(100,100,100,0.4)';
    ctx.beginPath();
    ctx.arc(x + 6, y - 22 + Math.sin(t*3)*2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawForge(ctx, x, y, t, light) {
  drawBase(ctx, x, y, 28, 18, '#444', '#333', '#8b4513');
  // کوره
  ctx.fillStyle = '#222';
  ctx.fillRect(x - 4, y - 22, 8, 12);
  // دود
  ctx.fillStyle = `rgba(80,80,80,${0.3 + light * 0.2})`;
  ctx.beginPath();
  ctx.arc(x, y - 26 + Math.sin(t*2)*3, 4 + Math.sin(t*4)*2, 0, Math.PI * 2);
  ctx.fill();
}

function drawMine(ctx, x, y, t, light) {
  drawBase(ctx, x, y, 24, 16, '#333', '#222', '#666');
  // ورودی معدن
  ctx.fillStyle = '#111';
  ctx.fillRect(x - 6, y - 8, 12, 10);
  // ریل
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 12, y + 2);
  ctx.lineTo(x + 12, y + 2);
  ctx.stroke();
  // دود
  ctx.fillStyle = `rgba(60,60,60,${0.4})`;
  ctx.beginPath();
  ctx.arc(x, y - 20 + Math.sin(t)*2, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawBarracks(ctx, x, y, t, light) {
  drawBase(ctx, x, y, 30, 18, '#554433', '#443322', '#886644');
  // برج‌ها
  for (let i = -1; i <= 1; i += 2) {
    ctx.fillStyle = '#443322';
    ctx.fillRect(x + i * 13, y - 24, 8, 10);
    ctx.fillStyle = '#664433';
    ctx.beginPath();
    ctx.moveTo(x + i * 13 - 4, y - 24);
    ctx.lineTo(x + i * 13, y - 30);
    ctx.lineTo(x + i * 13 + 4, y - 24);
    ctx.fill();
  }
  // پرچم
  ctx.fillStyle = '#cc0000';
  ctx.fillRect(x - 1, y - 32, 2, 10);
  ctx.fillRect(x + 1, y - 32, 8, 5);
}

function drawWorkshop(ctx, x, y, t, light) {
  drawBase(ctx, x, y, 24, 16, '#4a4a5a', '#3a3a4a', '#6a6a8a');
  // دھان‌های اختراع
  ctx.fillStyle = '#00ffff';
  for (let i = 0; i < 3; i++) {
    const bx = x - 6 + i * 6;
    ctx.fillRect(bx - 1, y - 10 + Math.sin(t * 2 + i) * 2, 2, 4);
  }
}

function drawWall(ctx, x, y, t, light) {
  ctx.fillStyle = '#666';
  ctx.fillRect(x - 18, y - 10, 36, 12);
  // کمرنگ‌ها
  ctx.fillStyle = '#555';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x - 16 + i * 9, y - 14, 6, 16);
    ctx.fillStyle = '#777';
    ctx.beginPath();
    ctx.moveTo(x - 16 + i * 9 - 3, y - 14);
    ctx.lineTo(x - 16 + i * 9, y - 20);
    ctx.lineTo(x - 16 + i * 9 + 3, y - 14);
    ctx.fill();
  }
}

function drawMarket(ctx, x, y, t, light) {
  drawBase(ctx, x, y, 28, 16, '#8b6914', '#daa520', '#ffd700');
  // چادر بازار
  ctx.fillStyle = '#fff8';
  ctx.beginPath();
  ctx.moveTo(x, y - 18);
  ctx.lineTo(x + 16, y - 2);
  ctx.lineTo(x - 16, y - 2);
  ctx.fill();
  // کالا
  ctx.fillStyle = '#e03030';
  ctx.fillRect(x - 8, y + 2, 4, 4);
  ctx.fillStyle = '#30e030';
  ctx.fillRect(x + 4, y + 2, 4, 4);
}

function drawMill(ctx, x, y, t, light) {
  drawBase(ctx, x, y, 22, 18, '#6b4423', '#4a2c1a', '#8b6914');
  // بال‌های بادی
  const angle = t * 2;
  ctx.strokeStyle = '#8b6914';
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    const a = angle + i * Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 18);
    ctx.lineTo(x + Math.cos(a) * 18, y - 18 + Math.sin(a) * 18);
    ctx.stroke();
  }
  ctx.fillStyle = '#ddd';
  ctx.beginPath();
  ctx.arc(x, y - 18, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawKeep(ctx, x, y, t, light) {
  drawBase(ctx, x, y, 40, 24, '#555', '#444', '#777');
  // برج‌های گوشه
  for (let dx of [-1, 1]) for (let dy of [-1, 1]) {
    ctx.fillStyle = '#444';
    ctx.fillRect(x + dx * 16, y - 32 + dy * 4, 10, 16);
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.moveTo(x + dx * 16 - 5, y - 32 + dy * 4);
    ctx.lineTo(x + dx * 16, y - 40 + dy * 4);
    ctx.lineTo(x + dx * 16 + 5, y - 32 + dy * 4);
    ctx.fill();
  }
  // پرچم مرکزی
  ctx.fillStyle = '#8b0000';
  ctx.fillRect(x - 1, y - 42, 2, 14);
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(x + 1, y - 42, 12, 7);
}

function drawFactory(ctx, x, y, t, light) {
  drawBase(ctx, x, y, 40, 22, '#444', '#333', '#666');
  // دودکش‌ها
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#333';
    ctx.fillRect(x - 14 + i * 14, y - 32, 6, 14);
  }
  // پنجره‌ها
  ctx.fillStyle = '#ffff88';
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(x - 16 + i * 8, y - 12 + row * 10, 4, 6);
    }
  }
}

function drawRailway(ctx, x, y, t, light) {
  drawBase(ctx, x, y, 48, 16, '#555', '#444', '#888');
  // ریل
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 30, y + 4);
  ctx.lineTo(x + 30, y + 4);
  ctx.stroke();
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 30, y + 2);
  ctx.lineTo(x + 30, y + 2);
  ctx.stroke();
  // قطار
  const trainX = x - 25 + (Math.sin(t * 0.5) + 1) * 25;
  ctx.fillStyle = '#222';
  ctx.fillRect(trainX - 10, y - 8, 20, 10);
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(trainX - 8, y - 6, 16, 6);
  // دود قطار
  ctx.fillStyle = 'rgba(100,100,100,0.3)';
  ctx.beginPath();
  ctx.arc(trainX - 12, y - 10, 6, 0, Math.PI * 2);
  ctx.fill();
}

function drawPowerplant(ctx, x, y, t, light) {
  drawBase(ctx, x, y, 36, 22, '#333', '#222', '#555');
  // برج‌های برق
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 14 + i * 14, y - 10);
    ctx.lineTo(x - 14 + i * 14, y - 30);
    ctx.stroke();
    // مهار
    ctx.beginPath();
    ctx.arc(x - 14 + i * 14, y - 30, 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  // سیم‌ها
  ctx.strokeStyle = '#ffd70088';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 20, y - 30);
  ctx.lineTo(x + 20, y - 30);
  ctx.stroke();
}

function drawApartment(ctx, x, y, t, light) {
  drawBase(ctx, x, y, 28, 30, '#555577', '#444466', '#7777aa');
  // پنجره‌های متعدد
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 4; col++) {
      const lit = Math.random() > 0.3 || Math.sin(t + row * 3 + col * 7) > 0;
      ctx.fillStyle = lit ? '#ffff88' : '#222244';
      ctx.fillRect(x - 12 + col * 8, y - 26 + row * 6, 5, 4);
    }
  }
}

function drawLab(ctx, x, y, t, light) {
  drawBase(ctx, x, y, 30, 20, '#2a2a4a', '#1a1a3a', '#4a4a8a');
  // گмбاد شیشه‌ای
  ctx.fillStyle = 'rgba(0,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(x, y - 24, 10, 0, Math.PI);
  ctx.fill();
  //アンテナ
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 34);
  ctx.lineTo(x, y - 42);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y - 42, 3, 0, Math.PI * 2);
  ctx.stroke();
  // پالس
  ctx.fillStyle = `rgba(0,255,255,${0.5 + Math.sin(t*5)*0.3})`;
  ctx.beginPath();
  ctx.arc(x, y - 42, 5 + Math.sin(t*10)*2, 0, Math.PI * 2);
  ctx.fill();
}

function drawSolar(ctx, x, y, t, light) {
  drawBase(ctx, x, y, 32, 14, '#2a3a2a', '#1a2a1a', '#3a5a3a');
  // پنل‌های خورشیدی
  ctx.fillStyle = '#1a1a3a';
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x - 14 + i * 9, y - 20, 8, 12);
    // درخشش
    ctx.fillStyle = `rgba(255,255,100,${light * 0.3})`;
    ctx.fillRect(x - 13 + i * 9, y - 19, 6, 2);
    ctx.fillStyle = '#1a1a3a';
  }
}

function drawSkyscraper(ctx, x, y, t, light) {
  drawBase(ctx, x, y, 24, 50, '#444466', '#333355', '#666688');
  // آنتن
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - 54);
  ctx.lineTo(x, y - 62);
  ctx.stroke();
  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.arc(x, y - 62, 2, 0, Math.PI * 2);
  ctx.fill();
  // پنجره‌ها
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 3; col++) {
      const lit = Math.sin(t * 0.5 + row + col * 5) > -0.5;
      ctx.fillStyle = lit ? '#aaccff' : '#111133';
      ctx.fillRect(x - 9 + col * 9, y - 46 + row * 5, 6, 3);
    }
  }
}

function drawSpacelift(ctx, x, y, t, light) {
  drawBase(ctx, x, y, 30, 24, '#1a1a2e', '#16213e', '#0f3460');
  // برج فضا
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y - 24);
  ctx.lineTo(x, y - 80);
  ctx.stroke();
  // راکت
  const rocketY = y - 40 + Math.sin(t * 0.3) * 20;
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - 4, rocketY - 20, 8, 20);
  ctx.fillStyle = '#f00';
  ctx.beginPath();
  ctx.moveTo(x, rocketY - 24);
  ctx.lineTo(x - 6, rocketY - 10);
  ctx.lineTo(x + 6, rocketY - 10);
  ctx.fill();
  ctx.fillStyle = '#ff8';
  ctx.fillRect(x - 2, rocketY + 2, 4, 6);
}

import { dayTime } from '../core/engine.js';

// ========== افکت‌های 파티클 ==========
function drawFireParticles(ctx, x, y, t) {
  for (let i = 0; i < 6; i++) {
    const px = x + (Math.sin(t * 5 + i) - 0.5) * 8;
    const py = y - (t * 50 + i * 30) % 40 - 5;
    const life = ((t * 50 + i * 30) % 40) / 40;
    const size = (1 - life) * 4 + 1;
    const col = `hsl(${15 + life * 40}, 100%, ${50 + life * 30}%)`;
    ctx.fillStyle = col;
    ctx.globalAlpha = 1 - life;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawForgeParticles(ctx, x, y, t) {
  for (let i = 0; i < 4; i++) {
    const px = x + (Math.sin(t * 3 + i) - 0.5) * 10;
    const py = y - (t * 30 + i * 40) % 30 - 5;
    const life = ((t * 30 + i * 40) % 30) / 30;
    ctx.fillStyle = `hsl(${15 + life * 30}, 100%, ${50 + life * 20}%)`;
    ctx.globalAlpha = (1 - life) * 0.6;
    ctx.fillRect(px - 1, py - 1, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawFactorySmoke(ctx, x, y, t) {
  for (let i = 0; i < 3; i++) {
    const px = x - 10 + i * 10 + Math.sin(t + i) * 3;
    const py = y - (t * 20 + i * 50) % 50 - 5;
    const life = ((t * 20 + i * 50) % 50) / 50;
    const size = 5 + life * 10;
    ctx.fillStyle = `rgba(80,80,80,${(1 - life) * 0.3})`;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPowerParticles(ctx, x, y, t) {
  for (let i = 0; i < 8; i++) {
    const a = t * 3 + i * Math.PI / 4;
    const r = 8 + Math.sin(t * 5 + i) * 4;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r * 0.5;
    ctx.fillStyle = `rgba(0,255,255,${0.5 + Math.sin(t*10+i)*0.3})`;
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRocketParticles(ctx, x, y, t) {
  if (Math.sin(t * 0.3) > 0.7) {
    for (let i = 0; i < 10; i++) {
      const px = x + (Math.random() - 0.5) * 12;
      const py = y + (Math.random() - 0.5) * 10 + 10;
      ctx.fillStyle = `hsl(${15 + Math.random() * 40}, 100%, ${50 + Math.random() * 30}%)`;
      ctx.globalAlpha = Math.random() * 0.8;
      ctx.beginPath();
      ctx.arc(px, py, 2 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function getLightLevel() {
  const t = dayTime % 1;
  return 0.3 + 0.7 * Math.max(0, Math.sin(t * Math.PI * 2));
}