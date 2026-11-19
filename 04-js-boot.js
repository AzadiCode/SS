// ═══ نقطهٔ شروع فرانت‌اند ═══
// ۱) سه‌بعدی (three.js) را می‌گیرد و سراسری می‌کند  ۲) فایل‌های بازی را به ترتیب لیست زیر بارگذاری می‌کند.
// فایل جدید؟ با قالب «شماره-دسته-نام.js» بساز (مثلاً 06-world-rain.js) و همان اسم را (بدون .js) به GAME_FILES اضافه کن. ترتیب مهم است: هر فایل می‌تواند از فایل‌های بالاتر از خودش استفاده کند.
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
Object.assign(globalThis,{THREE,OrbitControls,mergeGeometries});

const GAME_FILES=[
  '05-core-quality',
  '05-geo-core',
  '05-core-engine',
  '05-core-state',
  '05-core-materials',
  '06-world-scenery',
  '07-buildings-models',
  '07-buildings-footprint',
  '08-characters-dialogue',
  '06-world-roads',
  '06-world-environment',
  '08-characters-nametags',
  '09-ui-blueprint',
  '09-ui-interaction',
  '10-admin-panel',
  '11-features-recorder',
  '08-characters-navigation',
  '08-characters-models',
  '08-characters-behavior',
  '06-world-cars',
  '09-ui-hud',
  '07-buildings-houseview',
  '12-net-sync',
  '12-net-telegram',
  '11-features-music',
  '05-core-perf',
  '05-core-main',
];

const load=name=>new Promise((ok,bad)=>{
  const s=document.createElement('script');
  s.src='/'+name+'.js';
  s.onload=ok;
  s.onerror=()=>bad(new Error('فایل بارگذاری نشد: '+name));
  document.head.appendChild(s);
});

try{for(const f of GAME_FILES) await load(f)}catch(e){const m=document.getElementById('ldm');if(m){m.textContent='خطا در بارگذاری: '+e.message+' — صفحه را رفرش کن';m.className='on'}throw e}
