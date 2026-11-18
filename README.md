# Tribe World — جهان زنده قبیله

اجرای محلی: `pip install -r requirements.txt` ← `python app.py` (بدون `MONGO_URI` داده‌ها موقتی‌اند).
دیپلوی Render همان قبلی است (`gunicorn app:app`)؛ متغیرها: `ADMIN_KEY`, `MONGO_URI`, `BOT_TOKEN`.

## کجا دنبالش بگردم؟

| می‌خوای چی رو عوض کنی؟ | کجا |
|---|---|
| ظاهر کارکترها | `web/js/characters/models.js` |
| رفتار و حرکت کارکترها | `web/js/characters/behavior.js` · مسیریابی: `navigation.js` |
| حرف زدن کارکترها | `web/js/characters/dialogue.js` · نام/حباب: `nametags.js` |
| زمین، آسمان، برکه، درخت و کوه | `web/js/world/scenery.js` |
| شب‌وروز، ستاره، ماه | `web/js/world/environment.js` |
| جاده و پیاده‌رو (قدیمی، خانه‌ای) / ماشین‌ها | `web/js/world/roads.js` / `cars.js` |
| مسیر خاکی دست‌آزاد (قلم، جنس، پاک‌کن) | `web/js/world/dirt.js` + `web/css/dirt.css` + `server/dirt.py` |
| پلاک خانه‌ها (نام صاحب / نام خانه / شماره) | `web/js/buildings/plates.js` + `server/plates.py` |
| ساختمان‌ها و آیتم‌ها (مدل سه‌بعدی) | `web/js/buildings/models.js` |
| نمای داخل خانه (سقف باز می‌شود، مبلمان، کارت مشخصات) | `web/js/buildings/houseview.js` + `web/css/house.css` |
| نوع، نام و قیمت ساختمان‌ها | `server/config.py` (`CATALOG`, `COST`) |
| اقتصاد، مراحل، هدف‌ها | `server/config.py` + `server/world.py` |
| ربات تلگرام (پیام خوش‌آمد، وب‌هوک) | `server/telegram.py` |
| بازیکن‌ها و «کارکتر من» | `server/players.py` + `web/js/net/telegram.js` |
| پنل ادمین | `web/js/admin/panel.js` + `server/admin.py` + `server/auth.py` |
| ابزار ساخت/جابه‌جایی مدیر، لمس صحنه | `web/js/ui/interaction.js` |
| نوار بالا (منابع)، داستان آغازین | `web/js/ui/hud.js` + `web/css/hud.css` |
| ضبط ویدیو / استودیوی سینمایی | `web/js/features/recorder.js` · `cinema.js` · `hudcap.js` |
| موسیقی | `web/js/features/music.js` |
| دوربین، نور، رندرر | `web/js/core/engine.js` |
| پله‌های کیفیت، بنچمارک، سقف draw call، محافظ WebGL | `web/js/core/quality.js` (جدول پله‌ها) + `web/js/core/perf.js` (کنترلر) |
| ارتباط با سرور (poll) | `web/js/net/sync.js` |
| دیتابیس | `server/db.py` |

## دستورکارهای رایج

- **ساختمان جدید:** `server/config.py` (اضافه به `CATALOG` و `COST`) ← تابع مدل در `build` داخل `web/js/buildings/models.js`.
- **افکت سینمایی جدید:** یک آیتم به `EFFECTS` در `web/js/features/cinema.js`.
- **جملهٔ جدید برای آدم‌ها:** `DL` (تک‌جمله) یا `DC` (گفتگوی دونفره) در `web/js/characters/dialogue.js`.
- **API جدید مدیر:** تابع با `@bp.post(...)` و `@admin_only` در `server/admin.py`، و فراخوانی‌اش در `web/js/admin/panel.js`.
- **فایل جدید فرانت:** بساز و اسمش را به `GAME_FILES` در `web/js/boot.js` اضافه کن.

- **تغییر ظاهر خانه:** تابع `house` در `models.js` (دیوار = گروه `wl`، سقف = گروه `ro`؛ با `bake` مش‌ها ادغام می‌شوند). مبلمان داخل: `mkInterior` در `houseview.js`.

## نکتهٔ مهم فرانت

فایل‌های `web/js/**` (به‌جز `cinema.js`/`hudcap.js`) اسکریپت معمولی‌اند و **یک محیط مشترک** دارند، درست مثل وقتی که همه در یک فایل بودند؛
یعنی متغیرها و توابع هم‌دیگر را مستقیم می‌بینند (`cits`, `W`, `toast`, …) و نباید یک اسم را دوبار تعریف کنی.
ترتیب بارگذاری در `boot.js` مهم است: هر فایل فقط در لحظهٔ بارگذاری می‌تواند از فایل‌های بالاتر از خودش استفاده کند.

## زیرساخت عملکرد (برای توسعهٔ بزرگ)

**بودجه:** موبایل ≤ ۲۵۰ draw call و ≈۳۰۰ هزار مثلث، دسکتاپ ≤ ۶۰۰ و ≈۱٫۲ میلیون. هر قابلیت جدید باید در همین بودجه جا شود. برای دیدنش `?perf=1` را به آدرس اضافه کن (fps، calls، tris، تعداد geometry/texture برای تشخیص نشت حافظه). در کنسول: `Q.snapshot()`.

**پله‌های کیفیت (۰ = بهترین … ۹ = Potato)** در `QLV` داخل `core/quality.js`. ترتیب کاهش: سایه نرم ← سایهٔ ریزتر ← سایه کم‌نرخ ← خاموش‌کردن هاله/کرم شب‌تاب/ابر ← فاصلهٔ دید ← تعداد شهروند و نام ← pixelRatio ← بدون سایه. پله‌ی شروع از `deviceMemory`/`hardwareConcurrency`/رندر نرم‌افزاری تعیین می‌شود؛ بعد از ۲ ثانیه بنچمارک و سپس هر ۱٫۵ ثانیه چک می‌شود (۳ ثانیه fps زیر ۲۷ ← یک پله پایین؛ ۱۲ ثانیه fps بالای ۵۲ ← یک پله بالا؛ اگر ارتقا شکست بخورد تا ۳ دقیقه قفل می‌شود تا نوسان نکند). آنتی‌آلیاس فقط هنگام ساخت رندرر تعیین می‌شود.
دستی: `?q=0..9` یا `?q=ultra|high|med|low|potato` (خودکار خاموش می‌شود)، یا `Q.set(n)` / `Q.auto()` در کنسول.

**قواعد برای آیتم/ساختمان جدید:**
- چند مش هم‌رنگ‌نشده نساز؛ آخر تابع مدل `bakeVC(g)` (ادغام رنگی، یک draw call) یا `bake(g)` (ادغام بر اساس متریال) را صدا بزن.
- ژئومتری مشترک بین چند شیء را با `keepGeo(...)` علامت بزن تا هنگام حذف ساختمان dispose نشود؛ بقیه خودکار آزاد می‌شوند (`disposeObj`).
- افکت درخشان (Additive) جدید: متریالش را به لیست افکت‌ها در `apply()` داخل `perf.js` اضافه کن تا در پله‌های ضعیف خاموش شود.
- DOM برای هر شهروند نساز؛ نام/حباب فقط از `c.el` (تنبل) استفاده می‌کند.
