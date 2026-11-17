// ═══ زمین: جزیرهٔ پیکسلی پراسپارسی ═══
import { GRID, TILE, WORLD_W, WORLD_H, iso, rnd, pick } from '../core/engine.js';
import { dayTime, getLightLevel } from '../core/engine.js';

export const tiles = [];           // داده‌های تایل
export const buildSpots = [];      // مکان‌های قابل ساخت

const noise = (x, y, seed = 0) => {
  const n = Math.sin(x * 0.1 + seed) * Math.cos(y * 0.1 + seed) + Math.sin(x * 0.05 - y * 0.03) * 0.5;
  return n;
};

export function generateTerrain() {
  const cx = GRID / 2, cy = GRID / 2;
  
  for (let gx = 0; gx < GRID; gx++) {
    tiles[gx] = [];
    for (let gy = 0; gy < GRID; gy++) {
      const dx = gx - cx, dy = gy - cy;
      const dist = Math.sqrt(dx * dx + dy * dy) / (GRID * 0.45);
      let h = 1 - dist * dist;
      h += noise(gx, gy, 100) * 0.3;
      h += noise(gx, gy, 200) * 0.15;
      h += noise(gx, gy, 300) * 0.07;
      h = Math.max(0, Math.min(1, h));
      
      let type = 'water';
      if (h > 0.65) type = pick(['grass', 'grass', 'grass2']);
      else if (h > 0.45) type = 'sand';
      else if (h > 0.35) type = 'shallow';
      
      const res = Math.random() < 0.12 ? pick(['tree', 'rock', 'bush', 'berry']) : null;
      const res2 = Math.random() < 0.04 ? pick(['gold', 'crystal']) : null;
      
      tiles[gx][gy] = { h, type, res, res2, visible: false, explored: false };
      
      // محل ساخت
      if (h > 0.65 && h < 0.9 && !res && Math.random() < 0.15) {
        const wx = gx * TILE, wy = gy * TILE;
        buildSpots.push({ x: wx, y: wy, gx, gy, used: false });
      }
    }
  }
  
  // مرکز همیشه خاک
  const mid = GRID / 2 | 0;
  for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) {
    const x = mid + dx, y = mid + dy;
    if (x >= 0 && x < GRID && y >= 0 && y < GRID) {
      tiles[x][y].h = Math.max(tiles[x][y].h, 0.7);
      tiles[x][y].type = 'grass';
      tiles[x][y].res = null;
    }
  }
  
  buildSpots.push({ x: mid * TILE, y: mid * TILE, gx: mid, gy: mid, used: true }); // مرکز
}

function drawTile(ctx, x, y, tile, light) {
  const { h, type } = tile;
  const p = iso(x * TILE, y * TILE, h * 4);
  const cx = p.x + innerWidth / 2, cy = p.y + innerHeight / 2;
  
  // سایه زیرین
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + 2, TILE * 0.45, TILE * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // رنگ بر اساس نوع و ارتفاع
  let col;
  switch (type) {
    case 'water': col = `hsl(200, 60%, ${25 + light * 15}%)`; break;
    case 'shallow': col = `hsl(180, 40%, ${35 + light * 10}%)`; break;
    case 'sand': col = `hsl(45, 50%, ${50 + light * 15}%)`; break;
    case 'grass': col = `hsl(100, 40%, ${35 + h * 15 + light * 10}%)`; break;
    case 'grass2': col = `hsl(110, 35%, ${30 + h * 12 + light * 8}%)`; break;
    default: col = `hsl(80, 30%, ${30 + light * 10}%)`;
  }
  
  // مثلث ایزومتریک (دیموند)
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(cx, cy - HALF);
  ctx.lineTo(cx + HALF, cy);
  ctx.lineTo(cx, cy + HALF);
  ctx.lineTo(cx - HALF, cy);
  ctx.closePath();
  ctx.fill();
  
  // لبه بالا (ها이라يت)
  const hl = `hsl(${col.match(/\d+/g)[0]}, ${col.match(/\d+/g)[1]}%, ${Math.min(90, parseInt(col.match(/\d+/g)[2]) + 15 + light * 10)}%)`;
  ctx.strokeStyle = hl;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy - HALF);
  ctx.lineTo(cx + HALF, cy);
  ctx.lineTo(cx, cy + HALF);
  ctx.stroke();
  
  // ارتفاع - لایه‌های جانبی
  if (h > 0.5) {
    const layers = Math.floor(h * 3);
    for (let i = 0; i < layers; i++) {
      const shade = `hsl(${col.match(/\d+/g)[0]}, ${col.match(/\d+/g)[1]}%, ${Math.max(15, parseInt(col.match(/\d+/g)[2]) - 10 - i * 5)}%)`;
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.moveTo(cx - HALF, cy - i * 2);
      ctx.lineTo(cx, cy + HALF - i * 2);
      ctx.lineTo(cx + HALF, cy - i * 2);
      ctx.lineTo(cx, cy - HALF - i * 2);
      ctx.closePath();
      ctx.fill();
    }
  }
  
  return { cx, cy, h };
}

