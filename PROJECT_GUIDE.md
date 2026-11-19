# PROJECT_GUIDE — Tribe World (جهان زنده قبیله)
> این فایل «مغز پروژه» است. Claude: اول همین را بخوان، بعد **فقط** فایل‌های مربوط را باز کن.

## ۰) قوانین کار برای Claude (اجباری)
1. فایل‌های مرتبط را از جدول بخش ۴ و ۵ پیدا کن؛ بقیهٔ پروژه را باز نکن. اگر مطمئن نیستی، `grep` بزن، نه خواندن کل فایل.
2. تغییرات را مستقیم در فایل‌ها اعمال کن و فقط فایل‌های تغییرکرده را تحویل بده (یا diff). کل پروژه را دوباره نفرست. **ساختار تخت را حفظ کن:** همهٔ فایل‌ها در یک پوشه، با اسم `شماره-دسته-نام.پسوند` (بخش ۲)؛ زیرپوشه نساز.
3. **بعد از هر تغییر، حتی ریز، همین فایل را به‌روز کن:** (الف) خط جدید در «تاریخچه» بخش ۱۱ (ب) اگر فایل/تابع/API/کلید جدید ساخته شد یا مسئولیت فایلی عوض شد، جدول مربوط را اصلاح کن. فایل به‌روزشده را همراه خروجی بده.
4. اگر چیزی در این راهنما با کد نمی‌خواند، کد را مبنا بگیر و راهنما را اصلاح کن.
5. رعایت بخش ۶ (محیط مشترک و ترتیب بارگذاری) و بخش ۹ (بودجهٔ عملکرد) الزامی است.
6. جواب‌ها کوتاه: بگو چه فایل‌هایی عوض شد و چه کاری کردی؛ توضیح اضافه نده.

## ۱) خلاصهٔ پروژه
بازی/شبیه‌ساز زندهٔ سه‌بعدی «قبیله» برای محتوای ویدیویی و مینی‌اپ تلگرام. بینندگان با فالو، جمعیت و خزانه می‌سازند؛ مدیر (با `?admin=1`) ساختمان می‌چیند، رویداد و پیام می‌دهد. شهروندان خودکار راه می‌روند، حرف می‌زنند و کار می‌کنند. زبان رابط: فارسی، راست‌به‌چپ (فونت Vazirmatn).
- **بک‌اند:** Python Flask، هر بخش یک Blueprint (فایل‌های `01-server-*.py`). ذخیره: MongoDB یا حافظهٔ موقت (بدون `MONGO_URI`).
- **فرانت:** three.js (importmap)، بدون باندلر؛ اسکریپت‌های معمولی با محیط مشترک، بارگذاری از `04-js-boot.js`. **ساختار فایل‌ها تخت است** (بخش ۲).
- **ارتباط:** فرانت هر ۳ ثانیه `GET /api/world?since=rev` را poll می‌کند؛ هر تغییر سرور `rev+1`.
- **اجرا:** `pip install -r requirements.txt` ← `python app.py`. **دیپلوی:** Render (`render.yaml`, `gunicorn app:app`, ۱ worker + ۸ thread). env: `ADMIN_KEY`, `MONGO_URI`, `BOT_TOKEN`, `SECRET_KEY`, اختیاری: `PUBLIC_URL`, `DAY_SECONDS`, `TZ_NAME`.

## ۲) ساختار تخت (همه‌چیز در یک پوشه)
زیرپوشه نداریم. اسم هر فایل = **`شماره-دسته-نام.پسوند`**؛ «دسته» همان اسم پوشهٔ قدیمی است و شماره‌اش ترتیب دسته‌هاست (عدد فقط برای مرتب‌شدن فهرست است، ربطی به ترتیب بارگذاری ندارد).
```
ریشه (اسم ثابت)   app.py  render.yaml  requirements.txt  README.md  PROJECT_GUIDE.md
01-server-*.py     بک‌اند: init config db world auth public telegram players admin
02-web-index.html  صفحه + HUD/DOM ثابت (ids: hud res tier path toast quest cap ct side bs be ev…)
03-css-*.css       base hud citizens admin recorder house
04-js-boot.js      لیست و ترتیب بارگذاری (GAME_FILES)
05-core-*.js       quality engine state materials perf main
06-world-*.js      scenery roads environment cars
07-buildings-*.js  models houseview
08-characters-*.js dialogue nametags navigation models behavior
09-ui-*.js         blueprint interaction hud
10-admin-*.js      panel
11-features-*.js   recorder cinema hudcap music
12-net-*.js        sync telegram
```
- **بک‌اند:** `app.py` هر فایل `01-server-*.py` را با نام مستعار `srv_*` ثبت می‌کند (چون اسم با عدد شروع می‌شود و `import` معمولی کار نمی‌کند). داخل فایل‌ها: `from srv_config import ...`. جدول `PARTS` در `app.py` ترتیب بارگذاری را تعیین می‌کند.
- **سرو فایل‌ها:** `01-server-public.py` فقط `.js`/`.css` با قالب `شماره-دسته-نام` را سرو می‌کند؛ کد پایتون، `render.yaml` و بقیه هرگز از بیرون قابل دانلود نیستند. `/` ← `02-web-index.html`.
- **فرانت:** `02-web-index.html` استایل‌ها و `04-js-boot.js` را می‌خواند؛ بوت بقیهٔ `.js`ها را به ترتیب `GAME_FILES` از ریشه (`/نام.js`) بارگذاری می‌کند.

