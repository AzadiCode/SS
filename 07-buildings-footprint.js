// ═══ ردپای واقعی آیتم‌ها + اتصال دوطرفه به زیرساخت v2. ═══
// قانون: هر آیتم دقیقاً به اندازه و شکل خودش جا می‌گیرد. جاده/پیاده‌رو دیگر کاشی نیستند؛
// مسیرهای هندسی در W.infrastructure (v2) живут و برخورد ساختمان↔مسیر با poly_vs_rect انجام می‌شود.
// «پل‌زدن بصری» (fpBridgeOne/fpBridges قدیمی) حذف شد: مرز ساختمان↔پیاده‌رو حالا با باند آفست دقیق بسته می‌شود.
// باید با FOOT در 01-server-config.py یکی بماند.
'use strict';
const FOOT={house:[1.5,1.3,0,0],hq:[1.9,1.84,0,.05],farm:[1.9,1.9,0,0],market:[2,1.4,0,0],tree:[.5,.5,0,0]};
const FP_EPS=1e-3,FP_LO=-41,FP_HI=39,FP_EMPTY=new Set(),fpGrid=t=>false;   // کاشی‌ها بازنشسته شدند
let fpHit=null;
const fpPondW=(X,Z)=>((X+17)/8.6)**2+((Z+17)/6)**2<1.15,fpHitR=(a,b)=>Math.min(a[1],b[1])-Math.max(a[0],b[0])>FP_EPS&&Math.min(a[3],b[3])-Math.max(a[2],b[2])>FP_EPS;
const fpTiles=l=>new Set();                                  // سازگاری امضا؛ دیگر استفاده نمی‌شود
// مستطیل واقعی [x0,x1,z0,z1] به واحد دنیا (ساختمان‌های آزاد)
function fpRects(b){const t=b.type;if(fpGrid(t))return[[b.x*CELL-1,b.x*CELL+1,b.z*CELL-1,b.z*CELL+1]];
  const f=FOOT[t]||FOOT.tree,x=b.x*CELL,z=b.z*CELL,w=f[0],d=f[1];
  const a=(b.rot||0)*Math.PI/180,s=Math.round(Math.sin(a)),c=Math.round(Math.cos(a));
  const cx=x+f[2]*c+f[3]*s,cz=z-f[2]*s+f[3]*c;const W2=s?d:w,D2=s?w:d;
  return[[cx-W2/2,cx+W2/2,cz-D2/2,cz+D2/2]]}
const fpDim=(t,rot)=>{const f=FOOT[t]||FOOT.tree;return(rot||0)%180?[f[1],f[0]]:[f[0],f[1]]};
// ── مسیرهای v2: چندضلعی‌های رندر معادل هر یال (همان سرور) برای برخورد و Snap
const fpInf=()=>W&&W.infrastructure?infraLoad(W.infrastructure):GEO_EMPTY_INFRA();
function fpEdgePolys(inf){const out=[];
  for(const e of inf.edges.values()){const A=inf.nodes.get(e.a),B=inf.nodes.get(e.b);if(!A||!B)continue;
    out.push(geoEdgePolys(e,A,B).poly)}
  return out}
// true یا پیام خطا؛ others = آیتم‌های دیگر (بدون خودِ آیتم). fpHit = آیتم برخوردکرده
function fpCheck(type,x,z,rot,others){fpHit=null;
  const R=fpRects({type,x,z,rot});
  for(const r of R)if(r[0]<FP_LO-FP_EPS||r[1]>FP_HI+FP_EPS||r[2]<FP_LO-FP_EPS||r[3]>FP_HI+FP_EPS)return'خارج از نقشه';
  if(R.some(r=>[r[0],(r[0]+r[1])/2,r[1]].some(px=>[r[2],(r[2]+r[3])/2,r[3]].some(pz=>fpPondW(px,pz)))))return'برکه';
  for(const o of others){if(Math.abs(o.x-x)>3||Math.abs(o.z-z)>3)continue;
    for(const a of R)for(const b of fpRects(o))if(fpHitR(a,b)){fpHit=o;return'برخورد'}}
  // برخورد با مسیرهای v2 (تماس لبه‌به‌لبه مجاز)
  const inf=fpInf();
  for(const poly of fpEdgePolys(inf))for(const r of R)if(geoPolyVsRect(poly,r)){fpHit={type:'infra'};return'برخورد با مسیر'}
  return true}
