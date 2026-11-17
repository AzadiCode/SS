// ═══ افکت‌ها: پارتیکل‌ها، آب و هوا، سیاره‌ها ═══
import { rnd, pick } from '../core/engine.js';
import { dayTime } from '../core/engine.js';
import { G } from '../core/state.js';

export const particles = [];
export const weather = { type: 'none', intensity: 0, timer: 0 };

const WEATHER_TYPES = ['none', 'rain', 'snow', 'wind', 'meteor'];
const WEATHER_CHANCE = 0.0001;

export function stepEffects(dt, time) {
  // بروزرسانی پارتیکل‌ها
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.gravity * dt;
    p.size *= 0.99;
    p.alpha = p.life / p.maxLife;
  }
  
  // آب و هوا
  weather.timer -= dt;
  if (weather.timer <= 0) {
    if (weather.type === 'none' && Math.random() < WEATHER_CHANCE) {
      weather.type = pick(WEATHER_TYPES.slice(1));
      weather.intensity = rnd(0.3, 1);
      weather.timer = rnd(10, 30);
      addWeatherParticles(weather.type, weather.intensity);
    } else if (weather.type !== 'none') {
      weather.type = 'none';
      weather.intensity = 0;
      weather.timer = rnd(60, 180);
    }
  }
  
  // بارش مداوم
  if (weather.type === 'rain' || weather.type === 'snow') {
    addWeatherParticles(weather.type, weather.intensity * 0.1);
  }
}

function addWeatherParticles(type, intensity) {
  const count = Math.floor(intensity * 5) + 1;
  for (let i = 0; i < count; i++) {
    if (type === 'rain') {
      particles.push({
        x: rnd(0, innerWidth),
        y: -10,
        vx: rnd(-20, 20),
        vy: rnd(300, 500),
        gravity: 0,
        size: 1,
        alpha: 0.6,
        color: '#89b4fa',
        type: 'rain',
        life: 1.5,
        maxLife: 1.5,
      });
    } else if (type === 'snow') {
      particles.push({
        x: rnd(0, innerWidth),
        y: -10,
        vx: rnd(-15, 15) + Math.sin(Date.now() * 0.001 + i) * 10,
        vy: rnd(30, 60),
        gravity: 0,
        size: rnd(2, 4),
        alpha: 0.8,
        color: '#fff',
        type: 'snow',
        life: rnd(5, 10),
        maxLife: 10,
        rotation: rnd(0, Math.PI * 2),
        rotSpeed: rnd(-1, 1),
      });
    }
  }
}

export function addParticles(x, y, type, count = 5) {
  const configs = {
    gather: { colors: ['#4ecdc4', '#69db7c', '#ffe66d'], gravity: -50, speed: 80 },
    build: { colors: ['#ff8c42', '#ffd76a', '#ff6b6b'], gravity: -80, speed: 100 },
    levelup: { colors: ['#ffd700', '#ffaa00', '#ff6b6b', '#4ecdc4'], gravity: -100, speed: 150 },
    starve: { colors: ['#ff4757', '#ff6b6b', '#ff8c42'], gravity: -30, speed: 60 },
    research: { colors: ['#a29bfe', '#74b9ff', '#00ffff'], gravity: -60, speed: 80 },
    gold: { colors: ['#ffd700', '#ffaa00', '#fff8aa'], gravity: -40, speed: 70 },
  };
  
  const cfg = configs[type] || configs.gather;
  for (let i = 0; i < count; i++) {
    const angle = rnd(0, Math.PI * 2);
    const speed = rnd(cfg.speed * 0.5, cfg.speed);
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      gravity: cfg.gravity,
      size: rnd(2, 5),
      alpha: 1,
      color: pick(cfg.colors),
      type: 'sparkle',
      life: rnd(0.8, 1.5),
      maxLife: 1.5,
      rotation: rnd(0, Math.PI * 2),
      rotSpeed: rnd(-5, 5),
    });
  }
}

export function addFloatingText(x, y, text, color = '#ffd700', size = 16) {
  particles.push({
    x, y,
    vx: rnd(-20, 20),
    vy: -50,
    gravity: -20,
    size,
    alpha: 1,
    color,
    type: 'text',
    text,
    life: 2,
    maxLife: 2,
  });
}

export function renderEffects(ctx) {
  // مرتب‌سازی: متن‌ها در بالا
  particles.sort((a, b) => (a.type === 'text' ? -1 : 1) - (b.type === 'text' ? -1 : 1));
  
  for (const p of particles) {
    ctx.globalAlpha = p.alpha;
    
    if (p.type === 'text') {
      ctx.font = `bold ${p.size}px Vazirmatn`;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillText(p.text, p.x, p.y);
    } else if (p.type === 'rain') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.vx * 0.01, p.y + p.vy * 0.01);
      ctx.stroke();
    } else if (p.type === 'snow') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      // ستاره
      if (p.type === 'sparkle') {
        ctx.beginPath();
        for (let j = 0; j < 4; j++) {
          const a = j * Math.PI / 2 + p.rotation;
          const r = p.size;
          const r2 = p.size * 0.4;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          ctx.lineTo(Math.cos(a + Math.PI / 4) * r2, Math.sin(a + Math.PI / 4) * r2);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}

// افکت‌های محیطی (مه، نورانی،...)
export function renderAtmosphere(ctx) {
  const light = 0.3 + 0.7 * Math.max(0, Math.sin(dayTime * Math.PI * 2));
  const night = 1 - light;
  
  // مه صبحگاهی
  if (dayTime > 0.2 && dayTime < 0.35) {
    const fog = (dayTime - 0.2) / 0.15;
    ctx.fillStyle = `rgba(200,220,255,${fog * 0.15})`;
    ctx.fillRect(0, innerHeight * 0.5, innerWidth, innerHeight * 0.5);
  }
  
  // مه شب
  if (night > 0.5) {
    ctx.fillStyle = `rgba(20,10,40,${(night - 0.5) * 0.3})`;
    ctx.fillRect(0, 0, innerWidth, innerHeight);
  }
  
  // آفتاب/ماه
  const sunX = innerWidth * 0.85;
  const sunY = innerHeight * 0.2 + Math.sin(dayTime * Math.PI * 2) * innerHeight * 0.3;
  const sunR = 30;
  
  if (dayTime < 0.5) {
    // آفتاب
    const g = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 3);
    g.addColorStop(0, `rgba(255,240,180,${light * 0.4})`);
    g.addColorStop(0.3, `rgba(255,200,100,${light * 0.15})`);
    g.addColorStop(1, 'rgba(255,180,50,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR * 3, 0, Math.PI * 2);
    ctx.fill();
    
    // هسته
    ctx.fillStyle = `rgba(255,255,220,${light * 0.8})`;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR * 0.6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // ماه
    const moonLight = night;
    const g = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR * 2);
    g.addColorStop(0, `rgba(220,230,255,${moonLight * 0.3})`);
    g.addColorStop(1, 'rgba(180,200,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR * 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = `rgba(220,230,255,${moonLight * 0.9})`;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    // حفره‌ها
    ctx.fillStyle = `rgba(150,160,200,${moonLight * 0.5})`;
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3, r = sunR * 0.2 + Math.sin(i) * sunR * 0.1;
      ctx.beginPath();
      ctx.arc(sunX + Math.cos(a) * r, sunY + Math.sin(a) * r * 0.5, sunR * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}