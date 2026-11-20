// ═══ منظرهٔ ثابت: زمین چمن، گنبد آسمان، رودخانه، گل، سنگ، کوه‌های دور، جنگل، ابرها و خط‌چین محل خانهٔ مدیرعامل. ═══
'use strict';
// زمین: تکسچر چمن (یک سطح، بدون هم‌پوشانی ⇒ بدون پرپر)
const cv=document.createElement('canvas');cv.width=cv.height=512;const x=cv.getContext('2d');x.fillStyle='#7d9f5b';x.fillRect(0,0,512,512);
for(let i=0;i<70;i++){const px=Math.random()*512,py=Math.random()*512,r=30+Math.random()*70,c=['120,160,88','140,172,98','104,142,78'][i%3];
for(const ox of[-512,0,512])for(const oy of[-512,0,512]){const gr=x.createRadialGradient(px+ox,py+oy,0,px+ox,py+oy,r);gr.addColorStop(0,`rgba(${c},.35)`);gr.addColorStop(1,`rgba(${c},0)`);x.fillStyle=gr;x.fillRect(px+ox-r,py+oy-r,2*r,2*r)}}
const tex=new THREE.CanvasTexture(cv);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(7,7);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
const hgt=(x,z)=>{const r=Math.hypot(x,z),k=Math.min(1,Math.max(0,(r-52)/50));return k*k*(3-2*k)*(7+5*Math.sin(x*.07)*Math.cos(z*.06)+3*Math.sin(x*.19+z*.13))};
const gg=new THREE.PlaneGeometry(300,300,110,110);gg.rotateX(-Math.PI/2);{const p=gg.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,hgt(p.getX(i),p.getZ(i)));gg.computeVertexNormals()}
const ground=new THREE.Mesh(gg,new THREE.MeshStandardMaterial({map:tex,roughness:1}));ground.receiveShadow=true;scene.add(ground);
const sky=new THREE.Mesh(new THREE.SphereGeometry(250,24,12),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{a:{value:new THREE.Color(0x6f9fc8)},b:{value:new THREE.Color(0xc9d6c4)},s:{value:new THREE.Vector3(0,1,0)},gc:{value:new THREE.Color(0xffe2b8)},g:{value:1}},vertexShader:'varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 a,b,s,gc;uniform float g;varying vec3 p;void main(){vec3 c=mix(b,a,smoothstep(0.,.55,p.y));float d=max(dot(p,s),0.);c+=gc*(pow(d,6.)*.35+pow(d,90.)*1.2)*g;gl_FragColor=vec4(c,1.);}'}));scene.add(sky);
let s=5;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
// رودخانهٔ شکسته (هم‌راستا با گرید شهر): پلی‌لاین قطعه‌های مستقیم افقی/عمودی — مسیر منطقی (حریم/ساخت/ناوبری)
// عیناً همان نسخهٔ قبلی است تا بازوها تا سرِ گوشه کاملاً صاف بمانند و خانه/خیابون تا آخر بازو چسبیده ساخته شود؛
// فقط «رندر» آب در پیچ‌ها نرم شده (رستر فاصله‌محور ⇒ گوشهٔ آب پلهٔ موربِ نرم می‌گیرد، نه مربع تیز).
const RIVER_PTS=[[-146,22],[-96,22],[-96,6],[-40,6],[-40,24],[16,24],[16,4],[72,4],[72,18],[146,18]];
const inRiver=(x,z)=>{for(let i=1;i<RIVER_PTS.length;i++){const a=RIVER_PTS[i-1],b=RIVER_PTS[i],dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz))),qx=a[0]+u*dx,qz=a[1]+u*dz;if(Math.hypot(x-qx,z-qz)<4.1)return true}return false};
// فاصله تا محور رود — مشترک بین رستر آب، گاردهای ساحل و گل‌ها (برش‌های مورب هم مثل بقیه قطعه‌ها حساب می‌شوند)
const riverDist=(x,z)=>{let d=1e9;for(let i=1;i<RIVER_PTS.length;i++){const a=RIVER_PTS[i-1],b=RIVER_PTS[i],dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));d=Math.min(d,Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz))}return d};
const riverWaterMat=new THREE.MeshStandardMaterial({roughness:.22,metalness:.08,side:THREE.DoubleSide});
// آب پیکسلی: کاشی‌های ۱×۱ با تُن‌های نزدیک به هم و چیدمان شُuffleشده (بدون راه‌راهِ مورب)؛
// رنگ نهایی = بافت × رنگ رأس‌ها، پس عمق آب از رنگ رأس‌ها می‌آید نه از کنتراست بافت
const wcv=document.createElement('canvas');wcv.width=wcv.height=64;const wx=wcv.getContext('2d');
for(let j=0;j<8;j++)for(let i=0;i<8;i++){const tr=rnd();wx.fillStyle=tr<.1?'#62b7c5':tr<.45?'#58acbb':tr<.8?'#4ea2b2':'#4a9cac';wx.fillRect(i*8,j*8,8,8)}
const riverTex=new THREE.CanvasTexture(wcv);riverTex.wrapS=riverTex.wrapT=THREE.RepeatWrapping;riverTex.colorSpace=THREE.SRGBColorSpace;riverTex.magFilter=THREE.NearestFilter;
riverWaterMat.map=riverTex;
// سطح آب: رستر یک‌واحدی بر اساس فاصلهٔ مرکز سلول تا محور رود (<۳) ⇒ روی بازوها لبهٔ کاملاً تخت و در هر پیچ،
// گوشهٔ آب به‌جای مربعِ تیزِ «وصله‌مانند» پلهٔ موربِ نرم می‌گیرد (سلول‌های گوشهٔ بیرونی چون دورتر از ۳ از محورند رد می‌شوند)
// — یعنی همان «طرح بلوکیِ نرمِ پیچ‌ها» بدون هیچ دست‌زدنی به مسیر منطقی و ساخت. رنگ رأس‌ها عمق می‌سازد:
// مرکز تیره، کنارِ ساحل روشن‌تر (کف کم‌عمق) با کمی نویز؛ سطح آب ۰٫۰۴ زیر سرِ سنگ‌ها ⇒ لبهٔ سه‌بعدیِ خوانا. UV جهانی و اسکرول در core-main.
{const pos=[],uv=[],col=[],idx=[];let n=0;
 const x0=Math.min(...RIVER_PTS.map(p=>p[0]))-3,x1=Math.max(...RIVER_PTS.map(p=>p[0]))+3,z0=Math.min(...RIVER_PTS.map(p=>p[1]))-3,z1=Math.max(...RIVER_PTS.map(p=>p[1]))+3;
 for(let gz=z0;gz<z1;gz++)for(let gx=x0;gx<x1;gx++){
  const cx=gx+.5,cz=gz+.5,dc=riverDist(cx,cz);if(dc>=3)continue;
  const k=Math.min(1,Math.max(0,(dc-1.1)/1.9)),j=(rnd()-.5)*.07; // k: 0=مرکز تیره ← 1=لبهٔ روشن + نویز ظریف
  const cr=.23+.31*k+j,cg=.60+.14*k+j,cb=.68+.10*k+j;
  for(const[px,pz]of[[gx,gz],[gx+1,gz],[gx+1,gz+1],[gx,gz+1]]){pos.push(px,hgt(px,pz)+.04,pz);uv.push(px/8,pz/8);col.push(cr,cg,cb)}
  idx.push(n,n+1,n+2,n,n+2,n+3);n+=4}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();
 riverWaterMat.vertexColors=true;
 const riverWater=new THREE.Mesh(g,riverWaterMat);riverWater.receiveShadow=true;scene.add(riverWater)}
