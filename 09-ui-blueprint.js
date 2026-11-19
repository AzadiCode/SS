// ═══ مود نقشهٔ ساخت حرفه‌ای: شبحِ شفافِ «همان مدل واقعی» زیر انگشت ← چیدن/درگ/چرخش/انتخاب ← تیک = ساخت دسته‌ای با انیمیشن پله‌ای.
// معماری: BP (وضعیت مود) · bpTemplate (کش مدل شبح به‌ازای نوع+ماسک) · bpVal (اعتبارسنجی لایه‌دار) · bpRemesh (اتصال زندهٔ کاشی‌ها)
// · bpStroke (ردیف پیوستهٔ بدون گپ) · bpCommit (تأیید اتمیک + زمان‌بندی stagger ← 05-core-main.js).
// سرور: POST /api/admin/buildings/batch (اتمیک) ← 01-server-admin.py ═══
'use strict';
const BP={on:false,items:[],type:'house',rot:0,rotSet:false,sel:null,dragIt:null,down:null,ghost:null,line:null,busy:false,_tpl:new Map(),_stag:new Map()};
const BP_OK=0x3ddc97,BP_BAD=0xff5a4c,BP_GOLD=0xffc247;
const BP_GEO=new THREE.RingGeometry(.74,.94,4,1,Math.PI/4),BP_PGEO=new THREE.PlaneGeometry(1,1);
// شبح = مدل واقعیِ ادغام‌شده در یک متریال شفاف مشترک؛ عمق‌نویسی خاموش تا از هم پشت هم هم دیده شوند
const BP_HOL=new THREE.MeshStandardMaterial({color:0xaee9ff,transparent:true,opacity:.34,roughness:.5,metalness:0,depthWrite:false});
const BP_EDGE=new THREE.LineBasicMaterial({color:0xeaffff,transparent:true,opacity:.5});
const BP_TILE=new THREE.MeshBasicMaterial({color:BP_OK,transparent:true,opacity:.5,depthWrite:false});
// ── لایه‌ها: خانه/مزرعه/بازار/درخت/hq = لایهٔ ساختمان؛ جاده = لایهٔ خودش؛ پیاده‌رو روی زمینِ باز قابل‌همزیست با لایهٔ جاده نیست
const bpCompat=(a,b)=>a!==b;                                    // لایه‌های متفاوت همزیست؛ هم‌لایه = تداخل
const bpInPond=(x,z)=>((x*2+17)/8.6)**2+((z*2+17)/6)**2<1.15;
const inMap=(x,z)=>x>=-20&&x<20&&z>=-20&&z<20;
// ── اعتبارسنجی لایه‌دار: خروجی true یا دلیل خطا (رشته). مجاورت هرگز خطا نیست؛ فقط همپوشانیِ هم‌لایه، برکه و خارج نقشه.
function bpVal(type,x,z,skip){if(!inMap(x,z))return'خارج از نقشه';if(bpInPond(x,z))return'برکه';
  // هم‌پوشانی با هر ساختمان واقعی ممنوع (مثل سرور: check_cell بدون لایه) — مجاورت آزاد است
  if(W.buildings.some(b=>b.x===x&&b.z===z))return'اشغال است';
  for(const it of BP.items)if(it!==skip&&it.x===x&&it.z===z)return'تداخل با پیش‌نمایش';
  if(type==='hq'&&[...W.buildings,...BP.items.filter(i=>i!==skip)].some(b=>b.type==='hq'))return'دفتر فقط یکی است';
  return true}
const bpFree=(x,z,skip)=>bpVal(BP.type,x,z,skip)===true;
// ── شبحِ مدل واقعی: مدل کامل ساخته می‌شود، همهٔ مش‌ها در یک مش ادغام و با متریال شبح رندر می‌شوند (۱ دراکال)
const BP_DIR=[[0,-1],[1,0],[0,1],[-1,0]],BP_ROTD=[0,Math.PI/2,Math.PI,Math.PI*1.5];
// ماسک اتصال برای یک سلولِ نوع t: همسایه‌های واقعی (W) + همسایه‌های صف (BP.items)
// ماسک اتصال مثل roads.js: جاده و پیاده‌رو هر دو «مسیر»اند و به هم وصل می‌شوند
function bpMask(t,x,z){const same=b=>b.type==='road'||b.type==='path';
  let m=0;for(let i=0;i<4;i++){const nx=x+BP_DIR[i][0],nz=z+BP_DIR[i][1],k=nx+','+nz;
  if(W.buildings.some(b=>b.x===nx&&b.z===nz&&same(b))||BP.items.some(it=>it.x===nx&&it.z===nz&&same(it)))m|=1<<i}
  return m}
