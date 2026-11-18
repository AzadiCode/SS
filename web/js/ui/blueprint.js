// ═══ مود نقشهٔ ساخت حرفه‌ای: شبحِ کم‌رنگِ شفافِ خودِ ساختمان روی نقشه ← چیدن/درگ با لمس ← تیک (ساخت همه) / ضربدر (کنسل).
// جریان لمسی: انگشت بگذار → شبح چسبیده به انگشت حرکت می‌کند (سبز=خالی/قرمز=اشغال) → رها کن = همان‌جا می‌نشیند.
// درگ روی شبحِ چیده‌شده = جابه‌جایی دقیق همان آیتم. درگ روی زمین با قلم جاده/پیاده‌رو = ردیف پیوسته بدون گپ (خط برِزن‌هام).
// کلیدها: R=چرخش، Enter=تیک، Esc=کنسل. سرور: POST /api/admin/buildings/batch (اتمیک) ← server/admin.py ═══
'use strict';
let BP={on:false,ghost:null,items:[],type:'house',rot:0,busy:false,dragIt:null,pending:false,px:0,pz:0,down:null,line:null};
const BP_OK=0x3ddc97,BP_BAD=0xff5a4c;
const BP_GEO=new THREE.RingGeometry(.72,.92,4,1,Math.PI/4),BP_MAT=new THREE.MeshBasicMaterial({color:BP_OK,transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide});
// ── شبح: پوستهٔ شفافِ هم‌اندازهٔ خودِ ساختمان (از bbox مدل واقعی) + خط دور + حلقهٔ اعتبار
function bpGhost(type,rot){
  const g=new THREE.Group(),model=new THREE.Group(),bid=(type==='tree'||type==='hq')?7:1234+((rot/90)|0);
  build[type]?.(model,{id:bid,x:0,z:0,rot});
  const hol=new THREE.MeshStandardMaterial({color:0x9fe8ff,transparent:true,opacity:.42,roughness:.3,emissive:0x1c6a8a,emissiveIntensity:.55,depthWrite:false});
  const edges=new THREE.LineBasicMaterial({color:0xbdf3ff,transparent:true,opacity:.85});
  const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),ctr=box.getCenter(new THREE.Vector3());
  disposeObj(model);                                  // مدل زیرین لازم نیست؛ فقط اندازه‌اش را می‌خواهیم
  const shell=new THREE.Mesh(new THREE.BoxGeometry(size.x,size.y,size.z),hol);
  shell.position.copy(ctr);g.add(shell);
  const eg=new THREE.EdgesGeometry(shell.geometry);eg.translate(ctr.x,ctr.y,ctr.z);
  g.add(new THREE.LineSegments(eg,edges));
  const ring=new THREE.Mesh(BP_GEO,BP_MAT.clone());ring.rotation.x=-Math.PI/2;ring.position.y=.05;ring.scale.setScalar(.8);g.add(ring);
  g.userData={ring};
  return g}
// ── چیدمان فعلی نقشه: کدام سلول‌ها اشغاله (ساختمان‌های واقعی + اشباه چیده‌شده)
function bpUsed(){const u=new Set(W.buildings.map(b=>b.x+','+b.z));for(const it of BP.items)u.add(it.x+','+it.z);return u}
const bpFree=(x,z)=>x>=-20&&x<20&&z>=-20&&z<20&&((x*2+17)/8.6)**2+((z*2+17)/6)**2>=1.15&&!bpUsed().has(x+','+z);
// ── شبحِ چیده‌شدهٔ ثابت روی نقشه (هر آیتم: پوسته + حلقه‌اش)
function bpPlace(it){
  const g=bpGhost(it.type,it.rot);g.position.set(it.x*CELL,0,it.z*CELL);
  if(it.type!=='road'&&it.type!=='path')g.rotation.y=it.rot*Math.PI/180;
  scene.add(g);it.g=g;return g}
function bpSetRing(it,ok){if(it.g)it.g.userData.ring.material.color.setHex(ok?BP_OK:BP_BAD)}
function bpAdd(x,z){if(!bpFree(x,z))return false;
  const it={type:BP.type,x,z,rot:BP.type==='road'||BP.type==='path'?0:BP.rot};
  bpPlace(it);BP.items.push(it);bpBar();return true}
function bpRemove(it){if(it.g){scene.remove(it.g);disposeObj(it.g);it.g=null}BP.items.splice(BP.items.indexOf(it),1);bpBar()}
function bpClear(){for(const it of BP.items)if(it.g){scene.remove(it.g);disposeObj(it.g)}BP.items=[];bpLine(null);bpBar()}
// ── جابه‌جایی آیتم چیده‌شده (درگ): سلول قبلی موقتاً آزاد می‌شود تا همپوشانی با خودش خطا ندهد
function bpMoveTo(it,x,z){const ox=it.x,oz=it.z;it.x=1e4;const ok=bpFree(x,z);it.x=ox;
  if(!ok){bpSetRing(it,false);return false}
  it.x=x;it.z=z;it.g.position.set(x*CELL,0,z*CELL);bpSetRing(it,true);return true}
