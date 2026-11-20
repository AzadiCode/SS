// Tribe World — Isometric client, Phase 2
// Renderer and interaction layer are isolated from the legacy Three.js game.
export async function startIsoPreview() {
  const PIXI = await import('https://cdn.jsdelivr.net/npm/pixi.js@8.6.6/dist/pixi.min.mjs');
  const app = new PIXI.Application();
  await app.init({ resizeTo: window, background: '#17251f', antialias: true,
    autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2), powerPreference: 'high-performance' });

  document.body.innerHTML = '';
  document.body.style.cssText = 'margin:0;overflow:hidden;background:#17251f;touch-action:none;font-family:Arial,sans-serif';
  const canvas = app.canvas;
  canvas.style.cssText = 'display:block;width:100vw;height:100dvh;touch-action:none';
  document.body.appendChild(canvas);

  const ui = document.createElement('div');
  ui.dir = 'rtl';
  ui.style.cssText = `position:fixed;z-index:5;top:12px;right:12px;left:12px;display:flex;gap:7px;align-items:center;flex-wrap:wrap;pointer-events:none;color:#f4ead5`;
  ui.innerHTML = `
    <div style="pointer-events:auto;background:#14251feF;border:1px solid #91a77b55;border-radius:12px;padding:9px 12px;font-weight:800;letter-spacing:.5px">TRIBE WORLD <span style="color:#a9c88b">ISO</span></div>
    <div id="iso-tools" style="pointer-events:auto;display:flex;gap:6px;flex-wrap:wrap;background:#14251feF;border:1px solid #91a77b55;border-radius:12px;padding:7px"></div>
    <div id="iso-info" style="pointer-events:auto;background:#14251feF;border:1px solid #91a77b55;border-radius:12px;padding:9px 12px;font-size:12px">در حال اتصال…</div>`;
  document.body.appendChild(ui);
  const tools = ui.querySelector('#iso-tools'), info = ui.querySelector('#iso-info');
  const button = (label, action, active=false) => {
    const b=document.createElement('button'); b.textContent=label;
    b.style.cssText=`border:1px solid ${active?'#b6d28b':'#60745b'};background:${active?'#536d42':'#24392d'};color:#fff;border-radius:8px;padding:8px 11px;font-size:12px;font-weight:700`;
    b.onclick=action; tools.appendChild(b); return b;
  };

  const world = new PIXI.Container(), terrain = new PIXI.Container(), river = new PIXI.Graphics();
  const structures = new PIXI.Container(), overlay = new PIXI.Container();
  world.addChild(terrain,river,structures,overlay); app.stage.addChild(world);
  const TILE_W=34,TILE_H=17,RANGE=150,STEP=3,GRID=8;
  const iso=(x,z)=>({x:(x-z)*TILE_W/2,y:(x+z)*TILE_H/2});
  const unIso=(x,y)=>{const a=x/(TILE_W/2),b=y/(TILE_H/2);return{x:(a+b)/2,z:(b-a)/2}};
  const diamond=(g,x,y,w,h,color,alpha=1)=>g.moveTo(x,y-h/2).lineTo(x+w/2,y).lineTo(x,y+h/2).lineTo(x-w/2,y).closePath().fill({color,alpha});
  const colors={house:0xe8d3a5,farm:0x9b7548,market:0xd7a34c,hq:0xe7c56c,tree:0x315e3e,road:0x77766f,path:0xc2b18e,crossing:0xf0e8d2,banner:0xb64e42};
  const ground=new PIXI.Graphics();
  for(let z=-RANGE;z<RANGE;z+=STEP)for(let x=-RANGE;x<RANGE;x+=STEP){const p=iso(x+STEP/2,z+STEP/2);diamond(ground,p.x,p.y,TILE_W*STEP,TILE_H*STEP,((Math.floor(x/3)*13+Math.floor(z/3)*7)&3)===0?0x709b60:0x668e58)}
  terrain.addChild(ground);
  const riverPts=[[-146,22],[-96,22],[-96,6],[-40,6],[-40,24],[16,24],[16,4],[72,4],[72,18],[146,18]].map(([x,z])=>iso(x,z));
  for(const [color,width] of [[0x9b8d65,15],[0x398fa4,10]]){river.moveTo(riverPts[0].x,riverPts[0].y);for(const p of riverPts.slice(1))river.lineTo(p.x,p.y);river.stroke({color,width,cap:'round',join:'round'})}

  let current=null,rev=-1,loading=false,stopped=false,adminToken='',selected=null,buildType=null,mode='select',rotation=0;
  const toast=new PIXI.Text({text:'',style:{fontFamily:'Arial',fontSize:13,fill:0xffffff,stroke:{color:0x14251f,width:4}}});toast.anchor.set(.5);app.stage.addChild(toast);
  const title=new PIXI.Text({text:'TRIBE WORLD · ISOMETRIC',style:{fontFamily:'Arial',fontSize:13,fontWeight:'bold',fill:0xf2e9d0}});title.x=16;title.y=window.innerHeight-35;app.stage.addChild(title);
  let toastTimer;
  function showToast(t){toast.text=t;toast.alpha=1;toast.x=window.innerWidth/2;toast.y=window.innerHeight-68;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.alpha=0,2100)}
  function makeBuilding(b){
    const c=new PIXI.Container(),type=b.type||'house',gx=Number(b.gx??b.x??0)/GRID,gz=Number(b.gz??b.z??0)/GRID,p=iso(gx,gz);c.x=p.x;c.y=p.y;c.rotation=((Number(b.rot)||0)*Math.PI/180);
    const shadow=new PIXI.Graphics();shadow.ellipse(0,5,13,5).fill({color:0x14241b,alpha:.3});c.addChild(shadow);
    const g=new PIXI.Graphics(),col=colors[type]??0xd0c5a8;
    if(type==='tree'){g.moveTo(0,-2).lineTo(-8,-16).lineTo(-5,-25).lineTo(2,-30).lineTo(10,-19).lineTo(8,-8).closePath().fill({color:0x244b32});g.circle(-3,-20,8).fill({color:0x477d48});g.circle(5,-22,7).fill({color:0x5c914d});g.rect(-1,-7,3,9).fill({color:0x705039})}
    else if(type==='road'||type==='path'||type==='crossing')diamond(g,0,0,TILE_W*.92,TILE_H*.92,col);
    else{const w=type==='hq'?14:11,h=type==='hq'?20:14;g.moveTo(-w,0).lineTo(0,-h/2).lineTo(w,0).lineTo(0,h/2).closePath().fill({color:col});g.moveTo(-w,-1).lineTo(-w,-h*.72).lineTo(0,-h*1.25).lineTo(w,-h*.72).lineTo(w,-1).lineTo(0,h*.22).closePath().fill({color:type==='farm'?0x8d4939:0x9a5941});g.moveTo(0,-h*1.25).lineTo(0,h*.22).lineTo(w,-1).lineTo(w,-h*.72).closePath().fill({color:type==='farm'?0x743b35:0x75443a});g.rect(-3,-h*.65,6,7).fill({color:0x8dc0c4})}
    c.addChild(g);const name=new PIXI.Text({text:String(b.id??''),style:{fontSize:8,fill:0xffffff,stroke:{color:0x243326,width:2}}});name.anchor.set(.5);name.y=type==='tree'?-34:-20;c.addChild(name);return{container:c,depth:p.y+16,id:b.id};
  }
  function renderBuildings(list){structures.removeChildren();const items=(list||[]).map(makeBuilding).sort((a,b)=>a.depth-b.depth);for(const it of items){structures.addChild(it.container);if(selected!=null&&it.id===selected){const ring=new PIXI.Graphics();ring.ellipse(0,2,18,8).stroke({color:0xffe28a,width:2});it.container.addChild(ring)}}}
  function updateInfo(){const b=(current?.buildings||[]).find(x=>x.id===selected);info.text=`${current?.buildings?.length||0} سازه · ${mode==='build'?'ساخت '+(current?.catalog?.[buildType]||buildType):mode==='move'?'انتقال سازه':b?'انتخاب: '+(current?.catalog?.[b.type]||b.type)+' #'+b.id:'حالت انتخاب'}`}
  async function api(url,method='GET',body=null){const headers={'Content-Type':'application/json'};if(adminToken)headers['X-Admin-Token']=adminToken;const r=await fetch(url,{method,headers,body:body?JSON.stringify(body):undefined});let j={};try{j=await r.json()}catch{}if(!r.ok)throw new Error(j.error||`خطای ${r.status}`);return j}
  async function login(){const key=prompt('رمز مدیر بازی را وارد کن:');if(!key)return false;try{const j=await api('/api/admin/login','POST',{key});adminToken=j.token;showToast('ورود مدیر موفق بود');return true}catch(e){showToast(e.message);return false}}
  async function requireAdmin(){if(adminToken)return true;return login()}
  function rebuildTools(){tools.innerHTML='';button('انتخاب',()=>{mode='select';buildType=null;updateInfo()});button('ساخت +',async()=>{if(!await requireAdmin())return;mode='build';const entries=Object.entries(current?.catalog||{});if(!entries.length)return showToast('فهرست سازه‌ها دریافت نشد');const choice=prompt('نوع سازه را وارد کن:\n'+entries.map(([k,v])=>`${k} = ${v}`).join('\n'),buildType||'house');if(!choice)return;buildType=choice.trim();if(!current.catalog[buildType])return showToast('نوع سازه نامعتبر است');rotation=0;updateInfo();showToast('روی زمین بزن تا سازه ساخته شود')});button('جابجایی',async()=>{if(!await requireAdmin())return;if(selected==null)return showToast('اول یک سازه را انتخاب کن');mode='move';updateInfo();showToast('مقصد جدید را روی زمین انتخاب کن')});button('چرخش ۹۰°',async()=>{if(!await requireAdmin())return;const b=current?.buildings?.find(x=>x.id===selected);if(!b)return showToast('اول یک سازه را انتخاب کن');try{await api('/api/admin/building/'+b.id,'PUT',{x:b.x,z:b.z,rot:((b.rot||0)+90)%360});await sync(true);showToast('سازه چرخید')}catch(e){showToast(e.message)}});button('حذف',async()=>{if(!await requireAdmin())return;if(selected==null)return showToast('اول یک سازه را انتخاب کن');if(!confirm('این سازه حذف شود؟'))return;try{await api('/api/admin/building/'+selected,'DELETE');selected=null;await sync(true);showToast('سازه حذف شد')}catch(e){showToast(e.message)}});button('خروج از ساخت',()=>{mode='select';buildType=null;updateInfo()});}
  async function sync(force=false){if(loading||stopped)return;loading=true;try{const r=await fetch('/api/world'+(!force&&rev>=0?'?since='+rev:''),{cache:'no-store'});if(!r.ok)throw new Error('HTTP '+r.status);const d=await r.json();if(!d.same&&(force||d.rev!==rev)){current=d;rev=d.rev;renderBuildings(d.buildings||[]);rebuildTools();updateInfo();}}catch(e){info.textContent='خطای ارتباط: '+e.message}finally{loading=false}}
  await sync();const poll=setInterval(sync,3000);

  function screenToWorld(clientX,clientY){const local={x:(clientX-world.x)/world.scale.x,y:(clientY-world.y)/world.scale.y};return unIso(local.x,local.y)}
  function nearestBuilding(p){let best=null,dist=Infinity;for(const b of current?.buildings||[]){const q=iso(Number(b.gx??b.x??0)/GRID,Number(b.gz??b.z??0)/GRID);const d=Math.hypot(q.x-p.x,q.y-p.y);if(d<dist){dist=d;best=b}}return dist<24?best:null}
  async function worldTap(clientX,clientY){const w=screenToWorld(clientX,clientY),gx=Math.round(w.x*GRID),gz=Math.round(w.z*GRID);if(mode==='build'){if(!await requireAdmin())return;try{await api('/api/admin/building','POST',{type:buildType,x:gx,z:gz,rot:rotation});await sync(true);showToast('سازه با موفقیت ساخته شد')}catch(e){showToast(e.message)}return}if(mode==='move'){const b=current?.buildings?.find(x=>x.id===selected);if(!b)return;try{await api('/api/admin/building/'+b.id,'PUT',{x:gx,z:gz,rot:b.rot||0});mode='select';await sync(true);showToast('موقعیت سازه تغییر کرد')}catch(e){showToast(e.message)}return}const p=iso(w.x,w.z),b=nearestBuilding(p);selected=b?.id??null;renderBuildings(current?.buildings||[]);updateInfo();if(b)showToast(`${current?.catalog?.[b.type]||b.type} · #${b.id}`)}

  // Drag pans the map; a short tap interacts. Wheel zoom is anchored to the cursor.
  let pointer=null,moved=false;
  canvas.addEventListener('pointerdown',e=>{pointer={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY};moved=false;canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.lastX,dy=e.clientY-pointer.lastY;if(Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>5)moved=true;if(moved){world.x+=dx;world.y+=dy}pointer.lastX=e.clientX;pointer.lastY=e.clientY});
  canvas.addEventListener('pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;if(!moved)worldTap(e.clientX,e.clientY);pointer=null});canvas.addEventListener('pointercancel',()=>pointer=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();const before=screenToWorld(e.clientX,e.clientY),factor=e.deltaY<0?1.12:.89,next=Math.max(.38,Math.min(2.8,world.scale.x*factor));world.scale.set(next);const after=iso(before.x,before.z);world.x=e.clientX-after.x*next;world.y=e.clientY-after.y*next},{passive:false});
  let pinch=null;
  const resize=()=>{world.x=window.innerWidth/2;world.y=window.innerHeight*.47;toast.x=window.innerWidth/2;toast.y=window.innerHeight-68;title.y=window.innerHeight-35};resize();window.addEventListener('resize',resize);
  window.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='r'&&mode==='build'){rotation=(rotation+90)%360;showToast('چرخش: '+rotation+'°')}if(e.key==='Escape'){mode='select';buildType=null;updateInfo()}});
  window.addEventListener('pagehide',()=>{stopped=true;clearInterval(poll);clearTimeout(toastTimer);app.destroy(true,{children:true})},{once:true});
  showToast('نقشه ایزومتریک آماده است · برای حرکت بکش، برای بزرگ‌نمایی زوم کن');
}
