// ═══ لمس و انتخاب روی صحنه، ساخت دکمه‌های رابط، و ابزار مدیر (جابه‌جایی، ساخت، چرخش، حذف، نام، پیام).
// پنل مدیر ← admin/panel.js ═══
'use strict';
const MODES={move:'✋ جابه‌جایی: ساختمان را بکش و رها کن',build:'🏗️ نقشهٔ ساخت: شبح را بچین، بعد ✓ بزن تا همه ساخته شوند',rot:'🔄 چرخش: روی ساختمان بزن',del:'🗑️ حذف: روی ساختمان بزن',name:'🏷️ نام مستعار: روی آدم بزن',say:'💬 پیام: روی آدم بزن'};
// ── رابط
document.body.insertAdjacentHTML('afterbegin','<div id="nts"></div>');
document.body.insertAdjacentHTML('beforeend',`<div id="adm"><div class="btn e g" data-m="move" title="جابه‌جایی">✋</div><div class="btn e g" data-m="build" title="ساخت">🏗️</div><div class="btn e g" data-m="rot" title="چرخش">🔄</div><div class="btn e g" data-m="del" title="حذف">🗑️</div><div class="btn e g" data-m="name" title="نام مستعار">🏷️</div><div class="btn e g" data-m="say" title="پیام">💬</div><div class="btn e g" id="brec" title="ضبط ویدیو (فقط تصویر سه‌بعدی)">🎥</div><div class="btn e g" id="brec2" title="استودیوی سینمایی: حرکت‌های آماده + ضبط (کامپیوتر و موبایل)">🎬</div><div class="btn e g" id="btm" title="زمان">⏱️</div></div><div id="pal" class="g"><span data-t="house" class="on">🏠</span><span data-t="hq">🏢</span><span data-t="farm">🌾</span><span data-t="market">🏪</span><span data-t="road">🛣️</span><span data-t="path" title="پیاده‌رو">🚶</span><span data-t="tree">🌲</span><label><input type="checkbox" id="fr" checked> رایگان</label></div><div id="md" class="g"><p id="mt"></p><input id="mi" maxlength="120"><div><button id="mok">تأیید</button><button id="mno">انصراف</button></div></div>`);
$('side').insertAdjacentHTML('beforeend','<div id="bn" class="btn g" title="نمایش/پنهان نام‌ها"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.9 3.1-6.2 7-6.2s7 2.3 7 6.2"/></svg></div><div id="bm" class="btn g" title="قطع صدا"></div><div id="ba" class="btn g" title="ابزار مدیر"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h9M19 7h1M4 17h1M11 17h9"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/></svg></div>');
$('tier').insertAdjacentHTML('beforeend','<span id="clk"></span>');
// ── ابزار مدیر (جابه‌جایی، ساخت، چرخش، حذف، نام، پیام)
const cur=new THREE.Mesh(new THREE.PlaneGeometry(1.9,1.9),new THREE.MeshBasicMaterial({color:0x3ddc97,transparent:true,opacity:.45,depthWrite:false}));cur.rotation.x=-Math.PI/2;cur.position.y=.12;cur.visible=false;scene.add(cur);
const ray=new THREE.Raycaster(),mp=new THREE.Vector2(),GP=new THREE.Plane(new THREE.Vector3(0,1,0),0),gp3=new THREE.Vector3();
function ask(t,v='',pw){return new Promise(res=>{const m=$('md'),i=$('mi');$('mt').textContent=t;i.type=pw?'password':'text';i.value=v;m.style.display='flex';i.focus();const done=x=>{m.style.display='none';$('mok').onclick=$('mno').onclick=i.onkeydown=null;res(x)};$('mok').onclick=()=>done(i.value.trim());$('mno').onclick=()=>done(null);i.onkeydown=e=>{if(e.key==='Enter')done(i.value.trim());if(e.key==='Escape')done(null)}})}
async function api(p,m,b,q){const r=await fetch(p,{method:m,headers:{'Content-Type':'application/json','X-Admin-Token':T},body:b?JSON.stringify(b):undefined}),j=await r.json().catch(()=>({}));if(r.status===401){T=localStorage.tk='';setAdm(0);toast('نشست مدیر تمام شد؛ دوباره وارد شو')}if(!r.ok){if(!q)toast(j.error||'خطا');throw 0}poll();return j}
function setAdm(on){admOn=on;$('adm').style.display=on?'flex':'none';if(!on){setMode('');if(BP.on)bpEnd();const p=$('ap');if(p)p.style.display='none'}}
function setMode(m){mode=mode===m?'':m;document.querySelectorAll('#adm [data-m]').forEach(b=>b.classList.toggle('on',b.dataset.m===mode));$('pal').style.display=mode==='build'?'flex':'none';cur.visible=false;
if(mode==='build'){bpStart()}else if(BP.on){bpEnd()}   // ورود/خروج مود نقشهٔ ساخت
if(m||admOn)toast(MODES[mode]||'حالت عادی')}
const ray0=e=>{mp.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);ray.setFromCamera(mp,cam)};
const cellOf=e=>{ray0(e);return ray.ray.intersectPlane(GP,gp3)?[Math.round(gp3.x/CELL),Math.round(gp3.z/CELL)]:null};
const cellOk=(x,z,id)=>x>=-20&&x<20&&z>=-20&&z<20&&((x*2+17)/8.6)**2+((z*2+17)/6)**2>=1.15&&!W.buildings.some(b=>b.x===x&&b.z===z&&b.id!==id);
function pickAt(e){ray0(e);if(mode!=='move'){const h=ray.intersectObjects(cits.map(c=>c.g),true)[0];if(h){let o=h.object;while(o&&!o.userData.cit)o=o.parent;if(o)return{c:o.userData.cit}}}
const h=ray.intersectObjects([...objs.values()],true)[0];if(h){let o=h.object;while(o&&!o.userData.b)o=o.parent;if(o)return{g:o,b:o.userData.b}}return{}}
function paintAt(e){const c=cellOf(e);if(!c)return;const k=c+'';if(painted.has(k))return;painted.add(k);bpAdd(c[0],c[1])}
// ── مود ساخت (نقشهٔ ساز): جریان لمسی = شبح زیر انگشت · درگ آیتم = جابه‌جایی · تپ کوتاه = انتخاب · تپ دوباره روی انتخاب‌شده = حذف
// انتخاب از صف: اول آیتمِ همان سلولی که اشاره‌گر روی آن است (دقیق)، وگرنه نزدیک‌ترین برخوردِ واقعی raycast
const bpPick=e=>{const c=cellOf(e);
  const byCell=c&&BP.items.find(i=>i.x===c[0]&&i.z===c[1]);
  if(byCell)return byCell;
  ray0(e);const hits=ray.intersectObjects(BP.items.filter(i=>i.g).map(i=>i.g),true);
  for(const h of hits){let o=h.object;while(o&&!o.userData.it)o=o.parent;if(o)return o.userData.it}
  return null};
