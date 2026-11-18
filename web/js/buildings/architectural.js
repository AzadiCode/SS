// ═══ جزئیات معماری تکمیلی: قاب ورودی، آستانه و نوارهای نما؛ بدون تغییر مدل/رفتار ساختمان اصلی ═══
'use strict';
const _addBBase=addB;
const _trimMat=new THREE.MeshStandardMaterial({color:0x6b4a2b,roughness:.82});
const _stoneMat=new THREE.MeshStandardMaterial({color:0xaaa18e,roughness:.96});
function _detailBox(g,w,h,d,mat,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m}
addB=function(b){_addBBase(b);const g=objs.get(b.id);if(!g)return;
// Detail geometry uses the same local scale as the existing model and follows its build-in pop animation.
if(b.type==='house'){
  // subtle entry frame and doorstep at the front (positive Z), kept clear of the windows
  _detailBox(g,.045,.54,.055,_trimMat,-.185,.27,.565);
  _detailBox(g,.045,.54,.055,_trimMat,.185,.27,.565);
  _detailBox(g,.42,.045,.065,_trimMat,0,.555,.565);
  _detailBox(g,.38,.035,.18,_stoneMat,0,.025,.59);
  // thin window sills below the existing front windows
  for(const x of[-.4,.4])_detailBox(g,.34,.035,.085,_stoneMat,x,.205,.585);
  // fascia line gives the roof a cleaner voxel edge without replacing its geometry
  _detailBox(g,1.26,.045,.055,_trimMat,0,.96,.49);
}
else if(b.type==='market'){
  // sturdier counter plinth and compact corner trim, matching the existing market footprint
  _detailBox(g,1.92,.035,.065,_stoneMat,0,.025,.69);
  for(const x of[-.98,.98])_detailBox(g,.045,.46,.045,_trimMat,x,.08,.34);
}
};
