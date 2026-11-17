// ═══ شروع بازی و حلقهٔ اصلی ═══
'use strict';
import * as THREE from 'three';
import { R, scene, cam, ctl, HOME, stepSky, $ } from './engine.js';
import { G, tick, onStarve } from './state.js';
import { buildTerrain } from '../world/terrain.js';
import { placeBuilding, stepBuildings } from '../world/buildings.js';
import { syncPopulation, stepPeople } from '../world/people.js';
import { stepEffects } from '../world/effects.js';
import { refreshHUD, bindEraUp, toast } from '../ui/hud.js';
import { loadGame, saveGame } from '../net/sync.js';

onStarve(() => toast('😰 گرسنگی! یک نفر از دهکده رفت… مزرعه بساز!'));

async function start() {
  buildTerrain();
  await loadGame();

  // بازسازی ساختمان‌های ذخیره‌شده
  for (const [id, n] of Object.entries(G.built))
    for (let i = 0; i < n; i++) placeBuilding(id);
  syncPopulation();
  refreshHUD(); bindEraUp();

  setInterval(saveGame, 10000);
  setInterval(refreshHUD, 500);
  addEventListener('beforeunload', saveGame);
  if (G.era > 0) toast(`👋 خوش برگشتی! ${G.era > 0 ? 'دهکده در انتظار توست' : ''}`);

  // دوربین مقدماتی
  let intro = 0; ctl.enabled = false;
  const clock = new THREE.Clock();
  let saveAcc = 0;

  R.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), .1), t = clock.elapsedTime;
    const night = stepSky(dt);
    tick(dt);
    stepPeople(dt, t);
    stepBuildings(dt, night);
    stepEffects(dt);
    syncPopulation();

    if (intro < 1) {
      intro = Math.min(1, intro + dt / 3);
      const e = 1 - Math.pow(1 - intro, 3);
      cam.position.lerpVectors(new THREE.Vector3(70, 60, 70), HOME, e);
      cam.lookAt(0, 1, 0);
      if (intro >= 1) { ctl.enabled = true; ctl.update(); }
    } else {
      ctl.target.x = THREE.MathUtils.clamp(ctl.target.x, -16, 16);
      ctl.target.z = THREE.MathUtils.clamp(ctl.target.z, -16, 16);
      ctl.update();
    }
    R.render(scene, cam);
    saveAcc += dt; if (saveAcc > 10) { saveAcc = 0; }
  });

  // برداشتن لودینگ
  const ld = $('ld');
  if (ld) { ld.classList.add('out'); setTimeout(() => ld.remove(), 700); }
}
start();
