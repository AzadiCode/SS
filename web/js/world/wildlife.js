// ═══ حیات‌وحش آرام: رفت‌وآمد گاه‌به‌گاه جانوران جنگلی؛ بدون دشمن، موج حمله یا تخریب.
'use strict';
const WLR=()=>Math.random();
const wild=[];
const WLM={fur:M(0x8a6845),dark:M(0x4b3828),cream:M(0xd7c5a4),fox:M(0xc46d36),white:M(0xe7e0d2),eye:M(0x211b16)};
function wlBox(g,w,h,d,m,x,y,z){const q=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);q.position.set(x,y,z);q.castShadow=true;g.add(q);return q}
function makeWild(kind){const root=new THREE.Group(),body=new THREE.Group();root.add(body);const deer=kind==='deer',fox=kind==='fox',m=fox?WLM.fox:deer?WLM.fur:WLM.white;
// بدن و شانه‌ها
wlBox(body,deer?.72:.58,.36,deer?.28:.32,m,0,.48,0);
wlBox(body,deer?.36:.28,.3,.28,m,deer?.12:0,.62,0);
// سر، گوش‌ها و دم
const head=new THREE.Group();head.position.set(.28,.68,0);body.add(head);
wlBox(head,.23,.22,.22,m,.08,0,0);wlBox(head,.18,.12,.16,fox?WLM.dark:WLM.cream,.18,-.07,0);
for(const z of[-.09,.09])wlBox(head,.055,deer?.22:.14,.055,m,-.02,deer?.18:.12,z);
wlBox(body,deer?.12:fox?.22:.18,.12,.12,fox?WLM.dark:WLM.cream,deer?-.4:-.36,.53,0);
// چهار پا با حرکت نرم
const legs=[];for(const x of[ -.2,.2])for(const z of[-.105,.105]){const leg=new THREE.Group();leg.position.set(x,.35,z);wlBox(leg,.085,.32,.085,WLM.dark,0,-.14,0);body.add(leg);legs.push(leg)}
// چشم‌های ساده و کوچک
for(const z of[-.09,.09])wlBox(head,.035,.035,.025,WLM.eye,.12,.04,z);
root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return{root,body,legs,kind,phase:WLR()*6.28,home:new THREE.Vector3(),target:new THREE.Vector3(),timer:WLR()*5,visit:0,speed:fox?1.6:deer?1.2:.9}}
for(let i=0;i<5;i++){const a=WLR()*Math.PI*2,r=47+WLR()*13,k=['deer','fox','rabbit','deer','rabbit'][i],v=makeWild(k);v.home.set(Math.cos(a)*r,0,Math.sin(a)*r);v.root.position.copy(v.home);v.root.position.y=hgt(v.home.x,v.home.z);v.target.copy(v.home);scene.add(v.root);wild.push(v)}
let wlTick=0;
function wildlifeStep(dt,t){wlTick+=dt;if(wlTick<.12)return;dt=wlTick;wlTick=0;
for(const v of wild){v.visit=Math.max(0,v.visit-dt);v.timer-=dt;if(v.timer<=0){const a=WLR()*Math.PI*2;if(NT>.55&&v.visit<=0&&WLR()<.12){v.visit=16+WLR()*12;v.timer=v.visit;const radius=18+WLR()*12;v.target.set(Math.cos(a)*radius,0,Math.sin(a)*radius)}else{v.timer=4+WLR()*8;const radius=44+WLR()*12;v.target.set(Math.cos(a)*radius,0,Math.sin(a)*radius)}}
const p=v.root.position,dx=v.target.x-p.x,dz=v.target.z-p.z,dist=Math.hypot(dx,dz);if(dist>.35){const step=Math.min(dist,v.speed*dt);p.x+=dx/dist*step;p.z+=dz/dist*step;v.root.rotation.y=Math.atan2(dx,dz);const gait=Math.sin(t*7+v.phase)*.42;v.legs[0].rotation.x=gait;v.legs[3].rotation.x=gait;v.legs[1].rotation.x=-gait;v.legs[2].rotation.x=-gait;v.body.position.y=.025+Math.abs(Math.sin(t*7+v.phase))*.035}else{v.legs.forEach(l=>l.rotation.x*=.75);v.body.position.y*=.8}p.y=hgt(p.x,p.z);if(Math.hypot(p.x-v.home.x,p.z-v.home.z)>62){v.target.copy(v.home);v.timer=4+WLR()*3}}
}
// حلقهٔ اصلی بازی این تابع را هر فریم فراخوانی می‌کند.