## ۳) بک‌اند (`01-server-*.py`)
| فایل | مسئولیت |
|---|---|
| `01-server-init.py` | `create_app()` (ثبت Blueprintها)؛ بدون استاتیک فلسک |
| `01-server-config.py` | env، `SIZE`، `CATALOG`(نوع‌ها)، `COST`(قیمت‌ها)، `RULES`، `TIERS`، `GOALS`، اقتصاد (`FOOD_*`, `FARM_YIELD`, `MARKET_INCOME`) |
| `01-server-world.py` | منطق دنیا: `seed, migrate, ensure_hq, fix_pond, load, tick, check_cell, free_cell, capacity, apply_delta, check_goals, log_event, view, mutate`. **الگوی هر تغییر: `mutate(fn)`** (قفل←load←tick←fn←rev+1←save) |
| `01-server-db.py` | `fetch/save` خام + `lock` |
| `01-server-public.py` | `GET /api/world`, `/healthz`, `/`, `/admin` + سرو `.js`/`.css` ریشه (`/<name>`) |
| `01-server-auth.py` | توکن مدیر (`POST /api/admin/login`)، دکوراتور `@admin_only` |
| `01-server-admin.py` | API مدیر: `building` (POST/PUT/DELETE)، `buildings/batch` (اتمیک)، `adjust`, `contribution`, `milestone`, `event`, `citizen/<i>`, `say`, `env` |
| `01-server-players.py` | `/api/join, ping, leave, player/name`, `GET /api/admin/players`؛ تخصیص کارکتر (`assign_cid`) |
| `01-server-telegram.py` | وب‌هوک `/tg/<tok>`، پیام خوش‌آمد (`welcome`)، `tg_setup`, `tg_uid` |

**مدل داده (سند `main`):** `rev, country{name,gov}, stats{pop,money,food,subs}, buildings[{id,type,x,z,rot,ar?}] (`ar`=چرخش خودکار برای house/hq), events[], story{reached,values}, citizens{cid:{name}}, players, chat[], env{mode,hour}, hq_made, next_id`. فیلد جدید ← در `extras()` اضافه کن تا `migrate` به دیتابیس قدیمی برساند.