const bpDown=e=>{const c=cellOf(e);if(!c)return;ctl.enabled=false;
  BP.down={c,moved:0};
  const it=bpPick(e);
  if(it){BP.dragIt=it;bpGhostType()}                               // درگ آیتم صف = جابه‌جایی دقیق
  else{BP.dragIt=null;bpFloat(c);if(BP.type==='road'||BP.type==='path')bpLine(c)}};
const bpDrag=e=>{const c=cellOf(e);if(!c)return;
  if(BP.down)BP.down.moved=Math.max(BP.down.moved,Math.hypot(e.clientX-(BP.down.x??e.clientX),e.clientY-(BP.down.y??e.clientY)));
  if(BP.dragIt){if(c[0]!==BP.dragIt.x||c[1]!==BP.dragIt.z)bpMove(BP.dragIt,c[0],c[1])}
  else{bpFloat(c);if(BP.down&&(BP.type==='road'||BP.type==='path'))bpLine(c)}};
async function onTap(e){const h=pickAt(e);
if(h.c){react(h.c);if(h.c.me&&!(T&&(mode==='name'||mode==='say'))){const v=await ask('اسم کارکتر تو (خالی = پیش‌فرض)',nameOf(MY));if(v!==null)fetch('/api/player/name',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({init:INIT,name:v})}).then(r=>r.ok?poll():r.json().then(j=>toast(j.error||'خطا'))).catch(()=>0)}else if(T&&mode==='name'){const v=await ask('نام مستعار (خالی = پیش‌فرض)',nameOf(h.c.i));if(v!==null)api('/api/admin/citizen/'+h.c.i,'PUT',{name:v}).catch(()=>0)}
else if(T&&mode==='say'){const v=await ask('پیام بالای سر «'+nameOf(h.c.i)+'»');if(v)api('/api/admin/say','POST',{cid:h.c.i,text:v}).catch(()=>0)}return}
if(h.b){h.g.userData.t=.55;
if(T&&mode==='rot')api('/api/admin/building/'+h.b.id,'PUT',{x:h.b.x,z:h.b.z,rot:(h.b.rot+90)%360}).catch(()=>0);
else if(T&&mode==='del'){if(confirm('حذف شود؟'))api('/api/admin/building/'+h.b.id,'DELETE').catch(()=>0)}
else if(!mode){if(!openHouse(h.g)){closeHouse();toast(bInfo(h.b)+(h.b.type==='house'?' · برای دیدن داخل خانه بیشتر زوم کن':''));ownerHi(h.b)}}}else if(!mode)closeHouse()}
R.domElement.addEventListener('pointerdown',e=>{dn={x:e.clientX,y:e.clientY,t:performance.now()};if(!T||!mode)return;
if(mode==='move'){const h=pickAt(e);if(h.b){drag={g:h.g,b:h.b,c:[h.b.x,h.b.z]};ctl.enabled=false;cur.visible=true;cur.position.set(h.b.x*CELL,.12,h.b.z*CELL);cur.material.color.setHex(0x3ddc97)}}
else if(mode==='build'){if(BP.down)BP.down.x=e.clientX,BP.down.y=e.clientY;bpDown(e)}},true);
addEventListener('pointermove',e=>{if(drag){const c=cellOf(e);if(c){drag.c=c;drag.g.position.set(c[0]*CELL,.35,c[1]*CELL);cur.position.set(c[0]*CELL,.12,c[1]*CELL);cur.material.color.setHex(cellOk(c[0],c[1],drag.b.id)?0x3ddc97:0xff5a4c)}}
else if(mode==='build'&&BP.down){if(BP.down){BP.down.x=e.clientX;BP.down.y=e.clientY}bpDrag(e)}});
addEventListener('pointercancel',e=>{dn=null;drag=null;ctl.enabled=true;if(BP.on){BP.down=null;BP.dragIt=null;if(BP.ghost)BP.ghost.visible=false;bpLine(null)}});
addEventListener('pointerup',async e=>{const was=dn;dn=null;
if(drag){const d=drag,b=d.b;drag=null;ctl.enabled=true;cur.visible=false;d.g.position.y=0;const[x,z]=d.c;
if((x!==b.x||z!==b.z)&&cellOk(x,z,b.id)){const ox=b.x,oz=b.z;b.x=x;b.z=z;try{await api('/api/admin/building/'+b.id,'PUT',{x,z,rot:b.rot});toast('✅ جابه‌جا و ذخیره شد')}catch(_){b.x=ox;b.z=oz;d.g.position.set(ox*CELL,0,oz*CELL)}}
else d.g.position.set(b.x*CELL,0,b.z*CELL);return}
if(mode==='build'){const d=BP.down;BP.down=null;ctl.enabled=true;
  if(d){
    if(BP.dragIt){                                        // پایان درگ آیتم صف
      const moved=d.moved>8;
      if(!moved){                                         // تپ بدون حرکت: انتخاب؛ تپ روی انتخاب‌شده = حذف
        if(BP.sel===BP.dragIt){bpRemove(BP.sel);toast('از نقشه حذف شد')}
        else{BP.sel=BP.dragIt;bpAfterChange()}}
      else if(BP.sel===BP.dragIt)bpAfterChange();          // آیتم انتخاب‌شده که درگ شد هنوز انتخابی بماند
      BP.dragIt=null}
    else{const c=cellOf(e);                               // پایان چیدن: رها کردن شبح یا پایان خطِ ردیف
      if(BP.type==='road'||BP.type==='path')bpStroke(d.c[0],d.c[1],c[0],c[1]);
      else if(c&&BP.ok!==false)bpAdd(c[0],c[1]);
      else if(d.c)bpAdd(d.c[0],d.c[1])}
    if(BP.ghost)BP.ghost.visible=false;bpLine(null)}
  return}
if(was&&Math.hypot(e.clientX-was.x,e.clientY-was.y)<8&&performance.now()-was.t<500)onTap(e)});
$('adm').insertAdjacentHTML('afterbegin','<div class="btn e g" id="bap" title="پنل ادمین">🛠️</div>');$('bap').onclick=()=>openAP();
$('adm').onclick=e=>{const m=e.target.closest('[data-m]');if(m)setMode(m.dataset.m)};
$('pal').onclick=e=>{const s=e.target.closest('[data-t]');if(s){bt=s.dataset.t;BP.type=bt;$('pal').querySelectorAll('[data-t]').forEach(x=>x.classList.toggle('on',x===s));bpGhostType();if(BP.on)toast('قلم: '+(W.catalog[bt]||bt))}};
$('bn').classList.add('dim');$('bn').onclick=()=>{namesOn=!namesOn;$('bn').classList.toggle('dim',!namesOn);toast(namesOn?'نام‌ها نمایش داده می‌شود':'نام‌ها پنهان شد')};
$('ba').onclick=async()=>{if(!T){const k=await ask('رمز مدیر (ADMIN_KEY)','',1);if(!k)return;try{const r=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:k})}),j=await r.json();if(!r.ok)return toast(j.error||'رمز اشتباه است');T=localStorage.tk=j.token}catch(_){return toast('خطا در اتصال')}}setAdm(!admOn)};
$('btm').onclick=async()=>{const e=W.env||{mode:'live'},seq=[['live',0,'🕒 زمان زنده'],['lapse',0,'⏩ گذر سریع روز'],['fixed',12,'☀️ ظهر ثابت'],['fixed',19,'🌇 غروب ثابت'],['fixed',23,'🌙 شب ثابت']],i=seq.findIndex(s=>s[0]===e.mode&&(e.mode!=='fixed'||Math.round(e.hour)===s[1])),n=seq[(i+1)%seq.length];toast(n[2]);api('/api/admin/env','POST',{mode:n[0],hour:n[1]}).catch(()=>0)};
if(!new URLSearchParams(location.search).has('admin'))$('ba').style.display='none';else if(T)setAdm(1);
