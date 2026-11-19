// ═══ مود ساخت حرفه‌ای v2: ساختمان (شبح/درگ/چرخش) + رسم مسیر (خطی/زاویه‌دار/منحنی) + سطح خاکی (چندضلعی) + Undo/Redo.
// Preview = Final: پیش‌نمایش مسیر از همان توابع هندسی نهایی (geoEdgePolys) ساخته می‌شود؛ سرور همان را اعتبارسنجی می‌کند.
// سرور: POST /api/admin/buildings/batch (ساختمان‌ها، اتمیک) + POST /api/admin/infra (مسیرها/سطوح، اتمیک) ═══
'use strict';
const BP={on:false,items:[],type:'house',rot:0,sel:null,dragIt:null,down:null,ghost:null,line:null,busy:false,_tpl:new Map(),_stag:new Map(),
  // حالت رسم مسیر/سطح
  draw:null, undo:[],redo:[], snap:'smart', width:null, style:'poly'};
const BP_OK=0x3ddc97,BP_BAD=0xff5a4c,BP_GOLD=0xffc247;
const BP_GEO=new THREE.RingGeometry(.74,.94,4,1,Math.PI/4),BP_PGEO=new THREE.PlaneGeometry(1,1);
const BP_HOL=new THREE.MeshStandardMaterial({color:0xaee9ff,transparent:true,opacity:.34,roughness:.5,metalness:0,depthWrite:false});
const BP_EDGE=new THREE.LineBasicMaterial({color:0xeaffff,transparent:true,opacity:.5});
const BP_TILE=new THREE.MeshBasicMaterial({color:BP_OK,transparent:true,opacity:.5,depthWrite:false});
// متریال‌های پیش‌نمایش مسیر (همان رنگ نهایی INFRA_COL)
const BP_ROAD_MAT=new THREE.MeshBasicMaterial({color:0x4a4d52,transparent:true,opacity:.55,depthWrite:false});
const BP_WALK_MAT=new THREE.MeshBasicMaterial({color:0xb09366,transparent:true,opacity:.6,depthWrite:false});
const BP_DIRT_MAT=new THREE.MeshBasicMaterial({color:0x9b8058,transparent:true,opacity:.6,depthWrite:false});
const BP_SURF_MAT=new THREE.MeshBasicMaterial({color:0x9b8058,transparent:true,opacity:.5,depthWrite:false});
const BP_BAD_MAT=new THREE.MeshBasicMaterial({color:BP_BAD,transparent:true,opacity:.55,depthWrite:false});
const BP_NODE_GEO=new THREE.SphereGeometry(.12,10,8),BP_NODE_MAT=new THREE.MeshBasicMaterial({color:0xffe0a0});
const BP_PT_GEO=new THREE.SphereGeometry(.08,8,6),BP_PT_MAT=new THREE.MeshBasicMaterial({color:0xffffff});
const BP_LINE_MAT=new THREE.LineBasicMaterial({color:0xffe0a0,transparent:true,opacity:.9});
// ── انواع ابزار
const BP_TOOLS={
  house:{kind:'bld'},hq:{kind:'bld'},farm:{kind:'bld'},market:{kind:'bld'},tree:{kind:'bld'},
  road:{kind:'path',w:2},walk:{kind:'path',w:.6},dirt:{kind:'path',w:.6},
  surf:{kind:'surf'}};
const bpCompat=(a,b)=>a!==b;
const bpInPond=(x,z)=>((x*2+17)/8.6)**2+((z*2+17)/6)**2<1.15;
const inMap=(x,z)=>x>=-20&&x<20&&z>=-20&&z<20;
// ── اعتبارسنجی ساختمان (لایه‌دار)
let bpHit=null;
function bpVal(type,x,z,skip,rot){bpHit=null;if(rot==null)rot=BP.rot;
  const r=fpCheck(type,x,z,rot,W.buildings.concat(BP.items.filter(i=>i!==skip)));
  if(r==='برخورد'){bpHit=fpHit;return BP.items.includes(fpHit)?'تداخل با پیش‌نمایش':'اشغال است'}
  if(r==='برخورد با مسیر'){bpHit=fpHit;return'روی جاده/پیاده‌رو است'}
  if(r!==true)return r;
  if(type==='hq'&&[...W.buildings,...BP.items.filter(i=>i!==skip)].some(b=>b.type==='hq'))return'دفتر فقط یکی است';
  return true}