// ── ردیف پیوستهٔ جاده/پیاده‌رو: خط برِزن‌هام بین دو نقطهٔ لمس — هیچ سلولی در مسیر جا نمی‌ماند (بدون گپ)
function bpStroke(x0,z0,x1,z1){
  const pts=[],n=Math.max(Math.abs(x1-x0),Math.abs(z1-z0));
  if(n===0)pts.push([x0,z0]);
  else for(let i=0;i<=n;i++)pts.push([Math.round(x0+(x1-x0)*i/n),Math.round(z0+(z1-z0)*i/n)]);
  let added=0;for(const[x,z]of pts)if(bpAdd(x,z))added++;
  return added}
// ── خط راهنمای کشیدن (از نقطهٔ شروع تا انگشت)
function bpLine(c){if(!c){if(BP.line){scene.remove(BP.line);disposeObj(BP.line);BP.line=null}return}
  if(!BP.line){BP.line=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xffe0a0,transparent:true,opacity:.8}));BP.line.position.y=.1;scene.add(BP.line)}
  BP.line.geometry.setFromPoints([new THREE.Vector3(BP.down.c[0]*CELL,0,BP.down.c[1]*CELL),new THREE.Vector3(c[0]*CELL,0,c[1]*CELL)])}
// ── شبحِ شناور زیر انگشت (بدون ایونت: با مختصات سلول مستقیم)
function bpFloat(c){
  if(!BP.ghost){BP.ghost=bpGhost(BP.type,BP.rot);scene.add(BP.ghost)}
  const ok=bpFree(c[0],c[1]);
  BP.ghost.position.set(c[0]*CELL,0,c[1]*CELL);
  if(BP.type!=='road'&&BP.type!=='path')BP.ghost.rotation.y=BP.rot*Math.PI/180;
  BP.ghost.userData.ring.material.color.setHex(ok?BP_OK:BP_BAD);
  BP.ghost.visible=true;BP.ok=ok}
function bpRefreshGhost(){if(BP.ghost){scene.remove(BP.ghost);disposeObj(BP.ghost);BP.ghost=null}}
// ── نوار پایین: تیک/ضربدر + شمارنده
function bpBar(){const b=$('bpb');if(!b)return;
  b.style.display=BP.on?'flex':'none';
  if(BP.on){const n=BP.items.length,cost=n?(W.cost?BP.items.reduce((s,i)=>s+(W.cost[i.type]||0),0):0):0;
  $('bpn').textContent='نقشهٔ ساخت: '+cpx(n)+' مورد'+(cost&&!$('fr').checked?' · '+fa(cost/1e6,1)+' م':'');
  $('bpok').style.opacity=n?1:.35}}
function bpStart(){if(!T)return;BP.on=true;BP.rot=0;bpBar();
  $('bph').style.display='block';$('adm').style.display='none';$('pal').style.display='flex'}
function bpEnd(){BP.on=false;BP.dragIt=null;BP.down=null;bpClear();bpRefreshGhost();bpBar();
  $('bph').style.display='none';if(admOn)$('adm').style.display='flex'}
// ── تیک: ساخت همه (اتمیک) — sync خودش مدل‌ها را با انیمیشن پاپ می‌سازد
async function bpCommit(){const n=BP.items.length;if(!n||BP.busy)return;BP.busy=true;
  $('bpok').style.opacity=.4;
  try{await api('/api/admin/buildings/batch','POST',{items:BP.items.map(i=>({type:i.type,x:i.x,z:i.z,rot:i.rot})),free:$('fr').checked});
    toast('✅ '+cpx(n)+' ساختمان ساخته شد');bpClear()}
  catch(e){/* api خودش توست خطا می‌زند */}
  BP.busy=false;bpBar()}
document.body.insertAdjacentHTML('beforeend',
 `<div id="bph" class="g">🏗️ انگشت بگذار و بکش: شبح دنبال انگشت می‌آید، رها کن = بنشیند · روی شبحِ چیده‌شده بکش = جابه‌جایی · R چرخش</div>
  <div id="bpb" class="g"><span id="bpn"></span><button id="bpx" title="کنسل (Esc)">✕</button><button id="bpok" title="ساخت (Enter)">✓</button></div>`);
$('bpx').onclick=()=>{bpEnd();toast('نقشهٔ ساخت کنسل شد')};
$('bpok').onclick=bpCommit;
addEventListener('keydown',e=>{if(!BP.on)return;
  if(e.key==='Escape'){bpEnd();toast('کنسل شد')}
  else if(e.key==='Enter'){e.preventDefault();bpCommit()}
  else if(e.key==='r'||e.key==='R'){BP.rot=(BP.rot+90)%360;bpRefreshGhost()}});
