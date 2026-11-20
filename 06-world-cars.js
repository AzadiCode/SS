// ═══ خودروهای شهری: حرکت لاین‌محور با پیچ نرم و فاصله‌گذاری ایمن ═══
'use strict';
const cars=[],CC=[0xd94f3a,0xf0b13a,0x3f7f99,0x7cb342,0xf2ead6,0x94527f],HL=new THREE.MeshStandardMaterial({color:0xfff3c4,emissive:0xffe08a,emissiveIntensity:.2}),WH=new THREE.CylinderGeometry(.07,.07,.05,10),LANE=.22;
const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
let spT=3,carRoadGraph=[],carRoadSig='',carSerial=0;
const carSignals=new Map();
// گراف دقیقاً از همان کلید شبکه‌ای ناوبری ساخته می‌شود؛ مختصات واقعی قطعه برای حرکت حفظ می‌شود.
function rebuildCarRoadGraph(){
 const src=Array.isArray(roadC)?roadC:[],nodes=[],byKey=new Map();
 for(const r of src){const ix=Math.round(r.x/CELL),iz=Math.round(r.z/CELL),key=ix+','+iz;
  const n={ix,iz,x:r.x,z:r.z,neighbors:[]};nodes.push(n);byKey.set(key,n)}
 const sig=nodes.map(n=>n.ix+','+n.iz+':'+n.x.toFixed(4)+','+n.z.toFixed(4)).sort().join('|');
 if(sig===carRoadSig)return false;
 carRoadSig=sig;
 for(const n of nodes)for(const [dx,dz] of DIRS){const next=byKey.get((n.ix+dx)+','+(n.iz+dz));if(next)n.neighbors.push({node:next,dx,dz})}
 carRoadGraph=nodes.filter(n=>n.neighbors.length>0);
 // چراغ واقعی برای هر تقاطع سه‌راه/چهارراه؛ هر ورودی سرِ چراغ مستقل دارد.
 for(const g of carSignals.values()){scene.remove(g);g.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material.dispose()}})}carSignals.clear();
 for(const n of carRoadGraph)if(n.neighbors.length>=3){const root=new THREE.Group();root.position.set(n.x,0,n.z);
  for(const e of n.neighbors){const d=[-e.dx,-e.dz],side=[-d[1],d[0]],h=new THREE.Group();h.position.set(-d[0]*.78+side[0]*.48,0,-d[1]*.78+side[1]*.48);h.rotation.y=Math.atan2(-d[0],-d[1]);
   const pole=new THREE.Mesh(new THREE.CylinderGeometry(.025,.04,1.35,6),new THREE.MeshStandardMaterial({color:0x34383a,roughness:.8}));pole.position.y=.675;h.add(pole);
   const box=new THREE.Mesh(new THREE.BoxGeometry(.19,.42,.16),new THREE.MeshStandardMaterial({color:0x202326,roughness:.65}));box.position.set(0,1.42,0);h.add(box);
   const bulbs=[];for(let j=0;j<3;j++){const colors=[0xff2929,0xffc928,0x36df69],mat=new THREE.MeshStandardMaterial({color:colors[j],emissive:colors[j],emissiveIntensity:.06,roughness:.3});const bulb=new THREE.Mesh(new THREE.SphereGeometry(.052,8,6),mat);bulb.position.set(0,1.55-j*.13,.087);h.add(bulb);bulbs.push(bulb)}
   h.userData={d,bulbs};root.add(h)
  }scene.add(root);carSignals.set(n.ix+','+n.iz,root)
 }
 for(const c of cars)c.out=1;
 return true;
}
function signalStatus(node,d,t){const phase=(t+(Math.abs(node.ix*7+node.iz*13)%14))%14,horizontal=Math.abs(d[0])>.5;if(horizontal){if(phase<5)return'green';if(phase<6)return'yellow';return'red'}if(phase>=7&&phase<12)return'green';if(phase>=12&&phase<13)return'yellow';return'red'}
function updateCarSignals(t){for(const [key,g] of carSignals){const [ix,iz]=key.split(',').map(Number),n=carRoadGraph.find(v=>v.ix===ix&&v.iz===iz);if(!n)continue;for(const h of g.children){const st=signalStatus(n,h.userData.d,t);h.userData.bulbs.forEach((b,i)=>{b.material.emissiveIntensity=(i===(st==='red'?0:st==='yellow'?1:2))?1.65:.035})}}}
function mkCar(){const g=new THREE.Group(),col=rr(CC);bx(g,.62,.13,.3,col,0,.05);bx(g,.32,.12,.26,col,-.05,.18);bx(g,.3,.07,.275,0x9fc4d6,-.05,.2);
 [[.2,.16],[.2,-.16],[-.2,.16],[-.2,-.16]].forEach(([x,z])=>{const w=new THREE.Mesh(WH,M(0x25282c));w.rotation.x=Math.PI/2;w.position.set(x,.07,z);g.add(w)});
 [-.09,.09].forEach(z=>{const l=new THREE.Mesh(new THREE.BoxGeometry(.03,.05,.07),HL);l.position.set(.32,.12,z);g.add(l)});return g}
