// ═══ جاده‌ها و پیاده‌روهای به‌هم‌پیوسته + چراغ خیابان. ═══
'use strict';
// ── جاده‌های متصل + چراغ خیابان
const LAMP=new THREE.MeshStandardMaterial({color:0xfff1c0,emissive:0xffd98a,emissiveIntensity:.1}),LP=new THREE.MeshBasicMaterial({map:GRADT,color:0xffc873,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}),LPG=new THREE.PlaneGeometry(4.6,4.6),ASP=0x4a4d52;
const LBG=keepGeo(new THREE.SphereGeometry(.09,8,6));
// هر کاشی جاده = یک مش ادغام‌شده (رنگ در رأس‌ها) + فقط برای چراغ‌دار: لامپ/هاله. قبلاً ۵ تا ۱۵ مش جدا بود.
// جاده = ۸ سلول × CELL(=.25) = ۲ واحد دنیا؛ مدل آسفالت ۲×۲ در مرکز سلول.
function roadMesh(g,m,lamp,cr=0){clearKids(g);
const A=[],q=(w,d,x,z,c,h=.08)=>A.push(vcGeo(new THREE.BoxGeometry(w,h,d).translate(x,h/2,z),c));
q(2,2,0,0,0xb9b3a4,.06);q(1.3,1.3,0,0,ASP);
[[1,0,-.825,1.3,.35],[2,.825,0,.35,1.3],[4,0,.825,1.3,.35],[8,-.825,0,.35,1.3]].forEach(([bit,x,z,w,d])=>{if(m&bit){q(w,d,x,z,ASP);q(bit&5?.06:.3,bit&5?.3:.06,x*.9,z*.9,0xf1e7b8,.09)}});
if(cr){const zb=(w,d,x,z)=>q(w,d,x,z,0xefe9d6,.095);for(let i=-2;i<=2;i++){if(cr&1)zb(.09,1,i*.2,0);if(cr&2)zb(1,.09,0,i*.2)}}
if(lamp)A.push(vcGeo(new THREE.CylinderGeometry(.025,.035,1.1,5).translate(.82,.55,.82),0x2f3338));
g.add(vcMesh(A,VCM,!!lamp,true));
if(lamp){const bl=new THREE.Mesh(LBG,LAMP);bl.position.set(.82,1.12,.82);g.add(bl);const pl=NORAY(new THREE.Mesh(LPG,LP));pl.rotation.x=-Math.PI/2;pl.position.set(.55,.12,.55);g.add(pl);const hl=NORAY(new THREE.Sprite(LHALO));hl.scale.set(1,1,1);hl.position.set(.82,1.12,.82);g.add(hl)}}
// ── پیاده‌رو: مسیر خاکیِ باریکِ «رد پایی»؛ نوارِ پیوسته از دیسک‌های خاکیِ نامنظم + رد پا + سنگ‌ریزه.
// خاکی/طبیعی (نه کاشی): پالت قهوه‌ای، لبه‌های ناهموار، ساییدگی و سنگ‌ریزه.
// ضد پرپر: دیسک‌ها با ارتفاع واقعی (.045/.06) و کفِ تخت روی زمین، بدون سطحِ هم‌مرزِ هم‌سطح.
// مختصات محلی: مرکز کاشی = (۰,۰). PTW = عرض بصری پیاده‌رو (PATH_W=.5)؛ یک‌چهارمِ عرض جاده (۲).
// هر سلول پیاده‌رو = CELL واحد دنیا؛ دیسکِ مرکزی شعاع PTW/2 و بازوها تا مرز سلول (CELL) می‌روند تا
// به دیسکِ همسایه بچسبند. چون همه روی شبکه‌اند، فاصلهٔ بصری بین کاشی و ساختمان دیگر وجود ندارد.
const PTW=.5,PT_DIRT=[0xb09366,0xaa8f63,0xb59a6c],PT_EDGE=0x8d8c55,PT_WORN=0x9b8058,PT_FOOT=0x8f744c,PT_PBG=new THREE.IcosahedronGeometry(.03,0),PT_PBC=[0x8f8a80,0x7d786e,0xa39d90],PT_CYL=new THREE.CylinderGeometry(1,1,1,10,1),PT_M=new THREE.Matrix4(),PT_Q=new THREE.Quaternion(),PT_P=new THREE.Vector3(),PT_S=new THREE.Vector3(),PT_E=new THREE.Euler();
function pathMesh(g,m,id){clearKids(g);
const base=[],edge=[],worn=[],foot=[];let sd=(id*9301+49297)%233280;const r=()=>(sd=(sd*9301+49297)%233280)/233280;
// دیسکِ استوانه‌ای (بیضی با شعاع‌های rx/rz و چرخش ry) — کفِ تخت روی زمین (y=0) ⇒ بدون z-fight
const disc=(arr,x,z,rx,rz,h,ry=0)=>{PT_P.set(x,h/2,z);PT_S.set(rx,h,rz);PT_Q.setFromEuler(PT_E.set(0,ry,0));PT_M.compose(PT_P,PT_Q,PT_S);arr.push(PT_CYL.clone().applyMatrix4(PT_M))};
const B=[1,2,4,8],DX=[0,1,0,-1],DZ=[-1,0,1,0],any=B.some(b=>m&b);
// مرکز: لبهٔ محو + دیسکِ خاک (همیشه دیسک مرکزی؛ بازوها به آن می‌چسبند)
const cr=any?PTW/2+.02:.17;disc(edge,0,0,cr+.025,cr+.025,.035);disc(base,0,0,cr,cr,.05);
// بازوها: زنجیرهٔ دیسک‌های خاکی از لبهٔ دیسک مرکزی تا مرز سلول.
// دیسک انتهایی شعاعِ کاملِ پیاده‌رو دارد و در مرز سلول می‌نشیند ⇒ به دیسکِ همسایه می‌چسبد بدون z-fight.
const half=CELL/2-.005;   // مرز سلول منهای ε
B.forEach((bit,i)=>{if(!(m&bit))return;const n=Math.max(2,Math.ceil(half/.06)),ax=DX[i]!==0;
for(let k=1;k<=n;k++){const t=k/n,d=PTW/2+t*(half-PTW/2),last=k===n,
j=last?0:(r()-.5)*.05*Math.sin(Math.PI*t),      // انتهای بازو: صاف، بدون انحراف
rad=last?PTW/2:(PTW/2)*(.9+r()*.2),           // دیسک انتهایی: شعاع کامل پیاده‌رو
px=ax?DX[i]*d:j,pz=ax?j:DZ[i]*d;
disc(edge,px,pz,rad+.025,rad+.025,.035);disc(base,px,pz,rad,rad,.05);
if(!last&&r()<.55)disc(worn,px+(ax?0:(r()-.5)*.08),pz+(ax?(r()-.5)*.08:0),.03+r()*.03,.025+r()*.025,.055,r()*3)}
// رد پاها: جفت‌بیضی‌های کم‌رنگ چپ/راست در امتداد مسیر
for(let d=.08,s=1;d<half-.04;d+=.08,s=-s){const px=ax?DX[i]*d:s*.03,pz=ax?s*.03:DZ[i]*d;disc(foot,px,pz,ax?.04:.02,ax?.02:.04,.05,(r()-.5)*.4)}});
// ادغامِ همهٔ دیسک‌ها (لبه، خاک، ساییدگی، رد پا) + دو سنگ‌ریزه ← فقط یک مش
const all=[];const mk=(arr,c)=>{for(const x of arr)all.push(vcGeo(x,c))};
mk(edge,PT_EDGE);mk(base,PT_DIRT[((id%3)+3)%3]);mk(worn,PT_WORN);mk(foot,PT_FOOT);
for(let i=0;i<2;i++){const px=(r()-.5)*.3,pz=(r()-.5)*.3,ry=r()*3,ge=PT_PBG.clone();ge.scale(.6,.5,.6);ge.rotateY(ry);ge.translate(px,.03,pz);all.push(vcGeo(ge,PT_PBC[i%3]))}
g.add(vcMesh(all,VCP,false,true))}
// ── ساخت/به‌روزرسانی همهٔ کاشی‌های جاده/پیاده‌رو از روی دادهٔ سرور. ماسک همسایگی = هر دو جهت جاده/پیاده‌رو.
function roads(w){const rs=new Set(),ps=new Set();for(const b of w.buildings){if(b.type==='road')rs.add(b.x+','+b.z);else if(b.type==='path')ps.add(b.x+','+b.z)}
const hr=(x,z)=>rs.has(x+','+z),hq=(x,z)=>ps.has(x+','+z),hc=(x,z)=>hr(x,z)||hq(x,z);
for(const b of w.buildings){if(b.type!=='road'&&b.type!=='path')continue;const g=objs.get(b.id);if(!g)continue;
if(b.type==='road'){const m=(hr(b.x,b.z-1)?1:0)|(hr(b.x+1,b.z)?2:0)|(hr(b.x,b.z+1)?4:0)|(hr(b.x-1,b.z)?8:0),l=((b.x+b.z)%2+2)%2===0?1:0,cr=(hq(b.x,b.z-1)&&hq(b.x,b.z+1)?1:0)|(hq(b.x+1,b.z)&&hq(b.x-1,b.z)?2:0),k=m+l*16+cr*32;if(g.userData.k!==k){g.userData.k=k;roadMesh(g,m,l,cr)}}
else{const m=(hc(b.x,b.z-1)?1:0)|(hc(b.x+1,b.z)?2:0)|(hc(b.x,b.z+1)?4:0)|(hc(b.x-1,b.z)?8:0);if(g.userData.k!==m){g.userData.k=m;pathMesh(g,m,b.id)}}}}
