// ═══ جاده‌ها و پیاده‌روهای به‌هم‌پیوسته + چراغ خیابان. ═══
'use strict';
// ── جاده‌های متصل + چراغ خیابان
const LAMP=new THREE.MeshStandardMaterial({color:0xfff1c0,emissive:0xffd98a,emissiveIntensity:.1}),LP=new THREE.MeshBasicMaterial({map:GRADT,color:0xffc873,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}),LPG=new THREE.PlaneGeometry(4.6,4.6),ASP=0x4a4d52;
const LBG=keepGeo(new THREE.SphereGeometry(.09,8,6));
// هر کاشی جاده = یک مش ادغام‌شده (رنگ در رأس‌ها) + فقط برای چراغ‌دار: لامپ/هاله. قبلاً ۵ تا ۱۵ مش جدا بود.
function roadMesh(g,m,lamp,cr=0){clearKids(g);
const A=[],q=(w,d,x,z,c,h=.08)=>A.push(vcGeo(new THREE.BoxGeometry(w,h,d).translate(x,h/2,z),c));
q(ROAD_WIDTH,ROAD_WIDTH,0,0,0xb9b3a4,.06);q(ROAD_WIDTH*.65,ROAD_WIDTH*.65,0,0,ASP);
[[1,0,-.825,1.3,.35],[2,.825,0,.35,1.3],[4,0,.825,1.3,.35],[8,-.825,0,.35,1.3]].forEach(([bit,x,z,w,d])=>{if(m&bit){q(w,d,x,z,ASP);q(bit&5?.06:.3,bit&5?.3:.06,x*.9,z*.9,0xf1e7b8,.09)}});
if(cr){const zb=(w,d,x,z)=>q(w,d,x,z,0xefe9d6,.095);for(let i=-2;i<=2;i++){if(cr&1)zb(.09,1,i*.2,0);if(cr&2)zb(1,.09,0,i*.2)}}
if(lamp)A.push(vcGeo(new THREE.CylinderGeometry(.025,.035,1.1,5).translate(.82,.55,.82),0x2f3338));
g.add(vcMesh(A,VCM,!!lamp,true));
if(lamp){const bl=new THREE.Mesh(LBG,LAMP);bl.position.set(.82,1.12,.82);g.add(bl);const pl=NORAY(new THREE.Mesh(LPG,LP));pl.rotation.x=-Math.PI/2;pl.position.set(.55,.12,.55);g.add(pl);const hl=NORAY(new THREE.Sprite(LHALO));hl.scale.set(1,1,1);hl.position.set(.82,1.12,.82);g.add(hl)}}
// ── پیاده‌رو سلولی: کف و حاشیهٔ برجسته دقیقاً داخل footprint دو×دو سلول می‌مانند.
// هر ضلعِ متصل، حاشیهٔ همان ضلع را باز می‌کند؛ بنابراین اتصال به مسیر/جاده/ورودی ساختمان
// بدون بازوی شناور، بیرون‌زدگی یا هم‌پوشانیِ هندسی انجام می‌شود.
const ROAD_WIDTH=FOOT.road[0]*U,PTW=ROAD_WIDTH*PATH_WIDTH_RATIO,PT_DIRT=[0xb09366,0xaa8f63,0xb59a6c],PT_EDGE=0x8d8c55,PT_WORN=0x9b8058,PT_FOOT=0x8f744c,PT_PBG=new THREE.IcosahedronGeometry(.03,0),PT_PBC=[0x8f8a80,0x7d786e,0xa39d90],PT_CYL=new THREE.CylinderGeometry(1,1,1,10,1),PT_M=new THREE.Matrix4(),PT_Q=new THREE.Quaternion(),PT_P=new THREE.Vector3(),PT_S=new THREE.Vector3(),PT_E=new THREE.Euler();
function pathMesh(g,m,id){clearKids(g);
const all=[];let sd=(id*9301+49297)%233280;const r=()=>(sd=(sd*9301+49297)%233280)/233280;
const box=(w,h,d,x,y,z,c)=>all.push(vcGeo(new THREE.BoxGeometry(w,h,d).translate(x,y,z),c));
const disc=(x,z,rx,rz,y,h,c,ry=0)=>{PT_P.set(x,y,z);PT_S.set(rx,h,rz);PT_Q.setFromEuler(PT_E.set(0,ry,0));PT_M.compose(PT_P,PT_Q,PT_S);all.push(vcGeo(PT_CYL.clone().applyMatrix4(PT_M),c))};
// مرکز طبیعیِ خاکی با لبهٔ برجسته؛ قطر بیرونی دقیقاً برابر عرض مجاز footprint است.
disc(0,0,PTW/2,PTW/2,.0425,.085,PT_EDGE);
disc(0,0,PTW/2-.02,PTW/2-.02,.03,.06,PT_DIRT[((id%3)+3)%3]);
// بازوهای اتصال: فقط در ضلع‌های واقعاً متصل، از مرکز تا مرز سلول؛ هیچ‌چیز بیرون از مربع PTW×PTW نمی‌رود.
const len=FOOT.path[0]*U/2,off=len/2,rw=Math.min(.035,PTW*.08),rh=.045,ry=.06+rh/2,edge=PTW/2-rw/2;
if(m&1){box(PTW,.06,len,0,.03,-off,PT_DIRT[((id%3)+3)%3]);box(rw,rh,len,-edge,ry,-off,PT_EDGE);box(rw,rh,len,edge,ry,-off,PT_EDGE)}
if(m&2){box(len,.06,PTW,off,.03,0,PT_DIRT[((id%3)+3)%3]);box(len,rh,rw,off,ry,-edge,PT_EDGE);box(len,rh,rw,off,ry,edge,PT_EDGE)}
if(m&4){box(PTW,.06,len,0,.03,off,PT_DIRT[((id%3)+3)%3]);box(rw,rh,len,-edge,ry,off,PT_EDGE);box(rw,rh,len,edge,ry,off,PT_EDGE)}
if(m&8){box(len,.06,PTW,-off,.03,0,PT_DIRT[((id%3)+3)%3]);box(len,rh,rw,-off,ry,-edge,PT_EDGE);box(len,rh,rw,-off,ry,edge,PT_EDGE)}
// ساییدگی، ردپا و سنگ‌ریزه‌های کوچک در مرکز؛ کاملاً داخل شعاع مجاز باقی می‌مانند.
for(let i=0;i<4;i++){const x=(r()-.5)*PTW*.34,z=(r()-.5)*PTW*.34,rx=.035+r()*.025,rz=.025+r()*.02;disc(x,z,rx,rz,.062,.004,PT_WORN,r()*Math.PI)}
for(let i=0;i<2;i++){const x=(r()-.5)*PTW*.22,z=(r()-.5)*PTW*.22;disc(x,z,.025,.045,.064,.003,PT_FOOT,r()*Math.PI)}
for(let i=0;i<2;i++){const px=(r()-.5)*PTW*.42,pz=(r()-.5)*PTW*.42,ry0=r()*3,ge=PT_PBG.clone();ge.scale(.65,.32,.65);ge.rotateY(ry0);ge.translate(px,.068,pz);all.push(vcGeo(ge,PT_PBC[i%3]))}
g.add(vcMesh(all,VCP,false,true))}
// تماس واقعیِ مستطیل‌های سلولی؛ تماس لبه‌ای مجاز است و گوشه‌تماس اتصال نمی‌سازد.
function roads(w){const blds=w.buildings,rs=blds.filter(b=>b.type==='road'),ps=blds.filter(b=>b.type==='path');
const roadMask=b=>{let m=0;for(const o of rs)if(o!==b){const d=fpTouchDir(b,o);if(d>=0)m|=1<<d}return m};
const pathMask=b=>{let m=0;for(const o of [...ps,...rs])if(o!==b){const d=fpTouchDir(b,o);if(d>=0)m|=1<<d}return m};
const doorMask=new Map();for(const l of fpDoorLinks(blds)){const k=l.cx+','+l.cz;doorMask.set(k,(doorMask.get(k)||0)|(1<<l.d))}
for(const b of rs){const g=objs.get(b.id);if(!g)continue;const m=roadMask(b),pm=ps.reduce((v,p)=>{const d=fpTouchDir(b,p);return d<0?v:v|(1<<d)},0),cr=((pm&1)&&(pm&4)?1:0)|((pm&2)&&(pm&8)?2:0),lamp=((b.x+b.z)%2+2)%2===0?1:0,k=m+'|'+cr+'|'+lamp;if(g.userData.k!==k){g.userData.k=k;roadMesh(g,m,lamp,cr)}}
for(const b of ps){const g=objs.get(b.id);if(!g)continue;const k=b.x+','+b.z,m=pathMask(b)|(doorMask.get(k)||0);if(g.userData.k!==m){g.userData.k=m;pathMesh(g,m,b.id)}}}
