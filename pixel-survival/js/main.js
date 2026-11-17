// ═══ نقطه ورود اصلی و حلقه بازی ═══
import { C, X, clearScreen, updateCamera, stepDay, getCam, iso } from './core/engine.js';
import { G, tick, load, save, onStarve, notifyStarve } from './core/state.js';
import { generateTerrain, renderTerrain, tiles, GRID, TILE } from './world/terrain.js';
import { renderBuildings, placeBuilding, buildings, getBuildingAt } from './world/buildings.js';
import { syncPopulation, stepPeople, renderPeople, people } from './world/people.js';
import { stepEffects, renderEffects, renderAtmosphere, particles, addParticles, addFloatingText } from './world/effects.js';
import { refreshHUD, bindEraUp, toast, logEvent } from './ui/hud.js';

// بارگذاری ذخیره
load();
generateTerrain();

// بازسازی ساختمان‌ها
for (const [id, n] of Object.entries(G.built)) {
  for (let i = 0; i < n; i++) placeBuilding(id);
}
syncPopulation();
refreshHUD();
bindEraUp();

// رویداد گرسنه
onStarve(() => {
  toast('😰 گرسنگی! یک نفر از دهکده رفت… مزرعه بساز!', '#ff4757');
  logEvent('💀 یک روستایی از گرسنگی مرد!');
});

// انتخاب تاйл
C.addEventListener('click', e => {
  if (e.target.closest('.panel') || e.target.closest('.top-bar') || e.target.closest('.bottom-bar')) return;
  
  const { x, y } = getCam();
  const gx = Math.floor((e.clientX - innerWidth / 2 + x) / TILE);
  const gy = Math.floor((e.clientY - innerHeight / 2 + y) / TILE);
  
  if (gx >= 0 && gx < GRID && gy >= 0 && gy < GRID) {
    const tile = tiles[gx][gy];
    if (tile.type !== 'water' && tile.type !== 'shallow') {
      tile.explored = true;
      
      // جمع‌آوری منبع
      if (tile.res) {
        const gains = { tree: { wood: 3 }, rock: { stone: 2 }, bush: { fiber: 2 }, berry: { food: 3, fiber: 1 } };
        const gain = gains[tile.res];
        if (gain) {
          for (const [k, v] of Object.entries(gain)) {
            G.res[k] = Math.min(k === 'food' ? G.caps.food : 99999, (G.res[k] || 0) + v);
          }
          const wx = gx * TILE, wy = gy * TILE;
          const p = iso(wx, wy, tile.h * 4 + 4);
          addParticles(p.x + innerWidth / 2, p.y + innerHeight / 2, 'gather', 8);
          addFloatingText(p.x + innerWidth / 2, p.y + innerHeight / 2 - 20, 
            Object.entries(gain).map(([k,v]) => `+${v} ${k}`).join(' '), '#4ecdc4');
          tile.res = null;
          refreshHUD();
        }
      }
      if (tile.res2) {
        const gains = { gold: { gold: 5 }, crystal: { science: 3 } };
        const gain = gains[tile.res2];
        if (gain) {
          for (const [k, v] of Object.entries(gain)) {
            G.res[k] = Math.min(k === 'food' ? G.caps.food : 99999, (G.res[k] || 0) + v);
          }
          const wx = gx * TILE, wy = gy * TILE;
          const p = iso(wx, wy, tile.h * 4 + 4);
          addParticles(p.x + innerWidth / 2, p.y + innerHeight / 2, 'gold', 10);
          addFloatingText(p.x + innerWidth / 2, p.y + innerHeight / 2 - 20, 
            Object.entries(gain).map(([k,v]) => `+${v} ${k}`).join(' '), '#ffd700');
          tile.res2 = null;
          refreshHUD();
        }
      }
    }
  }
});

// خودکارسازی ذخیره
setInterval(save, 10000);
setInterval(refreshHUD, 500);
addEventListener('beforeunload', save);

// لاگ ورود
if (G.era > 0 || G.totalBuilt > 0) {
  toast(`👋 خوش برگشتی! دهکده در انتظار توست.`, '#4ecdc4');
} else {
  toast('به «از صفر» خوش آمدی! منابع جمع کن تا زنده بمانی.', '#ffd76a');
}

// مخفی کردن لودینگ
setTimeout(() => {
  $('#loading').classList.add('out');
}, 500);

// ========== حلقه اصلی ==========
const clock = { last: performance.now(), elapsed: 0 };

function frame(now) {
  const dt = Math.min((now - clock.last) / 1000, 0.1);
  clock.last = now;
  clock.elapsed += dt;
  
  // به‌روزرسانی
  updateCamera(dt);
  stepDay(dt);
  
  const cam = getCam();
  
  // تیک بازی
  const result = tick(dt);
  if (result.starved) notifyStarve();
  if (result.born) {
    toast('👶 نوزادی متولد شد!', '#4ecdc4');
    syncPopulation();
  }
  
  stepPeople(dt, clock.elapsed);
  stepEffects(dt, clock.elapsed);
  
  // رندر
  clearScreen();
  
  // فضایibility تبدیل مختصات دوربین
  X.save();
  X.translate(innerWidth / 2, innerHeight / 2);
  X.scale(cam.z, cam.z);
  X.translate(-cam.x, -cam.y);
  
  renderTerrain(X, cam);
  renderBuildings(X, cam, dt);
  renderPeople(X, cam);
  
  X.restore();
  
  // افکت‌های م atmosfer
  renderAtmosphere(X);
  renderEffects(X);
  
  // HUD روز
  if (clock.elapsed % 1 < dt) {
    G.day = Math.floor(clock.elapsed / (120 / ERAS.length)) + 1;
  }
  
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);