// ── Snap ساختمان آزاد: به لبهٔ ساختمان‌های دیگر، لبهٔ مسیرهای v2 (فاصله ≤ .4) و گره‌ها
// ورودی: نقطهٔ دنیا؛ خروجی: [x,z] به واحد خانه
function fpSnap(type,rot,wx,wz,others,raw){
  const S=.25,ok=(x,z)=>fpCheck(type,x,z,rot,others)===true,mine=(x,z)=>fpRects({type,x,z,rot})[0];
  let px=raw?wx:Math.round(wx/S)*S,pz=raw?wz:Math.round(wz/S)*S;const m=mine(px,pz);let bx=null,bz=null;
  const inf=fpInf(),edgesS=[];
  for(const e of inf.edges.values()){const A=inf.nodes.get(e.a),B=inf.nodes.get(e.b);if(!A||!B)continue;
    edgesS.push(geoSamplePath([[A.x,A.z],[B.x,B.z]],'poly',.4).map(q=>[q.x,q.z]))}
  // چسبیدن به لبهٔ مسیر (فاصلهٔ ساختمان تا لبهٔ مسیر — مرز آسفالت/پیاده‌رو تمیز)
  for(const pl of edgesS){const r=geoPtPolyline(px,pz,pl);
    if(r.d<=.6){ // نزدیک‌ترین نقطهٔ مرزی مسیر در جهت عمود
      // پروجکشن روی مسیر: جابه‌جایی تا فاصلهٔ نصفعرض+نصفعرض ساختمان
      continue}}
  for(const o of others){if(Math.abs(o.x*CELL-px)>6||Math.abs(o.z*CELL-pz)>6)continue;
    for(const r of fpRects(o)){
      if(Math.min(m[3],r[3])-Math.max(m[2],r[2])>-.3)for(const s of[r[0]-m[1],r[1]-m[0]])if(Math.abs(s)<=.4&&(bx===null||Math.abs(s)<Math.abs(bx)))bx=s;
      if(Math.min(m[1],r[1])-Math.max(m[0],r[0])>-.3)for(const s of[r[2]-m[3],r[3]-m[2]])if(Math.abs(s)<=.4&&(bz===null||Math.abs(s)<Math.abs(bz)))bz=s}}
  // snap به مسیر: نزدیک‌ترین نقطهٔ مرکزی مسیر + آفست نصف‌مجموعهٔ عرض‌ها
  let bestP=null;
  for(const e of inf.edges.values()){const A=inf.nodes.get(e.a),B=inf.nodes.get(e.b);if(!A||!B)continue;
    const S2=geoSamplePath([[A.x,A.z],[B.x,B.z]],'poly',.4),h=(e.w||.6)/2;
    for(let i=0;i<S2.length;i++){const p=S2[i],nx=-p.dz,nz=p.dx;
      // مرکز ساختمان باید در فاصلهٔ h + نصف عرض از محور مسیر باشد
      const[mw,md]=fpDim(type,rot),h2=(Math.abs(nx)>Math.abs(nz)?mw:md)/2;
      const d=h+h2,ex=p.x+nx*(d),ez=p.z+nz*(d),dd=Math.hypot(ex-px,ez-pz);
      if(dd<=.9&&(!bestP||dd<bestP.dd))bestP={dd,x:ex,z:ez,sign:1};
      const ex2=p.x-nx*(d),ez2=p.z-nz*(d),dd2=Math.hypot(ex2-px,ez2-pz);
      if(dd2<=.9&&(!bestP||dd2<bestP.dd))bestP={dd,x:ex2,z:ez2,sign:-1}}}
  const tries=[[bx,bz],[bx,null],[null,bz]];
  for(const[sx,sz]of tries){const x=px+(sx||0),z=pz+(sz||0);if((sx!==null||sz!==null)&&ok(x,z)){px=x;pz=z;break}}
  if(bestP&&ok(bestP.x/CELL,bestP.z/CELL)){
    const d1=Math.hypot(bestP.x-px,bestP.z-pz);
    if(d1>1e-6){px=bestP.x;pz=bestP.z}}
  return[+(px/CELL).toFixed(4),+(pz/CELL).toFixed(4)]}
// بعد از چرخش ۹۰° ابعاد جابه‌جا می‌شود: نزدیک‌ترین جای معتبر + چسبیدن مجدد به لبه
const FP_NUD=(()=>{const a=[[0,0]];for(const r of[.05,.1,.15,.2,.25,.3])for(const[u,v]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]])a.push([u*r,v*r]);return a})();
function fpReseat(type,rot,x,z,others){for(const[u,v]of FP_NUD)if(fpCheck(type,x+u,z+v,rot,others)===true)return fpSnap(type,rot,(x+u)*CELL,(z+v)*CELL,others,true);return[x,z]}
// ── جهت ورودی ساختمان نسبت به مسیر دسترسی (چرخش خودکار در سرور با auto_rot کار می‌کند؛ اینجا snap جهت برای UI)
// نزدیک‌ترین نقطهٔ مسیر به مرکز ساختمان + جهت رو به آن
function fpDoorDir(b,inf){const r=fpRects(b)[0],cx=(r[0]+r[1])/2,cz=(r[2]+r[3])/2;
  let best=null;
  for(const e of inf.edges.values()){const A=inf.nodes.get(e.a),B=inf.nodes.get(e.b);if(!A||!B)continue;
    const S=geoSamplePath([[A.x,A.z],[B.x,B.z]],'poly',.5);
    for(const p of S){const d=Math.hypot(p.x-cx,p.z-cz);if(!best||d<best.d)best={d,p}}}
  if(!best)return b.rot||0;
  const dx=best.p.x-cx,dz=best.p.z-cz;
  return Math.abs(dx)>Math.abs(dz)?(dx>0?90:270):(dz>0?0:180)}
