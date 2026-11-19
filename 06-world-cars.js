// ═══ خودروهای کوچک با حرکت روی مختصات واقعی شبکهٔ خیابان‌ها ═══
'use strict';
const cars=[],CC=[0xd94f3a,0xf0b13a,0x3f7f99,0x7cb342,0xf2ead6,0x94527f],HL=new THREE.MeshStandardMaterial({color:0xfff3c4,emissive:0xffe08a,emissiveIntensity:.2}),WH=new THREE.CylinderGeometry(.07,.07,.05,10),LANE=.18;
const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
let spT=3,carRoadGraph=[],carRoadSig='';
// اتصال جاده‌ها با همان کلید شبکه‌ای roadSet/ناوبری؛ مختصات واقعی هر قطعه حفظ می‌شود.
function rebuildCarRoadGraph(){
 const src=Array.isArray(roadC)?roadC:[],nodes=[],byKey=new Map();
 for(const r of src){const ix=Math.round(r.x/CELL),iz=Math.round(r.z/CELL),key=ix+','+iz;
  const n={ix,iz,x:r.x,z:r.z,neighbors:[]};nodes.push(n);byKey.set(key,n)}
 const sig=nodes.map(n=>n.ix+','+n.iz+':'+n.x.toFixed(4)+','+n.z.toFixed(4)).sort().join('|');
 if(sig===carRoadSig)return false;
 carRoadSig=sig;
 for(const n of nodes)for(const [dx,dz] of DIRS){const next=byKey.get((n.ix+dx)+','+(n.iz+dz));if(next)n.neighbors.push({node:next,dx,dz})}
 carRoadGraph=nodes.filter(n=>n.neighbors.length>0);
 // هنگام تغییر شبکه، خودروهای قبلی به‌آرامی خارج می‌شوند تا روی مسیر حذف‌شده نمانند.
 for(const c of cars)c.out=1;
 return true;
}
function mkCar(){const g=new THREE.Group(),col=rr(CC);bx(g,.62,.13,.3,col,0,.05);bx(g,.32,.12,.26,col,-.05,.18);bx(g,.3,.07,.275,0x9fc4d6,-.05,.2);
 [[.2,.16],[.2,-.16],[-.2,.16],[-.2,-.16]].forEach(([x,z])=>{const w=new THREE.Mesh(WH,M(0x25282c));w.rotation.x=Math.PI/2;w.position.set(x,.07,z);g.add(w)});
 [-.09,.09].forEach(z=>{const l=new THREE.Mesh(new THREE.BoxGeometry(.03,.05,.07),HL);l.position.set(.32,.12,z);g.add(l)});return g}
function pickNext(c){
 const ns=c.node.neighbors,forward=ns.filter(e=>!c.d||(e.dx!==-c.d[0]||e.dz!==-c.d[1])),pool=forward.length?forward:ns;if(!pool.length)return 0;
 let e=rr(pool);if(c.d&&Math.random()<.6){const s=pool.find(v=>v.dx===c.d[0]&&v.dz===c.d[1]);if(s)e=s}
 c.d=[e.dx,e.dz];c.next=e.node;c.tx=e.node.x-e.dz*LANE;c.tz=e.node.z+e.dx*LANE;return 1;
}
function spawnCar(){
 if(!carRoadGraph.length)return;const node=rr(carRoadGraph),g=mkCar();g.scale.setScalar(.01);scene.add(g);
 const c={g,node,next:null,d:null,tx:0,tz:0,hd:0,v:0,sp:1.5+Math.random()*.7,life:30+Math.random()*45,sc:0,stuck:0,out:0};
 if(!pickNext(c)){scene.remove(g);return}
 g.position.set(node.x-c.d[1]*LANE,.06,node.z+c.d[0]*LANE);c.hd=Math.atan2(-c.d[1],c.d[0]);cars.push(c);
}
function stepCars(dt,t){
 HL.emissiveIntensity=.15+2.2*NT;HQG.opacity=.04+.75*NT;HQGL.emissiveIntensity=.06+1.7*NT;ffStep(t);for(const p of cits)if(p.lan)p.lan.visible=NT>.4;if(hqDish)hqDish.rotation.y=t*.7;
 rebuildCarRoadGraph();
 const homesN=homes.filter(h=>!h.hq).length,people=Math.max(0,POP||cits.length),roadsN=roadC.length;
 const base=roadsN>=3?Math.min(6,1+(roadsN/5|0)):0,activity=Math.min(1.8,.55+homesN*.12+people*.035),want=base?Math.min(8,Math.max(1,Math.round(base*activity))):0,tg=Math.round(want*(1-NT*.75));
 if((spT-=dt)<=0){spT=2+Math.random()*6;if(cars.length<tg)spawnCar()}
 for(let i=cars.length-1;i>=0;i--){const c=cars[i],g=c.g;if((c.life-=dt)<=0||(cars.length>tg+1&&Math.random()<dt*.2))c.out=1;
  c.sc=Math.max(0,Math.min(1,c.sc+(c.out?-dt*2:dt*2)));g.scale.setScalar(Math.max(.01,c.sc)*1.3);
  if(c.out&&c.sc<=0){scene.remove(g);g.traverse(o=>{if(o.geometry&&o.geometry!==WH)o.geometry.dispose()});cars.splice(i,1);continue}
  const px=g.position.x,pz=g.position.z,dist=Math.hypot(c.tx-px,c.tz-pz);
  if(dist<Math.max(.2,c.v*dt+.06)){g.position.x=c.tx;g.position.z=c.tz;c.node=c.next;if(!pickNext(c)){c.out=1;continue}}
  const dx=c.tx-g.position.x,dz=c.tz-g.position.z;let da=Math.atan2(-dz,dx)-c.hd;da=Math.atan2(Math.sin(da),Math.cos(da));c.hd+=da*Math.min(1,dt*6);
  const cs=Math.cos(c.hd),sn=Math.sin(c.hd),ck=(x,z,fw,lat)=>{const rx=x-px,rz=z-pz,f=rx*cs-rz*sn,l=Math.abs(rx*sn+rz*cs);return f>.05&&f<fw&&l<lat};let bl=0;
  for(const p of cits)if(!p.hid&&ck(p.g.position.x,p.g.position.z,1.1,.4)){bl=1;break}
  if(!bl)for(const o of cars)if(o!==c&&ck(o.g.position.x,o.g.position.z,.95,.38)){bl=1;break}
  c.stuck=bl?c.stuck+dt:0;c.v+=((!bl||c.stuck>5?c.sp:0)-c.v)*Math.min(1,dt*4);
  const step=Math.min(c.v*dt,Math.hypot(c.tx-g.position.x,c.tz-g.position.z));g.position.x+=cs*step;g.position.z-=sn*step;g.position.y=.06+(c.v>.2?Math.sin(t*18+i)*.004:0);g.rotation.y=c.hd;
 }
}