// جریان آرام آب (اسکرول بافت) در framePart «world-ambient» در 05-core-main.js انجام می‌شود؛ t سراسری نیست.
// ── ساحل بلوکی: روی هر بازوی مستقیم قدم‌به‌قدم نیم‌واحد با ادامهٔ ۳٫۵ واحدی در دو سر تا ردیف‌ها در گوشه‌ها
// به هم برسند — بدون هیچ قطعهٔ مورب و بدون هیچ بلوک چرخیده (همان ردیف‌های صاف قبلی)؛
// ۱) سنگ‌چین روی لبهٔ آب (مرکز ۳٫۰، ارتفاع نامنظم ⇒ حس صخرهٔ سه‌بعدی) ۲) چمن/ماسه (مرکز ۳٫۷۵ ⇒ لبهٔ ۴٫۱ = مرز حریم).
// گارد فاصله: سنگ فقط با dn>2.6 و چمن فقط با dn>3.05 — نمونه‌های اضافهٔ کنارِ پیچ‌ها روی آب شناور نمی‌شوند.
{const CNT=2000,stoneMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.66,.2,.66),new THREE.MeshStandardMaterial({roughness:.95}),CNT),turfMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.7,.07,.7),new THREE.MeshStandardMaterial({roughness:1}),CNT);
 stoneMesh.receiveShadow=turfMesh.receiveShadow=true;const dm=new THREE.Object3D(),seen=new Set(),bc=new THREE.Color();let si=0,ti=0;
 for(let i=1;i<RIVER_PTS.length;i++){const a=RIVER_PTS[i-1],b=RIVER_PTS[i],dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz),tx=dx/L,tz=dz/L,ang=Math.atan2(tx,tz);
  for(let s=0;s<=L+7;s+=.5){
   const px=a[0]+tx*(s-3.5),pz=a[1]+tz*(s-3.5);
   for(const side of[-1,1]){
    const nx=-tz*side,nz=tx*side;
    const sx=Math.round((px+nx*3)*2)/2,sz=Math.round((pz+nz*3)*2)/2;
    if(si<CNT&&riverDist(sx,sz)>2.6&&!seen.has('s'+sx+','+sz)){seen.add('s'+sx+','+sz);dm.position.set(sx,hgt(sx,sz)+.1,sz);dm.rotation.set(0,ang,0);dm.scale.set(1,.85+rnd()*.4,1);dm.updateMatrix();stoneMesh.setMatrixAt(si,dm.matrix);const sc=rnd();stoneMesh.setColorAt(si++,bc.set(sc<.1?'#c9b27e':sc<.4?'#7d807b':sc<.7?'#8f928c':'#9aa09a'))}
    const fx=Math.round((px+nx*3.75)*2)/2,fz=Math.round((pz+nz*3.75)*2)/2;
    if(ti<CNT&&riverDist(fx,fz)>3.05&&!seen.has('t'+fx+','+fz)){seen.add('t'+fx+','+fz);dm.position.set(fx,hgt(fx,fz)+.035,fz);dm.rotation.set(0,ang,0);dm.scale.set(1,1,1);dm.updateMatrix();turfMesh.setMatrixAt(ti,dm.matrix);const tc=rnd();turfMesh.setColorAt(ti++,bc.set(tc<.14?'#b39b6d':tc<.5?'#6f9150':tc<.8?'#7d9f5b':'#5f844a'))}}}}
 stoneMesh.count=si;turfMesh.count=ti;stoneMesh.instanceMatrix.needsUpdate=true;turfMesh.instanceMatrix.needsUpdate=true;
 if(stoneMesh.instanceColor)stoneMesh.instanceColor.needsUpdate=true;if(turfMesh.instanceColor)turfMesh.instanceColor.needsUpdate=true;
 scene.add(stoneMesh);scene.add(turfMesh)}
