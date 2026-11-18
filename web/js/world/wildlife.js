// ═══ حیوانات وحشی جنگلی (جایگزین مفهوم «دشمن»): گراز، گرگ، خرس ─
// هر از گاه (مخصوصاً شب‌ها) از جنگل اطراف می‌آیند، به یک شهروند حمله می‌کنند، سپس فرار می‌کنند.
// هیچ نابودی پایگاه، موج دشمن، یا امتیاز جنگ وجود ندارد — فقط حادثهٔ طبیعی و زودگذر. ═══
'use strict';
const WILD=[];
let wildSpawnT=18+Math.random()*14; // اولین ظهور پس از ۱۸–۳۲ ثانیه
// ویژگی‌های هر نوع: نام، سرعت، اندازه، رنگ بدن/شکم/پا/سر، رنگ چشم، شعاع حمله، دامنهٔ تکان پا
const WL_KINDS={
  boar:{name:'گراز',sp:2.4,sz:1.0,body:0x5a3a22,belly:0x8a5a32,leg:0x3a2a18,head:0x4a2e1a,tusk:0xeae0c0,eye:0xffd23a,atkR:1.1},
  wolf:{name:'گرگ',sp:3.0,sz:0.95,body:0x6a6a72,belly:0x9a9aa2,leg:0x4a4a52,head:0x5a5a62,tusk:0xeae0c0,eye:0xffd23a,atkR:1.0},
  bear:{name:'خرس',sp:1.8,sz:1.3,body:0x4a3020,belly:0x6a4a30,leg:0x2a1a10,head:0x3a2418,tusk:0xeae0c0,eye:0xffae3a,atkR:1.3}
};
// ساخت یک حیوان (Group از مش‌های BoxGeometry با متریال مشترک M)
function mkWild(kind){
  const k=WL_KINDS[kind],g=new THREE.Group();g.rotation.order='YXZ';const s=k.sz;
  const body=M(k.body,.85),belly=M(k.belly,.85),leg=M(k.leg,.85),head=M(k.head,.85);
  const put=(geo,m,x,y,z)=>{const e=new THREE.Mesh(geo,m);e.position.set(x,y,z);e.castShadow=true;e.receiveShadow=true;g.add(e);return e};
  // بدن، شکم، سر، پوزه
  put(new THREE.BoxGeometry(.78*s,.44*s,1.05*s),body,0,.52*s,0);
  put(new THREE.BoxGeometry(.62*s,.22*s,.92*s),belly,0,.36*s,0);
  put(new THREE.BoxGeometry(.36*s,.34*s,.36*s),head,0,.62*s,.56*s);
  put(new THREE.BoxGeometry(.24*s,.18*s,.18*s),head,0,.58*s,.76*s);
  // گوش‌ها
  put(new THREE.BoxGeometry(.1*s,.14*s,.05*s),head,.2*s,.78*s,.5*s);
  put(new THREE.BoxGeometry(.1*s,.14*s,.05*s),head,-.2*s,.78*s,.5*s);
  // عاج/دندان (گراز برجسته‌تر)
  const tus=kind==='boar'?.04*s:.02*s;
  put(new THREE.BoxGeometry(tus,.1*s,.04*s),M(k.tusk,.6),.12*s,.55*s,.82*s,0,.3,0);
  put(new THREE.BoxGeometry(tus,.1*s,.04*s),M(k.tusk,.6),-.12*s,.55*s,.82*s,0,-.3,0);
  // دم — متفاوت بر هر نوع
  if(kind==='wolf'){const tg=new THREE.Group();tg.position.set(0,.55*s,-.56*s);const tm=new THREE.Mesh(new THREE.BoxGeometry(.1*s,.1*s,.32*s),body);tm.castShadow=true;tg.add(tm);g.add(tg);tg.rotation.z=.2;}
  else if(kind==='boar'){put(new THREE.BoxGeometry(.06*s,.06*s,.18*s),body,0,.5*s,-.55*s);}
  else{put(new THREE.BoxGeometry(.1*s,.08*s,.18*s),body,0,.45*s,-.55*s);}
  // پاها — چهار تا، برای انیمیشن تکان
  const legs=[];
  const lp=(x,z)=>{const lg=put(new THREE.BoxGeometry(.14*s,.42*s,.14*s),leg,x,.21*s,z);legs.push(lg);};
  lp(-.24*s,.32*s);lp(.24*s,.32*s);lp(-.24*s,-.32*s);lp(.24*s,-.32*s);
  // چشم‌های درخشان AdditiveSprite — شب‌ها دیده می‌شوند
  const eyeMat=new THREE.SpriteMaterial({map:GRADT,color:k.eye,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,fog:false});
  const eye=new THREE.Sprite(eyeMat);eye.scale.set(.28*s,.13*s,1);eye.position.set(0,.66*s,.74*s);g.add(eye);
  scene.add(g);
  return{kind,k,g,legs,eye,eyeMat,state:'in',t:0,ph:Math.random()*6,atkT:0,fleeT:0,stT:0,target:null,spawn:[0,0]};
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
    // چشم‌ها فقط شب دیده شوند
    w.eyeMat.opacity=Math.max(0,NT-.2)*.95;
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
