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
// رودخانهٔ طبیعی: مسیر پرپیچ از غرب تا شرق نقشه؛ پهنای آب ۲ واحد (هم‌اندازهٔ جاده) و دو ساحل گِلی گل‌دار.
const RIVER_PTS=[[-145,38],[-100,32],[-65,31],[-30,29],[5,25],[38,21],[70,17],[110,14],[145,18]];
const inRiver=(x,z)=>{for(let i=1;i<RIVER_PTS.length;i++){const a=RIVER_PTS[i-1],b=RIVER_PTS[i],dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz))),qx=a[0]+u*dx,qz=a[1]+u*dz;if(Math.hypot(x-qx,z-qz)<2.15)return true}return false};
const riverCurve=new THREE.CatmullRomCurve3(RIVER_PTS.map(([x,z])=>new THREE.Vector3(x,0,z)),false,'catmullrom',.22),riverSamples=riverCurve.getPoints(320);
function riverRibbon(inner,outer,mat,yoff=0){const pos=[],uv=[],idx=[];for(let i=0;i<riverSamples.length;i++){const p=riverSamples[i],a=riverSamples[Math.max(0,i-1)],b=riverSamples[Math.min(riverSamples.length-1,i+1)],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1,nx=-dz/l,nz=dx/l;for(const d of [inner,outer]){const x=p.x+nx*d,z=p.z+nz*d;pos.push(x,hgt(x,z)+yoff,z);uv.push(i/riverSamples.length,d)}}for(let i=0;i<riverSamples.length-1;i++){const k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();const m=new THREE.Mesh(g,mat);m.receiveShadow=true;scene.add(m);return m}
const riverWaterMat=new THREE.MeshStandardMaterial({color:0x3d91a5,roughness:.2,metalness:.12,side:THREE.DoubleSide});
const riverBankMat=new THREE.MeshStandardMaterial({color:0x9b8057,roughness:1,side:THREE.DoubleSide});
const riverGrassMat=new THREE.MeshStandardMaterial({color:0x66864b,roughness:1,side:THREE.DoubleSide});
riverRibbon(-1,1,riverWaterMat,.055);
for(const side of [-1,1]){riverRibbon(side*1,side*1.72,riverBankMat,.025);riverRibbon(side*1.68,side*1.92,riverGrassMat,.018)}
// نوار باریکِ انعکاس روی آب، برای خواناتر شدن جریان رود از نمای دور
const riverSheen=new THREE.MeshStandardMaterial({color:0x9ed5d8,roughness:.16,metalness:.08,transparent:true,opacity:.28,side:THREE.DoubleSide});riverRibbon(-.13,.13,riverSheen,.067);
// گل‌های ریز و پراکنده روی حاشیهٔ گِلی رود؛ از داخل آب فاصله دارند و در امتداد پیچ‌ها ادامه پیدا می‌کنند.
const riverBloom=new THREE.InstancedMesh(new THREE.SphereGeometry(.075,7,5),new THREE.MeshStandardMaterial({roughness:.72}),190),bloomObj=new THREE.Object3D();
for(let i=0;i<190;i++){const u=(i+.5)/190,p=riverCurve.getPointAt(u),tan=riverCurve.getTangentAt(u),side=(i%2?1:-1),d=1.18+rnd()*.58,x=p.x-tan.z*side*d,z=p.z+tan.x*side*d;bloomObj.position.set(x,hgt(x,z)+.13,z);bloomObj.scale.set(.8+rnd()*.6,.65+rnd()*.5,.8+rnd()*.6);bloomObj.updateMatrix();riverBloom.setMatrixAt(i,bloomObj.matrix);riverBloom.setColorAt(i,new THREE.Color(['#f2e7a1','#f0d4d8','#f4eee0','#d8c1e8'][i%4]))}scene.add(riverBloom);
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