// گل‌های ریز روی بلوک‌های چمن ساحل (۳٫۵۵ تا ۳٫۹۵ از محور)؛ کم‌تعدادتر و درشت‌تر و روشن‌تر تا از دور مثل نقطهٔ خاک دیده نشوند
const riverBloom=new THREE.InstancedMesh(new THREE.SphereGeometry(.09,7,5),new THREE.MeshStandardMaterial({roughness:.65}),110),bloomObj=new THREE.Object3D();
for(let i=0;i<110;i++){let bx=0,bz=0;
 for(let tr=0,n=0;n<5&&tr<3.15;n++){const k=1+((rnd()*(RIVER_PTS.length-1))|0),a=RIVER_PTS[k-1],b=RIVER_PTS[k],dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz),side=rnd()<.5?-1:1,d=3.55+rnd()*.4,tt=rnd();bx=a[0]+dx*tt-dz/L*side*d;bz=a[1]+dz*tt+dx/L*side*d;tr=riverDist(bx,bz)}
 bloomObj.position.set(bx,hgt(bx,bz)+.15,bz);bloomObj.scale.set(.8+rnd()*.6,.65+rnd()*.5,.8+rnd()*.6);bloomObj.updateMatrix();riverBloom.setMatrixAt(i,bloomObj.matrix);riverBloom.setColorAt(i,new THREE.Color(['#f7f3e6','#ffeef2','#fdf6df','#ffffff'][i%4]))}scene.add(riverBloom);