## ۴) فرانت — نقشهٔ فایل‌ها (به ترتیب بارگذاری)
| فایل | مسئولیت / کلیدواژه | نمادهای مهم |
|---|---|---|
| `05-core-quality.js` | تشخیص دستگاه، پله‌های کیفیت ۰..۹، آزادسازی GPU، ادغام رنگی | `QLV, QD, disposeObj, bakeVC, vcMesh` |
| `05-core-engine.js` | رندرر، صحنه، دوربین، کنترل، نور کلی | `$, scene, cam, ctl, hemi, sun, MOB0` |
| `05-core-state.js` | متغیرهای سراسری مشترک | `objs, W, HARD, MY, MOB, POP, VIS, QH` |
| `05-core-materials.js` | متریال‌ها و ابزار ساخت سریع | `mats, add, bx, GRADT` |
| `06-world-scenery.js` | زمین، آسمان، برکه، گل، سنگ، کوه، جنگل، ابر | `ground, sky, pond, clouds, refreshDeco` |
| `07-buildings-models.js` | مدل ۳بعدی ساختمان‌ها و `addB` | `build{}, house, bake, plaque, wl, ro` |
| `08-characters-dialogue.js` | جمله‌ها `DL`، گفتگو `DC`، نام‌های پیش‌فرض `DEF` | `dgSay, dgConv, dgEvent` |
| `06-world-roads.js` | جاده/پیاده‌رو متصل + چراغ | `roadMesh, pathMesh` |
| `06-world-environment.js` | شب‌وروز، ستاره، ماه، کرم شب‌تاب، توربین، ساعت | `envStep, realHour, ffStep` |
| `08-characters-nametags.js` | نام بالای سر، حباب، چت مدیر | `names, bubble, chatSync, tags` |
| `09-ui-blueprint.js` | **مود نقشهٔ ساخت:** شبح، چیدن/درگ/چرخش، تأیید دسته‌ای، stagger | `BP, bpStart, bpEnd, bpCommit, bpVal, bpStroke` |
| `09-ui-interaction.js` | لمس/انتخاب، دکمه‌های رابط، ابزار مدیر (جابه‌جایی/ساخت/حذف/نام/پیام)، `api()` | `setAdm, setMode, onTap, bpPick/bpDown/bpDrag` |
| `10-admin-panel.js` | پنل مدیر (تب‌ها) ← `/api/admin/*` | `openAP, apRender` |
| `11-features-recorder.js` | ضبط ویدیو؛ cinema و hudcap را با `import()` لود می‌کند | `recStart, recStop, ROOTS` |
| `08-characters-navigation.js` | A* و شبکهٔ هزینه، مالکیت خانه | `findPath, rebuildNav, homeFor` |
| `08-characters-models.js` | بدن شهروند، Instancing، `mkCit`, `tune`, ظاهر بنیان‌گذار | `cits, Parts, mkCit, founderLook` |
| `08-characters-behavior.js` | حالت‌ها، حرکت، سلام | `stepCits, goTo, newGoal` |
| `06-world-cars.js` | ماشین‌های ریز | `spawnCar, stepCars` |
| `09-ui-hud.js` | چیپ منابع، toast، داستان آغازین | `toast, bump, story` |
| `07-buildings-houseview.js` | نمای داخل خانه (سقف باز، مبلمان، کارت) | `openHouse, mkInterior, mkInteriorHQ` |
| `12-net-sync.js` | poll سرور و اعمال روی صحنه | `poll, sync, applyMe, fitCits` |
| `12-net-telegram.js` | مینی‌اپ: join/ping/«کارکتر من» | `joinMe, pingMe` |
| `11-features-music.js` | موسیقی WebAudio | `MU` |
| `05-core-perf.js` | کنترلر کیفیت زنده، بنچمارک، بودجهٔ draw call، `?perf=1` | `Q, apply, check, cull` |
| `05-core-main.js` | شروع بازی و حلقهٔ اصلی | `startGame` |
| `11-features-cinema.js` *(ماژول)* | استودیوی سینمایی، `EFFECTS` | `K, EFFECTS` |
| `11-features-hudcap.js` *(ماژول)* | ضبط HUD روی ویدیو | `frame` |

**CSS:** `03-css-base` (پایه) · `03-css-hud` (نوار بالا، منابع، داستان) · `03-css-citizens` (نام/حباب) · `03-css-admin` (پنل مدیر **و نوار ابزار ساخت/نقشه**) · `03-css-recorder` · `03-css-house` (نمای داخل خانه).

## ۵) «چی می‌خوام» ← «کدوم فایل‌ها»
| درخواست | فایل‌ها |
|---|---|
| ظاهر آدم‌ها / لباس / مو | `08-characters-models.js` |
| رفتار، حرکت، کار آدم‌ها | `08-characters-behavior.js` (+ `08-characters-navigation`) |
| جمله و گفتگو | `08-characters-dialogue.js` |
| اسم/حباب بالای سر | `08-characters-nametags.js` + `03-css-citizens.css` |
| ظاهر ساختمان/آیتم جدید | `07-buildings-models.js` + `01-server-config.py` (CATALOG, COST) |
| داخل خانه | `07-buildings-houseview.js` + `03-css-house.css` |
| مود ساخت، شبح، درگ، چرخش، ساخت دسته‌ای | `09-ui-blueprint.js` + `09-ui-interaction` + `03-css-admin.css` + `01-server-admin.py` (batch) |
| لمس/کلیک روی صحنه، ابزار مدیر | `09-ui-interaction.js` |
| پنل مدیر (تب/دکمه/API) | `10-admin-panel.js` + `01-server-admin.py` + `03-css-admin.css` |
| جاده/پیاده‌رو/چراغ | `06-world-roads.js` · ماشین: `06-world-cars` |
| زمین/آسمان/برکه/کوه/درخت | `06-world-scenery.js` |
| شب‌وروز/ستاره/ماه | `06-world-environment.js` (+ `01-server-admin.py` env) |
| قیمت، اقتصاد، مراحل، هدف‌ها، قوانین فالو | `01-server-config.py` + `01-server-world.py` |
| نوار منابع/داستان/toast | `09-ui-hud.js` + `03-css-hud.css` + `index.html` |
| ربات تلگرام/پیام خوش‌آمد | `01-server-telegram.py` · «کارکتر من»: `01-server-players.py` + `12-net-telegram` |
| ضبط ویدیو / سینمایی / ضبط HUD | `11-features-recorder.js` · `11-features-cinema` · `11-features-hudcap` + `03-css-recorder.css` |
| موسیقی | `11-features-music.js` |
| دوربین/نور/رندرر | `05-core-engine.js` |
| کندی، FPS، کیفیت، draw call | `05-core-quality.js` + `05-core-perf` |
| ارتباط با سرور/poll | `12-net-sync.js` + `01-server-public.py` + `01-server-world.py` (`view`) |
| دیتابیس/ذخیره | `01-server-db.py` |
| صفحه/المان ثابت HTML | `02-web-index.html` |

