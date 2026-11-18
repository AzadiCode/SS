// ═══ شیدرهای GPU (ادغام‌شده از سبک ووکسل): تکان خوردن گیاهان در باد،
// تکسچر پیکسلی ۱۶×۱۶ برای ظاهر ووکسل/پیکسلی زمین، و تکسچر دانه‌ای سبز برای چمن.
// این فایل قبل از scenery.js بارگذاری می‌شود تا متریال درخت‌ها و زمین بتوانند از آن استفاده کنند. ═══
'use strict';
// زمان باد — هر فریم به‌روز می‌شود (در environment.js envStep). روی همهٔ متریال‌های گیاهی به‌طور یکپارچه اثر می‌کند.
const VT={value:0};

// ── تکان دادن گیاهان (درخت/بوته/درختچه) در باد روی GPU ──
// فقط روی InstancedMesh با متریال یکپارچه کار می‌کند (جابه‌جایی بر اساس موقعیت نمونه = فاز).
// amp: دامنهٔ نوسان افقی (پیش‌فرض .۰۷ = ملایم).
function vegSway(mat,amp=.07){
  mat.onBeforeCompile=sh=>{
    sh.uniforms.uT=VT;
    sh.vertexShader='uniform float uT;\n'+sh.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat ph=instanceMatrix[3].x*.9+instanceMatrix[3].z*.7;\nfloat yy=max(position.y,0.);\ntransformed.x+=sin(uT*1.7+ph)*'+amp.toFixed(3)+'*yy;\ntransformed.z+=cos(uT*1.3+ph)*'+(amp*.7).toFixed(3)+'*yy;\n#endif'
    );
  };
  return mat;
}

// ── تکسچر پیکسلی ۱۶×۱۶: دانه‌های روشن/تیره روی هر کاشی (ظاهر ووکسل/پیکسلی مکعبی) ──
// روی بافت‌های دیگر به‌عنوان detail map ضرب می‌شود تا جزئیات ریز اضافه کند.
const pixTex=(()=>{
  const c=document.createElement('canvas');c.width=c.height=16;const x=c.getContext('2d');
  for(let i=0;i<16;i++)for(let j=0;j<16;j++){
    const v=Math.random();let g=234+((v*21)|0);
    if(v<.13)g=192;else if(v>.94)g=255;
    x.fillStyle='rgb('+g+','+g+','+g+')';x.fillRect(i,j,1,1);
  }
  const t=new THREE.CanvasTexture(c);
  t.magFilter=THREE.NearestFilter;
  t.minFilter=THREE.NearestMipmapLinearFilter;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.colorSpace=THREE.SRGBColorSpace;
  return t;
})();

// ── تکسچر دانه‌ای سبز ۳۲×۳۲: برای پوشش چمنی اضافی روی زمین (سبک ووکسل) ──
const groundDetail=(()=>{
  const c=document.createElement('canvas');c.width=c.height=32;const x=c.getContext('2d');
  const pal=['120,160,88','140,172,98','104,142,78','160,180,110','90,128,68'];
  for(let i=0;i<32;i++)for(let j=0;j<32;j++){
    x.fillStyle='rgb('+pal[(Math.random()*pal.length)|0]+')';x.fillRect(i,j,1,1);
  }
  const t=new THREE.CanvasTexture(c);
  t.magFilter=THREE.NearestFilter;
  t.minFilter=THREE.NearestMipmapLinearFilter;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.colorSpace=THREE.SRGBColorSpace;
  return t;
})();

// ─ـ اعمال تکسچر پیکسلی به‌عنوان detail layer روی یک MeshStandardMaterial موجود ──
// lightMap کانال detail را نگه می‌دارد تا ضرب بافت پایه در شیدر انجام شود؛ اما برای سادگی
// و سازگاری با three.js 0.160، از aoMap به‌عنوان overlay خاکستری استفاده می‌کنیم (تکرار ریز).
function applyDetail(mat,tex,repeat){
  mat.aoMap=tex;mat.aoMapIntensity=.18;
  if(mat.aoMap){mat.aoMap.repeat.set(repeat,repeat);mat.aoMap.wrapS=mat.aoMap.wrapT=THREE.RepeatWrapping;mat.aoMap.needsUpdate=true}
  mat.needsUpdate=true;
  return mat;
}
