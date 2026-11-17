// ═══ موتور رندر Canvas 2D: پیکسلی، ایزومتریک، روز/شب ═══
export const $ = id => document.getElementById(id);
export const fa = n => n.toLocaleString('fa-IR');
export const rnd = (a, b) => a + Math.random() * (b - a);
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });

export const C = canvas;
export const X = ctx;
export const TILE = 32;      // اندازه تاйл پایه
export const HALF = TILE / 2;
export const GRID = 30;      // 30x30 تایل
export const WORLD_W = GRID * TILE;
export const WORLD_H = GRID * TILE;

let camX = WORLD_W / 2, camY = WORLD_H / 2, camZ = 1;
const targetCam = { x: camX, y: camY, z: camZ };
let dragging = false, dragStart = { x: 0, y: 0 };

export let dayTime = 0.3;    // 0=صبح، 0.5=عصر، 1=شب
export let daySpeed = 1 / 120; // چرخه ۲ دقیقه

function resize() {
  canvas.width = innerWidth * devicePixelRatio;
  canvas.height = innerHeight * devicePixelRatio;
  canvas.style.width = innerWidth + 'px';
  canvas.style.height = innerHeight + 'px';
  ctx.scale(devicePixelRatio, devicePixelRatio);
}
addEventListener('resize', resize);
resize();

// تبدیل مختصات ایزومتریک
export function iso(x, y, z = 0) {
  const sx = (x - y) * HALF;
  const sy = (x + y) * HALF * 0.5 - z * TILE * 0.3;
  return { x: sx, y: sy };
}

export function screenToIso(sx, sy) {
  const cx = innerWidth / 2, cy = innerHeight / 2;
  const wx = (sx - cx) / camZ + camX;
  const wy = (sy - cy) / camZ + camY;
  const x = (wx / HALF + wy / (HALF * 0.5)) / 2;
  const y = (wy / (HALF * 0.5) - wx / HALF) / 2;
  return { x: Math.floor(x), y: Math.floor(y) };
}

// ورودی
canvas.addEventListener('pointerdown', e => {
  dragging = true;
  dragStart = { x: e.clientX, y: e.clientY, camX: targetCam.x, camY: targetCam.y };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (!dragging) return;
  const dx = (e.clientX - dragStart.x) / camZ;
  const dy = (e.clientY - dragStart.y) / camZ;
  targetCam.x = clamp(dragStart.camX - dx, innerWidth / camZ / 2, WORLD_W - innerWidth / camZ / 2);
  targetCam.y = clamp(dragStart.camY - dy, innerHeight / camZ / 2, WORLD_H - innerHeight / camZ / 2);
});
canvas.addEventListener('pointerup', () => dragging = false);
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  const nz = clamp(camZ * (e.deltaY > 0 ? 0.9 : 1.1), 0.4, 2.5);
  const mx = innerWidth / 2, my = innerHeight / 2;
  const wx = (mx - innerWidth / 2) / camZ + camX;
  const wy = (my - innerHeight / 2) / camZ + camY;
  targetCam.z = nz;
  targetCam.x = wx - (mx - innerWidth / 2) / nz;
  targetCam.y = wy - (my - innerHeight / 2) / nz;
  targetCam.x = clamp(targetCam.x, innerWidth / nz / 2, WORLD_W - innerWidth / nz / 2);
  targetCam.y = clamp(targetCam.y, innerHeight / nz / 2, WORLD_H - innerHeight / nz / 2);
}, { passive: false });
addEventListener('keydown', e => { if (e.code === 'Space') { targetCam.x = WORLD_W / 2; targetCam.y = WORLD_H / 2; } });

export function updateCamera(dt) {
  camX += (targetCam.x - camX) * 0.1;
  camY += (targetCam.y - camY) * 0.1;
  camZ += (targetCam.z - camZ) * 0.1;
}

export function getCam() { return { x: camX, y: camY, z: camZ }; }

// رنگ‌های روز/شب
export function getSkyColor() {
  const t = dayTime % 1;
  const a = Math.sin(t * Math.PI * 2);
  const day = Math.max(0, a);
  const night = Math.max(0, -a);
  const r = Math.round(28 + day * 180 + night * 10);
  const g = Math.round(22 + day * 140 + night * 10);
  const b = Math.round(37 + day * 60 + night * 40);
  return `rgb(${r},${g},${b})`;
}

export function getLightLevel() {
  const t = dayTime % 1;
  return 0.3 + 0.7 * Math.max(0, Math.sin(t * Math.PI * 2));
}

export function stepDay(dt) {
  dayTime = (dayTime + dt * daySpeed) % 1;
}

// واضحة‌سازی با گرادیان
export function clearScreen() {
  const sky = getSkyColor();
  const g = ctx.createLinearGradient(0, 0, 0, innerHeight);
  g.addColorStop(0, sky);
  g.addColorStop(1, '#1a1625');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, innerWidth, innerHeight);
  
  // ستاره‌های شب
  if (dayTime > 0.6 && dayTime < 0.95) {
    const night = (dayTime - 0.6) / 0.35;
    ctx.fillStyle = `rgba(255,255,255,${night * 0.8})`;
    for (let i = 0; i < 60; i++) {
      const x = (i * 73 + dayTime * 1000) % innerWidth;
      const y = (i * 149 + dayTime * 500) % (innerHeight * 0.6);
      ctx.fillRect(x, y, 1, 1);
    }
  }
}