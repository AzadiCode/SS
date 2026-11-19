// ═══ ردپای واقعی آیتم‌ها: مستطیل واقعی هر آیتم، تشخیص برخورد، چسبیدن لبه‌ها (snap) و اتصال پیاده‌رو به در. ═══
// قانون: هر آیتم دقیقاً به اندازه و شکل خودش جا می‌گیرد؛ فضای اضافه رزرو نمی‌شود. جاده/پیاده‌رو روی شبکه‌اند (عدد صحیح)،
// بقیه آزادانه (اعشاری، واحد = خانه) و فقط تا لبهٔ واقعی دیگری جا می‌گیرند. باید با FOOT در 01-server-config.py یکی بماند.
'use strict';
const FOOT={house:[1.5,1.3,0,0],hq:[1.9,1.84,0,.05],farm:[1.9,1.9,0,0],market:[2,1.4,0,0],tree:[.5,.5,0,0],road:[2,2,0,0],path:[.66,.66,0,0]};
const FP_EPS=1e-3,FP_LO=-41,FP_HI=39,FP_D4=[[1,0],[-1,0],[0,1],[0,-1]],FP_EMPTY=new Set(),fpGrid=t=>t==='road'||t==='path',fpDi=(dx,dz)=>dz<0?0:dx>0?1:dz>0?2:3;
let fpHit=null;
const fpPondW=(X,Z)=>((X+17)/8.6)**2+((Z+17)/6)**2<1.15,fpHitR=(a,b)=>Math.min(a[1],b[1])-Math.max(a[0],b[0])>FP_EPS&&Math.min(a[3],b[3])-Math.max(a[2],b[2])>FP_EPS;
const fpTiles=l=>{const s=new Set();for(const b of l)if(fpGrid(b.type))s.add(b.x+','+b.z);return s};
// مستطیل‌های واقعی [x0,x1,z0,z1] به واحد دنیا؛ پیاده‌رو = مربع مرکزی + بازو به همسایه‌های مسیر
function fpRects(b,TL){const t=b.type,x=b.x*CELL,z=b.z*CELL,f=FOOT[t]||FOOT.tree;
if(t==='path'){const h=.33,R=[[x-h,x+h,z-h,z+h]];for(const[dx,dz]of FP_D4)if(TL&&TL.has((b.x+dx)+','+(b.z+dz)))R.push(dx?[dx>0?x:x-1,dx>0?x+1:x,z-.3,z+.3]:[x-.3,x+.3,dz>0?z:z-1,dz>0?z+1:z]);return R}
let w=f[0],d=f[1];const a=fpGrid(t)?0:(b.rot||0)*Math.PI/180,s=Math.round(Math.sin(a)),c=Math.round(Math.cos(a)),cx=x+f[2]*c+f[3]*s,cz=z-f[2]*s+f[3]*c;if(s){const q=w;w=d;d=q}
return[[cx-w/2,cx+w/2,cz-d/2,cz+d/2]]}
const fpDim=(t,rot)=>{const f=FOOT[t]||FOOT.tree;return(rot||0)%180&&!fpGrid(t)?[f[1],f[0]]:[f[0],f[1]]};
// true یا پیام خطا؛ others = آیتم‌های دیگر (بدون خودِ آیتم). fpHit = آیتمی که برخورد کرده
function fpCheck(type,x,z,rot,others){fpHit=null;const tile=fpGrid(type);if(tile){x=Math.round(x);z=Math.round(z);rot=0}
const TL=fpTiles(others);if(tile)TL.add(x+','+z);const R=fpRects({type,x,z,rot},TL);
for(const r of R)if(r[0]<FP_LO-FP_EPS||r[1]>FP_HI+FP_EPS||r[2]<FP_LO-FP_EPS||r[3]>FP_HI+FP_EPS)return'خارج از نقشه';
if(tile?fpPondW(x*CELL,z*CELL):R.some(r=>[r[0],(r[0]+r[1])/2,r[1]].some(px=>[r[2],(r[2]+r[3])/2,r[3]].some(pz=>fpPondW(px,pz)))))return'برکه';
for(const o of others){if(Math.abs(o.x-x)>2||Math.abs(o.z-z)>2)continue;for(const a of R)for(const b of fpRects(o,TL))if(fpHitR(a,b)){fpHit=o;return'برخورد'}}
if(tile)for(const[dx,dz]of FP_D4){const n=others.find(o=>fpGrid(o.type)&&o.x===x+dx&&o.z===z+dz);if(!n)continue;const Rn=fpRects(n,TL);
for(const o of others){if(o===n||Math.abs(o.x-n.x)>2||Math.abs(o.z-n.z)>2)continue;for(const a of Rn)for(const b of fpRects(o,TL))if(fpHitR(a,b)){fpHit=o;return'برخورد'}}}
return true}
// چسباندن به لبهٔ واقعی نزدیک‌ترین آیتم‌ها (فاصله ≤ ۰٫۴ واحد) و هم‌ترازشدن در خانه با پیاده‌رو روبه‌رو. ورودی: نقطهٔ دنیا؛ خروجی: [x,z] به واحد خانه
function fpSnap(type,rot,wx,wz,others,raw){const S=.25,TL=fpTiles(others),ok=(x,z)=>fpCheck(type,x/CELL,z/CELL,rot,others)===true,mine=(x,z)=>fpRects({type,x:x/CELL,z:z/CELL,rot},TL)[0];
let px=raw?wx:Math.round(wx/S)*S,pz=raw?wz:Math.round(wz/S)*S;const m=mine(px,pz);let bx=null,bz=null;
for(const o of others){if(Math.abs(o.x*CELL-px)>6||Math.abs(o.z*CELL-pz)>6)continue;
for(const r of fpRects(o,TL)){
if(Math.min(m[3],r[3])-Math.max(m[2],r[2])>-.3)for(const s of[r[0]-m[1],r[1]-m[0]])if(Math.abs(s)<=.4&&(bx===null||Math.abs(s)<Math.abs(bx)))bx=s;
if(Math.min(m[1],r[1])-Math.max(m[0],r[0])>-.3)for(const s of[r[2]-m[3],r[3]-m[2]])if(Math.abs(s)<=.4&&(bz===null||Math.abs(s)<Math.abs(bz)))bz=s}}
const tries=[[bx,bz],[bx,null],[null,bz]];for(const[sx,sz]of tries){const x=px+(sx||0),z=pz+(sz||0);if((sx!==null||sz!==null)&&ok(x,z)){px=x;pz=z;break}}
if(!raw&&(type==='house'||type==='hq')){const a=rot*Math.PI/180,fx=Math.sin(a),fz=Math.cos(a),lx=Math.cos(a),lz=-Math.sin(a);let best=null;
for(const o of others){if(o.type!=='path')continue;const vx=o.x*CELL-px,vz=o.z*CELL-pz,al=vx*fx+vz*fz,la=vx*lx+vz*lz;if(al>=1.2&&al<2.6&&Math.abs(la)<.6&&(!best||Math.abs(la)<Math.abs(best)))best=la}
if(best!==null){const x=px+best*lx,z=pz+best*lz;if(ok(x,z)||!ok(px,pz)){px=x;pz=z}}}
return[+(px/CELL).toFixed(4),+(pz/CELL).toFixed(4)]}
// اتصال پیاده‌رو به در: برای هر خانه/دفتر/مزرعه/بازار، نزدیک‌ترین سلولِ جلوی لبهٔ واقعی ← {cx,cz (سلول پیاده‌رو), d (بیت جهت), len (طول بازو تا لبهٔ واقعی)}
function fpDoorLinks(blds){const out=[];for(const b of blds){const t=b.type;if(t!=='house'&&t!=='hq'&&t!=='farm'&&t!=='market')continue;
const r=fpRects(b,FP_EMPTY)[0],cx=(r[0]+r[1])/2,cz=(r[2]+r[3])/2,a=(b.rot||0)*Math.PI/180,sides=(t==='house'||t==='hq')?[[Math.round(Math.sin(a)),Math.round(Math.cos(a))]]:[[0,-1],[1,0],[0,1],[-1,0]];
for(const[nx,nz]of sides){if(!nx&&!nz)continue;const ax=nx!==0,s=ax?nx:nz,face=ax?(nx>0?r[1]:r[0]):(nz>0?r[3]:r[2]),ta=s>0?Math.ceil((face+.2)/CELL-1e-9):Math.floor((face-.2)/CELL+1e-9),tl=Math.round((ax?cz:cx)/CELL);
out.push({cx:ax?ta:tl,cz:ax?tl:ta,d:fpDi(-nx,-nz),len:Math.max(.3,Math.abs(ta*CELL-face)-PW/2)})}}return out}

