# -*- coding: utf-8 -*-
"""
عصر مکعب‌ها (Voxel Age) — بک‌اند تک‌فایلی
اجرای محلی:  pip install -r requirements.txt  ←  python app.py
دیپلوی Render:  gunicorn app:app  (متغیرها: MONGO_URI, BOT_TOKEN, PUBLIC_URL اختیاری‌اند)

بخش‌های این فایل (بعداً اگر بزرگ شد، هر بخش یک فایل در server/ می‌شود):
  1) تنظیمات   2) ذخیره‌سازی (Mongo یا حافظه)   3) هویت (تلگرام یا مهمان)
  4) API بازی: /api/load  /api/save  /api/top    5) ربات تلگرام (وب‌هوک + منو)
"""
import os, time, json, hmac, hashlib, threading, logging, re
from urllib.parse import parse_qsl
from urllib.request import Request, urlopen
from flask import Flask, request, jsonify, send_from_directory

# ───────── ۱) تنظیمات ─────────
MONGO_URI  = os.environ.get("MONGO_URI", "").strip()
BOT_TOKEN  = os.environ.get("BOT_TOKEN", "").strip()
PUBLIC_URL = (os.environ.get("PUBLIC_URL") or os.environ.get("RENDER_EXTERNAL_URL") or "").strip().rstrip("/")
ROOT = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(ROOT, "web")
MAX_SAVE_BYTES = 400_000          # بزرگ‌ترین سیو قابل قبول
MIN_SAVE_GAP = 4                  # حداقل فاصله‌ی دو ذخیره‌ی یک کاربر (ثانیه)

log = logging.getLogger("voxelage")
logging.basicConfig(level=logging.INFO)
app = Flask(__name__, static_folder=None)

# ───────── ۲) ذخیره‌سازی ─────────
lock = threading.RLock()
_mem = {}
col = None
if MONGO_URI:
    from pymongo import MongoClient
    col = MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000).get_database("voxelage").players
else:
    log.warning("MONGO_URI تنظیم نشده؛ پیشرفت بازیکن‌ها با ری‌استارت سرور پاک می‌شود")


def db_get(uid):
    return col.find_one({"_id": uid}) if col is not None else _mem.get(uid)


def db_put(uid, doc):
    doc["_id"] = uid
    if col is not None: col.replace_one({"_id": uid}, doc, upsert=True)
    else: _mem[uid] = doc


def db_top(n=20):
    if col is not None:
        rows = list(col.find({}, {"name": 1, "era": 1, "score": 1}).sort("score", -1).limit(n))
    else:
        rows = sorted(_mem.values(), key=lambda d: d.get("score", 0), reverse=True)[:n]
    return [{"name": r.get("name", "؟"), "era": r.get("era", 0), "score": r.get("score", 0)} for r in rows]


# ───────── ۳) هویت: تلگرام (initData امضاشده) یا مهمان (gid تصادفی مرورگر) ─────────
def tg_user(init):
    """initData مینی‌اپ را تأیید می‌کند؛ (uid, name) یا None"""
    if not BOT_TOKEN or not init: return None
    try:
        q = dict(parse_qsl(str(init), keep_blank_values=True)); h = q.pop("hash", "")
        data = "\n".join(f"{k}={q[k]}" for k in sorted(q))
        key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(hmac.new(key, data.encode(), hashlib.sha256).hexdigest(), h): return None
        if time.time() - int(q.get("auth_date", 0)) > 7 * 86400: return None
        u = json.loads(q["user"])
        return "t%d" % int(u["id"]), (u.get("first_name") or u.get("username") or "بازیکن")[:20]
    except Exception:
        return None


def who(body):
    t = tg_user(body.get("init"))
    if t: return t
    gid = re.sub(r"[^A-Za-z0-9]", "", str(body.get("gid", "")))[:40]
    if len(gid) < 12: return None
    name = re.sub(r"[<>&]", "", str(body.get("name") or "مهمان"))[:20] or "مهمان"
    return "g" + gid, name


