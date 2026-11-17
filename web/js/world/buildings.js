// ═══ ساختمان‌ها: مدل‌های باکسی پیکسلی، ارتقاء خودکار با عصر، جاده و ماشین ═══
'use strict';
import * as THREE from 'three';
import { scene, rnd, pick } from '../core/engine.js';
import { plots } from './terrain.js';
import { firePuff, smokePuff } from './effects.js';
import { G, countOf } from '../core/state.js';

const M = (c, e = 0) => new THREE.MeshLambertMaterial({ color: c, emissive: e, flatShading: true });
const box = (w, h, d, m, x = 0, y = 0, z = 0) => {
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; return b;
};
const WOOD = M(0x8a5a2e), WOOD2 = M(0x6e4526), STONE = M(0x8d8578), STONE2 = M(0x6f685c),
      THATCH = M(0xc9a44a), LEAF = M(0x3f7d2c), SNOW = M(0xe8e4da), BRICK = M(0xa3542f),
      METAL = M(0x9aa4b0), DARK = M(0x3a3f46), GLASS = M(0x66c8e0, 0x123a44),
      NEON = M(0x111111, 0xff2bd6), NEON2 = M(0x111111, 0x22e6ff);

export const builtGroups = [];   // {id, g, fx, level}
let roads = null, cars = [];

function fire(x, y, z, s = 1) {
  const g = new THREE.Group();
  const logs = box(.9 * s, .25, .9 * s, WOOD2); logs.position.y = .12; g.add(logs);
  const cross = box(.8 * s, .2, .25, WOOD, 0, .3, 0); cross.rotation.y = Math.PI / 4; g.add(cross);
  const stone = box(1.5 * s, .3, 1.5 * s, STONE); stone.position.y = .05; g.add(stone);
  g.position.set(x, y, z);
  g.userData.fx = p => { if (Math.random() < .5) firePuff(new THREE.Vector3(x + rnd(-.2, .2), y + .5, z + rnd(-.2, .2))); };
  return g;
}

// ── مدل هر ساختمان؛ eraLevel برای «نونوار شدن» با تکامل ──
function model(id, eraLevel) {
  const g = new THREE.Group();
  const mod = eraLevel >= 2 ? 1.15 : 1; // عصر‌های جدیدتر کمی بزرگ‌تر و خوش‌ساخت
  switch (id) {
    case 'fire': return fire(0, 0, 0, 1 + eraLevel * .15);
    case 'tent': {
      const t = new THREE.Mesh(new THREE.ConeGeometry(1.1 * mod, 1.6, 4), eraLevel >= 2 ? BRICK : THATCH);
      t.position.y = .8; t.rotation.y = Math.PI / 4; t.castShadow = true; g.add(t);
      g.add(box(.5, .6, .1, DARK, 0, .35, .78 * mod));
      break;
    }
    case 'woodman': g.add(box(.7, 1.4, .7, WOOD, -.5, .7, 0), box(1.2, .9, 1.2, LEAF, .5, 1.1, 0), box(.35, .9, .35, WOOD2, .5, .45, 0)); break;
    case 'quarry': g.add(box(1.6, .8, 1.6, STONE2, 0, .3, 0), box(1, .6, 1, STONE, .3, 1, -.3), box(.5, .5, .5, STONE, -.4, .9, .4)); break;
    case 'farm': {
      const soil = box(3, .25, 3, M(0x5d4024)); soil.position.y = .12; g.add(soil);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
        g.add(box(.4, rnd(.5, .8), .4, M(pick([0x7fae3f, 0xd8b93c])), -1 + i, .5, -1 + j));
      break;
    }
    case 'well': g.add(box(1.1, .8, 1.1, STONE, 0, .4, 0), box(1.3, .2, 1.3, WOOD, 0, .95, 0), box(.2, .8, .2, WOOD2, -.5, 1.3, 0), box(.2, .8, .2, WOOD2, .5, 1.3, 0)); break;
    case 'barn': g.add(box(2.4, 1.6, 2, WOOD, 0, .8, 0), box(2.8, .9, 2.4, M(0xa33b2e), 0, 1.9, 0)); break;
    case 'forge': {
      g.add(box(2, 1.5, 1.8, STONE2, 0, .75, 0), box(.5, 1.6, .5, DARK, .6, 1.8, .3));
      g.userData.fx = p => { if (Math.random() < .15) firePuff(new THREE.Vector3(p.x + .6, p.y + 2.6, p.z + .3)); };
      g.userData.smoke = [.6, 2.7, .3];
      break;
    }
    case 'mine': {
      g.add(box(2, 1.2, 2, DARK, 0, .6, 0), box(2.4, .5, 2.4, STONE, 0, 1.45, 0), box(.3, 1.5, .3, WOOD2, -1, .9, -1), box(.3, 1.5, .3, WOOD2, 1, .9, -1));
      break;
    }
    case 'wall': g.add(box(3.4, 2 + eraLevel, 1, STONE, 0, 1 + eraLevel / 2, 0), box(3.8, .5, 1.2, STONE2, 0, 2.3 + eraLevel, 0)); break;
    case 'market': {
      g.add(box(2.4, 1.3, 1.8, WOOD, 0, .65, 0), box(2.8, .3, 2.2, M(0xc94f3c), 0, 1.5, 0));
      for (let i = -1; i <= 1; i++) g.add(box(.4, .4, .4, pick([M(0xffa41c), M(0x7fae3f), M(0xd8b93c)]), i * .8, 1.75, .4));
      break;
    }
    case 'mill': {
      g.add(box(1.6, 3, 1.6, SNOW, 0, 1.5, 0), box(1.9, 1, 1.9, WOOD, 0, .5, 0));
      const rotor = new THREE.Group();
      for (let i = 0; i < 4; i++) { const b = box(.3, 2.4, .1, WOOD2); b.position.y = 1.1; const h = new THREE.Group(); h.rotation.z = i * Math.PI / 2; h.add(b); rotor.add(h); }
      rotor.position.set(0, 3, 1); g.add(rotor);
      g.userData.rotor = rotor;
      break;
    }
    case 'factory': {
      g.add(box(4, 2, 2.6, BRICK, 0, 1, 0), box(1.2, 1.2, .2, GLASS, -.8, .8, 1.35), box(1.2, 1.2, .2, GLASS, .8, .8, 1.35));
      g.add(box(.6, 3, .6, DARK, 1.4, 2, -.6));
      g.userData.smoke = [1.4, 3.6, -.6];
      break;
    }
    case 'rail': {
      g.add(box(5, .3, 1.4, DARK, 0, .15, 0), box(.3, .2, 6, METAL, 0, .35, 0), box(.3, .2, 6, METAL, 1, .35, 0));
      g.add(box(2, 1.6, 1.6, BRICK, -1.5, .9, .2), box(2.2, .4, 1.8, DARK, -1.5, 1.9, .2));
      g.userData.smoke = [-1.5, 2.2, .2];
      break;
    }
    case 'lab': {
      g.add(box(2.6, 1.8, 2.2, SNOW, 0, .9, 0), box(2.8, .4, 2.4, GLASS, 0, 2, 0), box(.3, 2.8, .3, NEON2, 1.2, 1.4, -1));
      break;
    }
    case 'tower': {
      g.add(box(.3, 4.5, .3, METAL, 0, 2.25, 0), box(2.2, .15, .15, METAL, 0, 3.4, 0), box(2.2, .15, .15, METAL, 0, 2.2, 0));
      const l = box(.5, .5, .5, NEON2, 0, 4.8, 0); l.userData.blink = true; g.add(l);
      break;
    }
    case 'skyscraper': {
      const h = 4 + Math.floor(rnd(0, 3));
      g.add(box(2, h, 2, GLASS, 0, h / 2, 0), box(2.2, .4, 2.2, DARK, 0, h + .1, 0));
      g.add(box(.3, .8, .3, NEON, .7, h + .6, 0));
      break;
    }
  }
  return g;
}

