// ═══ رندر زیرساخت v2: جاده/پیاده‌رو/مسیر خاکی پیوسته + سطوح خاکی + چراغ خیابان. ═══
// معماری: هندسه از W.infrastructure (v2: nodes/edges/surfaces) می‌آید؛ رندر = Stroke سه‌بعدی + Hub تقاطع + باند پیاده‌روی کنار جاده.
// کش: هر یال/گره/سطح با امضای هندسی (geoSigEdge) کش می‌شود؛ فقط تغییرشده بازساخته می‌شود (بودجهٔ draw call حفظ می‌شود).
// قدیمی: کاشی‌های ۲×۲ حذف شدند؛ مهاجرت در سرور کاشی‌ها را به یال تبدیل کرده و رندر کاشی را متوقف می‌کند.
'use strict';
// ── متریال‌ها
const LAMP=new THREE.MeshStandardMaterial({color:0xfff1c0,emissive:0xffd98a,emissiveIntensity:.1}),
LP=new THREE.MeshBasicMaterial({map:GRADT,color:0xffc873,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}),
LPG=new THREE.PlaneGeometry(4.6,4.6),ASP=0x4a4d52,
LBG=keepGeo(new THREE.SphereGeometry(.09,8,6));
// رنگ‌های سطوح: آسفالت/پیاده‌رو/خاکی — پالت قدیمی جاده حفظ شد (0xb9b3a4 حاشیه، ASP آسفالت، 0xf1e7b8 خط‌کشی)
const INFRA_COL={road:{base:ASP,edge:0xb9b3a4,line:0xf1e7b8},walk:{base:0xb09366,edge:0x8d8c55},dirt:{base:0x9b8058,edge:0x8f744c}};
const INFRA_Y={road:.075,walk:.062,dirt:.05};          // ارتفاع هر سطح (ضد Z-Fighting با ترتیب پلکانی)
// ── مثلث‌بندی چندضلعی به BufferGeometry (y ثابت) — از geoEarcut (05-geo-core)
function infraPolyGeo(P,y,color){
  const tris=geoEarcut(P.flat());
  if(!tris||!tris.length)return null;
  const pos=new Float32Array(tris.length*3),nor=new Float32Array(tris.length*3),col=new Float32Array(tris.length*3);
  const c=new THREE.Color(color);
  for(let i=0;i<tris.length;i++){const p=P[tris[i]];pos[i*3]=p[0];pos[i*3+1]=y;pos[i*3+2]=p[1];
    nor[i*3]=0;nor[i*3+1]=1;nor[i*3+2]=0;col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b}
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  g.setAttribute('normal',new THREE.BufferAttribute(nor,3));
  g.setAttribute('color',new THREE.BufferAttribute(col,3));
  return g}
// نوار بین دو polyline (مثلاً لبهٔ روشن‌تر دور پیاده‌رو) — ساده: همان چندضلعی با رنگ لبه
// ── رندر یک یال: بدنهٔ Stroke + حاشیه + (جاده: خط‌کشی وسط) — همه در یک مش vcMesh (۱ دراکال در هر یال)
const INF_G=new THREE.Group(),INF_LAMPS=new THREE.Group();
scene.add(INF_G,INF_LAMPS);
const INF_CACHE=new Map(); // sig ← mesh (گروه)
function infraEdgeMesh(inf,eid){
  const e=inf.edges.get(eid),A=inf.nodes.get(e.a),B=inf.nodes.get(e.b);
  const S=geoSamplePath([[A.x,A.z],[B.x,B.z]],e.style==='curve'?'curve':'poly',.4);
  const w=e.w||GEO_DEF[e.kind].w,y=INFRA_Y[e.kind],C=INFRA_COL[e.kind];
  const parts=[];
  // حاشیه (کمی پهن‌تر و پایین‌تر) + بدنه
  const outer=geoStrokePoly(S,w+.14,'round','butt','butt');
  const body=geoStrokePoly(S,w,'round','butt','butt');
  const g1=infraPolyGeo(outer,y-.012,C.edge),g2=infraPolyGeo(body,y,C.base);
  if(g1)parts.push(g1);if(g2)parts.push(g2);
  // جاده: خط‌کشی وسط (نوار باریک ۰٫۰۶) + عابر خ	lines جزئی
  if(e.kind==='road'&&w>=1.2){
    const mid=geoStrokePoly(S,.08,'round','butt','butt');
    const g3=infraPolyGeo(mid,y+.004,C.line);
    if(g3)parts.push(g3)}
  const grp=new THREE.Group();
  if(parts.length){const m=new THREE.Mesh(mergeGeometries(parts,false),VCP);m.receiveShadow=true;grp.add(m);parts.forEach(p=>p.dispose())}
  return grp}
