// ═══ جاده‌ها و پیاده‌روهای به‌هم‌پیوسته + چراغ خیابان. ═══
'use strict';
// ── جاده‌های متصل + چراغ خیابان
const LAMP=new THREE.MeshStandardMaterial({color:0xfff1c0,emissive:0xffd98a,emissiveIntensity:.1}),LP=new THREE.MeshBasicMaterial({map:GRADT,color:0xffc873,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}),LPG=new THREE.PlaneGeometry(4.6,4.6),ASP=0x4a4d52;
const LBG=keepGeo(new THREE.SphereGeometry(.09,8,6));
// هر کاشی جاده = یک مش ادغام‌شده (رنگ در رأس‌ها) + فقط برای چراغ‌دار: لامپ/هاله. قبلاً ۵ تا ۱۵ مش جدا بود.
function roadMesh(g,m,lamp,cr=0){clearKids(g);
const A=[],q=(w,d,x,z,c,h=.08)=>A.push(vcGeo(new THREE.BoxGeometry(w,h,d).translate(x,h/2,z),c));
q(2,2,0,0,0xb9b3a4,.06);q(1.3,1.3,0,0,ASP);
[[1,0,-.825,1.3,.35],[2,.825,0,.35,1.3],[4,0,.825,1.3,.35],[8,-.825,0,.35,1.3]].forEach(([bit,x,z,w,d])=>{if(m&bit){q(w,d,x,z,ASP);q(bit&5?.06:.3,bit&5?.3:.06,x*.9,z*.9,0xf1e7b8,.09)}});
if(cr){const zb=(w,d,x,z)=>q(w,d,x,z,0xefe9d6,.095);for(let i=-2;i<=2;i++){if(cr&1)zb(.09,1,i*.2,0);if(cr&2)zb(1,.09,0,i*.2)}}
if(lamp)A.push(vcGeo(new THREE.CylinderGeometry(.025,.035,1.1,5).translate(.82,.55,.82),0x2f3338));
g.add(vcMesh(A,VCM,!!lamp,true));
if(lamp){const bl=new THREE.Mesh(LBG,LAMP);bl.position.set(.82,1.12,.82);g.add(bl);const pl=NORAY(new THREE.Mesh(LPG,LP));pl.rotation.x=-Math.PI/2;pl.position.set(.55,.12,.55);g.add(pl);const hl=NORAY(new THREE.Sprite(LHALO));hl.scale.set(1,1,1);hl.position.set(.82,1.12,.82);g.add(hl)}}
// ── پیاده‌رو: سطح سنگ‌فرشِ تمیز (slabs سنگی روشن با درزِ تیره و حاشیهٔ curb) که به جاده/خونهٔ مجاور بی‌درز وصل می‌شود.
// جایگزینِ مسیر خاکیِ موج‌دارِ قبلی که شبکه‌ای و زشت می‌شد. فقط یک مش ادغام‌شده (draw call یکسان با قبل).
// پارامترها مثل قبل: m=بیتمسک اتصال چهار جهت، L=طول بازوی هر جهت، bl=بیتمسک درِ ساختمان، gx/gz=سلول برای تنوع رنگ.
const SDW=.86,SEG=.46,GAP=.07,ST_BASE=0x44474c,ST_STONE=[0xc4c1b8,0xb6b3aa,0xccc9c0,0xaeaba2],ST_STEP=0xd8c8a0;
function pathMesh(g,m,id,L,bl=0,gx=0,gz=0){clearKids(g);
const hw=PW/2,B=[1,2,4,8],DX=[0,1,0,-1],DZ=[-1,0,1,0],all=[],off=SDW/4+GAP/4,ss=(SDW-GAP)/2;
const bx=(x,z,w,d,c)=>all.push(vcGeo(new THREE.BoxGeometry(w,.04,d).translate(x,.02,z),c)); // لایهٔ تیرهٔ پایه (curb/درز)
const sx=(x,z,w,d,c)=>all.push(vcGeo(new THREE.BoxGeometry(w,.03,d).translate(x,.055,z),c)); // لایهٔ سنگ‌فرش روشن
// پایهٔ تیره: مرکز + بازوها (کمی بزرگ‌تر از سطح ⇒ حاشیهٔ curb و درزِ تیره دیده شود)
bx(0,0,SDW+.1,SDW+.1,ST_BASE);
B.forEach((bit,i)=>{if(!(m&bit))return;const l=hw+L[i],ax=DX[i]!==0,cx=DX[i]*l/2,cz=DZ[i]*l/2;bx(cx,cz,ax?l:SDW+.1,ax?SDW+.1:l,ST_BASE)});
// سنگ‌فرش روشن: شبکهٔ ۲×۲ در مرکز و ۲تایی در طول بازوها ⇒ درزِ GAP تیره از پایه پیدا است
for(const ox of[-1,1])for(const oz of[-1,1])sx(ox*off,oz*off,ss,ss,ST_STONE[(((id+ox*2+oz)%4)+4)%4]);
B.forEach((bit,i)=>{if(!(m&bit))return;const l=hw+L[i],ax=DX[i]!==0,n=Math.max(1,Math.round(l/(SEG+GAP))),seg=(l-(n-1)*GAP)/n;
for(let k=0;k<n;k++){const a=k*(seg+GAP)+seg/2,cx=DX[i]*a,cz=DZ[i]*a;
for(const s of[-1,1])sx(ax?cx:cx+s*off,ax?cz+s*off:cz,ax?seg:ss,ax?ss:seg,ST_STONE[(((id+k+s+4)%4)+4)%4])}
if(bl&bit)sx(DX[i]*(l-.05),DZ[i]*(l-.05),.6,.6,ST_STEP)}); // پلهٔ گرمِ جلوی در
g.add(vcMesh(all,VCP,false,true))}
function roads(w){const rs=new Set(),ps=new Set();for(const b of w.buildings){if(b.type==='road')rs.add(b.x+','+b.z);else if(b.type==='path')ps.add(b.x+','+b.z)}
const hr=(x,z)=>rs.has(x+','+z),hq=(x,z)=>ps.has(x+','+z),hc=(x,z)=>hr(x,z)||hq(x,z);
const LN=1-PW/2,lk=new Map(),di=(dx,dz)=>dz<0?0:dx>0?1:dz>0?2:3,link=(cx,cz,d,len)=>{const k=cx+','+cz;if(!ps.has(k))return;let e=lk.get(k);if(!e){e={m:0,bl:0,L:[LN,LN,LN,LN]};lk.set(k,e)}e.m|=1<<d;e.bl|=1<<d;e.L[d]=len};
for(const b of w.buildings){const t=b.type,th=(b.rot||0)*Math.PI/180;
if(t==='house'||t==='hq'){const dx=Math.round(Math.sin(th)),dz=Math.round(Math.cos(th));if(dx||dz)link(b.x+dx,b.z+dz,di(-dx,-dz),t==='house'?.85:.53)}
else if(t==='farm'||t==='market'){for(const[nx,nz]of[[0,-1],[1,0],[0,1],[-1,0]]){const ex=t==='farm'?.95:(((nx!==0)===((Math.round((b.rot||0)/90)%2+2)%2===0))?1:.7);link(b.x+nx,b.z+nz,di(-nx,-nz),Math.max(.3,1.5-ex))}}}
for(const b of w.buildings){if(b.type!=='road'&&b.type!=='path')continue;const g=objs.get(b.id);if(!g)continue;
if(b.type==='road'){const m=(hr(b.x,b.z-1)?1:0)|(hr(b.x+1,b.z)?2:0)|(hr(b.x,b.z+1)?4:0)|(hr(b.x-1,b.z)?8:0),l=((b.x+b.z)%2+2)%2===0?1:0,cr=(hq(b.x,b.z-1)&&hq(b.x,b.z+1)?1:0)|(hq(b.x+1,b.z)&&hq(b.x-1,b.z)?2:0),k=m+l*16+cr*32;if(g.userData.k!==k){g.userData.k=k;roadMesh(g,m,l,cr)}}
else{const e=lk.get(b.x+','+b.z),m=(hc(b.x,b.z-1)?1:0)|(hc(b.x+1,b.z)?2:0)|(hc(b.x,b.z+1)?4:0)|(hc(b.x-1,b.z)?8:0)|(e?e.m:0),L=e?e.L:[LN,LN,LN,LN],bl=e?e.bl:0,k=m+'|'+L.join(',')+'|'+bl;if(g.userData.k!==k){g.userData.k=k;pathMesh(g,m,b.id,L,bl,b.x,b.z)}}}}
