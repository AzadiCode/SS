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
// ── پیاده‌رو: بلوک‌های پیکسی سه‌بعدی (مکعب‌های کوچکِ سنگی با دو تنِ ملایم، بی‌درزِ تیره) + حاشیهٔ curb.
// باریک‌تر از نسخهٔ قبلی ⇒ قلمِ ریز برای چیدمانِ دقیق کنار جاده/خونه. بازوها تا لبهٔ سلول می‌رسند ⇒ بی‌فاصله.
// پارامترها: m=بیتمسک اتصال چهار جهت، L=طول بازوی هر جهت، bl=بیتمسک درِ ساختمان.
const SDW=.6,PV=.3,ST_BASE=0x6a6d72,TONES=[0xcac7be,0xb8b2a4],ST_STEP=0xd8c8a0;
function pathMesh(g,m,id,L,bl=0,gx=0,gz=0){clearKids(g);
const hw=PW/2,B=[1,2,4,8],DX=[0,1,0,-1],DZ=[-1,0,1,0],all=[];
const bx=(x,z,w,d,c)=>all.push(vcGeo(new THREE.BoxGeometry(w,.05,d).translate(x,.025,z),c)); // پایه/curb تیره
const px=(x,z,w,d,c)=>all.push(vcGeo(new THREE.BoxGeometry(w,.05,d).translate(x,.055,z),c)); // یک بلوکِ پیکسی
const pave=(x0,z0,x1,z1)=>{for(let z=z0;z<z1;z+=PV){for(let x=x0;x<x1;x+=PV){const w=Math.min(PV,x1-x),d=Math.min(PV,z1-z);if(w<.05||d<.05)continue;px(x+w/2,z+d/2,w,d,TONES[((Math.round(x/PV)+Math.round(z/PV))%2+2)%2])}}}; // چیدمانِ بلوک‌ها با تنِ شطرنجیِ ملایم
// پایهٔ curb تیره: مرکز + بازوها (کمی بزرگ‌تر ⇒ لبهٔ تیره دیده شود)
bx(0,0,SDW+.14,SDW+.14,ST_BASE);
B.forEach((bit,i)=>{if(!(m&bit))return;const l=hw+L[i],ax=DX[i]!==0,cx=DX[i]*l/2,cz=DZ[i]*l/2;bx(cx,cz,ax?l:SDW+.14,ax?SDW+.14:l,ST_BASE)});
// بلوک‌های پیکسیِ روشن: مرکز
pave(-SDW/2,-SDW/2,SDW/2,SDW/2);
// بازوها (تا l می‌رسند ⇒ به همسایه/جاده بی‌درز وصل می‌شوند)
B.forEach((bit,i)=>{if(!(m&bit))return;const l=hw+L[i],ax=DX[i]!==0;
if(ax){const x0=DX[i]>0?0:-l,x1=DX[i]>0?l:0;pave(x0,-SDW/2,x1,SDW/2)}else{const z0=DZ[i]>0?0:-l,z1=DZ[i]>0?l:0;pave(-SDW/2,z0,SDW/2,z1)}
if(bl&bit)all.push(vcGeo(new THREE.BoxGeometry(.62,.14,.62).translate(DX[i]*(l-.08),.07,DZ[i]*(l-.08)),ST_STEP))}); // پلهٔ گرمِ مرتفعِ جلوی در (از زمین تا آستانهٔ پایهٔ خونه)
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
