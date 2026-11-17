// ═══ افکت‌ها: ذرات آتش، دود کارخانه، انفجار جشن عصر جدید ═══
'use strict';
import * as THREE from 'three';
import { scene, rnd, pick } from '../core/engine.js';

const parts = []; // {m, v, life, max, g}

function spawn(pos, color, n, spread, up, life, size, grav = -3) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(size, size, size),
      new THREE.MeshBasicMaterial({ color, transparent: true }));
    m.position.copy(pos).add(new THREE.Vector3(rnd(-spread, spread), rnd(0, spread), rnd(-spread, spread)));
    scene.add(m);
    parts.push({ m, v: new THREE.Vector3(rnd(-1.5, 1.5), rnd(up * .5, up), rnd(-1.5, 1.5)), life: 0, max: life, grav, size });
  }
}

export const firePuff = p => spawn(p, pick([0xff6b1a, 0xffa41c, 0xffe45e]), 1, .25, 1.6, rnd(.4, .8), .22, -1.2);
export const smokePuff = p => spawn(p, pick([0x777777, 0x999999, 0x555555]), 1, .3, 1.8, rnd(1.5, 2.5), .5, .6);
export const celebrate = p => { spawn(p, 0xffe45e, 30, 1, 8, 1.4, .3); spawn(p, 0xff5ea8, 25, 1, 7, 1.6, .28); spawn(p, 0x66e0ff, 25, 1, 9, 1.5, .28); };

export function stepEffects(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life += dt;
    p.v.y += p.grav * dt;
    p.m.position.addScaledVector(p.v, dt);
    const k = 1 - p.life / p.max;
    p.m.scale.setScalar(Math.max(.01, k));
    p.m.material.opacity = k;
    if (p.life >= p.max) { scene.remove(p.m); p.m.geometry.dispose(); p.m.material.dispose(); parts.splice(i, 1); }
  }
}
