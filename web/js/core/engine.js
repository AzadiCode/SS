// ═══ موتور: رندرر پیکسلی، صحنه، دوربین ایزومتریک، نور، چرخهٔ روز/شب ═══
'use strict';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const $ = id => document.getElementById(id);
export const fa = (n, d = 0) => Number(n).toLocaleString('fa-IR', { maximumFractionDigits: d });
export const rnd = (a, b) => a + Math.random() * (b - a);
export const pick = a => a[Math.floor(Math.random() * a.length)];

const MOB = innerWidth < 820 || matchMedia('(pointer:coarse)').matches;
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2) * (MOB ? .42 : .5)); // ← مagic پیکسلی
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.prepend(renderer.domElement);

export const R = renderer;
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2b1a3d);
scene.fog = new THREE.Fog(0x3a2418, 55, 130);

export const cam = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, .5, 400);
const HOME = new THREE.Vector3(26, 26, 26);
cam.position.set(60, 55, 60);

export const ctl = new OrbitControls(cam, renderer.domElement);
Object.assign(ctl, { enableDamping: true, dampingFactor: .08, maxPolarAngle: 1.15, minPolarAngle: .3, minDistance: 10, maxDistance: 70, screenSpacePanning: false });
ctl.target.set(0, 1, 0);

const hemi = new THREE.HemisphereLight(0xfff3d8, 0x4a2c14, .75); scene.add(hemi);
export const sun = new THREE.DirectionalLight(0xffd9a0, 1.6);
sun.position.set(-25, 35, 20); sun.castShadow = true;
sun.shadow.mapSize.set(MOB ? 1024 : 2048, MOB ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 5, far: 100 });
sun.shadow.bias = -.0004; sun.shadow.normalBias = .05;
scene.add(sun);

// چرخهٔ روز/شب ملایم
export let dayT = .3; // ۰=صبح … ۱=شب
export function stepSky(dt) {
  dayT = (dayT + dt / 90) % 1;
  const a = Math.sin(dayT * Math.PI * 2);            // روز روشن، شب تاریک
  const light = .55 + .45 * Math.max(0, a);
  sun.intensity = 1.9 * Math.max(.12, light);
  hemi.intensity = .75 * light + .18;
  const sky = new THREE.Color().lerpColors(new THREE.Color(0x1c1030), new THREE.Color(0xf7b46a), Math.max(0, a));
  scene.background = sky;
  scene.fog.color.copy(sky).lerp(new THREE.Color(0x000000), .25);
  const fire = Math.max(0, -a); // شب → آتش‌ها دیده می‌شوند
  return fire;
}

addEventListener('resize', () => {
  cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
export { HOME };
