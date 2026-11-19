// ═══ جاده‌ها و پیاده‌روهای به‌هم‌پیوسته + چراغ خیابان. ═══
'use strict';
// ── جاده‌های متصل + چراغ خیابان
const LAMP=new THREE.MeshStandardMaterial({color:0xfff1c0,emissive:0xffd98a,emissiveIntensity:.1}),LP=new THREE.MeshBasicMaterial({map:GRADT,color:0xffc873,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}),LPG=new THREE.PlaneGeometry(4.6,4.6),ASP=0x4a4d52;
const LBG=keepGeo(new THREE.SphereGeometry(.09,8,6));
// هر کاشی جاده = یک مش ادغام‌شده (رنگ در رأس‌ها) + فقط برای چراغ‌دار: لامپ/هاله. قبلاً ۵ تا ۱۵ مش جدا بود.
function roadMesh(g,m,lamp,cr=0){clearKids(g);
const A=[],q=(w,d,x,z,c,h=.08)=>A.push(vcGeo(new THREE.BoxGeometry(w,h,d).translate(x,h/2,z),c));
q(ROAD_WIDTH,ROAD_WIDTH,0,0,0xb9b3a4,.06);q(ROAD_WIDTH*.65,ROAD_WIDTH*.65,0,0,ASP);
[[1,0,-.825,1.3,.6],[2,.825,0,.6,1.3],[4,0,.825,1.3,.6],[8,-.825,0,.6,1.3]].forEach(([bit,x,z,w,d])=>{if(m&bit){q(w,d,x,z,ASP);q(bit&5?.06:.3,bit&5?.3:.06,x*.9,z*.9,0xf1e7b8,.09)}});
if(cr){
 // گذرگاه عابر در همان سمتی که پیاده‌رو به جاده می‌رسد؛ هر چهار جهت مستقل‌اند.
 const zb=(w,d,x,z)=>q(w,d,x,z,0xefe9d6,.095);
 for(let i=-3;i<=3;i++){
  if(cr&1)zb(1.24,.105,i*.17,-.70);
  if(cr&2)zb(.105,1.24,.70,i*.17);
  if(cr&4)zb(1.24,.105,i*.17,.70);
  if(cr&8)zb(.105,1.24,-.70,i*.17);
 }
}
// خط توقف سفید در ورودی تقاطع‌های سه‌راه/چهارراه؛ یک خط برای هر شاخهٔ متصل
const degree=((m&1)?1:0)+((m&2)?1:0)+((m&4)?1:0)+((m&8)?1:0);
if(degree>=3){const stop=(w,d,x,z)=>q(w,d,x,z,0xe5e2d8,.098);if(m&1)stop(1.18,.075,0,-.88);if(m&2)stop(.075,1.18,.88,0);if(m&4)stop(1.18,.075,0,.88);if(m&8)stop(.075,1.18,-.88,0)}
if(lamp)A.push(vcGeo(new THREE.CylinderGeometry(.025,.035,1.1,5).translate(.82,.55,.82),0x2f3338));
g.add(vcMesh(A,VCM,!!lamp,true));
if(lamp){const bl=new THREE.Mesh(LBG,LAMP);bl.position.set(.82,1.12,.82);g.add(bl);const pl=NORAY(new THREE.Mesh(LPG,LP));pl.rotation.x=-Math.PI/2;pl.position.set(.55,.12,.55);g.add(pl);const hl=NORAY(new THREE.Sprite(LHALO));hl.scale.set(1,1,1);hl.position.set(.82,1.12,.82);g.add(hl)}}
// ── پیاده‌رو سلولی: کف و حاشیهٔ برجسته دقیقاً داخل footprint دو×دو سلول می‌مانند.
// هر ضلعِ متصل، حاشیهٔ همان ضلع را باز می‌کند؛ بنابراین اتصال به مسیر/جاده/ورودی ساختمان
// بدون بازوی شناور، بیرون‌زدگی یا هم‌پوشانیِ هندسی انجام می‌شود.
const ROAD_WIDTH=FOOT.road[0]*U,PTW=ROAD_WIDTH*PATH_WIDTH_RATIO;
// پیاده‌رو مدرن و هم‌سطح: سنگ‌فرش بتنی روشن، درزهای باریک و لبهٔ کوتاه.
// ضخامت کل فقط ۳٫۲ سانتی‌متر است؛ کف از y=0 شروع می‌شود و هیچ پایهٔ معلقی ندارد.
let PATH_STYLE=(()=>{try{return localStorage.getItem('tw_path_style')==='dirt'?'dirt':'stone'}catch(_){return'stone'}})();
// مسیرهای قدیمی که هنوز فیلد style ندارند، سبک زمان ورود به نسخهٔ جدید را حفظ می‌کنند.
const LEGACY_PATH_STYLE=(()=>{try{let v=localStorage.getItem('tw_path_legacy_style');if(v!=='dirt'&&v!=='stone'){v=PATH_STYLE;localStorage.setItem('tw_path_legacy_style',v)}return v}catch(_){return PATH_STYLE}})();
const PT_BASE=0x77776c,PT_TOP=[0xb9b8aa,0xc2c0b2,0xb4b4a7,0xc7c4b6],PT_JOINT=0x969589;
function pathMesh(g,m,id,style=PATH_STYLE){clearKids(g);
 const all=[],box=(w,h,d,x,y,z,color)=>all.push(vcGeo(new THREE.BoxGeometry(w,h,d).translate(x,y,z),color));
 if(style==='dirt'){
  // مسیر خاکی فشرده، کمی تیره‌تر از زمین اطراف؛ بدون جدول و سکوی برجسته
  const soil=[0x8c7650,0x947d55,0x88724c,0x9a8258][((id*7)%4+4)%4];
  box(PTW,.014,PTW,0,.007,0,soil);
  // دانه‌های ریز و پراکندهٔ خاک/ریگ؛ کاملاً درون footprint
  const seed=((id*9301+49297)%233280+233280)%233280;
  for(let i=0;i<7;i++){
   const x=(((seed*(i+3)*17)%997)/997-.5)*PTW*.78;
   const z=(((seed*(i+5)*29)%991)/991-.5)*PTW*.78;
   box(.018,.002,.012,x,.015,z,i%2?0x66583e:0xb19a6d);
  }
 }else{
  const c=((id*9301+49297)%233280+233280)%233280,top=PT_TOP[c%PT_TOP.length];
  box(PTW,.024,PTW,0,.012,0,PT_BASE);
  box(PTW-.012,.008,PTW-.012,0,.028,0,top);
  const seam=.006,span=PTW-.055;
  box(span,.0015,seam,0,.0325,0,PT_JOINT);
  box(seam,.0015,span,0,.0325,0,PT_JOINT);
  // جدول فقط در لبه‌های آزاد؛ در اتصال مستقیم، گوشه، سه‌راه و چهارراه جدول قطع می‌شود.
  const lip=.006,lh=.006;
  if(!(m&4))box(PTW,lh,lip,0,.003,PTW/2-lip/2,PT_BASE);
  if(!(m&1))box(PTW,lh,lip,0,.003,-PTW/2+lip/2,PT_BASE);
  if(!(m&2))box(lip,lh,PTW,PTW/2-lip/2,.003,0,PT_BASE);
  if(!(m&8))box(lip,lh,PTW,-PTW/2+lip/2,.003,0,PT_BASE);
 }
 g.add(vcMesh(all,VCP,false,true));
}
function setPathStyle(style){
 PATH_STYLE=style==='dirt'?'dirt':'stone';
 try{localStorage.setItem('tw_path_style',PATH_STYLE)}catch(_){}
 // سبک انتخابی فقط پیش‌فرضِ مسیرهای بعدی است؛ مسیرهای ساخته‌شده دوباره‌رندر نمی‌شوند.
 if(typeof BP!=='undefined'&&BP){
  BP._tpl.clear();
  if(typeof bpRemeshAll==='function')bpRemeshAll();
  if(typeof bpGhostType==='function'&&BP.on)bpGhostType();
 }
}
// تماس واقعیِ مستطیل‌های سلولی؛ تماس لبه‌ای مجاز است و گوشه‌تماس اتصال نمی‌سازد.
// تشخیص گذرگاه از تماس واقعیِ footprint و نیز تلورانس یک خرده‌سلول؛
// این کار وقتی پیاده‌رو در امتداد دو ضلع جاده کاشته شده باشد، خط‌کشی را از دست نمی‌دهد.
function roadCrossingMask(road,paths){
 const A=fpBounds(road);let mask=0;
 for(const path of paths){const B=fpBounds(path),ovX=B.x0<=A.x1+1&&B.x1>=A.x0-1,ovZ=B.z0<=A.z1+1&&B.z1>=A.z0-1;
  if(ovZ){if(B.x0>=A.x1+1&&B.x0<=A.x1+2)mask|=2;if(B.x1<=A.x0-1&&B.x1>=A.x0-2)mask|=8}
  if(ovX){if(B.z0>=A.z1+1&&B.z0<=A.z1+2)mask|=4;if(B.z1<=A.z0-1&&B.z1>=A.z0-2)mask|=1}
 }
 return mask;
}
function roads(w){const blds=w.buildings,rs=blds.filter(b=>b.type==='road'),ps=blds.filter(b=>b.type==='path'),byType={road:new Map(),path:new Map()};
const key=(x,z)=>x+','+z;for(const b of rs)byType.road.set(key(b.gx??b.x,b.gz??b.z),b);for(const b of ps)byType.path.set(key(b.gx??b.x,b.gz??b.z),b);
const dirs=[[0,-1],[1,0],[0,1],[-1,0]],dims={road:FOOT.road[0],path:FOOT.path[0]},step=(a,b)=>(dims[a]+dims[b])/2;
const maskFor=(b,types)=>{let m=0;const x=b.gx??b.x,z=b.gz??b.z;for(const t of types){const d=step(b.type,t),map=byType[t];for(let i=0;i<4;i++){const[dx,dz]=dirs[i],o=map.get(key(x+dx*d,z+dz*d));if(o&&fpTouchDir(b,o)>=0)m|=1<<i}}return m};
const doorMask=new Map();for(const l of fpDoorLinks(blds)){const k=l.cx+','+l.cz;doorMask.set(k,(doorMask.get(k)||0)|(1<<l.d))}
for(const b of rs){const g=objs.get(b.id);if(!g)continue;const m=maskFor(b,['road']),cr=roadCrossingMask(b,ps);const lamp=((b.x+b.z)%2+2)%2===0?1:0,k=m+'|'+cr+'|'+lamp;if(g.userData.k!==k){g.userData.k=k;roadMesh(g,m,lamp,cr)}}
for(const b of ps){const g=objs.get(b.id);if(!g)continue;const k=b.x+','+b.z,m=maskFor(b,['path','road'])|(doorMask.get(k)||0),style=b.style==='dirt'?'dirt':b.style==='stone'?'stone':LEGACY_PATH_STYLE,sig=m+'|'+style;if(g.userData.k!==sig){g.userData.k=sig;pathMesh(g,m,b.id,style)}}}
