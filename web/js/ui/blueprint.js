// ═══ مود نقشهٔ ساخت حرفه‌ای: شبحِ کم‌رنگِ شفافِ خودِ ساختمان روی نقشه ← چیدنِ چندتایی ← تیک (ساخت همه با انیمیشن) / ضربدر (کنسل).
// ساختمان دیگه همون لحظه ساخته نمی‌شه؛ اول «نقشه» چیده می‌شه. کلیدها: R=چرخش، Enter=تیک، Esc=کنسل.
// سرور: POST /api/admin/buildings/batch (اتمیک) ← server/admin.py ═══
'use strict';
let BP={on:false,ghost:null,items:[],g:null,type:'house',rot:0,busy:false};
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
// ── شبحِ چیده‌شدهٔ ثابت روی نقشه (هر آیتم: نسخهٔ کوچک‌شدهٔ شبح + حلقه‌اش)
function bpPlace(it){
  const g=bpGhost(it.type,it.rot);g.position.set(it.x*CELL,0,it.z*CELL);
  if(it.type!=='road'&&it.type!=='path')g.rotation.y=it.rot*Math.PI/180;
  scene.add(g);it.g=g;return g}
function bpAdd(x,z){if(!bpFree(x,z)){toast('اینجا جا نیست');return}
  const it={type:BP.type,x,z,rot:BP.type==='road'||BP.type==='path'?0:BP.rot};
  bpPlace(it);BP.items.push(it);bpBar()}
function bpRemove(it){if(it.g){scene.remove(it.g);disposeObj(it.g);it.g=null}BP.items.splice(BP.items.indexOf(it),1);bpBar()}
function bpClear(){for(const it of BP.items)if(it.g){scene.remove(it.g);disposeObj(it.g)}BP.items=[];bpBar()}
// ── شبحِ شناور زیر اشاره‌گر
function bpFloat(e){const c=cellOf(e);if(!c)return;
  if(!BP.ghost){BP.ghost=bpGhost(BP.type,BP.rot);BP.g=BP.ghost;scene.add(BP.ghost)}
  const ok=bpFree(c[0],c[1]);
  BP.ghost.position.set(c[0]*CELL,0,c[1]*CELL);
  if(BP.type!=='road'&&BP.type!=='path')BP.ghost.rotation.y=BP.rot*Math.PI/180;
  const ring=BP.ghost.userData.ring;ring.material.color.setHex(ok?BP_OK:BP_BAD);
  BP.ghost.visible=true;BP.ok=ok;BP.cx=c[0];BP.cz=c[1]}
function bpRefreshGhost(){if(BP.ghost){scene.remove(BP.ghost);disposeObj(BP.ghost);BP.ghost=null}bpBar()}
// ── نوار پایین: تیک/ضربدر + شمارنده + راهنما
function bpBar(){const b=$('bpb');if(!b)return;
  b.style.display=BP.on?'flex':'none';
  if(BP.on){const n=BP.items.length,cost=n?(W.cost?[...BP.items].reduce((s,i)=>s+(W.cost[i.type]||0),0):0):0;
  $('bpn').textContent='نقشهٔ ساخت: '+cpx(n)+' مورد'+(cost&&!$('fr').checked?' · '+fa(cost/1e6,1)+' میلیون تومان':'');
  $('bpok').style.opacity=n?1:.35}}
function bpStart(){if(!T)return;BP.on=true;BP.rot=0;bpBar();bpHint(1);
  $('adm').style.display='none';$('pal').style.display='flex'}
function bpEnd(){BP.on=false;bpClear();if(BP.ghost){scene.remove(BP.ghost);disposeObj(BP.ghost);BP.ghost=null}
  bpBar();bpHint(0);if(admOn)$('adm').style.display='flex'}
// ── تیک: ساخت همه (اتمیک) — sync خودش مدل‌ها را با انیمیشن پاپ می‌سازد
async function bpCommit(){const n=BP.items.length;if(!n||BP.busy)return;BP.busy=true;
  $('bpok').style.opacity=.4;
  try{await api('/api/admin/buildings/batch','POST',{items:BP.items.map(i=>({type:i.type,x:i.x,z:i.z,rot:i.rot})),free:$('fr').checked});
    toast('✅ '+cpx(n)+' ساختمان ساخته شد');bpClear()}
  catch(e){/* api خودش توست خطا می‌زند */}
  BP.busy=false;bpBar()}
// ── راهنمای بالا
function bpHint(on){const h=$('bph');if(!h)return;h.style.display=on?'block':'none'}
document.body.insertAdjacentHTML('beforeend',
 `<div id="bph" class="g">🏗️ نقشهٔ ساخت: بزن تا شبح بچیند · کشیدن = ردیف جاده/پیاده‌رو · R چرخش · 🔒 قدم‌بقدم</div>
  <div id="bpb" class="g"><span id="bpn"></span><button id="bpx" title="کنسل (Esc)">✕</button><button id="bpok" title="ساخت (Enter)">✓</button></div>`);
$('bpx').onclick=()=>{bpEnd();toast('نقشهٔ ساخت کنسل شد')};
$('bpok').onclick=bpCommit;
addEventListener('keydown',e=>{if(!BP.on)return;
  if(e.key==='Escape'){bpEnd();toast('کنسل شد')}
  else if(e.key==='Enter'){e.preventDefault();bpCommit()}
  else if(e.key==='r'||e.key==='R'){BP.rot=(BP.rot+90)%360;if(BP.ghost)bpRefreshGhost()}});
