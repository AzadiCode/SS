// Tribe World boot: ایزومتریک آزمایشیِ مستقل و مسیر سه‌بعدی اصلی
// برای پیش‌نمایش نسل ایزومتریک: ?iso=1
if (new URLSearchParams(location.search).get('iso') === '1') {
  import('./13-iso-preview.js').then(m => m.startIsoPreview()).catch(err => {
    console.error('[TribeWorld Isometric]', err);
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#101923;color:#fff;display:grid;place-items:center;padding:24px;font:16px sans-serif;text-align:center;direction:rtl';
    el.textContent = 'اجرای پیش‌نمایش ایزومتریک ناموفق بود: ' + (err?.message || err);
    document.body.appendChild(el);
  });
} else {
  // مسیر اصلی سه‌بعدی فعلی؛ تا زمان تکمیل مهاجرت بدون تغییر باقی می‌ماند.
  const THREE_MOD = await import('three');
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
  Object.assign(globalThis, { THREE: THREE_MOD, OrbitControls, mergeGeometries });

  const GAME_FILES = [
    '05-core-quality','05-core-engine','05-core-state','05-core-materials',
    '06-world-scenery','07-buildings-models','07-buildings-footprint',
    '08-characters-dialogue','06-world-roads','06-world-environment','06-world-weather',
    '08-characters-nametags','09-ui-blueprint','09-ui-interaction','10-admin-panel',
    '11-features-recorder','08-characters-navigation','08-characters-models',
    '08-characters-behavior','06-world-cars','09-ui-hud','07-buildings-houseview',
    '12-net-sync','12-net-telegram','11-features-music','05-core-perf','05-core-main'
  ];
  try {
    const sources = await Promise.all(GAME_FILES.map(async name => {
      const r = await fetch('/' + name + '.js', { cache: 'no-store' });
      if (!r.ok) throw new Error('فایل بارگذاری نشد: ' + name + ' (' + r.status + ')');
      return await r.text();
    }));
    for (let i = 0; i < GAME_FILES.length; i++) {
      const s = document.createElement('script');
      s.textContent = sources[i] + '\\n//# sourceURL=/' + GAME_FILES[i] + '.js';
      s.onerror = () => console.error('[TribeWorld script execution]', GAME_FILES[i]);
      document.head.appendChild(s);
    }
  } catch (e) {
    console.error('[TribeWorld boot]', e);
    const m = document.getElementById('ldm');
    if (m) { m.textContent = 'خطا در بارگذاری: ' + e.message; m.className = 'on'; }
    throw e;
  }
}