## ۶) قواعد مهم فرانت
- همهٔ فایل‌های فرانت `05..12` (به‌جز `11-features-cinema`/`11-features-hudcap`/`04-js-boot`) **یک محیط سراسری مشترک** دارند: متغیرها/توابع همدیگر را مستقیم می‌بینند. **یک اسم را دو بار تعریف نکن** (`const/let/function`).
- ترتیب `GAME_FILES` در `04-js-boot.js` مهم است (شمارهٔ اسم فایل ربطی به ترتیب بارگذاری ندارد): هر فایل در لحظهٔ بارگذاری فقط از فایل‌های بالاتر استفاده می‌کند (داخل توابعی که بعداً صدا می‌شوند آزاد است).
- فایل جدید فرانت ← با قالب `شماره-دسته-نام.js` بساز (مثلاً `06-world-rain.js`) + اسمش (بدون `.js`) را در جای درست `GAME_FILES` بگذار.
- فایل جدید بک‌اند ← `01-server-نام.py` + یک خط در جدول `PARTS` در `app.py` (نام مستعار `srv_نام`).
- متن‌های رابط فارسی؛ اعداد نمایشی با `cpx()`.

## ۷) دستورکارهای رایج
- **ساختمان جدید:** `01-server-config.py` (`CATALOG`+`COST`) ← تابع در `build` داخل `07-buildings-models.js` (آخرش `bakeVC`/`bake`) ← در صورت لزوم پشتیبانی در `09-ui-blueprint.js`.
- **API مدیر جدید:** `@bp.post(...)` + `@admin_only` در `01-server-admin.py` ← فراخوانی با `api()` در `10-admin-panel.js`/`09-ui-interaction.js`. تغییر دادهٔ دنیا فقط از طریق `mutate()`.
- **افکت سینمایی:** آیتم به `EFFECTS` در `11-features-cinema.js`. **جملهٔ جدید:** `DL`/`DC` در `08-characters-dialogue.js`. **المان ضبط‌شونده در HUD:** سلکتور به `ROOTS` در `11-features-recorder.js`.
- **فیلد جدید در دیتابیس:** `extras()` در `01-server-world.py` (+ اگر به فرانت می‌رود، `view()`).

## ۸) ظاهر خانه
`house` در `07-buildings-models.js` (دیوار = گروه `wl`، سقف = گروه `ro`، ادغام با `bake`). مبلمان داخل: `mkInterior` در `07-buildings-houseview.js`.

## ۹) بودجهٔ عملکرد
موبایل ≤ ۲۵۰ draw call و ≈۳۰۰ هزار مثلث؛ دسکتاپ ≤ ۶۰۰ و ≈۱٫۲ میلیون. دیدن: `?perf=1` یا `Q.snapshot()`.
- مش هم‌رنگ‌نشده نساز؛ آخر تابع مدل `bakeVC(g)` یا `bake(g)`.
- ژئومتری مشترک ← `keepGeo(...)`؛ بقیه خودکار با `disposeObj` آزاد می‌شوند.
- افکت درخشان (Additive) جدید ← متریالش را به لیست `apply()` در `05-core-perf.js` اضافه کن.
- برای هر شهروند DOM نساز (فقط `c.el` تنبل).
- کیفیت دستی: `?q=0..9` یا `ultra|high|med|low|potato`؛ کنسول: `Q.set(n)`, `Q.auto()`.