// ماسک کاملِ پیاده‌رو = همسایه‌های مسیر (bpMask) + بازوهای درِ ساختمان‌های مجاور (آینهٔ roads().link)
// تا شبحِ پیاده‌رو دقیقاً همان ماسک/طول‌بازو/بیتِ درِ کاشیِ نهایی را داشته باشد (پیش‌نمایش = نهایی).
// بدون این، شبحِ کنارِ خانه با m=0 و cr=.4 (دیسک کوچک) رندر می‌شود ولی واقعی با بیتِ در → cr=PTW/2 (پر).
// ساختمان‌های واقعی (W.buildings) و صفِ چیده‌شده (BP.items) هر دو برای محاسبهٔ در به‌حساب می‌آیند.
function bpPathMask(x,z){const LN=1-PW/2;const L=[LN,LN,LN,LN];let bl=0,m=bpMask('path',x,z);
  // LN فقط برای امضای کش است؛ pathMesh برای بازوی معمولی به مرز سلول می‌رود و L فقط برای بازوی در استفاده می‌شود
  const di=(dx,dz)=>dz<0?0:dx>0?1:dz>0?2:3;
  const blds=[...W.buildings,...BP.items.filter(i=>i.type==='house'||i.type==='hq'||i.type==='farm'||i.type==='market')];
  for(const b of blds){const t=b.type,th=(b.rot||0)*Math.PI/180;
    if(t==='house'||t==='hq'){const dx=Math.round(Math.sin(th)),dz=Math.round(Math.cos(th));
      if((dx||dz)&&b.x+dx===x&&b.z+dz===z){const d=di(-dx,-dz);m|=1<<d;L[d]=t==='house'?.85:.53;bl|=1<<d}}
    else if(t==='farm'||t==='market'){for(const[nx,nz]of[[0,-1],[1,0],[0,1],[-1,0]]){if(b.x+nx===x&&b.z+nz===z){const ex=t==='farm'?.95:(((nx!==0)===((Math.round((b.rot||0)/90)%2+2)%2===0))?1:.7);const d=di(-nx,-nz);m|=1<<d;L[d]=Math.max(.3,1.5-ex);bl|=1<<d}}}}
  return{m,L,bl}}
