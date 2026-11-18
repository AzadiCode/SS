// ═══ پلاک خانه‌ها: تابلوی چوبیِ کنار در که «نام خانه یا صاحب خانه» + «پلاک» را نشان می‌دهد.
// فقط وقتی دوربین نزدیک شد ساخته/نمایش داده می‌شود (دور = هیچ هزینه‌ای). نام دلخواه را مدیر با ابزار 🏷️ روی خانه می‌زند. ═══
'use strict';
const PL_NEAR=18,PL_FAR=24,PL_TW=.76,PL_TH=.282,PL_TILT=-.55;
const PL_WOOD=new THREE.MeshStandardMaterial({color:0x6b4326,roughness:.9}),PL_POS={house:[.58,.82],hq:[.8,1.08]};
const PL_GEO=keepGeo((()=>{                                   // تخته + میله در یک ژئومتری (یک draw call)؛ تخته رو به بالا-جلو خم است تا از دید بالا خوانده شود
const m=new THREE.Matrix4().makeTranslation(0,.34,0).multiply(new THREE.Matrix4().makeRotationX(PL_TILT));
const board=new THREE.BoxGeometry(PL_TW+.05,PL_TH+.05,.04).applyMatrix4(m),post=new THREE.CylinderGeometry(.018,.022,.3,6).translate(0,.15,0);
return mergeGeometries([board,post])})());
const PL_FACE=keepGeo((()=>{const m=new THREE.Matrix4().makeTranslation(0,.34,0).multiply(new THREE.Matrix4().makeRotationX(PL_TILT)).multiply(new THREE.Matrix4().makeTranslation(0,0,.03));return new THREE.PlaneGeometry(PL_TW,PL_TH).applyMatrix4(m)})());
let PL_FONT=false,PL_FL=0,PL_MAP=null,PL_MW=null;
function plNum(n){return cpx(n)}
function plText(b){                                              // [خط اول، خط دوم]
const n2='پلاک '+plNum(b.id);if(b.name)return[b.name,n2];
if(b.type==='hq')return[(W.catalog&&W.catalog.hq)||'دفتر مدیرعامل',n2];
const h=homeById.get(b.id),o=h?ownersIdx(h):[];if(!o.length)return['خانهٔ خالی',n2];
return['خانهٔ '+nameOf(o[0])+(o.length>1?' +'+plNum(o.length-1):''),n2]}
function plDraw(p,t){const c=p.cv,x=c.getContext('2d'),w=c.width,h=c.height;
x.clearRect(0,0,w,h);x.fillStyle='#c9a56b';x.fillRect(0,0,w,h);x.fillStyle='#e0c28a';x.fillRect(0,0,w,h*.5);                                    // تخته
x.strokeStyle='#6b4326';x.lineWidth=10;x.strokeRect(5,5,w-10,h-10);
x.fillStyle='#4a3022';x.beginPath();x.arc(18,18,5,0,7);x.arc(w-18,18,5,0,7);x.arc(18,h-18,5,0,7);x.arc(w-18,h-18,5,0,7);x.fill();                    // میخ‌ها
x.textAlign='center';x.textBaseline='middle';x.direction='rtl';x.fillStyle='#3a2414';
let s=64;const f=z=>(PL_FONT?'800 ':'bold ')+z+'px Vazirmatn,Tahoma,sans-serif';x.font=f(s);while(s>22&&x.measureText(t[0]).width>w-70){s-=3;x.font=f(s)}
x.fillText(t[0],w/2,h*.37);x.font=f(40);x.fillStyle='#5a3a1f';x.fillText(t[1],w/2,h*.76);p.tex.needsUpdate=true}
function plMake(g,b){const p=new THREE.Group(),at=PL_POS[b.type]||PL_POS.house;p.position.set(at[0],0,at[1]);
const cv=document.createElement('canvas');cv.width=512;cv.height=190;const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
const wood=NORAY(new THREE.Mesh(PL_GEO,PL_WOOD)),face=NORAY(new THREE.Mesh(PL_FACE,new THREE.MeshStandardMaterial({map:tex,roughness:.85,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4})));wood.castShadow=true;p.add(wood,face);g.add(p);
return g.userData.plate={g:p,cv,tex,mat:face.material,key:''}}
function plKill(g){const p=g.userData.plate;if(!p)return;g.remove(p.g);p.tex.dispose();p.mat.dispose();g.userData.plate=null}
function plMap(){if(PL_MW!==W){PL_MW=W;PL_MAP=new Map(W.buildings.map(b=>[b.id,b]))}return PL_MAP}
function plRefresh(){if(!W||!W.buildings||typeof homeById==='undefined'||typeof ownersIdx==='undefined'||document.hidden)return;
if(!PL_FL){PL_FL=1;if(!document.fonts||!document.fonts.load)PL_FONT=true;else document.fonts.load('800 40px Vazirmatn','پلاک').then(()=>{PL_FONT=true;for(const g of objs.values())if(g.userData.plate)g.userData.plate.key=''}).catch(()=>{PL_FONT=true})}
const bm=plMap();
for(const g of objs.values()){const u=g.userData,ty=u.b&&u.b.type;if(ty!=='house'&&ty!=='hq')continue;
const d=cam.position.distanceTo(g.position),p=u.plate;
if(d>PL_FAR||(!p&&d>PL_NEAR)){if(p)plKill(g);continue}
const b=bm.get(u.b.id)||u.b,pl=p||plMake(g,b),t=plText(b),k=t[0]+'|'+t[1]+'|'+PL_FONT;if(pl.key!==k){pl.key=k;plDraw(pl,t)}}}
setInterval(plRefresh,300);
// مدیر: ابزار 🏷️ (نام مستعار) → روی خانه بزن → نام خانه
async function plateRename(b){const v=await ask('نام خانه (خالی = نام صاحب خانه)',b.name||'');if(v!==null)api('/api/admin/building/'+b.id+'/name','PUT',{name:v}).then(()=>toast(v?'نام خانه ذخیره شد':'نام خانه به‌صورت خودکار برگشت')).catch(()=>0)}
