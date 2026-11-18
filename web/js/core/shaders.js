// ═══ شیدر GPU (ادغام‌شده از سبک ووکسل): تکان خوردن گیاهان در باد روی GPU.
// این فایل قبل از scenery.js بارگذاری می‌شود تا متریال درخت‌ها بتوانند از آن استفاده کنند. ═══
'use strict';
// زمان باد — هر فریم به‌روز می‌شود (در environment.js envStep). روی همهٔ متریال‌های گیاهی به‌طور یکپارچه اثر می‌کند.
const VT={value:0};

// ── تکان دادن گیاهان (درخت) در باد روی GPU ──
// فقط روی InstancedMesh کار می‌کند (فاز نوسان از موقعیت هر نمونه می‌آید).
// amp: دامنهٔ نوسان افقی — برگ‌ها .۰۹ و تنه .۰۴ (ملایم؛ ظاهر پایه دست نمی‌خورد).
// نکته: فقط کد جابه‌جایی به شیدر اضافه می‌شود؛ هیچ تغییری در رنگ/متریال داده نمی‌شود.
function vegSway(mat,amp=.07){
  mat.onBeforeCompile=sh=>{
    sh.uniforms.uT=VT;
    sh.vertexShader='uniform float uT;\n'+sh.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat ph=instanceMatrix[3].x*.9+instanceMatrix[3].z*.7;\nfloat yy=max(position.y,0.);\ntransformed.x+=sin(uT*1.7+ph)*'+amp.toFixed(3)+'*yy;\ntransformed.z+=cos(uT*1.3+ph)*'+(amp*.7).toFixed(3)+'*yy;\n#endif'
    );
  };
  return mat;
}