function carLanePoint(node,d){return{x:node.x-d[1]*LANE,z:node.z+d[0]*LANE}}
function carNodeKey(n){return n.ix+','+n.iz}
function pickNext(c){
 const ns=c.node.neighbors;
 // برگشت فوری از همان خیابان ممنوع است؛ فقط وقتی مسیر دیگری وجود ندارد (بن‌بست) مجاز می‌شود.
 const forward=ns.filter(e=>!c.d||(e.dx!==-c.d[0]||e.dz!==-c.d[1]));
 if(!ns.length)return 0;
 const recent=new Set(c.history||[]);
 // مقصدهایی که در چند تقاطع اخیر دیده شده‌اند کنار گذاشته می‌شوند تا خودرو وارد حلقه و رفت‌وبرگشت نشود.
 const fresh=forward.filter(e=>!recent.has(carNodeKey(e.node)));
 let pool=fresh.length?fresh:(forward.length?forward:ns);
 if(!pool.length)return 0;
 const straight=c.d&&pool.find(e=>e.dx===c.d[0]&&e.dz===c.d[1]);
 let e=null;
 // مسیر مستقیم در اولویت قوی است؛ اگر مسیر مستقیم قبلاً تکرار شده باشد، مسیر تازه انتخاب می‌شود.
 if(straight&&Math.random()<.86)e=straight;
 if(!e){
  // در حالت اجبار به استفاده از گره‌های تکراری، قدیمی‌ترین مقصد اولویت می‌گیرد.
  if(!fresh.length&&forward.length){
   const ageOf=e=>{const i=(c.history||[]).lastIndexOf(carNodeKey(e.node));return i<0?1e6:(c.history.length-1-i)};
   const oldest=Math.max(...pool.map(ageOf));pool=pool.filter(v=>ageOf(v)===oldest);
  }
  // وزن مسیر مستقیم بیشتر از چپ/راست است؛ انتخاب تصادفی خام در تقاطع حذف شده است.
  const weights=pool.map(v=>v.dx===(c.d||[])[0]&&v.dz===(c.d||[])[1]?4.5:1);
  let r=Math.random()*weights.reduce((a,b)=>a+b,0);
  for(let i=0;i<pool.length;i++){r-=weights[i];if(r<=0){e=pool[i];break}}
  e=e||pool[pool.length-1];
 }
 c.d=[e.dx,e.dz];c.next=e.node;const q=carLanePoint(e.node,c.d);c.tx=q.x;c.tz=q.z;return 1;
}
function carStartTurn(c,incoming){
 const d=c.d,p0={x:c.g.position.x,z:c.g.position.z},laneEnd=carLanePoint(c.node,d);
 if(incoming[0]===d[0]&&incoming[1]===d[1]){c.turn=null;return}
 // نقطهٔ خروج کمی بعد از مرکز تقاطع قرار می‌گیرد؛ چرخش فقط در یک نقطهٔ فشرده رخ نمی‌دهد.
 const reverse=incoming[0]===-d[0]&&incoming[1]===-d[1],exitRun=.48;
 const p3={x:laneEnd.x+d[0]*exitRun,z:laneEnd.z+d[1]*exitRun};
 // دسته‌های بزیه مماس با لاین ورودی/خروجی هستند؛ طول دسته برای گردش چپ و راست متفاوت است
 // تا مماس میانی در هیچ‌یک از دو حالت به صفر نزدیک نشود.
 const cross=incoming[0]*d[1]-incoming[1]*d[0],k=reverse?.42:(cross>0?.60:.30);
 const p1={x:p0.x+incoming[0]*k,z:p0.z+incoming[1]*k},p2={x:p3.x-d[0]*k,z:p3.z-d[1]*k};
 // جدول طول قوس ۴۰ نمونه‌ای: پیشروی بر اساس فاصلهٔ واقعی روی منحنی است، نه u خطی.
 const samples=[{u:0,x:p0.x,z:p0.z,dist:0}];let len=0,prev=p0;
 for(let i=1;i<=40;i++){const u=i/40,v=1-u,pt={x:v*v*v*p0.x+3*v*v*u*p1.x+3*v*u*u*p2.x+u*u*u*p3.x,z:v*v*v*p0.z+3*v*v*u*p1.z+3*v*u*u*p2.z+u*u*u*p3.z};len+=Math.hypot(pt.x-prev.x,pt.z-prev.z);samples.push({u,x:pt.x,z:pt.z,dist:len});prev=pt}
 c.turn={p0,p1,p2,p3,u:0,len:Math.max(.08,len),distance:0,samples};
}
function carSpawnClear(x,z){for(const o of cars){if(o.out)continue;if(Math.hypot(o.g.position.x-x,o.g.position.z-z)<.92)return false}return true}
function spawnCar(){
 if(!carRoadGraph.length)return;
 for(let attempt=0;attempt<12;attempt++){
  const node=rr(carRoadGraph),g=mkCar(),c={id:++carSerial,g,node,next:null,d:null,tx:0,tz:0,hd:0,v:0,sp:1.45+Math.random()*.55,life:38+Math.random()*42,sc:0,stuck:0,out:0,turn:null,history:[carNodeKey(node)]};
  if(!pickNext(c))continue;const pos=carLanePoint(node,c.d);if(!carSpawnClear(pos.x,pos.z))continue;
  g.scale.setScalar(.01);g.position.set(pos.x,.06,pos.z);c.hd=Math.atan2(-c.d[1],c.d[0]);scene.add(g);cars.push(c);return;
 }
}
function carBezier(turn,u){const v=1-u,p=turn.p0,a=turn.p1,b=turn.p2,q=turn.p3;
 const x=v*v*v*p.x+3*v*v*u*a.x+3*v*u*u*b.x+u*u*u*q.x,z=v*v*v*p.z+3*v*v*u*a.z+3*v*u*u*b.z+u*u*u*q.z;
 const dx=3*v*v*(a.x-p.x)+6*v*u*(b.x-a.x)+3*u*u*(q.x-b.x),dz=3*v*v*(a.z-p.z)+6*v*u*(b.z-a.z)+3*u*u*(q.z-b.z);
 return{x,z,dx,dz}}