export function renderTerrain(ctx, cam) {
  const light = getLightLevel();
  const { x: camX, y: camY, z: camZ } = cam;
  
  // محدوده قابل مشاهده
  const viewR = Math.max(innerWidth, innerHeight) / camZ / TILE + 3;
  const cx = camX / TILE | 0, cy = camY / TILE | 0;
  const minX = Math.max(0, cx - viewR), maxX = Math.min(GRID - 1, cx + viewR);
  const minY = Math.max(0, cy - viewR), maxY = Math.min(GRID - 1, cy + viewR);
  
  // مرتب‌سازی برای رسم صحیح ( painter's algorithm )
  const drawList = [];
  for (let gx = minX; gx <= maxX; gx++) {
    for (let gy = minY; gy <= maxY; gy++) {
      const tile = tiles[gx][gy];
      const p = iso(gx * TILE, gy * TILE);
      const depth = p.x + p.y; // تقریبی
      drawList.push({ gx, gy, tile, depth });
      tile.visible = true;
      tile.explored = true;
    }
  }
  drawList.sort((a, b) => a.depth - b.depth);
  
  for (const d of drawList) {
    drawTile(ctx, d.gx, d.gy, d.tile, light);
  }
  
  // منابع روی تایل‌ها (در ال دوم)
  for (const d of drawList) {
    const { gx, gy, tile } = d;
    const p = iso(gx * TILE, gy * TILE, tile.h * 4 + 4);
    const cx = p.x + innerWidth / 2, cy = p.y + innerHeight / 2;
    
    if (tile.res) drawResource(ctx, cx, cy, tile.res, tile.h);
    if (tile.res2) drawRareResource(ctx, cx, cy, tile.res2, tile.h);
  }
}

function drawResource(ctx, x, y, type, h) {
  const baseY = y - h * 4 - 8;
  switch (type) {
    case 'tree':
      // درخت پیکسلی
      ctx.fillStyle = '#4a3728'; // تنه
      ctx.fillRect(x - 2, baseY + 8, 4, 10);
      // برگ‌ها
      const leafCol = ['#2d5a1a', '#3a7a22', '#4a9a2a'][Math.floor(Math.random() * 3)];
      ctx.fillStyle = leafCol;
      for (let i = 0; i < 3; i++) {
        const ly = baseY - i * 6;
        const w = 8 + i * 2;
        ctx.fillRect(x - w / 2, ly, w, 6);
      }
      break;
    case 'rock':
      ctx.fillStyle = '#6b6b6b';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const r = 6 + Math.sin(i * 1.3) * 2;
        ctx.lineTo(x + Math.cos(a) * r, baseY + Math.sin(a) * r * 0.5);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#888';
      ctx.stroke();
      break;
    case 'bush':
      ctx.fillStyle = '#2d6a20';
      ctx.beginPath();
      ctx.arc(x, baseY + 4, 6, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'berry':
      ctx.fillStyle = '#2d6a20';
      ctx.beginPath();
      ctx.arc(x, baseY + 4, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e03030';
      for (let i = 0; i < 5; i++) {
        const a = i * 1.2, r = 3 + Math.random() * 2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * r, baseY + 4 + Math.sin(a) * r * 0.5, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
  }
}

function drawRareResource(ctx, x, y, type, h) {
  const baseY = y - h * 4 - 12;
  const t = Date.now() * 0.003;
  const float = Math.sin(t) * 2;
  
  if (type === 'gold') {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 0.4 + t;
      const r = 4 + Math.sin(a * 2) * 1;
      ctx.lineTo(x + Math.cos(a) * r, baseY + float + Math.sin(a) * r * 0.5);
    }
    ctx.closePath();
    ctx.fill();
    // درخشش
    ctx.fillStyle = 'rgba(255,215,0,0.5)';
    ctx.beginPath();
    ctx.arc(x, baseY + float, 8, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === 'crystal') {
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + t * 0.5;
      const r = 5;
      ctx.lineTo(x + Math.cos(a) * r, baseY + float + Math.sin(a) * r * 0.5);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}