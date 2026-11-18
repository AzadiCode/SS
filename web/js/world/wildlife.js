// ═══ حیوانات وحشی جنگلی (جایگزین مفهوم «دشمن»): گراز، گرگ، خرس ─
// هر از گاه (مخصوصاً شب‌ها) از جنگل اطراف می‌آیند، به یک شهروند حمله می‌کنند، سپس فرار می‌کنند.
// هیچ نابودی پایگاه، موج دشمن، یا امتیاز جنگ وجود ندارد — فقط حادثهٔ طبیعی و زودگذر. ═══
'use strict';
const WILD=[];
let wildSpawnT=18+Math.random()*14; // اولین ظهور پس از ۱۸–۳۲ ثانیه
// ویژگی‌های هر نوع: نام، سرعت، اندازه، رنگ بدن/شکم/پا/سر، رنگ چشم، شعاع حمله
// رنگ‌ها کمی روشن انتخاب شده‌اند تا شب‌ها (نور کم) هم خوانا باشند؛ اندازه‌ها ~۱٫۲ برابر شهروند بزرگ‌اند
const WL_KINDS={
  boar:{name:'گراز',sp:2.4,sz:1.2,body:0x7a5230,belly:0xa87848,leg:0x4a321e,head:0x6a4630,tusk:0xf2ead4,eye:0xffd23a,atkR:1.3},
  wolf:{name:'گرگ',sp:3.0,sz:1.1,body:0x8a8a94,belly:0xb8b8c2,leg:0x5a5a64,head:0x7a7a84,tusk:0xf2ead4,eye:0xffd23a,atkR:1.2},
  bear:{name:'خرس',sp:1.8,sz:1.55,body:0x6a4428,belly:0x8a5a36,leg:0x3a2414,head:0x5a3820,tusk:0xf2ead4,eye:0xffae3a,atkR:1.5}
};
// ساخت یک حیوان (Group از مش‌های BoxGeometry با متریال مشترک M)
function mkWild(kind){
  const k=WL_KINDS[kind],g=new THREE.Group();g.rotation.order='YXZ';const s=k.sz;
  const body=M(k.body,.85),belly=M(k.belly,.85),leg=M(k.leg,.85),head=M(k.head,.85);
  const put=(geo,m,x,y,z)=>{const e=new THREE.Mesh(geo,m);e.position.set(x,y,z);e.castShadow=true;e.receiveShadow=true;g.add(e);return e};
  // بدن، شکم، سر، پوزه
  put(new THREE.BoxGeometry(.8*s,.5*s,1.15*s),body,0,.58*s,0);
  put(new THREE.BoxGeometry(.64*s,.24*s,1.0*s),belly,0,.4*s,0);
  put(new THREE.BoxGeometry(.4*s,.4*s,.4*s),head,0,.72*s,.64*s);
  put(new THREE.BoxGeometry(.26*s,.2*s,.2*s),head,0,.66*s,.86*s);
  // گوش‌ها
  put(new THREE.BoxGeometry(.12*s,.16*s,.06*s),head,.22*s,.92*s,.58*s);
  put(new THREE.BoxGeometry(.12*s,.16*s,.06*s),head,-.22*s,.92*s,.58*s);
  // عاج/دندان (گراز برجسته‌تر)
  const tus=kind==='boar'?.05*s:.02*s;
  put(new THREE.BoxGeometry(tus,.12*s,.04*s),M(k.tusk,.6),.14*s,.62*s,.94*s,0,.3,0);
  put(new THREE.BoxGeometry(tus,.12*s,.04*s),M(k.tusk,.6),-.14*s,.62*s,.94*s,0,-.3,0);
  // دم — متفاوت بر هر نوع
  if(kind==='wolf'){const tg=new THREE.Group();tg.position.set(0,.62*s,-.62*s);const tm=new THREE.Mesh(new THREE.BoxGeometry(.12*s,.12*s,.36*s),body);tm.castShadow=true;tg.add(tm);g.add(tg);tg.rotation.z=.2;}
  else if(kind==='boar'){put(new THREE.BoxGeometry(.07*s,.07*s,.2*s),body,0,.56*s,-.62*s);}
  else{put(new THREE.BoxGeometry(.12*s,.1*s,.2*s),body,0,.5*s,-.62*s);}
  // پاها — چهار تا، برای انیمیشن تکان
  const legs=[];
  const lp=(x,z)=>{const lg=put(new THREE.BoxGeometry(.16*s,.48*s,.16*s),leg,x,.24*s,z);legs.push(lg);};
  lp(-.26*s,.36*s);lp(.26*s,.36*s);lp(-.26*s,-.36*s);lp(.26*s,-.36*s);
  // چشم‌های درخشان — دو نقطهٔ AdditiveSprite جلوی پوزه (بیرون از هندسه تا depth-test نشوند)
  const eyeMat=new THREE.SpriteMaterial({map:GRADT,color:k.eye,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false});
  const eyeL=new THREE.Sprite(eyeMat),eyeR=new THREE.Sprite(eyeMat.clone());
  eyeL.scale.set(.3*s,.3*s,1);eyeL.position.set(.14*s,.82*s,1.02*s);
  eyeR.scale.set(.3*s,.3*s,1);eyeR.position.set(-.14*s,.82*s,1.02*s);
  g.add(eyeL,eyeR);
  scene.add(g);
  return{kind,k,g,legs,eye:eyeL,eyeMat,eyeMatR:eyeR.material,state:'in',t:0,ph:Math.random()*6,atkT:0,fleeT:0,stT:0,target:null,spawn:[0,0]};
}
// انتخاب نوع بر اساس شب/روز
function pickKind(){
  const nt=NT>.3;
  if(nt){const r=Math.random();return r<.5?'wolf':r<.85?'boar':'bear';}
  return Math.random()<.7?'boar':'wolf';
}
// ظهور یک حیوان از جنگل اطراف در لبهٔ تصادفی
function spawnWild(){
  if(WILD.length>=(MOB?2:4))return;
  const w=mkWild(pickKind());
  const ang=Math.random()*6.283,r=46+Math.random()*8;
  const x=Math.cos(ang)*r,z=Math.sin(ang)*r;
  w.spawn=[x,z];
  w.g.position.set(x,hgt(x,z),z);
  WILD.push(w);
  try{toast(w.k.name+' وحشی از جنگل اومد!')}catch(e){}
}
// انتخاب نزدیک‌ترین شهروند قابل‌ دیدن به‌عنوان هدف
function pickTarget(w){
  let best=null,bd=1e9;const px=w.g.position.x,pz=w.g.position.z;
  for(const c of cits){
    if(c.hid||!c.g.visible)continue;
    const d=Math.hypot(c.g.position.x-px,c.g.position.z-pz);
    if(d<bd){bd=d;best=c}
  }
  return best;
}
// انیمیشن تکان پا — جفت‌جفت (پیشانی-چپ + عقبی-راست و ...)
function swingLegs(w,amp){
  const sw=Math.sin(w.ph)*amp;
  w.legs[0].rotation.x=sw;
  w.legs[3].rotation.x=sw;
  w.legs[1].rotation.x=-sw;
  w.legs[2].rotation.x=-sw;
}
// حلقهٔ اصلی — توسط main.js صدا زده می‌شود.
function stepWildlife(dt,t){
  // زمان‌بندی ظهور: شب‌ها مکررتر، روزها کمتر
  wildSpawnT-=dt;
  const rate=NT>.4?26:(NT>.15?55:120);
  if(wildSpawnT<=0&&WILD.length<(MOB?2:4)){
    wildSpawnT=rate*.6+Math.random()*rate;
    spawnWild();
  }
  for(let i=WILD.length-1;i>=0;i--){
    const w=WILD[i],g=w.g;
    w.t+=dt;w.ph+=dt*w.k.sp*2.4;
    // چشم‌ها فقط شب دیده شوند — درخشان و واضح (شناسهٔ اصلی حیوان در تاریکی)
    const eo=Math.min(1,Math.max(0,NT-.15)*1.3);w.eyeMat.opacity=eo;w.eyeMatR.opacity=eo;
    const px=g.position.x,pz=g.position.z;
    if(w.state==='in'){
      // انتخاب هدف (هر ۲ ثانیه تازه می‌شود)
      if(!w.target||w.target.hid||!w.target.g.visible||w.stT<=0){w.target=pickTarget(w);w.stT=2;}
      w.stT-=dt;
      const tx=w.target?w.target.g.position.x:0,tz=w.target?w.target.g.position.z:0;
      const dx=tx-px,dz=tz-pz,d=Math.hypot(dx,dz);
      if(d<w.k.atkR){w.state='atk';w.atkT=0;}
      else{
        const st=w.k.sp*dt;
        const nx=px+dx/d*st,nz=pz+dz/d*st;
        if(walk(nx,nz)){g.position.x=nx;g.position.z=nz;}
        g.position.y=hgt(g.position.x,g.position.z);
        g.rotation.y=Math.atan2(dx,dz);
        swingLegs(w,.5);
        if(Math.random()<.04)dust(g.position.x,.05,g.position.z);
      }
    }else if(w.state==='atk'){
      w.atkT+=dt;
      if(w.atkT<.25){
        // حمله: انفجار گرد‌و‌غبار + جرقه خشم + وحشت شهروند
        boom(px,.2,pz,.6);rageFx(px,.4,pz);
        const tc=w.target;
        if(tc){
          tc.st='stay';tc.tm=1.4;tc.act='';
          // هل دادن شهروند به عقب
          const ax=tc.g.position.x-px,az=tc.g.position.z-pz,ad=Math.hypot(ax,az)||1;
          const bx=tc.g.position.x+ax/ad*.7,bz=tc.g.position.z+az/ad*.7;
          if(walk(bx,bz)){tc.g.position.x=bx;tc.g.position.z=bz;}
          // حرف وحشت
          try{dgSay(tc,['wild'],2200,'s');}catch(e){}
        }
        w.state='flee';w.fleeT=0;
      }
    }else if(w.state==='flee'){
      w.fleeT+=dt;
      const sx=w.spawn[0],sz=w.spawn[1],dx=sx-px,dz=sz-pz,d=Math.hypot(dx,dz);
      const st=w.k.sp*1.25*dt;
      if(d<2.5||w.fleeT>16){
        scene.remove(w.g);disposeObj(w.g);
        WILD.splice(i,1);
        continue;
      }
      const nx=px+dx/d*st,nz=pz+dz/d*st;
      if(walk(nx,nz)){g.position.x=nx;g.position.z=nz;}
      g.position.y=hgt(g.position.x,g.position.z);
      g.rotation.y=Math.atan2(dx,dz);
      swingLegs(w,.6);
      if(Math.random()<.05)dust(g.position.x,.05,g.position.z);
    }
  }
}