// سرعت تطبیقی: فاصلهٔ امن در همان لاین حفظ می‌شود؛ ترافیک لاین مقابل سد راه نیست.
function carSafeSpeed(c,dx,dz){
 let speed=c.sp;
 for(const o of cars){
  if(o===c||o.out)continue;
  const rx=o.g.position.x-c.g.position.x,rz=o.g.position.z-c.g.position.z,dist=Math.hypot(rx,rz);
  const ahead=rx*dx+rz*dz,lateral=Math.abs(rx*dz-rz*dx);
  // فاصلهٔ طولیِ کافی برای خودرو جلویی؛ خودروهای لاین مقابل مزاحم محسوب نمی‌شوند.
  if(ahead>.02&&ahead<2.35&&lateral<.32)speed=Math.min(speed,Math.max(0,(ahead-1.02)*2.6));
  // اولویت عبور پایدار برای جلوگیری از قفل متقابل در نزدیکی تقاطع.
  if(dist<.40&&o.id<c.id)speed=0;
 }
 return speed;
}
function stepCars(dt,t){
 HL.emissiveIntensity=.15+2.2*NT;HQG.opacity=.04+.75*NT;HQGL.emissiveIntensity=.06+1.7*NT;ffStep(t);for(const p of cits)if(p.lan)p.lan.visible=NT>.4;if(hqDish)hqDish.rotation.y=t*.7;
 rebuildCarRoadGraph();updateCarSignals(t);
 const homesN=homes.filter(h=>!h.hq).length,people=Math.max(0,POP||cits.length),roadsN=roadC.length;
 const base=roadsN>=3?Math.min(6,1+(roadsN/5|0)):0,activity=Math.min(1.8,.55+homesN*.12+people*.035),want=base?Math.min(8,Math.max(1,Math.round(base*activity))):0,tg=Math.round(want*(1-NT*.75));
 if((spT-=dt)<=0){spT=2+Math.random()*4;if(cars.filter(c=>!c.out).length<tg)spawnCar()}
 for(let i=cars.length-1;i>=0;i--){const c=cars[i],g=c.g;
  if((c.life-=dt)<=0)c.out=1;
  c.sc=Math.max(0,Math.min(1,c.sc+(c.out?-dt*2:dt*2)));g.scale.setScalar(Math.max(.01,c.sc)*1.3);
  if(c.out&&c.sc<=0){scene.remove(g);g.traverse(o=>{if(o.geometry&&o.geometry!==WH)o.geometry.dispose()});cars.splice(i,1);continue}
  if(c.out)continue;
  let vx,vz,dist=0;
  if(c.turn){const q=carBezier(c.turn,c.turn.u),mag=Math.hypot(q.dx,q.dz)||1;vx=q.dx/mag;vz=q.dz/mag}
  else{const dx=c.tx-g.position.x,dz=c.tz-g.position.z;dist=Math.hypot(dx,dz)||1;vx=dx/dist;vz=dz/dist}
  let desired=carSafeSpeed(c,vx,vz),redStop=false,maxMove=Infinity;
  // خودرو در پیچ سرعت را کمی کم می‌کند تا تغییر مسیر طبیعی و بدون چرخش تند باشد.
  if(c.turn)desired=Math.min(desired,c.sp*.78);
  // مرکز خودرو در توقف باید حدود ۱٫۱۰ واحد پیش از مرکز تقاطع بماند؛ دماغه پشت خط توقف می‌ایستد.
  if(!c.turn&&c.next&&c.next.neighbors.length>=3){
   const light=signalStatus(c.next,c.d,t);
   if(light!=='green'){redStop=true;maxMove=Math.max(0,dist-1.10);desired=0}
  }
  c.v+=(desired-c.v)*Math.min(1,dt*7);let move=Math.max(0,c.v)*dt;
  if(redStop){move=Math.min(move,maxMove);if(maxMove<=.002)c.v=0}
  if(c.turn){const tr=c.turn;tr.distance=Math.min(tr.len,tr.distance+move);
   let lo=0,hi=tr.samples.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(tr.samples[mid].dist<tr.distance)lo=mid+1;else hi=mid}
   const b=tr.samples[lo],a0=tr.samples[Math.max(0,lo-1)],f=(tr.distance-a0.dist)/Math.max(.00001,b.dist-a0.dist);tr.u=a0.u+(b.u-a0.u)*f;
   const q=carBezier(tr,tr.u);g.position.x=q.x;g.position.z=q.z;
   const finished=tr.distance>=tr.len-.0001;
   if(finished){g.position.x=tr.p3.x;g.position.z=tr.p3.z;c.turn=null;}
   const a=finished?Math.atan2(-c.d[1],c.d[0]):Math.atan2(-q.dz,q.dx);
   let da=Math.atan2(Math.sin(a-c.hd),Math.cos(a-c.hd));c.hd+=da*Math.min(1,dt*(finished?18:16));
  }else if(dist<=move+.025){
   g.position.x=c.tx;g.position.z=c.tz;const incoming=c.d.slice();c.node=c.next;
   c.history.push(carNodeKey(c.node));if(c.history.length>9)c.history.shift();
   if(!pickNext(c)){c.out=1;continue}carStartTurn(c,incoming);
   if(c.turn){const q=carBezier(c.turn,0),a=Math.atan2(-q.dz,q.dx);let da=Math.atan2(Math.sin(a-c.hd),Math.cos(a-c.hd));c.hd+=da*Math.min(1,dt*10)}
  }else{
   g.position.x+=vx*move;g.position.z+=vz*move;const a=Math.atan2(-vz,vx);let da=Math.atan2(Math.sin(a-c.hd),Math.cos(a-c.hd));c.hd+=da*Math.min(1,dt*10);
  }
  g.position.y=.06+(c.v>.2?Math.sin(t*18+c.id)*.004:0);g.rotation.y=c.hd;
 }
}
