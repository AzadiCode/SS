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
function fpSnap(type,rot,wx,wz,others){const S=.25,TL=fpTiles(others),ok=(x,z)=>fpCheck(type,x/CELL,z/CELL,rot,others)===true,mine=(x,z)=>fpRects({type,x:x/CELL,z:z/CELL,rot},TL)[0];
let px=Math.round(wx/S)*S,pz=Math.round(wz/S)*S;const m=mine(px,pz);let bx=null,bz=null;
for(const o of others){if(Math.abs(o.x*CELL-px)>6||Math.abs(o.z*CELL-pz)>6)continue;
for(const r of fpRects(o,TL)){
if(Math.min(m[3],r[3])-Math.max(m[2],r[2])>-.3)for(const s of[r[0]-m[1],r[1]-m[0]])if(Math.abs(s)<=.4&&(bx===null||Math.abs(s)<Math.abs(bx)))bx=s;
if(Math.min(m[1],r[1])-Math.max(m[0],r[0])>-.3)for(const s of[r[2]-m[3],r[3]-m[2]])if(Math.abs(s)<=.4&&(bz===null||Math.abs(s)<Math.abs(bz)))bz=s}}
const tries=[[bx,bz],[bx,null],[null,bz]];for(const[sx,sz]of tries){const x=px+(sx||0),z=pz+(sz||0);if((sx!==null||sz!==null)&&ok(x,z)){px=x;pz=z;break}}
if(type==='house'||type==='hq'){const a=rot*Math.PI/180,fx=Math.sin(a),fz=Math.cos(a),lx=Math.cos(a),lz=-Math.sin(a);let best=null;
for(const o of others){if(o.type!=='path')continue;const vx=o.x*CELL-px,vz=o.z*CELL-pz,al=vx*fx+vz*fz,la=vx*lx+vz*lz;if(al>=1.2&&al<2.6&&Math.abs(la)<.6&&(!best||Math.abs(la)<Math.abs(best)))best=la}
if(best!==null){const x=px+best*lx,z=pz+best*lz;if(ok(x,z)||!ok(px,pz)){px=x;pz=z}}}
return[+(px/CELL).toFixed(4),+(pz/CELL).toFixed(4)]}
// اتصال پیاده‌رو به در: برای هر خانه/دفتر/مزرعه/بازار، نزدیک‌ترین سلولِ جلوی لبهٔ واقعی ← {cx,cz (سلول پیاده‌رو), d (بیت جهت), len (طول بازو تا لبهٔ واقعی)}
function fpDoorLinks(blds){const out=[];for(const b of blds){const t=b.type;if(t!=='house'&&t!=='hq'&&t!=='farm'&&t!=='market')continue;
const r=fpRects(b,FP_EMPTY)[0],cx=(r[0]+r[1])/2,cz=(r[2]+r[3])/2,a=(b.rot||0)*Math.PI/180,sides=(t==='house'||t==='hq')?[[Math.round(Math.sin(a)),Math.round(Math.cos(a))]]:[[0,-1],[1,0],[0,1],[-1,0]];
for(const[nx,nz]of sides){if(!nx&&!nz)continue;const ax=nx!==0,s=ax?nx:nz,face=ax?(nx>0?r[1]:r[0]):(nz>0?r[3]:r[2]),ta=s>0?Math.ceil((face+.2)/CELL-1e-9):Math.floor((face-.2)/CELL+1e-9),tl=Math.round((ax?cz:cx)/CELL);
out.push({cx:ax?ta:tl,cz:ax?tl:ta,d:fpDi(-nx,-nz),len:Math.max(.3,Math.abs(ta*CELL-face)-PW/2)})}}return out}