const bpFree=(x,z,skip)=>bpVal(BP.type,x,z,skip,BP.rot)===true;
// ── شبح ساختمان (مدل واقعی ادغام‌شده) — بدون تغییر از نسخهٔ قبل
function bpTemplate(type,rot){const key=type+'|'+rot;
  if(BP._tpl.has(key))return BP._tpl.get(key);
  const g=new THREE.Group();
  build[type]?.(g,{id:type==='tree'||type==='hq'?7:1234+(rot/90|0),x:0,z:0,rot});if(type!=='tree'&&type!=='hq')plaqueless(g);
  g.updateMatrixWorld(true);
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
  const tile=new THREE.Mesh(BP_PGEO,BP_TILE.clone());tile.rotation.x=-Math.PI/2;tile.position.y=.02;
  const b=out.userData.box;tile.scale.set(Math.min(2.2,b?b.sz.x+.3:2),Math.min(2.2,b?b.sz.z+.3:2),1);
  out.add(tile);out.userData.tileMesh=tile;
  const ring=new THREE.Mesh(BP_GEO,new THREE.MeshBasicMaterial({color:BP_OK,transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.06;out.add(ring);out.userData.ring=ring;
  BP._tpl.set(key,out);return out}
function plaqueless(g){for(const c of[...g.children])if(c.isMesh&&c.material&&c.material.map&&_PLQ.has(c.material.map))g.remove(c)}
function bpClone(type,rot){const src=bpTemplate(type,rot),g=src.clone(true);
  const ring=g.children.find(c=>c.geometry===BP_GEO),tile=g.children.find(c=>c.geometry===BP_PGEO);
  if(ring)ring.material=ring.material.clone();if(tile)tile.material=tile.material.clone();
  g.userData={ring,tileMesh:tile};return g}
// ── ساخت/به‌روزرسانی آیتم ساختمانی صف
function bpMake(it){
  const g=bpClone(it.type,it.rot);g.userData.it=it;
  g.position.set(it.x*CELL,0,it.z*CELL);g.rotation.y=it.rot*Math.PI/180;
  scene.add(g);it.g=g;bpPaint(it);return g}
function bpPaint(it){if(!it.g)return;const val=bpVal(it.type,it.x,it.z,it,it.rot),ring=it.g.userData.ring;
  it.ok=val===true;it.err=val===true?'':val;
  ring.material.color.setHex(it===BP.sel?BP_GOLD:it.ok?BP_OK:BP_BAD);
  it.g.userData.tileMesh.material.color.setHex(it.ok?BP_OK:BP_BAD);
  it.g.userData.tileMesh.material.opacity=it.ok?.5:.65;
  const occupied=val==='اشغال است';
  it.g.children.forEach(ch=>{if(ch!==ring)ch.visible=!occupied})}
function bpAdd(x,z){if(BP.items.length>=400)return toast('حداکثر ۴۰۰ مورد در یک نقشه');
  if(bpVal(BP.type,x,z,null,BP.rot)!==true)return false;
  const it={type:BP.type,x,z,rot:BP.rot};
  bpMake(it);BP.items.push(it);bpAfterChange();return true}
function bpRemove(it){if(!it)return;if(it.g){scene.remove(it.g);disposeObj(it.g);it.g=null}
  BP.items.splice(BP.items.indexOf(it),1);if(BP.sel===it)BP.sel=null;
  bpAfterChange()}
function bpMove(it,x,z){if(it.x===x&&it.z===z){bpPaint(it);return true}
  const val=bpVal(it.type,x,z,it,it.rot);if(val!==true){bpPaint(it);return false}
  it.x=x;it.z=z;it.g.position.set(x*CELL,0,z*CELL);bpPaint(it);bpAfterChange();return true}
function bpRot(it){it.rot=(it.rot+90)%360;it.g.rotation.y=it.rot*Math.PI/180;
  const c=fpReseat(it.type,it.rot,it.x,it.z,W.buildings.concat(BP.items.filter(i=>i!==it)));
  it.x=c[0];it.z=c[1];it.g.position.set(it.x*CELL,0,it.z*CELL);bpPaint(it);bpAfterChange()}
function bpAfterChange(){for(const it of BP.items)bpPaint(it);bpBar()}
// ═══ رسم مسیر و سطح (جدید) ═══
// BP.draw = {mode:'path'|'surf', kind, style, w, pts:[[x,z]...], ghost:Group, cursor:[x,z]}
function bpDrawStart(){const t=BP_TOOLS[BP.type];
  if(!t||t.kind!=='path'&&t.kind!=='surf')return false;
  BP.draw={mode:t.kind,kind:t.kind==='path'?(BP.type==='road'?'road':BP.type==='walk'?'walk':'dirt'):null,
    style:BP.style,w:BP.width||(t.w||.6),pts:[],ghost:new THREE.Group(),valid:true};
  scene.add(BP.draw.ghost);
  bpBar();return true}
function bpDrawAbort(){if(!BP.draw)return;
  scene.remove(BP.draw.ghost);disposeObj(BP.draw.ghost);BP.draw=null;bpBar()}
// اعتبارسنجی مسیر در حال رسم (همان سرور): یال‌های بین نقاط متوالی در infra آزمایشی + همهٔ مسیرهای موجود
function bpDrawValidate(pts,kind,style,w){
  if(pts.length<2)return{ok:false,err:'حداقل ۲ نقطه'};
  const inf=GEO_EMPTY_INFRA();
  const Winf=fpInf();
  for(const[id,n]of Winf.nodes)inf.nodes.set(+id,{x:n.x,z:n.z});
  for(const[id,e]of Winf.edges)inf.edges.set(+id,e);
  // next_id باید بالاتر از همهٔ idهای موجود باشد وگرنه گره‌های جدید روی موجودها می‌نشانند و گراف خراب می‌شود
  inf.next_id=Math.max(1,Winf.next_id||1);
  for(const id of inf.nodes.keys())if(id>=inf.next_id)inf.next_id=id+1;
  for(const id of inf.edges.keys())if(id>=inf.next_id)inf.next_id=id+1;
  const ids=pts.map(p=>{const id=inf.next_id++;inf.nodes.set(id,{x:p[0],z:p[1]});return id});
  const eids=[];
  for(let i=0;i<ids.length-1;i++){const eid=inf.next_id++;
    inf.edges.set(eid,{a:ids[i],b:ids[i+1],kind,style,w});eids.push(eid)}
  const rects=W.buildings.filter(b=>b.type!=='road'&&b.type!=='path').map(b=>fpRects(b)[0]);
  for(const eid of eids){const er=geoValidateEdge(inf,eid,rects);if(er.length)return{ok:false,err:er[0]}}
  return{ok:true,eids}}
// رندر پیش‌نمایش مسیر (همان هندسهٔ نهایی)
function bpDrawRender(cursor){
  if(!BP.draw)return;const d=BP.draw;
  clearKids(d.ghost);
  const pts=cursor?[...d.pts,cursor]:d.pts;
  // مسیر: نقاط + خط راهنما + سطح پیش‌نمایش
  if(d.mode==='path'){
    if(pts.length>=2){
      const S=geoSamplePath(pts,d.style==='curve'?'curve':'poly',.4);
      const poly=geoStrokePoly(S,d.w,'round','round','round');
      const v=bpDrawValidate(d.pts,d.kind,d.style,d.w);   // اعتبارسنجی فقط نقاط قطعی (cursor موقتی است)
      d.valid=v.ok;d.err=v.ok?'':v.err;
      const mat=d.kind==='road'?BP_ROAD_MAT:d.kind==='walk'?BP_WALK_MAT:BP_DIRT_MAT;
      const g=infraPolyGeo(poly,.08,0xffffff);
      if(g){const m=new THREE.Mesh(g,v.ok?mat:BP_BAD_MAT);m.renderOrder=4;d.ghost.add(m);g.dispose()}
      // خط مرکز
      const lg=new THREE.BufferGeometry().setFromPoints(S.map(p=>new THREE.Vector3(p.x,.14,p.z)));
      d.ghost.add(new THREE.Line(lg,BP_LINE_MAT))}
    // نقاط کنترل
    for(const p of d.pts){const n=new THREE.Mesh(BP_PT_GEO,BP_NODE_MAT);n.position.set(p[0],.14,p[1]);d.ghost.add(n)}}
  // سطح: چندضلعی + رأس‌ها
  else{
    if(pts.length>=3){
      const P=pts;
      const errs=[];
      if(geoPolySelfIsect(P))errs.push('چندضلعی خودمتقاطع');
      if(Math.abs(geoPolyArea(P))<.05)errs.push('مساحت خیلی کم');
      const bb=geoPolyBBox(P);
      if(bb[0]<GEO_LO||bb[1]>GEO_HI||bb[2]<GEO_LO||bb[3]>GEO_HI)errs.push('خارج از نقشه');
      for(const p of P)if(GEO_POND(p[0],p[1])){errs.push('روی برکه');break}
      d.valid=!errs.length;d.err=errs[0]||'';
      const g=infraPolyGeo(P,.045,0xffffff);
      if(g){const m=new THREE.Mesh(g,d.valid?BP_SURF_MAT:BP_BAD_MAT);m.renderOrder=3;d.ghost.add(m);g.dispose()}}
    for(const p of pts){const n=new THREE.Mesh(BP_PT_GEO,BP_NODE_MAT);n.position.set(p[0],.12,p[1]);d.ghost.add(n)}}
  bpBar()}
// افزودن نقطه به رسم جاری (با Snap)
function bpDrawPoint(p){if(!BP.draw)return;
  const d=BP.draw;
  // Snap هوشمند: اگر نقطهٔ اول است → گره‌های موجود؛ در غیر این صورت آزاد + زاویه قفل با Shift
  let pt=[p[0],p[1]];
  if(BP.snap!=='off'){
    const inf=fpInf();
    const edgesS=[];for(const e of inf.edges.values()){const A=inf.nodes.get(e.a),B=inf.nodes.get(e.b);if(!A||!B)continue;
      edgesS.push({S:geoSamplePath([[A.x,A.z],[B.x,B.z]],'poly',.4)})}
    const s=geoSnap(p,inf,BP.snap==='node'?'node':'path',{edgesS,snapR:.6});
    if(BP.snap!=='off')pt=s.p}
  // نقطهٔ تکراری نگیر
  const last=d.pts[d.pts.length-1];
  if(last&&Math.hypot(last[0]-pt[0],last[1]-pt[1])<.15)return;
  d.pts.push(pt);
  BP.undo.push({t:'pt'});BP.redo.length=0;
  bpDrawRender(null)}
// حذف آخرین نقطه
function bpDrawUndo(){if(!BP.draw||!BP.draw.pts.length)return;
  BP.redo.push({t:'pt',p:BP.draw.pts.pop()});bpDrawRender(null)}
function bpDrawRedo(){if(!BP.draw||!BP.redo.length)return;const r=BP.redo.pop();if(r.t==='pt'&&r.p)BP.draw.pts.push(r.p);bpDrawRender(null)}
// تأیید رسم ← API infra
async function bpDrawCommit(){
  if(!BP.draw)return;const d=BP.draw;
  if(d.mode==='path'&&d.pts.length>=2){
    const v=bpDrawValidate(d.pts,d.kind,d.style,d.w);
    if(!v.ok)return toast('مسیر نامعتبر: '+v.err);
    try{await api('/api/admin/infra','POST',{free:$('fr').checked,ops:[{op:'edge',kind:d.kind,pts:d.pts,style:d.style,w:d.w}]});
      toast('✅ مسیر ساخته شد');bpDrawAbort();bpDrawStart()}
    catch(e){/* api توست می‌زند */}}
  else if(d.mode==='surf'&&d.pts.length>=3){
    const errs=[];const P=d.pts;
    if(geoPolySelfIsect(P))errs.push('چندضلعی خودمتقاطع');
    if(Math.abs(geoPolyArea(P))<.05)errs.push('مساحت خیلی کم');
    const bb=geoPolyBBox(P);
    if(bb[0]<GEO_LO||bb[1]>GEO_HI||bb[2]<GEO_LO||bb[3]>GEO_HI)errs.push('خارج از نقشه');
    for(const p of P)if(GEO_POND(p[0],p[1])){errs.push('روی برکه');break}
    if(errs.length)return toast('سطح نامعتبر: '+errs[0]);
    try{await api('/api/admin/infra','POST',{free:$('fr').checked,ops:[{op:'surf',pts:P,mat:'dirt'}]});
      toast('✅ سطح خاکی ساخته شد');bpDrawAbort();bpDrawStart()}
    catch(e){}}}
// ── شبح شناور ساختمان
function bpFloat(c){const isBld=BP_TOOLS[BP.type]?.kind==='bld';
  if(!isBld)return;   // مسیر/سطح شبح مدل ندارند (پیش‌نمایش رسم زنده داریم)
  if(!BP.ghost){BP.ghost=bpClone(BP.type,BP.rot);scene.add(BP.ghost)}
  const val=bpVal(BP.type,c[0],c[1],null,BP.rot),ok=val===true;
  BP.ghost.position.set(c[0]*CELL,0,c[1]*CELL);
  BP.ghost.rotation.y=BP.rot*Math.PI/180;
  BP.ghost.userData.ring.material.color.setHex(ok?BP_OK:BP_BAD);
  BP.ghost.userData.tileMesh.material.color.setHex(ok?BP_OK:BP_BAD);
  const occupied=val==='اشغال است'||val==='تداخل با پیش‌نمایش';
  const occ=occupied&&bpHit&&W.buildings.includes(bpHit)?bpHit:null;
  const top=occ&&objs.get(occ.id)?(()=>{const bx=new THREE.Box3().setFromObject(objs.get(occ.id));return Math.max(.12,bx.max.y+.25)})():.06;
  BP.ghost.userData.ring.position.y=top;
  BP.ghost.children.forEach(ch=>{if(ch!==BP.ghost.userData.ring)ch.visible=!occupied});
  BP.ghost.visible=true;BP.ok=ok}
function bpGhostType(){if(!BP.ghost)return;
  scene.remove(BP.ghost);disposeObj(BP.ghost);BP.ghost=null}
// ── نوار پایین
function bpBar(){const b=$('bpb');if(!b)return;b.style.display=BP.on?'flex':'none';if(!BP.on)return;
  const drawing=!!BP.draw;
  const n=BP.items.length,bad=BP.items.filter(i=>!i.ok).length;
  const cost=W.cost?BP.items.reduce((s,i)=>s+(W.cost[i.type]||0),0):0;
  let html='';
  if(drawing){const d=BP.draw;
    html='<span id="bpn">'+(d.mode==='path'?'رسم مسیر: ':'رسم سطح: ')+cpx(d.pts.length)+' نقطه'+(d.err?' · <b style="color:#ff8d80">'+d.err+'</b>':'')+'</span>';}
  else{html='<span id="bpn">نقشهٔ ساخت: '+cpx(n)+' مورد'+(bad?' · <b style="color:#ff8d80">'+cpx(bad)+' نامعتبر</b>':'')+(cost&&!$('fr').checked?' · '+fa(cost/1e6,1)+' م':'')+'</span>';}
  $('bpb').innerHTML=html+
   (drawing?'<button id="bpz" title="حذف نقطهٔ آخر (Ctrl+Z)">⌫</button><button id="bpy" title="بازگردانی نقطه (Ctrl+Y)">↷</button><button id="bpd" title="پاک‌کردن مسیر">🗑</button><button id="bpok2" title="ساخت (Enter)">✓</button><button id="bpx2" title="کنسل (Esc)">✕</button>'
    :'<span id="bpi">'+(BP.sel?'انتخاب: '+cpx(BP.items.indexOf(BP.sel)+1)+' · '+(W.catalog?.[BP.sel.type]||BP.sel.type):'')+'</span><button id="bpr" title="چرخش (R)">🔄</button><button id="bpq2" title="صف ساخت">📋</button><button id="bpx" title="کنسل (Esc)">✕</button><button id="bpok" title="ساخت (Enter)">✓</button>');
  if(drawing){
    $('bpz').onclick=bpDrawUndo;$('bpy').onclick=bpDrawRedo;
    $('bpd').onclick=()=>{if(BP.draw){BP.draw.pts=[];bpDrawRender(null)}};
    $('bpok2').onclick=bpDrawCommit;$('bpx2').onclick=()=>{bpDrawAbort();bpDrawStart()};}
  else{
    $('bpok')&&( $('bpok').style.opacity=n&&!bad&&!BP.busy?1:.35);
    $('bpr').onclick=()=>{if(BP.sel)bpRot(BP.sel);else toast('اول یک پیش‌نمایش را انتخاب کن')};
    $('bpq2').onclick=()=>{const q=$('bpq');const on=q.style.display==='flex';q.style.display=on?'none':'flex';if(!on)bpQList()};
    $('bpx').onclick=()=>{bpEnd();toast('نقشهٔ ساخت کنسل شد — هیچی ساخته نشد')};
    $('bpok').onclick=bpCommit}}
function bpStart(){if(!T)return;BP.on=true;BP.rot=0;BP.sel=null;BP.pid=null;bpBar();
  $('bph').style.display='block';$('adm').style.display='none';$('pal').style.display='flex';
  bpToolChanged()}
function bpToolChanged(){ // با تغییر قلم: شروع/توقف حالت رسم
  const t=BP_TOOLS[BP.type];
  if(BP.draw)bpDrawAbort();
  if(t&&(t.kind==='path'||t.kind==='surf'))bpDrawStart();
  bpGhostType();
  $('bph').textContent=t&&t.kind==='path'?'✏️ روی زمین بزن تا نقاط مسیر ثبت شود · Enter = ساخت · Esc = کنسل · ⌫ = حذف نقطهٔ آخر':
    t&&t.kind==='surf'?'🟤 نقاط گوشه‌های سطح خاکی را بزن · Enter = ساخت · Esc = کنسل':
    '🏗️ انگشت بگذار و بکش: شبح دنبال انگشت می‌آید، رها کن = بنشیند · روی پیش‌نمایش بکش = جابه‌جایی · تپ = انتخاب · R چرخش'}
function bpEnd(){BP.on=false;BP.sel=null;BP.dragIt=null;BP.down=null;BP.pid=null;
  if(BP.draw)bpDrawAbort();
  for(const it of BP.items)if(it.g){scene.remove(it.g);disposeObj(it.g);it.g=null}
  BP.items=[];bpGhostType();bpBar();
  $('bph').style.display='none';$('bpq').style.display='none';if(admOn)$('adm').style.display='flex';
  if(mode==='build')setMode('')}
// ── تأیید ساخت ساختمان‌ها (اتمیک)
async function bpCommit(){const n=BP.items.length;if(!n||BP.busy)return;
  const bad=BP.items.filter(i=>!i.ok);if(bad.length){toast(cpx(bad.length)+' مورد نامعتبر است — سبز شود یا حذفش کن');
    BP.sel=bad[0];bpAfterChange();return}
  BP.busy=true;bpBar();
  try{const res=await api('/api/admin/buildings/batch','POST',{items:BP.items.map(i=>({type:i.type,x:i.x,z:i.z,rot:i.rot})),free:$('fr').checked});
    const made=res.buildings||[];BP._stag.clear();
    made.forEach((b,i)=>BP._stag.set(b.id,i*.12));
    toast('✅ '+cpx(n)+' ساختمان ساخته شد');
    for(const it of BP.items)if(it.g){scene.remove(it.g);disposeObj(it.g);it.g=null}
    BP.items=[];bpBar()}
  catch(e){/* api خودش توست خطا می‌زند */}
  BP.busy=false;bpBar()}
const bpDelay=id=>BP._stag.get(id)||0;
document.body.insertAdjacentHTML('beforeend',
 `<div id="bph" class="g"></div>
  <div id="bpb" class="g"></div>
  <div id="bpq" class="g"><div id="bpi"></div><ol id="bql"></ol></div>`);
function bpQList(){const l=$('bql');if(!l)return;l.innerHTML=BP.items.map((it,i)=>
  `<li data-i="${i}" class="${it===BP.sel?'on':''} ${it.ok?'':'bad'}">${cpx(i+1)}. ${W.catalog?.[it.type]||it.type} <i>(${it.x},${it.z})</i><span data-del="${i}">✕</span></li>`).join('')||'<li style="opacity:.6">خالی</li>';
  l.querySelectorAll('[data-del]').forEach(s=>s.onclick=ev=>{ev.stopPropagation();const it=BP.items[+s.dataset.del];bpRemove(it);bpQList()});
  l.querySelectorAll('li[data-i]').forEach(li=>li.onclick=()=>{BP.sel=BP.items[+li.dataset.i]||null;bpAfterChange();bpQList()})}
addEventListener('keydown',e=>{if(!BP.on)return;
  if(e.key==='Escape'){BP.draw?bpDrawAbort():bpEnd();if(BP.draw)bpDrawStart();toast('کنسل شد')}
  else if(e.key==='Enter'){e.preventDefault();BP.draw?bpDrawCommit():bpCommit()}
  else if((e.key==='z'||e.key==='Z')&&(e.ctrlKey||e.metaKey)){e.preventDefault();bpDrawUndo()}
  else if((e.key==='y'||e.key==='Y')&&(e.ctrlKey||e.metaKey)){e.preventDefault();bpDrawRedo()}
  else if(e.key==='Backspace'&&BP.draw){e.preventDefault();bpDrawUndo()}
  else if(e.key==='r'||e.key==='R'){if(BP.sel)bpRot(BP.sel);else{BP.rot=(BP.rot+90)%360;bpGhostType()}}
  else if(e.key==='Delete'||e.key==='Backspace'){if(BP.sel)bpRemove(BP.sel)}});