# ───────── ۴) API بازی ─────────
_last = {}


@app.post("/api/load")
def api_load():
    me = who(request.get_json(silent=True) or {})
    if not me: return jsonify(error="auth"), 401
    with lock:
        d = db_get(me[0]) or {}
    return jsonify(save=d.get("save"), name=me[1], tg=me[0].startswith("t"))


@app.post("/api/save")
def api_save():
    b = request.get_json(silent=True) or {}
    me = who(b)
    if not me: return jsonify(error="auth"), 401
    sv = b.get("save")
    if not isinstance(sv, dict) or len(json.dumps(sv, separators=(",", ":"))) > MAX_SAVE_BYTES:
        return jsonify(error="bad save"), 400
    now = time.time()
    if now - _last.get(me[0], 0) < MIN_SAVE_GAP: return jsonify(ok=True, skipped=True)
    _last[me[0]] = now
    era = max(0, min(4, int(sv.get("era", 0))))
    score = max(0, min(10_000_000, int(b.get("score", 0))))   # توجه: امتیاز از کلاینت می‌آید؛ برای مسابقه‌ی جدی باید سمت سرور محاسبه شود
    with lock:
        db_put(me[0], {"name": me[1], "era": era, "score": score, "save": sv, "t": now})
    return jsonify(ok=True)


@app.get("/api/top")
def api_top():
    with lock: return jsonify(top=db_top())


@app.get("/healthz")
def health(): return "ok"


@app.get("/")
def index(): return send_from_directory(WEB, "index.html")


# ───────── ۵) ربات تلگرام: وب‌هوک + پیام خوش‌آمد + دکمه‌ی ورود ─────────
HOOK = hashlib.sha256(("vx|" + BOT_TOKEN).encode()).hexdigest()[:24]
_tg_ready, _base = False, ""


def tg_api(method, **kw):
    try:
        r = urlopen(Request(f"https://api.telegram.org/bot{BOT_TOKEN}/{method}", json.dumps(kw).encode(), {"Content-Type": "application/json"}), timeout=8)
        return json.loads(r.read().decode())
    except Exception as e:
        log.warning("telegram %s failed: %s", method, e); return {}


def tg_setup(base):
    global _base
    _base = base
    tg_api("setWebhook", url=f"{base}/tg/{HOOK}", allowed_updates=["message"])
    tg_api("setMyCommands", commands=[{"command": "start", "description": "شروع بازی"}])
    tg_api("setChatMenuButton", menu_button={"type": "web_app", "text": "🎮 بازی", "web_app": {"url": base}})
    log.info("telegram ready %s", base)


@app.before_request
def lazy_bot():
    global _tg_ready
    if BOT_TOKEN and not _tg_ready:
        _tg_ready = True
        base = PUBLIC_URL or request.url_root.replace("http://", "https://").rstrip("/")
        threading.Thread(target=tg_setup, args=(base,), daemon=True).start()


def welcome(chat_id):                                   # متن خوش‌آمد ربات را اینجا عوض کن
    url = _base or PUBLIC_URL
    tg_api("sendMessage", chat_id=chat_id,
           text="🪨➡️🏙️ به «عصر مکعب‌ها» خوش اومدی!\n\nقبیله‌ت از صفر شروع می‌کنه؛ چوب جمع کن، کلبه بساز، ارتش بساز و از عصر حجر تا دنیای مدرن پیشرفت کن.\n\nدکمه‌ی پایین رو بزن 👇",
           reply_markup={"inline_keyboard": [[{"text": "🎮 شروع بازی", "web_app": {"url": url}}]]})


@app.post("/tg/<tok>")
def tg_hook(tok):
    if not BOT_TOKEN or not hmac.compare_digest(tok, HOOK): return "", 403
    m = (request.get_json(silent=True) or {}).get("message") or {}
    if (m.get("chat") or {}).get("type") == "private":
        threading.Thread(target=welcome, args=(m["chat"]["id"],), daemon=True).start()
    return "ok"


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