// پیدا کردن جای خالی نزدیک مرکز
function freePlot() {
  plots.sort((a, b) => (Math.hypot(a.x, a.z)) - (Math.hypot(b.x, b.z)));
  return plots.find(p => !p.used);
}

export function placeBuilding(id) {
  const p = freePlot(); if (!p) return null;
  p.used = true;
  const g = model(id, G.era);
  g.position.set(p.x, p.y + .35, p.z);
  g.rotation.y = pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
  g.scale.setScalar(.01);
  g.userData.popIn = 0;
  scene.add(g);
  builtGroups.push({ id, g, plot: p, smokeAcc: 0 });
  return g;
}

// با تغییر عصر همه‌چیز نونوار می‌شود
export function rebuildAll() {
  for (const b of builtGroups) {
    const np = b.plot;
    scene.remove(b.g);
    const g = model(b.id, G.era);
    g.position.set(np.x, np.y + .35, np.z);
    g.rotation.y = b.g.rotation.y; g.scale.copy(b.g.scale);
    scene.add(g); b.g = g;
  }
  updateRoads();
}

function updateRoads() {
  if (G.era >= 4 && !roads) {
    roads = new THREE.Group();
    for (let i = -7; i <= 7; i++) roads.add(box(1.9, .12, 1.9, M(0x3c4048), i * 1.9, .06, 7));
    scene.add(roads);
    for (let i = 0; i < 3; i++) {
      const car = new THREE.Group();
      car.add(box(1.4, .5, .8, pick([M(0xd84f3c), M(0x3c78d8), M(0xe8c23c)]), 0, .45, 0),
              box(.8, .4, .7, GLASS, -.1, .85, 0), box(1.5, .15, .85, DARK, 0, .2, 0));
      car.userData.t = Math.random() * 10; car.userData.dir = i % 2 ? 1 : -1;
      scene.add(car); cars.push(car);
    }
  }
}

const v = new THREE.Vector3();
export function stepBuildings(dt, night) {
  for (const b of builtGroups) {
    const u = b.g.userData;
    if (u.popIn !== undefined && u.popIn < 1) { u.popIn = Math.min(1, u.popIn + dt * 2); const e = 1 - Math.pow(1 - u.popIn, 3); b.g.scale.setScalar(Math.max(.01, e)); }
    if (u.rotor) u.rotor.rotation.z += dt * (1 + G.era * .4);
    if (u.blink) u.blink = false;
    if (u.smoke) { b.smokeAcc += dt; if (b.smokeAcc > .25) { b.smokeAcc = 0; v.set(b.g.position.x + u.smoke[0], b.g.position.y + u.smoke[1], b.g.position.z + u.smoke[2]); smokePuff(v); } }
    if (u.fx) u.fx(b.g.position);
    // چراغ نئونی شب
    b.g.traverse(o => { if (o.userData.blink) o.visible = night < .5 || Math.sin(performance.now() * .006) > 0; });
  }
  for (const car of cars) {
    car.userData.t += dt * car.userData.dir * 4;
    if (Math.abs(car.userData.t) > 27) car.userData.dir *= -1;
    car.position.set(car.userData.t, .35, 7 + (car.userData.dir > 0 ? .5 : -.5));
    car.rotation.y = car.userData.dir > 0 ? 0 : Math.PI;
  }
}
