// ═══ دریافت وضعیت دنیا از سرور (poll هر ۳ ثانیه) و اعمالش روی صحنه: ساختمان‌ها، آمار، مرحله، هدف، شهروندان. ═══
// Engine 2.0: اعمالِ ساختمان‌های تازه با «زمان‌بندِ بودجه‌ای TWE» انجام می‌شود (نقشهٔ ساختِ دسته‌ایِ بزرگ
// تکه‌تکه و در چند فریم ⇒ صفر فریز)، رویدادهای دقیق دنیا از TWE.events عبور می‌کنند و
// زمانِ بازسازی ناوبری/جاده اندازه‌گیری و گزارش می‌شود (داشبورد ?perf=1 / Q.snapshot()).
'use strict';
let bSig='',firstSync=true;
// سرور با هر tick اقتصادی rev را بالا می‌برد حتی وقتی ساختمانی عوض نشده؛ ناوبری (A*) و جاده‌ها فقط وقتی ساختمان‌ها یا جمعیت واقعاً عوض شدند بازسازی می‌شوند
function sync(w){W=w;rev=w.rev;const ids=new Set(w.buildings.map(b=>b.id));
let removed=0;
for(const[id,g]of objs)if(!ids.has(id)){scene.remove(g);disposeObj(g);objs.delete(id);removed++}
// ── اعمالِ ساختمان‌های تازه: کوچک = فوری (مثل قبل)؛ بزرگ (نقشهٔ ساخت دسته‌ای) = تکه‌تکه با بودجهٔ ۶ms در فریم،
// نزدیک‌ترین به دوربین اول؛ پس از اتمام، ماسک جاده/پیاده‌روها یک‌بار کامل بازسازی می‌شود.
const adds=w.buildings.filter(b=>!objs.has(b.id));
if(adds.length>12){
 const tg=ctl.target,items=adds.map(b=>{const wx=b.x*U,wz=b.z*U;return{b,d2:(wx-tg.x)*(wx-tg.x)+(wz-tg.z)*(wz-tg.z)}}).sort((a,c)=>a.d2-c.d2);
 TWE.Sched.slice('sync-build',items,it=>{const cur=W&&W.buildings.find(x=>x.id===it.b.id);
  if(cur&&!objs.has(cur.id)){addB(cur,bpDelay(cur.id));return 1}return 0},
  {budget:6,done:n=>{if(W)roads(W);TWE.emit('buildings:changed',{added:n,removed:removed});TWE.Mem.checkpoint('batch-build')}});
}else{
 for(const b of adds)addB(b,bpDelay(b.id));
 if(adds.length||removed){TWE.emit('buildings:changed',{added:adds.length,removed:removed});if(adds.length>4)TWE.Mem.checkpoint('sync-build')}}
// تغییر ظاهریِ رکوردهای موجود (متن بنر / جابه‌جایی / چرخش) — همان قواعد قبلی
for(const b of w.buildings){const g=objs.get(b.id);if(!g)continue;
 if(b.type==='banner'&&g.userData.b.bn!==b.bn){scene.remove(g);disposeObj(g);objs.delete(b.id);addB(b,0)}   // متن بنر عوض شد ← مش با بافت تازه
 else if(g.userData.b.x!==b.x||g.userData.b.z!==b.z||g.userData.b.rot!==b.rot){g.position.set(b.x*U,fpBaseY(b.type,b.x,b.z,b.rot),b.z*U);if(b.type!=='road'&&b.type!=='path')g.rotation.y=b.rot*Math.PI/180;g.userData.b=b}}   // هم‌ترازی با زمینِ واقعی (کنار رود) مثل addB
plan.visible=!w.buildings.some(b=>b.type==='hq');
// امضای ناوبری باید وضعیت چراغ راهنمایی (tl) و متن بنر (bn) را هم بگیرد وگرنه تغییر آن‌ها rebuildNav/roads را
// زود می‌زند و چراغ‌های تازه اعمال‌شده تا رفرش کامل رسم نمی‌شوند (باگ گزارش‌شده).
{const sig=w.buildings.length+'|'+((w.stats&&w.stats.pop)||0)+'|'+w.buildings.map(b=>b.id+b.type+b.x+','+b.z+','+b.rot+(b.tl?'T':'')+(b.bn||'')).join(';');if(sig!==bSig){bSig=sig;const t0=performance.now();rebuildNav(w);roads(w);TWE.emit('nav:rebuilt',{ms:performance.now()-t0,buildings:w.buildings.length})}}
const s=w.stats;tgt.pop=s.pop;tgt.money=s.money/1e6;tgt.food=s.food;
const ti=w.tiers.indexOf(w.tier);$('tn').textContent=w.tier;$('path').innerHTML=w.tiers.map((t,i)=>`<i class="${i<ti?'past':i===ti?'on':''}"></i>`).join('<u></u>');
const g=w.goals.find(g=>s.subs<g.at),pend=w.goals.find(g=>s.subs>=g.at&&!g.value);
$('quest').innerHTML=`<div class="fl">${IC.flag}</div><div class="tx">${pend?`<strong>${pend.title}</strong><small>رأی‌گیری در جریان است</small>`:g?`<div class="qh"><strong>${fa(g.at)} نفر ← ${g.title}</strong><small>${fa(s.subs)} از ${fa(g.at)}</small></div><div id="bar"><u style="width:${Math.min(100,s.subs/g.at*100)}%"></u></div>`:'<strong>همه هدف‌ها انجام شد</strong>'}</div>`;
$('ev').innerHTML=w.events.map(e=>`<div><time>${new Date(e.t).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'})}</time>${noEm(e.text).replace(/</g,'&lt;')}</div>`).join('');
if(seenEv&&w.events[0]&&w.events[0].t+w.events[0].text!==seenEv){toast(noEm(w.events[0].text));dgEvent(noEm(w.events[0].text))}seenEv=w.events[0]?w.events[0].t+w.events[0].text:'';
POP=s.pop;fitCits();names();chatSync(w);
if(firstSync){firstSync=false;TWE.Mem.checkpoint('first-sync')}
if(typeof wxSync==='function')wxSync(w.weather)}   // وضعیت آب‌وهوا از سرور ← گذار نرم در 06-world-weather.js
function fitCits(){const n=Math.max(POP?1:0,Math.min(POP,VIS,HARD));let ch=0;while(cits.length<n){cits.push(mkCit(cits.length));ch=1}while(cits.length>n){const c=cits.pop();scene.remove(c.g);disposeObj(c.g);if(c._el)c._el.remove();ch=1}applyMe();if(ch)names()}
function applyMe(){for(const c of cits)if(c.me){c.me=0;c.i=cits.indexOf(c);if(c._el)c._el.classList.remove('me')}
if(MY<1||cits.length<2){if(meRing&&meRing.parent)meRing.parent.remove(meRing);return}
const c=MY<cits.length?cits[MY]:cits[cits.length-1];c.me=1;c.i=MY;c.el.classList.add('me');c.nb.textContent=nameOf(MY);
if(!meRing){meRing=new THREE.Mesh(new THREE.RingGeometry(.4,.53,28),new THREE.MeshBasicMaterial({color:0x3ddc97,transparent:true,opacity:.8,depthWrite:false,side:THREE.DoubleSide}));meRing.rotation.x=-Math.PI/2;meRing.position.y=.03}
c.g.add(meRing)}
async function poll(){try{const w=await(await fetch('/api/world?since='+rev,{cache:'no-store'})).json();if(!w.same)sync(w);$('dot').className=''}catch(e){$('dot').className='off'}}