// قالب شبح: type/rot/mask + links (فقط پیاده‌رو: {m,L,bl} از bpPathMask). کش با کلیدِ امضای کامل.
// lamp (فقط جاده): پریتیِ چراغِ همان سلول — تا شبح دقیقاً مثل جادهٔ نهایی چراغ‌دار/بی‌چراغ باشد.
function bpTemplate(type,rot,mask,links,lamp=0){const key=type+'|'+rot+'|'+mask+(links?'|'+links.L.join(',')+'|'+links.bl:'')+'|'+lamp;
  if(BP._tpl.has(key))return BP._tpl.get(key);
  const g=new THREE.Group();
  if(type==='road'){roadMesh(g,mask,lamp);g.userData.tile=1}
  else if(type==='path'){const lk=links||{m:mask,L:[1-PW/2,1-PW/2,1-PW/2,1-PW/2],bl:0};pathMesh(g,lk.m,1234,lk.L,lk.bl,0,0);g.userData.tile=1}
  else{build[type]?.(g,{id:type==='tree'||type==='hq'?7:1234+(rot/90|0),x:0,z:0,rot});if(type!=='tree'&&type!=='hq')plaqueless(g)}
  // ادغام کل مدل به یک مش شفاف + ذخیرهٔ bbox برای خط دور
  g.updateMatrixWorld(true);   // گروه در صحنه نیست؛ بدون این، ماتریس‌های فرزندان stale می‌مانند و هندسه جای غلط ادغام می‌شود
  // نرمال‌سازی صفات هندسه‌ها قبل از ادغام: همه باید position+normal+color داشته باشند و uv نداشته باشند
  // (قطعات vcGeo رنگ رأس دارند؛ قطعات خام مثل صفحهٔ هالهٔ چراغ فقط position/normal/uv) — وگرنه mergeGeometries null برمی‌گرداند.
  const geos=[];g.traverse(c=>{if(c.isMesh&&c.geometry){let ge=c.geometry.clone();ge.applyMatrix4(c.matrixWorld);if(ge.index)ge=ge.toNonIndexed();
    for(const a of Object.keys(ge.attributes))if(a!=='position'&&a!=='normal')ge.deleteAttribute(a);
    if(!ge.attributes.color){const n=ge.attributes.position.count,ca=new Float32Array(n*3);ge.setAttribute('color',new THREE.BufferAttribute(ca,3))}
    geos.push(ge)}});
  const out=new THREE.Group();
  if(geos.length){const me=new THREE.Mesh(mergeGeometries(geos,false),BP_HOL);me.renderOrder=5;out.add(me);
    const box=new THREE.Box3().setFromObject(me),sz=box.getSize(new THREE.Vector3()),ct=box.getCenter(new THREE.Vector3());
    const eg=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(sz.x,Math.max(sz.y,.02),sz.z)),BP_EDGE);
    eg.position.copy(ct);out.add(eg);out.userData.box={sz,ct}}
  geos.forEach(x=>x.dispose());
  // کاشی زمینی (جاده/پیاده‌رو): صفحهٔ رنگی زیر مدل که سبز/قرمز را نشان می‌دهد
  const tile=new THREE.Mesh(BP_PGEO,BP_TILE.clone());tile.rotation.x=-Math.PI/2;tile.position.y=.02;
  if(type==='road'||type==='path'){tile.scale.set(2,2,1)}else{const b=out.userData.box;tile.scale.set(Math.min(2,b?b.sz.x+.5:2),Math.min(2,b?b.sz.z+.5:2),1)}
  out.add(tile);out.userData.tileMesh=tile;
  const ring=new THREE.Mesh(BP_GEO,new THREE.MeshBasicMaterial({color:BP_OK,transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.06;out.add(ring);out.userData.ring=ring;
  BP._tpl.set(key,out);return out}
// حذف پلاک شمارهٔ خانه از شبح (عنصر نامربوط به پیش‌نمایش).
// فقط صفحهٔ پلاک (texture کشِ _PLQ) حذف می‌شود؛ هالهٔ نورِ در (GRADT) جزو ظاهر واقعی ساختمان است و می‌ماند
// تا ابعاد شبح با ساختمان نهایی یکسان بماند.
function plaqueless(g){for(const c of[...g.children])if(c.isMesh&&c.material&&c.material.map&&_PLQ.has(c.material.map))g.remove(c)}
// کلون امن قالب شبح: ring و کاشی اعتبار را از روی هندسهٔ مشخص پیدا می‌کند (clone در three.js userData را کپی سطحی می‌دهد)
function bpClone(type,rot,mask,links,lamp=0){const src=bpTemplate(type,rot,mask,links,lamp),g=src.clone(true);
  const ring=g.children.find(c=>c.geometry===BP_GEO),tile=g.children.find(c=>c.geometry===BP_PGEO);
  if(ring)ring.material=ring.material.clone();if(tile)tile.material=tile.material.clone();   // متریال جدا تا رنگ هر شبح مستقل باشد
  g.userData={ring,tileMesh:tile,k:mask+(links?'|'+links.L.join(',')+'|'+links.bl:'')+'|'+lamp};return g}

// ── چرخش خودکار (هم‌قاعده با auto_rot سرور): در خانه/دفتر رو به نزدیک‌ترین جاده/پیاده‌رو (واقعی + صف)
function bpAutoRot(it){const r=[...W.buildings,...BP.items.filter(i=>i!==it)].filter(b=>b.type==='road'||b.type==='path');
  if(!r.length)return it.rot||0;let best=null;
  for(const[dx,dz,rt]of[[0,1,0],[1,0,90],[0,-1,180],[-1,0,270]]){const fx=it.x+dx,fz=it.z+dz;let d=1e9;for(const b of r)d=Math.min(d,Math.abs(b.x-fx)+Math.abs(b.z-fz));if(!best||d<best[0])best=[d,rt]}
  return best[1]}
// بازسازی مش یک کاشی مسیر اگر امضای اتصالش عوض شده
function bpRefresh(it){if(!it.g||(it.type!=='road'&&it.type!=='path'))return;
  const links=it.type==='path'?bpPathMask(it.x,it.z):null,lamp=it.type==='road'?(((it.x+it.z)%2+2)%2===0?1:0):0,m=links?links.m:bpMask(it.type,it.x,it.z),
  sig=m+(links?'|'+links.L.join(',')+'|'+links.bl:'')+'|'+lamp;
  if(it.g.userData.k!==sig){scene.remove(it.g);disposeObj(it.g);const g=bpClone(it.type,it.rot,m,links,lamp);g.userData.it=it;g.position.set(it.x*CELL,0,it.z*CELL);scene.add(g);it.g=g;bpPaint(it)}}
// جهت قلم: خودکار ← ۰ ← ۹۰ ← ۱۸۰ ← ۲۷۰ ← خودکار
function bpPenRot(){if(!BP.rotSet){BP.rotSet=true;BP.rot=0}else if(BP.rot===270){BP.rotSet=false;BP.rot=0}else BP.rot+=90;bpGhostType();toast(BP.rotSet?'جهت دستی: '+cpx(BP.rot)+'°':'جهت خودکار: در رو به جاده/پیاده‌رو')}
// ── ساخت/به‌روزرسانی یک آیتم صف: مدل شبح + حلقه + کاشی اعتبار
function bpMake(it){const links=it.type==='path'?bpPathMask(it.x,it.z):null;
  const lamp=it.type==='road'?(((it.x+it.z)%2+2)%2===0?1:0):0;   // چراغ جاده = پریتی سلول، مثل roads()
  const mask=links?links.m:(it.type==='road'?bpMask(it.type,it.x,it.z):0);
  const g=bpClone(it.type,it.rot,mask,links,lamp);
  g.userData.it=it;
  g.position.set(it.x*CELL,0,it.z*CELL);
  if(it.type!=='road'&&it.type!=='path')g.rotation.y=it.rot*Math.PI/180;
  scene.add(g);it.g=g;bpPaint(it);return g}
// رنگ حالت: سبز=معتبر · قرمز=نامعتبر · طلایی=انتخاب‌شده
function bpPaint(it){if(!it.g)return;const val=bpVal(it.type,it.x,it.z,it),ring=it.g.userData.ring;
  it.ok=val===true;it.err=val===true?'':val;
  ring.material.color.setHex(it===BP.sel?BP_GOLD:it.ok?BP_OK:BP_BAD);
  it.g.userData.tileMesh.material.color.setHex(it.ok?BP_OK:BP_BAD);
  it.g.userData.tileMesh.material.opacity=it.ok?.5:.65;
  // اشغالِ سلول توسط ساختمان واقعی: هندسهٔ شبح داخل ساختمان می‌رود و بریدگی می‌سازد → فقط حلقه بماند
  const occupied=val==='اشغال است';
  it.g.children.forEach(ch=>{if(ch!==ring)ch.visible=!occupied})}
// چیدن/حذف/جابه‌جایی
function bpAdd(x,z){if(BP.items.length>=400)return toast('حداکثر ۴۰۰ مورد در یک نقشه');
  if(bpVal(BP.type,x,z)!==true)return false;
  const tile=BP.type==='road'||BP.type==='path',hs=BP.type==='house'||BP.type==='hq',it={type:BP.type,x,z,rot:tile?0:BP.rot,ar:hs&&!BP.rotSet};
  if(it.ar)it.rot=bpAutoRot(it);
  bpMake(it);BP.items.push(it);bpRemesh(it);bpAfterChange(it);return true}
function bpRemove(it){if(!it)return;if(it.g){scene.remove(it.g);disposeObj(it.g);it.g=null}
  BP.items.splice(BP.items.indexOf(it),1);if(BP.sel===it)BP.sel=null;
  for(const o of BP.items)if((o.type==='road'||o.type==='path')&&Math.abs(o.x-it.x)<=1&&Math.abs(o.z-it.z)<=1)bpRemesh(o);
  bpAfterChange(it)}
function bpMove(it,x,z){if(it.x===x&&it.z===z){bpPaint(it);return true}
  const val=bpVal(it.type,x,z,it);if(val!==true){bpPaint(it);return false}
  const ox=it.x,oz=it.z;it.x=x;it.z=z;it.g.position.set(x*CELL,0,z*CELL);bpRemesh(it);
  for(const o of BP.items)if(o!==it&&(o.type==='road'||o.type==='path')&&Math.abs(o.x-ox)<=1&&Math.abs(o.z-oz)<=1)bpRefresh(o);
  bpPaint(it);bpAfterChange(it);return true}
function bpRot(it){if(it.type==='road'||it.type==='path')return;
  it.ar=false;it.rot=(it.rot+90)%360;it.g.rotation.y=it.rot*Math.PI/180;bpRemesh(it);bpPaint(it)}
// ch = آیتمِ تغییرکرده: خانه‌های خودکار اطراف دوباره رو به مسیر می‌چرخند و کاشی‌های مسیرِ کنارشان بازاتصال می‌شوند (چسبیدن درِ خانه به پیاده‌رو)
function bpAfterChange(ch){if(ch){const tiles=ch.type==='road'||ch.type==='path',near=(a,b,n)=>Math.abs(a.x-b.x)<=n&&Math.abs(a.z-b.z)<=n;
  for(const h of BP.items.filter(i=>i.ar&&(i.type==='house'||i.type==='hq')&&(tiles?near(i,ch,8):i===ch))){const nr=bpAutoRot(h);if(nr!==h.rot){h.rot=nr;if(h.g)h.g.rotation.y=nr*Math.PI/180;for(const o of BP.items)if(near(o,h,2))bpRefresh(o)}}
  if(!tiles)for(const o of BP.items)if(near(o,ch,2))bpRefresh(o)}
  for(const it of BP.items)bpPaint(it);bpBar()}
// ── اتصال زندهٔ کاشی‌ها: با هر تغییر، ماسک همسایگیِ همهٔ کاشی‌های مجاور دوباره ساخته می‌شود (مسیر پیوسته همیشه درست)
function bpRemesh(changed){if(changed.type!=='road'&&changed.type!=='path')return;
  const near=[changed,...BP.items.filter(it=>(it.type==='road'||it.type==='path')&&Math.abs(it.x-changed.x)<=1&&Math.abs(it.z-changed.z)<=1)];
  for(const it of near){
    const links=it.type==='path'?bpPathMask(it.x,it.z):null;
    const lamp=it.type==='road'?(((it.x+it.z)%2+2)%2===0?1:0):0;
    const m=links?links.m:bpMask(it.type,it.x,it.z);
    const sig=m+(links?'|'+links.L.join(',')+'|'+links.bl:'')+'|'+lamp;
    if(it.g&&it.g.userData.k!==sig){
      scene.remove(it.g);disposeObj(it.g);
      const g=bpClone(it.type,it.rot,m,links,lamp);g.userData.it=it;
      g.position.set(it.x*CELL,0,it.z*CELL);scene.add(g);it.g=g;bpPaint(it)}}}
// ── ردیف پیوستهٔ جاده/پیاده‌رو: خط برِزن‌هام بین دو نقطه — هیچ سلولی در مسیر جا نمی‌ماند
function bpStroke(x0,z0,x1,z1){const pts=[],n=Math.max(Math.abs(x1-x0),Math.abs(z1-z0));
  if(n===0)pts.push([x0,z0]);
  else for(let i=0;i<=n;i++)pts.push([Math.round(x0+(x1-x0)*i/n),Math.round(z0+(z1-z0)*i/n)]);
  let added=0;for(const[x,z]of pts)if(bpAdd(x,z))added++;return added}
// ── خط راهنمای کشیدن
function bpLine(c){if(!c){if(BP.line){scene.remove(BP.line);disposeObj(BP.line);BP.line=null}return}
  if(!BP.line){BP.line=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xffe0a0,transparent:true,opacity:.8}));BP.line.position.y=.1;scene.add(BP.line)}
  BP.line.geometry.setFromPoints([new THREE.Vector3(BP.down.c[0]*CELL,0,BP.down.c[1]*CELL),new THREE.Vector3(c[0]*CELL,0,c[1]*CELL)])}
