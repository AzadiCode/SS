// ═══ زمین: جزیرهٔ پیکسلی با ارتفاع، آب، درخت و سنگ پراکنده ═══
'use strict';
import * as THREE from 'three';
import { scene, rnd, pick } from '../core/engine.js';

export const CELL = 2, GRID = 15; // ۱۵×۱۵ خانهٔ ۲ متری
export const plots = [];           // جای خالی برای ساختمان‌ها

const c = h => THREE.MathUtils.clamp(h, 0, 1);

export function islandHeight(x, z) {
  const d = Math.hypot(x, z) / (GRID * CELL * .62);
  return c(1 - d * d) * (1.6 + .9 * Math.sin(x * .35) * Math.cos(z * .3) + rnd(-.05, .05));
}

const MATS = {
  grass: new THREE.MeshLambertMaterial({ color: 0x7fae3f, flatShading: true }),
  grass2: new THREE.MeshLambertMaterial({ color: 0x6b9c34, flatShading: true }),
  sand: new THREE.MeshLambertMaterial({ color: 0xd9a05e, flatShading: true }),
  rock: new THREE.MeshLambertMaterial({ color: 0x8d8578, flatShading: true }),
  trunk: new THREE.MeshLambertMaterial({ color: 0x6e4526, flatShading: true }),
  leaf: new THREE.MeshLambertMaterial({ color: 0x3f7d2c, flatShading: true }),
  leaf2: new THREE.MeshLambertMaterial({ color: 0x5c9a36, flatShading: true }),
  water: new THREE.MeshLambertMaterial({ color: 0x2e6f9e, flatShading: true, transparent: true, opacity: .92 }),
};
const box = (w, h, d, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.castShadow = b.receiveShadow = true; return b; };

export function buildTerrain() {
  const g = new THREE.Group();
  const half = GRID * CELL / 2;
  for (let i = 0; i < GRID; i++) for (let j = 0; j < GRID; j++) {
    const x = i * CELL - half + CELL / 2, z = j * CELL - half + CELL / 2;
    const h = islandHeight(x, z);
    if (h < .25) continue; // زیر آب
    const m = box(CELL, h * 2, CELL, h < .6 ? MATS.sand : (Math.random() < .3 ? MATS.grass2 : MATS.grass));
    m.position.set(x, h - 1.4, z);
    g.add(m);
    if (h > .8 && Math.random() < .14) makeTree(g, x, h - .4 + .0, z);
    else if (h > .8 && Math.random() < .06) { const r = box(rnd(.8, 1.4), rnd(.7, 1.2), rnd(.8, 1.2), MATS.rock); r.position.set(x, h - .7, z); g.add(r); }
    else if (h > .8 && Math.random() < .5) plots.push({ x, z, y: h - .4, used: false });
  }
  // دریا
  const sea = new THREE.Mesh(new THREE.BoxGeometry(GRID * CELL * 4, .4, GRID * CELL * 4), MATS.water);
  sea.position.y = -.15; g.add(sea);
  // ماه‌های نورانی شب (نئون آب)
  const gl = new THREE.Mesh(new THREE.BoxGeometry(GRID * CELL * 4, .1, GRID * CELL * 4),
    new THREE.MeshBasicMaterial({ color: 0x66e0ff, transparent: true, opacity: 0 }));
  gl.position.y = .02; g.add(gl);
  scene.add(g);
  return { group: g, seaGlow: gl };
}

function makeTree(g, x, y, z) {
  const t = new THREE.Group();
  const trunk = box(.35, 1.2, .35, MATS.trunk); trunk.position.y = .6; t.add(trunk);
  const n = 2 + Math.floor(Math.random() * 2);
  for (let k = 0; k < n; k++) {
    const s = 1.3 - k * .35;
    const leaf = box(s, .7, s, Math.random() < .5 ? MATS.leaf : MATS.leaf2);
    leaf.position.y = 1.2 + k * .55; leaf.rotation.y = rnd(0, Math.PI); t.add(leaf);
  }
  t.position.set(x, y, z); t.scale.setScalar(rnd(.8, 1.3));
  g.add(t);
}
