// ═══ مردم: ناوبری، انیمیشن، رفتار ═══
import { TILE, HALF, iso, rnd, pick } from '../core/engine.js';
import { G, countOf } from '../core/state.js';
import { buildings } from './buildings.js';
import { tiles, GRID } from './terrain.js';

export const people = [];

export function syncPopulation() {
  const target = G.pop;
  while (people.length < target) spawnPerson();
  while (people.length > target) people.pop();
}

function spawnPerson() {
  // نزدیک اردوگاه/خانه
  const home = buildings.find(b => b.type.prod?.popMax) || buildings[0];
  const baseX = home ? home.x : GRID * TILE / 2;
  const baseY = home ? home.y : GRID * TILE / 2;
  
  people.push({
    x: baseX + rnd(-20, 20),
    y: baseY + rnd(-20, 20),
    tx: baseX, ty: baseY,
    state: 'idle', // idle, move, work, gather
    target: null,
    workTimer: 0,
    anim: rnd(0, 100),
    color: pick(['#ff6b6b', '#4ecdc4', '#ffe66d', '#a29bfe', '#fd79a8', '#74b9ff', '#55efc4']),
    outfit: pick(['tunic', 'robe', 'armor', 'suit', 'labcoat']),
    carry: null,
  });
}

export function stepPeople(dt, time) {
  const workBuildings = buildings.filter(b => b.type.prod && (b.type.prod.food || b.type.prod.wood || b.type.prod.stone || b.type.prod.metal));
  
  for (const p of people) {
    p.anim += dt * 8;
    
    switch (p.state) {
      case 'idle':
        if (Math.random() < dt * 0.5) {
          // یافتن کار
          if (workBuildings.length && Math.random() < 0.7) {
            p.target = pick(workBuildings);
            p.state = 'move';
          } else if (Math.random() < 0.3) {
            // گردش آزاد
            p.tx = p.x + rnd(-80, 80);
            p.ty = p.y + rnd(-80, 80);
            p.state = 'move';
          }
        }
        break;
        
      case 'move':
        const dx = p.tx - p.x, dy = p.ty - p.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 5) {
          p.x = p.tx; p.y = p.ty;
          if (p.target) {
            p.state = 'work';
            p.workTimer = rnd(3, 6);
          } else {
            p.state = 'idle';
          }
        } else {
          const speed = 40 * dt;
          p.x += (dx / dist) * speed;
          p.y += (dy / dist) * speed;
        }
        break;
        
      case 'work':
        p.workTimer -= dt;
        if (p.workTimer <= 0) {
          // تولید منبع
          if (p.target && p.target.type.prod) {
            p.carry = Object.keys(p.target.type.prod).find(k => p.target.type.prod[k] > 0);
            p.state = 'return';
            p.tx = p.x; p.ty = p.y; // بازگشت به خانه
            const home = buildings.find(b => b.type.prod?.popMax);
            if (home) { p.tx = home.x; p.ty = home.y; }
          } else {
            p.state = 'idle';
          }
        }
        break;
        
      case 'return':
        const dx2 = p.tx - p.x, dy2 = p.ty - p.y;
        const dist2 = Math.hypot(dx2, dy2);
        if (dist2 < 5) {
          p.carry = null;
          p.state = 'idle';
        } else {
          const speed = 50 * dt;
          p.x += (dx2 / dist2) * speed;
          p.y += (dy2 / dist2) * speed;
        }
        break;
    }
  }
}

export function renderPeople(ctx, cam) {
  const time = Date.now() * 0.001;
  
  for (const p of people) {
    const pos = iso(p.x, p.y, 2);
    const cx = pos.x + innerWidth / 2;
    const cy = pos.y + innerHeight / 2;
    
    // سایه
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 6, 4, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // بدنه
    const bob = Math.sin(p.anim) * 1.5;
    const walk = p.state === 'move' || p.state === 'return' ? Math.sin(p.anim * 2) * 2 : 0;
    
    // پاها
    ctx.fillStyle = p.outfit === 'armor' ? '#444' : p.outfit === 'suit' ? '#222' : '#8b4513';
    ctx.fillRect(cx - 3 + walk, cy + 6 + bob, 2, 6);
    ctx.fillRect(cx + 1 - walk, cy + 6 - bob, 2, 6);
    
    // تن
    ctx.fillStyle = p.color;
    ctx.fillRect(cx - 4, cy - 8 + bob, 8, 10);
    
    // لباس
    if (p.outfit === 'robe') {
      ctx.fillStyle = '#6a1b9a';
      ctx.fillRect(cx - 5, cy - 6 + bob, 10, 12);
    } else if (p.outfit === 'armor') {
      ctx.fillStyle = '#888';
      ctx.fillRect(cx - 5, cy - 6 + bob, 10, 8);
    } else if (p.outfit === 'suit') {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(cx - 5, cy - 6 + bob, 10, 8);
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx - 2, cy - 4 + bob, 4, 2);
    } else if (p.outfit === 'labcoat') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx - 5, cy - 6 + bob, 10, 10);
    }
    
    // بازو
    ctx.fillStyle = p.color;
    ctx.fillRect(cx - 6, cy - 6 + bob + walk * 0.5, 3, 8);
    ctx.fillRect(cx + 3, cy - 6 + bob - walk * 0.5, 3, 8);
    
    // سر
    ctx.fillStyle = p.color;
    ctx.fillRect(cx - 4, cy - 14 + bob, 8, 6);
    
    // مو/کلاه
    if (p.outfit === 'armor') {
      ctx.fillStyle = '#666';
      ctx.fillRect(cx - 4, cy - 16 + bob, 8, 3);
    } else if (p.outfit === 'suit') {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(cx - 5, cy - 17 + bob, 10, 4);
    } else if (p.outfit === 'labcoat') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(cx - 5, cy - 17 + bob, 10, 3);
    }
    
    // چهره ساده
    ctx.fillStyle = '#222';
    ctx.fillRect(cx - 2, cy - 12 + bob, 1, 1);
    ctx.fillRect(cx + 1, cy - 12 + bob, 1, 1);
    
    // اشیاء در دست
    if (p.carry) {
      const itemColors = { food: '#e03030', wood: '#8b4513', stone: '#888', metal: '#ffd700', gold: '#ffd700', science: '#00ffff' };
      ctx.fillStyle = itemColors[p.carry] || '#fff';
      ctx.fillRect(cx + 5, cy - 8 + bob, 4, 6);
      if (p.carry === 'food') {
        ctx.fillStyle = '#2d6a20';
        ctx.fillRect(cx + 5, cy - 10 + bob, 4, 2);
      }
    }
  }
}