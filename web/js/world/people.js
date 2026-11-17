// ═══ روستایی‌ها: آدمک‌های باکسی که قدم می‌زنند، کار می‌کنند، جمعیت را نشان می‌دهند ═══
'use strict';
import * as THREE from 'three';
import { scene, rnd, pick } from '../core/engine.js';
import { plots } from './terrain.js';
import { G } from '../core/state.js';

const SKIN = [0xe8b88a, 0xd9a06a, 0xc98d5a], CLOTH = [0xc94f3c, 0x3c78d8, 0x7fae3f, 0xd8b93c, 0x9a5fc9];
const mat = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
const vills = [];
let inner = [];

function makeVillager() {
  const g = new THREE.Group();
  const skin = mat(pick(SKIN)), cloth = mat(pick(CLOTH));
  const mk = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; g.add(b); return b; };
  mk(.42, .5, .3, cloth, 0, .55, 0);                 // تنه
  g.userData.head = mk(.32, .32, .32, skin, 0, .98, 0); // سر
  mk(.14, .4, .16, DARK, -.12, .2, 0); mk(.14, .4, .16, DARK, .12, .2, 0); // پاها
  mk(.12, .4, .14, skin, -.28, .6, 0); mk(.12, .4, .14, skin, .28, .6, 0);  // دست‌ها
  const spot = plots[Math.floor(Math.random() * plots.length)];
  g.position.set(spot.x, spot.y + .35, spot.z);
  g.userData = { ...g.userData, tx: spot.x, tz: spot.z, wait: rnd(0, 3), ph: rnd(0, 6), sp: rnd(1.2, 2) };
  scene.add(g); vills.push(g);
  return g;
}
const DARK = mat(0x3a3230);

export function syncPopulation() {
  while (inner.length < G.pop && inner.length < 40) inner.push(makeVillager());
  while (inner.length > G.pop) { const v = inner.pop(); scene.remove(v); vills.splice(vills.indexOf(v), 1); }
}

export function stepPeople(dt, t) {
  for (const v of inner) {
    const u = v.userData;
    if (u.wait > 0) { u.wait -= dt; }
    else {
      const dx = u.tx - v.position.x, dz = u.tz - v.position.z, d = Math.hypot(dx, dz);
      if (d < .3) {
        u.wait = rnd(1, 4);
        const s = plots[Math.floor(Math.random() * plots.length)];
        u.tx = s.x + rnd(-1, 1); u.tz = s.z + rnd(-1, 1);
      } else {
        v.position.x += dx / d * u.sp * dt; v.position.z += dz / d * u.sp * dt;
        v.rotation.y = Math.atan2(dx, dz);
      }
    }
    // انیمیشن قدم‌زدن
    const w = u.wait > 0 ? 0 : Math.abs(Math.sin(t * 6 + u.ph)) * .1;
    v.position.y += (Math.sin(t * 3 + u.ph) * .02 + w) - (v.userData.ly || 0);
    u.ly = Math.sin(t * 3 + u.ph) * .02 + w;
  }
}
