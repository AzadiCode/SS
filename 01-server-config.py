# -*- coding: utf-8 -*-
"""تنظیمات و ثابت‌های بازی — اگر می‌خوای قیمت، قانون یا آستانه‌ای را عوض کنی، اینجاست."""
import os

# ───────── متغیرهای محیطی (در Render تنظیم می‌شوند) ─────────
MONGO_URI  = os.environ.get("MONGO_URI", "").strip()      # خالی = حافظه‌ی موقت
ADMIN_KEY  = os.environ.get("ADMIN_KEY", "").strip()      # رمز پنل مدیریت
BOT_TOKEN  = os.environ.get("BOT_TOKEN", "").strip()      # توکن ربات تلگرام (از BotFather)؛ بدون آن هیچ‌کس کارکتر نمی‌گیرد
PUBLIC_URL = (os.environ.get("PUBLIC_URL") or os.environ.get("RENDER_EXTERNAL_URL") or "").strip().rstrip("/")
SECRET_KEY = os.environ.get("SECRET_KEY") or ADMIN_KEY or "dev-only"
DAY = int(os.environ.get("DAY_SECONDS", "600"))            # طول یک «روز بازی» به ثانیه‌ی واقعی
TZ_NAME = os.environ.get("TZ_NAME", "Asia/Tehran")        # منطقه‌ی زمانی ساعت زنده‌ی دنیا

# ───────── مسیرها ─────────
ROOT = os.path.dirname(os.path.abspath(__file__))
WEB = ROOT                                                 # همهٔ فایل‌ها (html/css/js) کنار هم در همین پوشه‌اند

# ───────── اقتصاد و نقشه ─────────
SIZE = 20                                                  # نیم‌اندازه‌ی نقشه (خانه)
FOOD_PRICE, FOOD_PER_PERSON, FARM_YIELD, MARKET_INCOME = 20000, 0.5, 10, 200000

CATALOG = {"house": "خانه", "farm": "مزرعه", "market": "بازار", "road": "جاده", "path": "پیاده‌رو", "tree": "درخت", "hq": "دفتر مدیرعامل"}
COST = {"house": 2_000_000, "farm": 1_500_000, "market": 3_000_000, "road": 100_000, "path": 50_000, "tree": 0, "hq": 5_000_000}  # تومان
# قوانین داستان (مطابق ویدیو): هر فالو = ۱ نفر + ۱ میلیون تومان به خزانه
RULES = {"subscriber": {"pop": 1, "money": 1_000_000, "subs": 1}, "contribution": {"pop": 1, "money": 1_000_000}}
TIERS = [(0, "قبیله"), (500, "روستا"), (5000, "شهر"), (50000, "کشور")]   # آستانه‌ها پیشنهادی‌اند؛ تغییرشان بده
GOALS = [(100, "name", "انتخاب اسم قبیله با رأی مخاطبان"), (2000, "gov", "انتخاب نظام حکومت: پادشاهی یا جمهوری")]
RES = ("pop", "money", "food", "subs")
# ردپای واقعی هر آیتم (عرض، عمق) به واحد دنیا (هر سلول = ۲)؛ با FOOT0 در 06-world-footprint.js هماهنگ بماند. جاده = کل سلول، پیاده‌رو = نوار ۰٫۶ + بازو به همسایه‌های مسیر
FOOT = {"house": (1.5, 1.3), "hq": (1.9, 1.84), "farm": (1.9, 1.9), "market": (2.0, 1.4), "road": (2.0, 2.0), "path": (0.6, 0.6), "tree": (0.4, 0.4)}
TILES = ("road", "path")                                   # آیتم‌هایی که روی شبکهٔ سلولی می‌نشینند؛ بقیه آزادند (مختصات اعشاری)

# ───────── وضعیت زمان اجرا (بین بخش‌ها مشترک) ─────────
runtime = {"bot_user": ""}                                 # نام کاربری ربات؛ بعد از راه‌اندازی تلگرام پر می‌شود