// ── شبحِ شناور زیر انگشت (مدل واقعی؛ فقط وقتی درگِ جدید روی زمین است)
function bpFloat(c){const isTile=BP.type==='road'||BP.type==='path';
  // جاده/پیاده‌رو: ماسک/لینک با حرکتِ سلول عوض می‌شود ⇒ مشِ شبح را بازسازی کن تا اتصال زنده دیده شود
  if(isTile&&BP.ghost){const links=BP.type==='path'?bpPathMask(c[0],c[1]):null;
    const lamp=BP.type==='road'?(((c[0]+c[1])%2+2)%2===0?1:0):0;
    const m=links?links.m:bpMask(BP.type,c[0],c[1]);const sig=m+(links?'|'+links.L.join(',')+'|'+links.bl:'')+'|'+lamp;
    if(BP.ghost.userData.k!==sig){scene.remove(BP.ghost);disposeObj(BP.ghost);
      BP.ghost=bpClone(BP.type,BP.rot,m,links,lamp);scene.add(BP.ghost)}}
  else if(!BP.ghost){const g=bpClone(BP.type,BP.rot,0);BP.ghost=g;scene.add(BP.ghost)}
  const val=bpVal(BP.type,c[0],c[1]),ok=val===true;
  BP.ghost.position.set(c[0]*CELL,0,c[1]*CELL);
  if(!isTile){const hs=BP.type==='house'||BP.type==='hq',r=hs&&!BP.rotSet?bpAutoRot({type:BP.type,x:c[0],z:c[1],rot:BP.rot}):BP.rot;BP.ghost.rotation.y=r*Math.PI/180}
  BP.ghost.userData.ring.material.color.setHex(ok?BP_OK:BP_BAD);
  BP.ghost.userData.tileMesh.material.color.setHex(ok?BP_OK:BP_BAD);
  // سلولِ «اشغال» (ساختمان واقعی همان‌جاست): مدل/کاشی شبح داخل هندسهٔ ساختمان می‌رود و مثل بریدگی
  // دیده می‌شود (باگ کاشی صورتیِ ویدیو). فقط حلقهٔ قرمز می‌ماند — و بالای بامِ ساختمانِ موجود می‌رود
  // تا زیر پی دفن نشود و پیامِ روشنِ «اینجا پر است» جلوی چشم باشد.
  const occupied=val==='اشغال است'||val==='تداخل با پیش‌نمایش';
  const occ=occupied&&W.buildings.find(b=>b.x===c[0]&&b.z===c[1]);
  const top=occ&&objs.get(occ.id)?(()=>{const bx=new THREE.Box3().setFromObject(objs.get(occ.id));return Math.max(.12,bx.max.y+.25)})():.06;
  BP.ghost.userData.ring.position.y=top;
  BP.ghost.children.forEach(ch=>{if(ch!==BP.ghost.userData.ring)ch.visible=!occupied});
  BP.ghost.visible=true;BP.ok=ok}
