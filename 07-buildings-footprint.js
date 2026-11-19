// ═══ ردپای یکپارچهٔ خرده‌سلولی: اشغال، برخورد، snap و اتصال ورودی‌ها ═══
'use strict';
const GRID=8,U=CELL/GRID;
const PATH_WIDTH_RATIO=1/4;
const FOOT={house:[6,6],hq:[8,8],farm:[8,8],market:[8,6],tree:[2,2],road:[8,8]};
const PATH_CELLS=Math.max(1,Math.round(FOOT.road[0]*PATH_WIDTH_RATIO));FOOT.path=[PATH_CELLS,PATH_CELLS];const ROAD_PATH_STEP=Math.round((FOOT.road[0]+FOOT.path[0])/2);
const FP_LO=-20*GRID,FP_HI=20*GRID-1,FP_D4=[[1,0],[-1,0],[0,1],[0,-1]],FP_EMPTY=new Set();
const fpGrid=t=>t==='road'||t==='path',fpDi=(dx,dz)=>dz<0?0:dx>0?1:dz>0?2:3;
let fpHit=null;
const fpPondW=(X,Z)=>((X+17)/8.6)**2+((Z+17)/6)**2<1.15;
const range=(a,b)=>Array.from({length:Math.max(0,b-a)},(_,i)=>a+i);
const fpTiles=l=>{const s=new Set();for(const b of l)if(b.type==='path')s.add((b.gx??b.x)+','+(b.gz??b.z));return s};
const fpDims=(t,rot=0)=>{const f=FOOT[t]||FOOT.tree;return !fpGrid(t)&&rot%180?[f[1],f[0]]:f};
function fpCoreCells(b){const gx=b.gx??b.x,gz=b.gz??b.z,[w,h]=fpDims(b.type,b.rot||0),x0=gx-Math.floor(w/2),z0=gz-Math.floor(h/2),s=new Set();
 for(let x=x0;x<x0+w;x++)for(let z=z0;z<z0+h;z++)s.add(x+','+z);return s}
function fpCellParts(b,tiles){const core=fpCoreCells(b);if(b.type!=='path'||!tiles)return[core];
 const gx=b.gx??b.x,gz=b.gz??b.z,out=[core];
 for(const[dx,dz]of FP_D4)if(tiles.has((gx+dx*GRID)+','+(gz+dz*GRID))){const arm=new Set();
  const[w,h]=FOOT.path;
  if(dx){const xs=dx>0?range(gx+w-Math.floor(w/2),gx+GRID-Math.floor(w/2)):range(gx-GRID+w-Math.floor(w/2),gx-Math.floor(w/2));
   for(let x of xs)for(let z=gz-Math.floor(h/2);z<gz-Math.floor(h/2)+h;z++)arm.add(x+','+z)}
  else{const zs=dz>0?range(gz+h-Math.floor(h/2),gz+GRID-Math.floor(h/2)):range(gz-GRID+h-Math.floor(h/2),gz-Math.floor(h/2));
   for(let x=gx-Math.floor(w/2);x<gx-Math.floor(w/2)+w;x++)for(let z of zs)arm.add(x+','+z)}
  out.push(arm)}return out}
const fpPartsRect=parts=>parts.map(set=>{let xs=[],zs=[];for(const k of set){const[x,z]=k.split(',').map(Number);xs.push(x);zs.push(z)}
 return[Math.min(...xs)*U,(Math.max(...xs)+1)*U,Math.min(...zs)*U,(Math.max(...zs)+1)*U]});
function fpRects(b,TL){return fpPartsRect(fpCellParts(b,TL))}
const fpDim=(t,rot)=>fpDims(t,rot).map(v=>v*U);
const fpHitCells=(a,b)=>{for(const c of a)if(b.has(c))return true;return false};
function fpCheck(type,x,z,rot,others){fpHit=null;x=Math.round(x);z=Math.round(z);rot=fpGrid(type)?0:(Math.round((rot||0)/90)*90)%360;
 const b={type,x,z,gx:x,gz:z,rot},tiles=fpTiles(others);if(type==='path')tiles.add(x+','+z);
 const parts=fpCellParts(b,tiles),cells=new Set(parts.flatMap(p=>[...p]));
 for(const k of cells){const[cx,cz]=k.split(',').map(Number);if(cx<FP_LO||cx>FP_HI||cz<FP_LO||cz>FP_HI)return'خارج از نقشه';if(fpPondW((cx+.5)*U,(cz+.5)*U))return'برکه'}
 const occ=new Map();for(const o of others){const parts=fpCellParts(o,fpTiles(others)),use=type==='path'&&o.type==='path'?[parts[0]]:parts;for(const p of use)for(const k of p)if(!occ.has(k))occ.set(k,o)}
 for(const k of cells)if(occ.has(k)){fpHit=occ.get(k);return'برخورد'}
 if(type==='path'){for(const o of others.filter(o=>o.type==='path')){const old=new Set(fpCellParts(o,fpTiles(others)).flatMap(p=>[...p])),next=new Set(fpCellParts(o,tiles).flatMap(p=>[...p]));
   for(const k of next)if(!old.has(k)&&occ.has(k)){fpHit=occ.get(k);return'برخورد'}}}
 return true}
function fpSnap(type,rot,wx,wz,others){const gx0=Math.round(wx/U),gz0=Math.round(wz/U);
 for(let r=0;r<=24;r++){const cand=[];for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++)if(Math.max(Math.abs(dx),Math.abs(dz))===r)cand.push([gx0+dx,gz0+dz]);
  cand.sort((a,b)=>(a[0]-gx0)**2+(a[1]-gz0)**2-((b[0]-gx0)**2+(b[1]-gz0)**2));
  for(const[gx,gz]of cand)if(fpCheck(type,gx,gz,rot,others)===true)return[gx,gz]}
 return[gx0,gz0]}
function fpDoorLinks(blds){const out=[];for(const b of blds){if(!['house','hq','farm','market'].includes(b.type))continue;
 const gx=b.gx??b.x,gz=b.gz??b.z,[w,h]=fpDims(b.type,b.rot||0),a=(b.rot||0)*Math.PI/180;
 const dirs=(b.type==='house'||b.type==='hq')?[[Math.round(Math.sin(a)),Math.round(Math.cos(a))]]:[[0,-1],[1,0],[0,1],[-1,0]];
 for(const[nx,nz]of dirs){if(!nx&&!nz)continue;const side=nx?w:h,span=nx?h:w;
  const edgeX=gx+nx*(side/2),edgeZ=gz+nz*(side/2);
  const pw=FOOT.path[0]/2,cx=Math.round(edgeX+nx*pw),cz=Math.round(edgeZ+nz*pw);
  out.push({cx,cz,d:fpDi(-nx,-nz),len:U*.5})}}
 return out}
