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
// ── پیاده‌رو: مسیر خاکیِ باریکِ «رد پایی»؛ نوارِ پیوسته از دیسک‌های خاکیِ نامنظم + رد پا + سنگ‌ریزه.
// خاکی/طبیعی (نه کاشی): پالت قهوه‌ای، لبه‌های ناهموار، ساییدگی و سنگ‌ریزه.
// ضد پرپر: دیسک‌ها با ارتفاع واقعی (.045/.06) و کفِ تخت روی زمین، بدون سطحِ هم‌مرزِ هم‌سطح.
// پارامترها: m=بیتمسک اتصال چهار جهت، L=طول بازوی هر جهت (فاصلهٔ لبه تا هدف)، bl=بیتمسک درِ ساختمان.
// PTW = عرض بصری پیاده‌رو. آسفالت جاده = ۱٫۳ ⇒ نصفش ≈ ۰٫۶۵؛ پیاده‌رو باریک‌تر: ۰٫۶ (هرگز ≥ جاده نشود).
// فوت‌پرینتِ گریدِ پیاده‌رو همان ۱ سلول است؛ PTW فقط «عرض بصری» است و سلول اضافی رزرو نمی‌شود.
// بازوها دقیقاً تا ۰٫۹۶ سلول بعد می‌روند (مرز سلول = ۱) ⇒ به دیسکِ مرکزیِ همسایه می‌چسبند بی‌آنکه همپوشانیِ
// هم‌ارتفاع (z-fight) بسازند: دیسک انتهاییِ هر کاشی جیتِر/انحراف صفر و شعاعِ کامل دارد و در مرز می‌نشیند.
const PTW=.6,PT_DIRT=[0xb09366,0xaa8f63,0xb59a6c],PT_EDGE=0x8d8c55,PT_WORN=0x9b8058,PT_FOOT=0x8f744c,PT_PBG=new THREE.IcosahedronGeometry(.03,0),PT_PBC=[0x8f8a80,0x7d786e,0xa39d90],PT_CYL=new THREE.CylinderGeometry(1,1,1,10,1),PT_M=new THREE.Matrix4(),PT_Q=new THREE.Quaternion(),PT_P=new THREE.Vector3(),PT_S=new THREE.Vector3(),PT_E=new THREE.Euler();
function pathMesh(g,m,id,L,bl=0,gx=0,gz=0){clearKids(g);
const base=[],edge=[],worn=[],foot=[];let sd=(id*9301+49297)%233280;const r=()=>(sd=(sd*9301+49297)%233280)/233280;
// دیسکِ استوانه‌ای (بیضی با شعاع‌های rx/rz و چرخش ry) — کفِ تخت روی زمین (y=0) ⇒ بدون z-fight
const disc=(arr,x,z,rx,rz,h,ry=0)=>{PT_P.set(x,h/2,z);PT_S.set(rx,h,rz);PT_Q.setFromEuler(PT_E.set(0,ry,0));PT_M.compose(PT_P,PT_Q,PT_S);arr.push(PT_CYL.clone().applyMatrix4(PT_M))};
const B=[1,2,4,8],DX=[0,1,0,-1],DZ=[-1,0,1,0],any=B.some(b=>m&b);
// مرکز: لبهٔ محو + دیسکِ خاک (همیشه دیسک مرکزی؛ بازوها به آن می‌چسبند)
const cr=any?PTW/2+.03:.34;disc(edge,0,0,cr+.05,cr+.05,.045);disc(base,0,0,cr,cr,.06);
// بازوها: زنجیرهٔ دیسک‌های خاکی با انحراف ملایم در میانه.
// • بازوی معمولی (همسایهٔ مسیر): تا «مرز سلول منهای ε» می‌رود (CELL/2−.01) ⇒ دیسک انتهایی دقیقاً به دیسکِ
//   انتهاییِ کاشیِ همسایه می‌چسبد بی‌آنکه همپوشانیِ هم‌ارتفاع بین دو مشِ جدا (z-fight/فلیکر) بسازد.
// • بازوی درِ ساختمان (bl): مثل قبل تا دیوارِ ساختمان می‌رود (PW/2+L) — داخل سلولِ ساختمان است که
//   مسیر دیگری نیست ⇒ تداخل بصری ندارد و خاک تا خودِ در می‌رسد.
B.forEach((bit,i)=>{if(!(m&bit))return;const door=bl&bit,l=door?PW/2+L[i]:CELL/2-.01,n=Math.max(2,Math.ceil(l/.2)),ax=DX[i]!==0;
for(let k=1;k<=n;k++){const t=k/n,d=t*l,last=k===n,
j=last?0:(r()-.5)*.1*Math.sin(Math.PI*t),      // انتهای بازو: صاف، بدون انحراف
rad=last?PTW/2:(PTW/2)*(.9+r()*.25),           // دیسک انتهایی: شعاع کامل پیاده‌رو
px=ax?DX[i]*d:j,pz=ax?j:DZ[i]*d;
disc(edge,px,pz,rad+.05,rad+.05,.045);disc(base,px,pz,rad,rad,.06);
if(!last&&r()<.55)disc(worn,px+(ax?0:(r()-.5)*.16),pz+(ax?(r()-.5)*.16:0),.06+r()*.06,.045+r()*.05,.065,r()*3)}
// جلوی در: دیسک گشادتر (حیاطِ ورودی) — تا نزدیک دیوار ساختمان
if(door){const dd=Math.max(PTW,l-.45);disc(edge,DX[i]*dd,DZ[i]*dd,.42,.42,.045);disc(base,DX[i]*dd,DZ[i]*dd,.36,.36,.06)}
// رد پاها: جفت‌بیضی‌های کم‌رنگ چپ/راست در امتداد مسیر
for(let d=.3,s=1;d<l-.08;d+=.3,s=-s){const px=ax?DX[i]*d:s*.06,pz=ax?s*.06:DZ[i]*d;disc(foot,px,pz,ax?.075:.04,ax?.04:.075,.062,(r()-.5)*.4)}});
// ادغامِ همهٔ دیسک‌ها (لبه، خاک، ساییدگی، رد پا) + دو سنگ‌ریزه ← فقط یک مش
const all=[];const mk=(arr,c)=>{for(const x of arr)all.push(vcGeo(x,c))};
mk(edge,PT_EDGE);mk(base,PT_DIRT[((id%3)+3)%3]);mk(worn,PT_WORN);mk(foot,PT_FOOT);
for(let i=0;i<2;i++){const px=(r()-.5)*.6,pz=(r()-.5)*.6,ry=r()*3,ge=PT_PBG.clone();ge.scale(1,.5,1);ge.rotateY(ry);ge.translate(px,.035,pz);all.push(vcGeo(ge,PT_PBC[i%3]))}
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