// ── پل‌زدنِ بصریِ فاصله: جاده/پیاده‌رو روی شبکه‌اند (مضرب ۲) ولی خانه/دفتر/مزرعه/بازار آزادانه (اعشاری) می‌نشینند؛
// پس وقتی جاده/پیاده‌رو «بعد از» ساختمان گذاشته شود، لبهٔ ساختمان معمولاً وسط سلول می‌افتد و یک نوار خالیِ زمین بینشان می‌ماند.
// اینجا آن نوار فقط «بصری» پر می‌شود (برخورد و ردپا دست‌نخورده): جاده ← سکوی پیاده‌روی خاکستری تا لبهٔ ساختمان؛
// پیاده‌رو ← بازوی خاکی تا لبهٔ ساختمان. فقط نوار بین دو آیتم (≤ FP_BR) و فقط اگر چیزِ دیگری در آن نباشد.
const FP_BR=1,FP_EMPTY_G=.001,fpFreeT=t=>t==='house'||t==='hq'||t==='farm'||t==='market',FP_DIRS=[[0,-1],[1,0],[0,1],[-1,0]];
// tp=road|path ؛ x,z = سلول ؛ blds = همهٔ آیتم‌ها (بدون خودِ این سلول) ؛ skip = بیتمسک جهت‌هایی که بازوی درِ ساختمان دارند
// خروجی: road ← {ap:[[x0,x1,z0,z1] محلی]} ؛ path ← {ex:[{d,len}]}
function fpBridgeOne(tp,x,z,blds,skip=0){const X=x*CELL,Z=z*CELL,hw=tp==='road'?1:.3,near=blds.filter(o=>Math.abs(o.x*CELL-X)<=5&&Math.abs(o.z*CELL-Z)<=5&&!(fpGrid(o.type)&&o.x===x&&o.z===z)),TL=fpTiles(near),ap=[],ex=[];
for(let d=0;d<4;d++){if(skip&(1<<d))continue;const dx=FP_DIRS[d][0],dz=FP_DIRS[d][1];if(near.some(o=>fpGrid(o.type)&&o.x===x+dx&&o.z===z+dz))continue;
let best=null;for(const f of near){if(!fpFreeT(f.type))continue;const r=fpRects(f,FP_EMPTY)[0];let face,dist,lo,hi;
if(dx){face=dx>0?r[0]:r[1];dist=dx>0?face-X:X-face;lo=Math.max(r[2],Z-hw);hi=Math.min(r[3],Z+hw)}else{face=dz>0?r[2]:r[3];dist=dz>0?face-Z:Z-face;lo=Math.max(r[0],X-hw);hi=Math.min(r[1],X+hw)}
if(hi-lo<=.05)continue;const gap=tp==='road'?dist-1:dist-.33;if(tp==='road'?(gap<=FP_EMPTY_G||gap>FP_BR):(gap<-FP_EPS||gap>FP_BR))continue;
if(!best||dist<best.dist)best={f,face,dist,lo,hi}}
if(!best)continue;const{f,face,dist,lo,hi}=best,e=.03;let R;
if(tp==='road'){R=dx?[dx>0?X+1:face-e,dx>0?face+e:X-1,lo,hi]:[lo,hi,dz>0?Z+1:face-e,dz>0?face+e:Z-1]}
else R=dx?[dx>0?X+.33:face-e,dx>0?face+e:X-.33,Z-.3,Z+.3]:[X-.3,X+.3,dz>0?Z+.33:face-e,dz>0?face+e:Z-.33];
if(R[1]-R[0]<=FP_EPS||R[3]-R[2]<=FP_EPS)continue;
let bad=false;for(const o of near){if(o===f)continue;for(const q of fpRects(o,TL))if(fpHitR(R,q)){bad=true;break}if(bad)break}
if(bad||fpPondW((R[0]+R[1])/2,(R[2]+R[3])/2))continue;
if(tp==='road')ap.push([R[0]-X,R[1]-X,R[2]-Z,R[3]-Z]);else ex.push({d,len:dist})}
return{ap,ex}}
// برای همهٔ سلول‌های جاده/پیاده‌رو: Map «x,z» ← {ap}|{ex}
function fpBridges(blds){const out=new Map(),dm=new Map();for(const l of fpDoorLinks(blds)){const k=l.cx+','+l.cz;dm.set(k,(dm.get(k)||0)|(1<<l.d))}
for(const b of blds){if(!fpGrid(b.type))continue;const k=b.x+','+b.z,r=fpBridgeOne(b.type,b.x,b.z,blds,b.type==='path'?(dm.get(k)||0):0);if(r.ap.length||r.ex.length)out.set(k,r)}return out}
// بعد از چرخش (۹۰°) ابعاد جابه‌جا می‌شود و لبه‌ها ≈۰٫۱ می‌لغزد: نزدیک‌ترین جای معتبر را پیدا کن و دوباره به لبهٔ همسایه بچسبان. x,z و خروجی = واحد خانه
const FP_NUD=(()=>{const a=[[0,0]];for(const r of[.05,.1,.15,.2,.25,.3])for(const[u,v]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]])a.push([u*r,v*r]);return a})();
function fpReseat(type,rot,x,z,others){if(fpGrid(type))return[x,z];for(const[u,v]of FP_NUD)if(fpCheck(type,x+u,z+v,rot,others)===true)return fpSnap(type,rot,(x+u)*CELL,(z+v)*CELL,others,true);return[x,z]}