function bpGhostType(){if(!BP.ghost)return;
  scene.remove(BP.ghost);disposeObj(BP.ghost);BP.ghost=null}
// ── نوار پایین و راهنما
function bpBar(){const b=$('bpb');if(!b)return;b.style.display=BP.on?'flex':'none';if(!BP.on)return;
  const n=BP.items.length,bad=BP.items.filter(i=>!i.ok).length;
  const cost=W.cost?BP.items.reduce((s,i)=>s+(W.cost[i.type]||0),0):0;
  $('bpn').innerHTML='نقشهٔ ساخت: '+cpx(n)+' مورد'+(bad?' · <b style="color:#ff8d80">'+cpx(bad)+' نامعتبر</b>':'')+(cost&&!$('fr').checked?' · '+fa(cost/1e6,1)+' م':'');
  $('bpi').textContent=BP.sel?'انتخاب: '+cpx(BP.items.indexOf(BP.sel)+1)+' · '+(W.catalog?.[BP.sel.type]||BP.sel.type):'';
  $('bpok').style.opacity=n&&!bad&&!BP.busy?1:.35}
function bpStart(){if(!T)return;BP.on=true;BP.rot=0;BP.rotSet=false;BP.sel=null;BP.pid=null;bpBar();
  $('bph').style.display='block';$('adm').style.display='none';$('pal').style.display='flex'}
