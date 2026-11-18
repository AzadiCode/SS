// ═══ ذرات و نور آتش (ادغام‌شده از سبک ووکسل): حوضچهٔ ثابت InstancedMesh برای ذرات،
// افکت انفجار/گرد‌و‌غبار/جرقه خشم، و حوضچهٔ نور آتش برای مشعل‌ها.
// هیچ شیءای در هر فریم ساخته نمی‌شود — فقط نمونه‌های از پیش‌موجود بازنویسی می‌شوند. ═══
'use strict';
// ── حوضچهٔ ذرات: ۴۸۰ ذره در یک InstancedMesh ──
const MAXP=480,PT=[];
for(let i=0;i<MAXP;i++)PT.push({a:0,x:0,y:0,z:0,vx:0,vy:0,vz:0,g:0,l:0,m:1,s0:0,s1:0});
const _pM=new THREE.Matrix4(),_pC=new THREE.Color();
const pMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}),MAXP);
keepGeo(pMesh.geometry); // ژئومتری ذره هرگز dispose نشود
pMesh.frustumCulled=false;pMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
{_pM.makeScale(0,0,0);for(let i=0;i<MAXP;i++){pMesh.setMatrixAt(i,_pM);pMesh.setColorAt(i,_pC.set(0xffffff))}}
scene.add(pMesh);
let pp=0;
// تابع داخلی برای دریافت عدد تصادفی در بازه
const _rr=(a,b)=>a+Math.random()*(b-a);

// emit یک ذره (مختصات، سرعت، طول عمر، اندازهٔ شروع/پایان، رنگ، جاذبه)
function P(x,y,z,vx,vy,vz,life,s0,s1,col,g=0){
  const p=PT[pp];
  pMesh.setColorAt(pp,_pC.set(col));pMesh.instanceColor.needsUpdate=true;
  pp=(pp+1)%MAXP;
  Object.assign(p,{a:1,x,y,z,vx,vy,vz,g,l:life,m:life,s0,s1});
}
// به‌روزرسانی ذرات در هر فریم — توسط main.js صدا زده می‌شود.
function stepParts(dt){
  for(let i=0;i<MAXP;i++){
    const p=PT[i];if(!p.a)continue;
    p.l-=dt;
    if(p.l<=0){p.a=0;_pM.makeScale(0,0,0);pMesh.setMatrixAt(i,_pM);continue}
    p.vy-=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
    const s=Math.max(.001,p.s0+(p.s1-p.s0)*(1-p.l/p.m));
    _pM.makeScale(s,s,s).setPosition(p.x,p.y,p.z);
    pMesh.setMatrixAt(i,_pM);
  }
  pMesh.instanceMatrix.needsUpdate=true;
}

// ── انفجار کوچک (گرد‌و‌غبار + جرقه) — برای حملۀ حیوانات وحشی و برخورد ──
function boom(x,y,z,pw=1){
  P(x,y+.3,z,0,0,0,.14,1.6*pw,.2,0xffffff);
  const n=Math.round(12*pw);
  for(let i=0;i<n;i++)P(x,y+.2,z,_rr(-3,3)*pw,_rr(1,5)*pw,_rr(-3,3)*pw,_rr(.35,.75),_rr(.25,.5)*pw,.05,[0xb98a5a,0x9a6a3a,0xd8b88a,0x7a5a3a][i%4],7);
  const m=Math.round(5*pw);
  for(let i=0;i<m;i++)P(x+_rr(-.4,.4),y+.4,z+_rr(-.4,.4),_rr(-.4,.4),_rr(.8,1.8),_rr(-.4,.4),_rr(1,1.7),.4*pw,1.2*pw,0x555a60,0);
}
// گرد‌و‌غبار قدم — سبک و کوتاه
function dust(x,y,z){
  for(let i=0;i<4;i++)P(x+_rr(-.1,.1),y+.05,z+_rr(-.1,.1),_rr(-.3,.3),_rr(.2,.6),_rr(-.3,.3),_rr(.4,.7),.18,.04,0xc8b890,2);
}
// جرقه خشم قرمز — نشانهٔ حملهٔ حیوان وحشی
function rageFx(x,y,z){
  for(let i=0;i<6;i++)P(x,y+.3,z,_rr(-1,1),_rr(.5,1.4),_rr(-1,1),.4,.16,.03,0xff5a3a,5);
}

// ═══ نور آتش: حوضچهٔ PointLight + هالهٔ AdditiveSprite برای مشعل‌ها و آتش‌دان ═══
// شب‌ها با NT روشن می‌شوند، روزها خاموش. addFire یک نقطه را ثبت می‌کند، fireLights هر فریم به‌روز می‌کند.
const FL=[];for(let i=0;i<8;i++){
  const l=new THREE.PointLight(0xff8a3a,0,16,2);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:GRADT,color:0xff9a4a,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false}));
  sp.scale.set(1.4,1.4,1);
  scene.add(l,sp);
  FL.push({l,sp,on:false,t:0,x:0,y:0,z:0});
}
// ثبت یک نور آتش در مختصات داده‌شده. اگر حوضچهٔ پر باشد، بی‌اثر برمی‌گردد.
function addFire(x,y,z){
  const f=FL.find(f=>!f.on);if(!f)return null;
  f.on=true;f.x=x;f.y=y;f.z=z;f.t=0;
  f.l.position.set(x,y,z);f.sp.position.set(x,y,z);
  return f;
}
function clearFire(f){if(!f)return;f.on=false;f.l.intensity=0;f.sp.material.opacity=0}
// به‌روزرسانی هر فریم — سوسوزدن آتش و شدت بر اساس شب (NT)
function fireLights(dt,now){
  for(const f of FL){
    if(!f.on)continue;
    f.t+=dt;
    const flick=.7+.3*Math.sin(now*9+f.x*1.3+f.z*.7);
    const warm=Math.min(1,f.t*.6);            // کم‌کم روشن شود
    const k=warm*Math.max(0,NT-.05)*1.4;      // فقط شب فعال
    f.l.intensity=(.5+1.6*flick)*k;
    f.sp.material.opacity=(.45+.4*flick)*k;
  }
}
// ثبت مشعل‌ها هنگام ساخت انجام می‌شود: initTorches در scenery.js خودش addFire را صدا می‌زند
// (پس از بارگذاری دنیا، تا جای مشعل با ساختمان/جاده/برکه تداخل نکند)
