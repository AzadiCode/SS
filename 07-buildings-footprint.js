// ═══ ردپای واقعی آیتم‌ها (مبتنی بر سلول): مستطیل واقعی هر آیتم، تشخیص برخورد، چسبیدن (snap) به سلول.
// قانون: زمین یک شبکهٔ شطرنجی ریز است؛ هر سلول CELL واحد دنیا. هر آیتم تعدادِ صحیحی سلول می‌گیرد (FOOT به «سلول»).
// همهٔ مختصات عدد صحیح (سلول)اند؛ مرکز دنیای آیتم = x*CELL. چرخش ۹۰° فقط عرض و عمق را جابه‌جا می‌کند.
// برخورد = هم‌پوشانی مستطیل‌ها؛ لبه‌به‌لبه (تماس) مجاز است. باید با FOOT در 01-server-config.py یکی باشد.
// چون همه روی شبکه‌اند، دیگر «نوار خالی» یا «لغزش اعشاری» وجود ندارد → پل‌زدن، reseat و door-link حذف شدند.
'use strict';
// FOOT = [عرض, عمق] به سلول؛ باید با 01-server-config.py یکی باشد.
// پیاده‌رو هم ۸×۸ سلول است (مثل جاده) تا لبه‌به‌لبه با جاده و ساختمان‌ها بنشیند؛ فقط «عرض بصری»اش (PATH_W) یک‌چهارم جاده است.
const FOOT={house:[6,5],hq:[8,7],farm:[8,8],market:[8,6],tree:[2,2],road:[8,8],path:[8,8]};
const PATH_W=.5,                                              // عرض بصری پیاده‌رو (مربع مرکزی) به واحد دنیا؛ = ۲×CELL، یک‌چهارم جاده
      FP_EPS=1e-3,FP_LO=-40,FP_HI=40,                         // مرز دنیا (سلول لبه: ±160 × .25 = ±40)
      FP_D4=[[1,0],[-1,0],[0,1],[0,-1]],FP_EMPTY=new Set();
let fpHit=null;
const fpPondW=(X,Z)=>((X+17)/8.6)**2+((Z+17)/6)**2<1.15,fpHitR=(a,b)=>Math.min(a[1],b[1])-Math.max(a[0],b[0])>FP_EPS&&Math.min(a[3],b[3])-Math.max(a[2],b[2])>FP_EPS;
const fpTiles=l=>{const s=new Set();for(const b of l)if(b.type==='road'||b.type==='path')s.add(b.x+','+b.z);return s};
// ابعاد (عرض, عمق) به سلول با درنظرگرفتن چرخش ۹۰°
const fpDim=(t,rot)=>{const f=FOOT[t]||FOOT.tree;return(rot||0)%180?[f[1],f[0]]:[f[0],f[1]]};
// مستطیل واقعی [x0,x1,z0,z1] به واحد دنیا؛ مرکز = x*CELL.
// پیاده‌رو = مربع مرکزی (PATH_W) + بازوی باریک به همسایه‌های مسیر (تا مرز سلول).
function fpRects(b,TL){const t=b.type,x=b.x*CELL,z=b.z*CELL;
  if(t==='path'){const h=PATH_W/2,R=[[x-h,x+h,z-h,z+h]];for(const[dx,dz]of FP_D4)if(TL&&TL.has((b.x+dx)+','+(b.z+dz)))
    R.push(dx?[dx>0?x:x-CELL,dx>0?x+CELL:x,z-h,z+h]:[x-h,x+h,dz>0?z:z-CELL,dz>0?z+CELL:z]);return R}
  const[w,d]=fpDim(t,b.rot||0);return[[x-w*CELL/2,x+w*CELL/2,z-d*CELL/2,z+d*CELL/2]]}
// true یا پیام خطا؛ others = آیتم‌های دیگر (بدون خودِ آیتم). fpHit = آیتمی که برخورد کرده
function fpCheck(type,x,z,rot,others){fpHit=null;
  x=Math.round(x);z=Math.round(z);rot=(Math.round((rot||0)/90)*90)%360;
  const TL=fpTiles(others);TL.add(x+','+z);const R=fpRects({type,x,z,rot},TL);
  for(const r of R)if(r[0]<FP_LO-FP_EPS||r[1]>FP_HI+FP_EPS||r[2]<FP_LO-FP_EPS||r[3]>FP_HI+FP_EPS)return'خارج از نقشه';
  if(R.some(r=>[r[0],(r[0]+r[1])/2,r[1]].some(px=>[r[2],(r[2]+r[3])/2,r[3]].some(pz=>fpPondW(px,pz)))))return'برکه';
  for(const o of others){if(Math.abs(o.x-x)>8||Math.abs(o.z-z)>8)continue;for(const a of R)for(const b of fpRects(o,TL))if(fpHitR(a,b)){fpHit=o;return'برخورد'}}
  return true}
// snap ساده: نقطهٔ دنیا ← نزدیک‌ترین سلول صحیح. دیگر نیازی به چسباندن اعشاری یا هم‌ترازی در نیست.
const fpSnap=(type,rot,wx,wz,others)=>[Math.round(wx/CELL),Math.round(wz/CELL)];