function bpEnd(){BP.on=false;BP.sel=null;BP.dragIt=null;BP.down=null;BP.pid=null;
  for(const it of BP.items)if(it.g){scene.remove(it.g);disposeObj(it.g);it.g=null}
  BP.items=[];bpGhostType();bpLine(null);bpBar();
  $('bph').style.display='none';$('bpq').style.display='none';if(admOn)$('adm').style.display='flex';
  // همگام‌سازی مود: اگر همچنان مود build روشن است خاموشش کن (پالت، هایلایت دکمه) — وگرنه دفعهٔ بعد
  // دکمهٔ 🏗️ toggle می‌کند و هیچ اتفاقی نمی‌افتد (ورود دوباره به ساخت از کار می‌افتد).
  if(mode==='build')setMode('')}
// ── تیک: ساخت همه (اتمیک سمت سرور) — stagger زمان انیمیشن هر ساختمان را BP._stag می‌دهد ← sync.js/main.js
async function bpCommit(){const n=BP.items.length;if(!n||BP.busy)return;
  const bad=BP.items.filter(i=>!i.ok);if(bad.length){toast(cpx(bad.length)+' مورد نامعتبر است — سبز شود یا حذفش کن');
    BP.sel=bad[0];bpAfterChange();return}
  BP.busy=true;bpBar();
  try{const res=await api('/api/admin/buildings/batch','POST',{items:BP.items.map(i=>({type:i.type,x:i.x,z:i.z,rot:i.ar?null:i.rot})),free:$('fr').checked});
    const made=res.buildings||[];BP._stag.clear();
    made.forEach((b,i)=>BP._stag.set(b.id,i*.12));        // پله‌ای: هر ساختمان ۱۲۰ms بعد از قبلی
    toast('✅ '+cpx(n)+' ساختمان ساخته شد');
    for(const it of BP.items)if(it.g){scene.remove(it.g);disposeObj(it.g);it.g=null}
    BP.items=[];bpBar()}
  catch(e){/* api خودش توست خطا می‌زند */}
  BP.busy=false;bpBar()}