const inPond=(x,z)=>inRiver(x,z),occ=[]; // مستطیل‌های واقعی آیتم‌ها [x0,x1,z0,z1]
const dm=new THREE.Object3D(),FP=[],fl=new THREE.InstancedMesh(new THREE.SphereGeometry(.08,6,5),new THREE.MeshStandardMaterial({roughness:.7}),260);
for(let i=0;i<260;i++){FP.push([(rnd()-.5)*78,(rnd()-.5)*78]);fl.setColorAt(i,new THREE.Color(['#f3e9a6','#f4efe4','#e8a3b8','#b9a4e6'][i%4]))}scene.add(fl);
const rocks=[];for(let i=0;i<22;i++){const r=new THREE.Mesh(new THREE.DodecahedronGeometry(.2+rnd()*.25,0),M(0x8c9088));r.position.set((rnd()-.5)*76,.14,(rnd()-.5)*76);r.scale.y=.7;r.castShadow=true;scene.add(r);rocks.push(r)}
const hid=(x,z)=>inPond(x,z)||occ.some(r=>x>r[0]-.1&&x<r[1]+.1&&z>r[2]-.1&&z<r[3]+.1);
function refreshDeco(){FP.forEach(([x,z],i)=>{dm.position.set(x,.08,z);dm.scale.setScalar(hid(x,z)?0:1);dm.updateMatrix();fl.setMatrixAt(i,dm.matrix)});fl.instanceMatrix.needsUpdate=true;rocks.forEach(r=>r.visible=!hid(r.position.x,r.position.z))}
for(let i=0;i<18;i++){const an=i/18*6.283,r=112+rnd()*14,h=16+rnd()*22,w=20+rnd()*16;const m=new THREE.Mesh(new THREE.ConeGeometry(w,h,6),M(i%3?0x6b8796:0x7a9a88,1));m.position.set(Math.cos(an)*r,h/2-1,Math.sin(an)*r);m.rotation.y=rnd()*3;scene.add(m);const c=new THREE.Mesh(new THREE.ConeGeometry(w*.32,h*.3,6),M(0xeef2f4,.9));c.position.set(m.position.x,h*.85-1,m.position.z);scene.add(c)}
{const N=260,tr=new THREE.InstancedMesh(new THREE.CylinderGeometry(.12,.18,1,6),M(0x6b4a30),N),cn=new THREE.InstancedMesh(new THREE.ConeGeometry(.9,1.8,7),new THREE.MeshStandardMaterial({roughness:.95}),N*2),o=new THREE.Object3D();let k=0;
for(let i=0;i<N;i++){let x,z;do{x=(rnd()-.5)*104;z=(rnd()-.5)*104}while((Math.abs(x)<42&&Math.abs(z)<42)||inRiver(x,z));
const sc=1+rnd()*1.3;o.rotation.set(0,rnd()*6,0);o.scale.setScalar(sc);o.position.set(x,.5*sc+hgt(x,z),z);o.updateMatrix();tr.setMatrixAt(i,o.matrix);
for(let j=0;j<2;j++){o.scale.set(sc*(1-j*.3),sc*(1-j*.2),sc*(1-j*.3));o.position.set(x,(1.2+j*.9)*sc+hgt(x,z),z);o.updateMatrix();cn.setMatrixAt(k,o.matrix);cn.setColorAt(k++,new THREE.Color([0x3f7a4a,0x4a8a52,0x356b44,0x5a9a58][(rnd()*4)|0]))}}
tr.castShadow=cn.castShadow=true;scene.add(tr,cn)}
const clouds=[];for(let i=0;i<8;i++){const g=new THREE.Group();for(let j=0;j<5;j++){const p=new THREE.Mesh(new THREE.IcosahedronGeometry(2.5+rnd()*2.5,1),new THREE.MeshStandardMaterial({color:0xf4f1ea,roughness:1,transparent:true,opacity:.85}));p.position.set(j*3.2-6,rnd()*1.5,rnd()*2);p.scale.y=.6;g.add(p)}g.position.set((rnd()-.5)*160,32+rnd()*14,(rnd()-.5)*120);scene.add(g);clouds.push(g)}
// محل خانهٔ رئیس (خط‌چین)
const pts=[[-1.1,-1.1],[1.1,-1.1],[1.1,1.1],[-1.1,1.1],[-1.1,-1.1]].map(p=>new THREE.Vector3(p[0],.06,p[1]));
const plan=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineDashedMaterial({color:0xffffff,dashSize:.25,gapSize:.15}));plan.computeLineDistances();scene.add(plan);