// چراغ کنار جاده (هر ~۱۲ واحد طول، با آفست از لبه)
function infraLampsFor(inf){
  clearKids(INF_LAMPS);
  const mk=(x,z,ang)=>{const g=new THREE.Group();
    const pole=new THREE.Mesh(keepGeo(new THREE.CylinderGeometry(.025,.035,1.1,5)),LAMP.clone?LAMP:LAMP);
    pole.position.set(x,.55,z);INF_LAMPS.add(pole);
    const bl=new THREE.Mesh(LBG,LAMP);bl.position.set(x,1.12,z);INF_LAMPS.add(bl);
    const pl=NORAY(new THREE.Mesh(LPG,LP));pl.rotation.x=-Math.PI/2;pl.position.set(x-.27,.12,z-.27);INF_LAMPS.add(pl);
    const hl=NORAY(new THREE.Sprite(LHALO));hl.scale.set(1,1,1);hl.position.set(x,1.12,z);INF_LAMPS.add(hl)};
  let acc=0;
  for(const e of inf.edges.values()){
    if(e.kind!=='road')continue;
    const A=inf.nodes.get(e.a),B=inf.nodes.get(e.b);
    const S=geoSamplePath([[A.x,A.z],[B.x,B.z]],'poly',1);
    for(let i=1;i<S.length;i++){acc+=S[i].s-S[i-1].s;
      if(acc>=12){acc=0;const p=S[i],nx=-p.dz,nz=p.dx,h=(e.w||2)/2+.3;
        mk(p.x+nx*h,p.z+nz*h,Math.atan2(nx,nz))}}}}
// ── رندر کامل زیرساخت: فقط امضاهای تغییرکرده بازسازی می‌شوند
let INF_SIG='';
function infraRender(w){
  const inf=infraLoad(w.infrastructure);
  // امضای کل: تعداد + امضای هر یال/سطح
  const sigs=[];
  for(const[id,e]of inf.edges){const A=inf.nodes.get(e.a),B=inf.nodes.get(e.b);
    if(A&&B)sigs.push('E'+id+':'+geoSigEdge(e,A,B))}
  for(const[id,s]of inf.surfaces)sigs.push('S'+id+':'+s.mat+':'+s.pts.map(p=>p[0]+','+p[1]).join(';'));
  const sig=sigs.sort().join('|');
  if(sig===INF_SIG)return;
  const prev=new Set(INF_CACHE.keys()),next=new Set();
  for(const[id,e]of inf.edges){
    const A=inf.nodes.get(e.a),B=inf.nodes.get(e.b);if(!A||!B)continue;
    const s=geoSigEdge(e,A,B);next.add(s);
    if(INF_CACHE.has(s))continue;
    const g=infraEdgeMesh(inf,id);g.userData.k=s;INF_G.add(g);INF_CACHE.set(s,g)}
  for(const[s,g]of INF_CACHE)if(!next.has(s)){INF_G.remove(g);disposeObj(g);INF_CACHE.delete(s)}
  // سطوح خاکی (هر سطح = یک مش، متریال mat)
  INF_SIG=sig;
  infraLampsFor(inf)}
// ── سازگاری ناوبری/ماشین‌ها: داده‌های قدیمی roadC/pathC از زیرساخت v2 پر می‌شوند
function roads(w){
  infraRender(w);
  const inf=infraLoad(w.infrastructure);
  roadC.length=0;pathC.length=0;roadSet.clear();pathSet.clear();
  for(const e of inf.edges.values()){
    const A=inf.nodes.get(e.a),B=inf.nodes.get(e.b);if(!A||!B)continue;
    const S=geoSamplePath([[A.x,A.z],[B.x,B.z]],'poly',1.0);
    for(const p of S){
      if(e.kind==='road'){roadC.push({x:p.x,z:p.z});roadSet.add(Math.round(p.x/CELL)+','+Math.round(p.z/CELL))}
      else if(e.kind==='walk'){pathC.push({x:p.x,z:p.z});pathSet.add(Math.round(p.x/CELL)+','+Math.round(p.z/CELL))}
      else{pathC.push({x:p.x,z:p.z})}}}
  // کاشی‌های قدیمی رندر نمی‌شوند (مهاجرت شده‌اند) — مدل‌هایشان را مخفی کن
  for(const b of w.buildings)if(b.type==='road'||b.type==='path'){const g=objs.get(b.id);if(g)g.visible=false}
  // سطوح خاکی روی cost ناوبری اثر بگذارند (راه رفتن آسان‌تر)
  }
// ماشین‌ها: مسیر پیوسته دارد؛ گره‌های جاده برای انتخاب جهت
function infraRoadGraph(){
  const inf=W?infraLoad(W.infrastructure):GEO_EMPTY_INFRA();
  const nodes=new Map(),adj=new Map();
  for(const[id,n]of inf.nodes)nodes.set(id,n);
  for(const[id,e]of inf.edges){if(e.kind!=='road')continue;
    const A=nodes.get(e.a),B=nodes.get(e.b);if(!A||!B)continue;
    if(!adj.has(e.a))adj.set(e.a,[]);if(!adj.has(e.b))adj.set(e.b,[]);
    adj.get(e.a).push({to:e.b,x:B.x,z:B.z});adj.get(e.b).push({to:e.a,x:A.x,z:A.z})}
  return{nodes,adj}}