// زمان شروع انیمیشنِ پاپ برای ساختمان تازه (۰ = همین حالا؛ stagger ← bpCommit)
const bpDelay=id=>BP._stag.get(id)||0;
document.body.insertAdjacentHTML('beforeend',
 `<div id="bph" class="g">🏗️ انگشت بگذار و بکش: شبح دنبال انگشت می‌آید، رها کن = بنشیند · روی پیش‌نمایش بکش = جابه‌جایی · تپ = انتخاب · R چرخش · ⇧ دوتایی حذف</div>
  <div id="bpb" class="g"><span id="bpn"></span><button id="bpr" title="چرخش انتخاب‌شده (R)">🔄</button><button id="bpq2" title="صف ساخت">📋</button><button id="bpx" title="کنسل (Esc)">✕</button><button id="bpok" title="ساخت (Enter)">✓</button></div>
  <div id="bpq" class="g"><div id="bpi"></div><ol id="bql"></ol></div>`);
$('bpx').onclick=()=>{bpEnd();toast('نقشهٔ ساخت کنسل شد — هیچی ساخته نشد')};
$('bpok').onclick=bpCommit;
$('bpr').onclick=()=>{if(BP.sel)bpRot(BP.sel);else bpPenRot()};
$('bpq2').onclick=()=>{const q=$('bpq');const on=q.style.display==='flex';q.style.display=on?'none':'flex';if(!on)bpQList()};
function bpQList(){const l=$('bql');if(!l)return;l.innerHTML=BP.items.map((it,i)=>
  `<li data-i="${i}" class="${it===BP.sel?'on':''} ${it.ok?'':'bad'}">${cpx(i+1)}. ${W.catalog?.[it.type]||it.type} <i>(${it.x},${it.z})</i><span data-del="${i}">✕</span></li>`).join('')||'<li style="opacity:.6">خالی</li>';
  l.querySelectorAll('[data-del]').forEach(s=>s.onclick=ev=>{ev.stopPropagation();const it=BP.items[+s.dataset.del];bpRemove(it);bpQList()});
  l.querySelectorAll('li[data-i]').forEach(li=>li.onclick=()=>{BP.sel=BP.items[+li.dataset.i]||null;bpAfterChange();bpQList()})}
addEventListener('keydown',e=>{if(!BP.on)return;
  if(e.key==='Escape'){bpEnd();toast('کنسل شد')}
  else if(e.key==='Enter'){e.preventDefault();bpCommit()}
  else if(e.key==='r'||e.key==='R'){if(BP.sel)bpRot(BP.sel);else bpPenRot()}
  else if(e.key==='Delete'||e.key==='Backspace'){if(BP.sel){bpRemove(BP.sel)}}});