## ۱۰) نکات/تله‌ها
- مود ساخت (`BP`) با `interaction.js` جفت است: رویدادهای pointer در `interaction.js` به `bpDown/bpDrag/bpPick` می‌رسند؛ خروج مدیر باید `bpEnd()` بزند.
- ساخت دسته‌ای باید اتمیک باشد (`/api/admin/buildings/batch`)؛ اعتبارسنجی هم در فرانت (`bpVal`) هم سرور (`check_cell`).
- سلول‌های نقشه ×۲ ← مختصات دنیا (برکه: `in_pond` در `01-server-world.py` و `bpInPond`/`inPond` در فرانت — هر سه باید هماهنگ بمانند).
- `README.md` کوتاه است و به همین فایل ارجاع می‌دهد؛ مرجع اصلی همین فایل است.

## ۱۱) تاریخچه تغییرات (جدیدترین بالا؛ هر خط: تاریخ — چه چیزی — فایل‌ها)
- ۲۰۲۶-۱۱-۱۹ — **زمین قطعهٔ ساختمان‌ها:** خانه/دفتر/مزرعه/بازار یک زمین قطعهٔ ۲×۲ هم‌ارتفاع جاده دارند (جایگزین چمن). کاشی کامل ۲×۲ برای پیاده‌رو امتحان شد و به درخواست کاربر **برگشت خورد**: ظاهر پیاده‌رو (مسیر خاکی باریک با لبهٔ تیره) باید همان قبلی بماند. — `07-buildings-models.js`, `PROJECT_GUIDE.md`
- ۲۰۲۶-۱۱-۱۹ — **چینش حرفه‌ای (شهرسازی):** علت فاصله‌ها: نقشهٔ ساخت همیشه `rot:0` می‌فرستاد پس چرخش خودکار درِ خانه/دفتر هرگز اجرا نمی‌شد. حالا خانه/دفتر `ar` (چرخش خودکار) دارد و رو به نزدیک‌ترین جاده/پیاده‌رو می‌ایستد؛ با هر تغییر مسیر (ساخت/حذف/جابه‌جایی) دوباره می‌چرخد (`reorient` در سرور، `bpAutoRot/bpAfterChange` در فرانت) و پیاده‌روی جلوی در بازاتصال می‌شود. چرخش دستی (R / دکمهٔ 🔄 / ابزار چرخش) خودکار را خاموش می‌کند؛ دکمهٔ 🔄 بدون انتخاب: جهت قلم خودکار←۰←۹۰←۱۸۰←۲۷۰. همچنین هر خانه/دفتر/مزرعه/بازار یک «زمین قطعه» ۱٫۹۶×۱٫۹۶ (چمن) دارد تا کنار جاده، پیاده‌رو و همسایه بدون شکاف چمن بنشیند. — `01-server-admin.py`, `09-ui-blueprint.js`, `07-buildings-models.js`, `PROJECT_GUIDE.md`
- ۲۰۲۶-۱۱-۱۹ — **تخت‌کردن پروژه:** همهٔ فایل‌ها در یک پوشه با اسم `شماره-دسته-نام`؛ `app.py` بک‌اند را با نام مستعار `srv_*` لود می‌کند؛ `public.py` فقط `.js/.css` را سرو می‌کند؛ `boot.js`/`index.html`/`recorder.js` به اسم‌های جدید رسید؛ `WEB=ROOT`. — همهٔ فایل‌ها (اسم) + `app.py`, `01-server-init.py`, `01-server-config.py`, `01-server-public.py`, `02-web-index.html`, `04-js-boot.js`, `11-features-recorder.js`, `README.md`, `PROJECT_GUIDE.md`
- ۲۰۲۶-۱۱-۱۹ — ساخت `PROJECT_GUIDE.md` (نقشهٔ کامل پروژه، قوانین کار، قالب پیام). — `PROJECT_GUIDE.md`, `README.md`
- *(پیش از این: مود نقشهٔ ساخت حرفه‌ای، بهبود جاده‌ها، زیرساخت کیفیت/perf — طبق تاریخ فایل‌ها)*

## ۱۲) قالب پیام کاربر (برای اول هر چت)
```
[زیپ پروژه پیوست]
اول PROJECT_GUIDE.md را بخوان و طبق آن فقط فایل‌های مرتبط را باز کن.
درخواست: …(کوتاه و معمولی، لازم نیست اسم فایل/تابع بدهی)…
خروجی: فقط فایل‌های تغییرکرده + PROJECT_GUIDE.md به‌روز.
```
