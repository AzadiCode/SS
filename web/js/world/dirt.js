// ═══ مسیر خاکیِ دست‌آزاد: به‌جای خانه‌های شبکه‌ای، با انگشت/ماوس خط می‌کشی و یک نوار صاف و پیوسته (بدون فاصله) ساخته می‌شود.
// ابزار: 🟫 در پالت ساخت (حالت 🏗️). جنس (خاک/شن/سنگ)، چهار اندازهٔ قلم (از ریز تا پهن)، پاک‌کن (لمس مسیر = حذف آن مسیر) و برگشت.
// سر و ته مسیر اگر نزدیک در خانه باشد خودکار به جلوی در می‌چسبد. ذخیره: server/dirt.py ═══
'use strict';
const DT_MAT=[{n:'خاک',f:[176,147,102],e:[141,116,76],y:.026},{n:'شن',f:[208,193,152],e:[166,152,117],y:.038},{n:'سنگ',f:[152,150,142],e:[112,110,104],y:.05}],
DT_H=[.1,.22,.45,.85],DT_WN=['ریز','نازک','میانه','پهن'],DT_K=50,DT_EDGE=.05,DT_LIM=41,DT_MAXP=400,DT_DOOR={house:.72,hq:1};
let dtM=0,dtW=1,dtTool='draw',dtSrv=[],dtPend=new Map(),dtSig='',dtCur=null,dtTmp=0;
const dtTex=m=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),f=DT_MAT[m].f;x.fillStyle=`rgb(${f})`;x.fillRect(0,0,128,128);
let s=m*97+13;const r=()=>(s=(s*16807)%2147483647)/2147483647;for(let i=0;i<260;i++){const v=r()<.5?-1:1,a=10+r()*16;x.fillStyle=`rgba(${v>0?255:60},${v>0?245:50},${v>0?220:30},${.05+r()*.1})`;x.beginPath();x.arc(r()*128,r()*128,.8+r()*2.2,0,7);x.fill()}
const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t};
const DT_ML=DT_MAT.map((d,m)=>({fill:new THREE.MeshStandardMaterial({map:dtTex(m),roughness:1,side:THREE.DoubleSide}),edge:new THREE.MeshStandardMaterial({color:new THREE.Color(`rgb(${d.e})`),roughness:1,side:THREE.DoubleSide})}));
const dtMeshes=DT_MAT.map((d,m)=>{const mk=(mat,y)=>{const me=NORAY(new THREE.Mesh(new THREE.BufferGeometry(),mat));me.position.y=y;me.receiveShadow=true;me.visible=false;me.frustumCulled=false;scene.add(me);return me};return{edge:mk(DT_ML[m].edge,d.y-.006),fill:mk(DT_ML[m].fill,d.y)}});
const dtLive={edge:null,fill:null};
// نقطه‌ها: چایکین یک مرحله برای نرمی
const dtSmooth=P=>{if(P.length<3)return P;const o=[P[0]];for(let i=0;i<P.length-1;i++){const a=P[i],b=P[i+1];o.push([.75*a[0]+.25*b[0],.75*a[1]+.25*b[1]],[.25*a[0]+.75*b[0],.25*a[1]+.75*b[1]])}o.push(P[P.length-1]);return o};
// یک نوار با سرهای گرد → داخل A (آرایه‌های pos/uv/idx) اضافه می‌شود
function dtRibbon(P,h,A){const n=P.length,b0=A.p.length/3,push=(x,z)=>{A.p.push(x,0,z);A.u.push(x*.35,z*.35)};
if(n>1){for(let i=0;i<n;i++){const a=P[Math.max(0,i-1)],b=P[Math.min(n-1,i+1)];let dx=b[0]-a[0],dz=b[1]-a[1];const l=Math.hypot(dx,dz)||1;dx/=l;dz/=l;let k=1;
if(i>0&&i<n-1){const x0=P[i][0]-P[i-1][0],z0=P[i][1]-P[i-1][1],x1=P[i+1][0]-P[i][0],z1=P[i+1][1]-P[i][1],c=(x0*x1+z0*z1)/((Math.hypot(x0,z0)*Math.hypot(x1,z1))||1);k=Math.min(1.5,1/Math.max(.55,Math.sqrt((1+c)/2)))}
push(P[i][0]-dz*h*k,P[i][1]+dx*h*k);push(P[i][0]+dz*h*k,P[i][1]-dx*h*k)}
for(let i=0;i<n-1;i++){const a=b0+2*i;A.i.push(a,a+2,a+1,a+1,a+2,a+3)}}
for(const e of n>1?[P[0],P[n-1]]:[P[0]]){const c=A.p.length/3;push(e[0],e[1]);for(let k=0;k<=10;k++)push(e[0]+Math.cos(k/10*6.2832)*h,e[1]+Math.sin(k/10*6.2832)*h);for(let k=0;k<10;k++)A.i.push(c,c+1+k,c+2+k)}}
function dtGeo(A){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(A.p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(A.u,2));const nm=[];for(let i=0;i<A.p.length/3;i++)nm.push(0,1,0);g.setAttribute('normal',new THREE.Float32BufferAttribute(nm,3));g.setIndex(A.i);return g}
const dtPts=s=>s.p.map(q=>[q[0]/DT_K,q[1]/DT_K]);
function dtSet(me,A){me.geometry.dispose();me.visible=A.p.length>0;me.geometry=dtGeo(A)}
function dtBuild(){const all=[...dtSrv,...dtPend.values()];
DT_MAT.forEach((d,m)=>{const E={p:[],u:[],i:[]},F={p:[],u:[],i:[]};for(const s of all)if(s.m===m){const P=dtSmooth(dtPts(s)),h=DT_H[s.w];dtRibbon(P,h+DT_EDGE,E);dtRibbon(P,h,F)}dtSet(dtMeshes[m].edge,E);dtSet(dtMeshes[m].fill,F)})}
function dirtSync(w){dtSrv=w.dirt||[];const sig=dtSrv.map(s=>s.id).join(',')+'|'+dtPend.size;if(sig!==dtSig){dtSig=sig;dtBuild()}}
// ── نمایش زندهٔ مسیری که همین الان داری می‌کشی
function dtLiveShow(){const c=dtCur;if(!c)return;if(!dtLive.fill){const mk=()=>{const me=NORAY(new THREE.Mesh(new THREE.BufferGeometry(),DT_ML[0].fill));me.receiveShadow=true;me.frustumCulled=false;scene.add(me);return me};dtLive.edge=mk();dtLive.fill=mk()}
const d=DT_MAT[c.m],P=dtSmooth(c.P),E={p:[],u:[],i:[]},F={p:[],u:[],i:[]};dtRibbon(P,DT_H[c.w]+DT_EDGE,E);dtRibbon(P,DT_H[c.w],F);
dtLive.edge.material=DT_ML[c.m].edge;dtLive.fill.material=DT_ML[c.m].fill;dtLive.edge.position.y=d.y-.006+.001;dtLive.fill.position.y=d.y+.001;dtSet(dtLive.edge,E);dtSet(dtLive.fill,F)}
function dtLiveHide(){for(const k of['edge','fill'])if(dtLive[k])dtLive[k].visible=false}
// ── چسبیدن سر/ته به جلوی در خانه
function dtSnap(p){let best=null,bd=.9;for(const b of W.buildings){const fz=DT_DOOR[b.type];if(!fz)continue;const th=(b.rot||0)*Math.PI/180,x=b.x*CELL+Math.sin(th)*fz,z=b.z*CELL+Math.cos(th)*fz,d=Math.hypot(x-p[0],z-p[1]);if(d<bd){bd=d;best=[x,z]}}return best||p}
// ── ساده‌سازی (Douglas-Peucker) تا حجم ذخیره کم شود
function dtSimplify(P,eps){if(P.length<3)return P;const keep=new Uint8Array(P.length);keep[0]=keep[P.length-1]=1;const st=[[0,P.length-1]];
while(st.length){const[a,b]=st.pop();let md=0,mi=-1;const[ax,az]=P[a],[bx,bz]=P[b],dx=bx-ax,dz=bz-az,L=Math.hypot(dx,dz)||1e-9;
for(let i=a+1;i<b;i++){const d=Math.abs((P[i][0]-ax)*dz-(P[i][1]-az)*dx)/L;if(d>md){md=d;mi=i}}if(md>eps&&mi>0){keep[mi]=1;st.push([a,mi],[mi,b])}}return P.filter((_,i)=>keep[i])}
async function dtCommit(c){if(!c||!c.P.length)return;const P=c.P.length>1?dtSimplify(c.P,Math.max(.02,DT_H[c.w]*.12)):c.P,Q=P.map(p=>[Math.round(p[0]*DT_K),Math.round(p[1]*DT_K)]);
for(let i=0;i<Q.length;i+=DT_MAXP-1){const part=Q.slice(i,i+DT_MAXP);if(part.length<2&&i>0)break;const id='t'+(++dtTmp);dtPend.set(id,{id,m:c.m,w:c.w,p:part});dtSig='';dirtSync({dirt:dtSrv});
try{await api('/api/admin/dirt','POST',{m:c.m,w:c.w,p:part});await poll()}catch(e){toast('ذخیرهٔ مسیر نشد')}
dtPend.delete(id);dtSig='';dirtSync({dirt:dtSrv})}}
// ── پاک‌کن: هر مسیری که قلم از آن رد شود حذف می‌شود
function dtErase(p){const hit=[];for(const s of dtSrv){const P=dtPts(s),r=DT_H[s.w]+.3;let ok=false;for(let i=0;i<P.length&&!ok;i++){const a=P[i],b=P[i+1]||a,dx=b[0]-a[0],dz=b[1]-a[1],L2=dx*dx+dz*dz,t=L2?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/L2)):0;ok=Math.hypot(a[0]+dx*t-p[0],a[1]+dz*t-p[1])<r}if(ok)hit.push(s.id)}
if(!hit.length)return;dtSrv=dtSrv.filter(s=>!hit.includes(s.id));dtSig='';dirtSync({dirt:dtSrv});hit.forEach(id=>api('/api/admin/dirt/'+id,'DELETE',null,1).catch(()=>0))}
// ── ورودی: فقط مدیر، حالت ساخت، ابزار مسیر خاکی (🟫)
const dtOn=()=>T&&mode==='build'&&bt==='dirt',dtPt=e=>{ray0(e);if(!ray.ray.intersectPlane(GP,gp3))return null;const x=gp3.x,z=gp3.z;return Math.abs(x)>DT_LIM||Math.abs(z)>DT_LIM||inPond(x,z)?null:[x,z]};
let dtDown=false,dtLast=0;
R.domElement.addEventListener('pointerdown',e=>{if(!dtOn()||!e.isPrimary)return;dtDown=true;const p=dtPt(e);if(!p)return;if(dtTool==='erase')return dtErase(p);dtCur={m:dtM,w:dtW,P:[dtSnap(p)]};dtLiveShow()},true);
addEventListener('pointermove',e=>{if(!dtDown||!dtOn())return;const p=dtPt(e);if(dtTool==='erase'){if(p)dtErase(p);return}
if(!p){if(dtCur){const c=dtCur;dtCur=null;dtLiveHide();dtCommit(c)}return}                            // وارد برکه/بیرون نقشه شد ← مسیر همین‌جا تمام
if(!dtCur){dtCur={m:dtM,w:dtW,P:[p]};dtLiveShow();return}
const l=dtCur.P[dtCur.P.length-1],sp=Math.max(.06,DT_H[dtCur.w]*.5);if(Math.hypot(p[0]-l[0],p[1]-l[1])<sp)return;dtCur.P.push(p);const t=performance.now();if(t-dtLast>30){dtLast=t;dtLiveShow()}});
addEventListener('pointerup',e=>{if(!dtDown)return;dtDown=false;if(!dtCur)return;const c=dtCur;dtCur=null;dtLiveHide();if(c.P.length>1)c.P[c.P.length-1]=dtSnap(c.P[c.P.length-1]);dtCommit(c)});
// ── رابط: دکمهٔ 🟫 در پالت + پنل جنس/اندازه/ابزار
$('pal').insertAdjacentHTML('afterbegin','<span data-t="dirt" title="مسیر خاکی دست‌آزاد">🟫</span>');
document.body.insertAdjacentHTML('beforeend',`<div id="dp" class="g"><div id="dpm">${DT_MAT.map((d,i)=>`<b data-m="${i}" class="${i?'':'on'}" style="--c:rgb(${d.f})">${d.n}</b>`).join('')}</div><div id="dpw">${DT_WN.map((n,i)=>`<b data-w="${i}" class="${i===1?'on':''}">${n}</b>`).join('')}</div><div id="dpt"><b data-k="draw" class="on">✏️ بکش</b><b data-k="erase">🧽 پاک</b><b data-k="undo">↩️ برگشت</b></div></div>`);
const dtUpd=()=>setTimeout(()=>{$('dp').style.display=dtOn()||(admOn&&mode==='build'&&bt==='dirt')?'flex':'none'},0);
$('adm').addEventListener('click',dtUpd);$('pal').addEventListener('click',dtUpd);
$('dp').addEventListener('pointerup',e=>e.stopPropagation());
$('dp').onclick=e=>{const b=e.target.closest('b');if(!b)return;const on=(s,v)=>$(s).querySelectorAll('b').forEach(x=>x.classList.toggle('on',x===v));
if(b.dataset.m!==undefined){dtM=+b.dataset.m;on('dpm',b)}else if(b.dataset.w!==undefined){dtW=+b.dataset.w;on('dpw',b)}
else if(b.dataset.k==='undo'){const l=dtSrv[dtSrv.length-1];if(l){dtSrv=dtSrv.slice(0,-1);dtSig='';dirtSync({dirt:dtSrv});api('/api/admin/dirt/'+l.id,'DELETE').catch(()=>0)}else toast('مسیری برای برگشت نیست')}
else{dtTool=b.dataset.k;on('dpt',b);toast(dtTool==='erase'?'پاک‌کن: روی مسیر بکش':'کشیدن مسیر')}};
