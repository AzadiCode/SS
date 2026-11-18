# -*- coding: utf-8 -*-
"""
لایه‌ی «قبیله» — اتصال بازی به کانال یوتیوب
هر عضو/ساب/کامنت‌گذار = یک شهروند. شهرها، شغل‌ها، رای‌گیری مدیرعامل شهر جدید.

متغیرهای محیطی (همه اختیاری‌اند؛ بدون آن‌ها با پنل ادمین کار می‌کند):
  ADMIN_KEY        کلید پنل ادمین (/admin)                         ← حتماً بگذار
  YT_API_KEY       کلید YouTube Data API v3
  YT_CHANNEL_ID    شناسه‌ی کانال (UC...)  ← تعداد ساب + کامنت‌های «!join» از همه‌ی ویدیوها
  OPEN_JOIN=1      هر کس اسم بدهد فوراً شهروند شود (پیش‌فرض: تأیید ادمین یا کامنت یوتیوب)
  CITY_CAP         ظرفیت هر شهر (پیش‌فرض ۳۰)

نکته‌ی صادقانه: یوتیوب فهرست سابسکرایبرها را عمومی نمی‌دهد، فقط «تعداد» را. پس
  • تعداد ساب‌ها → جمعیت بی‌نام (ساکنین) خودکار
  • شهروند نام‌دار → با کامنت «!join» زیر هر ویدیو، یا ثبت دستی ادمین
  • رای‌گیری → کامنت «#۱» «#۲» … زیر ویدیوی رای‌گیری + رای داخل بازی
"""
import os, re, time, json, hmac, hashlib, secrets, threading, logging
from urllib.parse import urlencode
from urllib.request import urlopen
from flask import Blueprint, request, jsonify

log = logging.getLogger("tribe")
bp = Blueprint("tribe", __name__)

ADMIN_KEY = os.environ.get("ADMIN_KEY", "").strip()
YT_KEY = os.environ.get("YT_API_KEY", "").strip()
YT_CHANNEL = os.environ.get("YT_CHANNEL_ID", "").strip()
OPEN_JOIN = os.environ.get("OPEN_JOIN", "") == "1"
DEF_CAP = int(os.environ.get("CITY_CAP", "30") or 30)
MAX_CITIZENS = 3000
SYNC_GAP = 90

# شغل‌ها: برای افزودن شغل جدید فقط اینجا و در JOB_DEFS فایل web/tribe.js یک خط اضافه کن
JOBS = ["free", "wood", "food", "stone", "metal", "trader"]
COLORS = ["#e0503a", "#e8a838", "#4be08a", "#5ab0ff", "#b07aff", "#ff7ac8", "#f2e9d0", "#6c7486"]

lock = threading.RLock()
_col = None
_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tribe_state.json")
S = None
_ip = {}
_sync_at = 0
_syncing = False


def init(mongo_uri=""):
    """از app.py یک‌بار صدا زده می‌شود."""
    global _col, S
    if mongo_uri:
        try:
            from pymongo import MongoClient
            _col = MongoClient(mongo_uri, serverSelectionTimeoutMS=8000).get_database("voxelage").tribe
            S = _col.find_one({"_id": "world"})
        except Exception as e:
            log.warning("tribe mongo failed: %s", e)
    if S is None:
        try:
            S = json.load(open(_path, encoding="utf-8"))
        except Exception:
            S = None
    if not S:
        S = fresh()
    S.pop("_id", None)
    # مهاجرت ملایم: کلیدهای جدید
    for k, v in fresh().items():
        S.setdefault(k, v)
    save()


def fresh():
    return {"v": 1, "cap": DEF_CAP, "next": 1, "subs": 0, "ytseen": [],
            "cities": [{"id": 1, "name": "شهر اول", "ceo": "", "ceo_id": "", "founded": int(time.time())}],
            "citizens": {}, "vote": {"open": False, "cands": [], "votes": {}, "video": "", "title": "", "city": 0},
            "joinvid": "", "log": [], "yt_ok": False}


def save():
    d = dict(S)
    try:
        if _col is not None:
            d["_id"] = "world"
            _col.replace_one({"_id": "world"}, d, upsert=True)
        else:
            json.dump(S, open(_path, "w", encoding="utf-8"), ensure_ascii=False)
    except Exception as e:
        log.warning("tribe save failed: %s", e)


def note(msg):
    S["log"].append({"t": int(time.time()), "m": msg})
    S["log"] = S["log"][-40:]


def clean(s, n=20):
    return re.sub(r"[<>&\"'`\\]", "", str(s or "")).strip()[:n]


def thash(t):
    return hashlib.sha256(("tr|" + str(t)).encode()).hexdigest()[:32]


def norm_digits(s):
    return str(s).translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"))


def city_count(cid):
    return sum(1 for c in S["citizens"].values() if c["status"] == "ok" and c["city"] == cid)


def pick_city():
    for c in S["cities"]:
        if city_count(c["id"]) < S["cap"]:
            return c["id"]
    return S["cities"][-1]["id"]          # همه پرند → در آخرین شهر می‌مانند تا شهر جدید ساخته شود


def add_citizen(name, src="admin", status="ok", token=None, ytid=""):
    name = clean(name)
    if len(name) < 2 or len(S["citizens"]) >= MAX_CITIZENS:
        return None
    low = name.lower()
    for c in S["citizens"].values():
        if c["name"].lower() == low or (ytid and c.get("ytid") == ytid):
            return None
    cid = "c%d" % S["next"]; S["next"] += 1
    S["citizens"][cid] = {"id": cid, "name": name, "src": src, "status": status, "joined": int(time.time()),
                          "city": pick_city(), "job": "free", "color": COLORS[S["next"] % len(COLORS)],
                          "hname": "", "tok": thash(token) if token else "", "ytid": ytid, "xp": 0, "ping": 0}
    if status == "ok":
        note("🎉 %s به قبیله پیوست" % name)
    return cid


def by_token(tok):
    if not tok:
        return None
    h = thash(tok)
    for c in S["citizens"].values():
        if c["tok"] and hmac.compare_digest(c["tok"], h):
            return c
    return None


def public():
    cs = [{k: c[k] for k in ("id", "name", "city", "job", "color", "hname", "xp", "joined")}
          for c in S["citizens"].values() if c["status"] == "ok"]
    cs.sort(key=lambda c: c["joined"])
    v = S["vote"]
    tally = {}
    for k, cand in v["votes"].items():
        tally[cand] = tally.get(cand, 0) + 1
    ready = city_count(S["cities"][-1]["id"]) >= S["cap"]
    named = len(cs)
    return {"cap": S["cap"], "cities": S["cities"], "citizens": cs[:600], "total": named,
            "pending": sum(1 for c in S["citizens"].values() if c["status"] == "pending"),
            "subs": S["subs"], "anon": max(0, S["subs"] - named), "ready": ready,
            "vote": {"open": v["open"], "cands": v["cands"], "tally": tally, "video": v["video"], "title": v["title"]},
            "log": S["log"][-12:], "jobs": JOBS, "colors": COLORS, "yt": bool(YT_KEY and YT_CHANNEL)}


# ───────── یوتیوب ─────────
def yt(path, **p):
    p["key"] = YT_KEY
    r = urlopen("https://www.googleapis.com/youtube/v3/%s?%s" % (path, urlencode(p)), timeout=10)
    return json.loads(r.read().decode())


def vote_comments(video):
    """[(authorChannelId, name, text)] از کامنت‌های ویدیو"""
    out, tok = [], None
    for _ in range(5):
        p = {"part": "snippet", "videoId": video, "maxResults": 100, "order": "time"}
        if tok: p["pageToken"] = tok
        j = yt("commentThreads", **p)
        for it in j.get("items", []):
            s = it["snippet"]["topLevelComment"]["snippet"]
            out.append(((s.get("authorChannelId") or {}).get("value", s.get("authorDisplayName", "")), s.get("authorDisplayName", ""), s.get("textDisplay", "")))
        tok = j.get("nextPageToken")
        if not tok: break
    return out


def do_sync(force=False):
    global _sync_at, _syncing
    if not (YT_KEY and YT_CHANNEL) or _syncing or (not force and time.time() - _sync_at < SYNC_GAP):
        return
    _syncing = True; _sync_at = time.time()
    try:
        j = yt("channels", part="statistics", id=YT_CHANNEL)
        st = (j.get("items") or [{}])[0].get("statistics", {})
        subs = int(st.get("subscriberCount", 0) or 0)
        j = yt("commentThreads", part="snippet", allThreadsRelatedToChannelId=YT_CHANNEL, maxResults=100, order="time")
        new = []
        for it in j.get("items", []):
            s = it["snippet"]["topLevelComment"]["snippet"]
            txt = norm_digits(s.get("textDisplay", "")).lower()
            if "!join" in txt or "عضو" in txt:
                new.append(((s.get("authorChannelId") or {}).get("value", ""), s.get("authorDisplayName", "")))
        with lock:
            S["subs"] = max(S["subs"], subs); S["yt_ok"] = True
            for ytid, name in new:
                if ytid and ytid not in S["ytseen"]:
                    S["ytseen"].append(ytid); S["ytseen"] = S["ytseen"][-5000:]
                    add_citizen(name.lstrip("@"), "yt", "ok", None, ytid)
                # اگر قبلاً در بازی ثبت‌نام «در انتظار» کرده بود و اسمش با کامنت‌گذار یکی است → تأیید خودکار
            names = {n.lstrip("@").lower() for _, n in new}
            for c in S["citizens"].values():
                if c["status"] == "pending" and c["name"].lower() in names:
                    c["status"] = "ok"; note("🎉 %s به قبیله پیوست" % c["name"])
            save()
    except Exception as e:
        log.warning("yt sync failed: %s", e)
    finally:
        _syncing = False


def tally_yt():
    """رای‌های کامنتی «#N» ← {voterkey: candId}"""
    v = S["vote"]
    if not (YT_KEY and v["video"] and v["cands"]):
        return {}
    res = {}
    try:
        for aid, name, text in vote_comments(v["video"]):
            m = re.search(r"#\s*([1-9])", norm_digits(text))
            if m and aid not in res:
                i = int(m.group(1)) - 1
                if 0 <= i < len(v["cands"]):
                    res["y:" + aid] = v["cands"][i]
    except Exception as e:
        log.warning("yt tally failed: %s", e)
    return res


# ───────── API عمومی ─────────
def ip_ok(key, n, per):
    ip = (request.headers.get("X-Forwarded-For") or request.remote_addr or "").split(",")[0].strip()
    now = time.time(); k = key + ip
    L = [t for t in _ip.get(k, []) if now - t < per]
    if len(L) >= n: return False
    L.append(now); _ip[k] = L
    if len(_ip) > 5000: _ip.clear()
    return True


@bp.get("/api/tribe")
def api_tribe():
    threading.Thread(target=do_sync, daemon=True).start()
    with lock:
        return jsonify(public())


@bp.post("/api/tribe/join")
def api_join():
    b = request.get_json(silent=True) or {}
    if not ip_ok("j", 6, 3600): return jsonify(error="کمی بعد دوباره امتحان کن"), 429
    with lock:
        c = by_token(b.get("token"))
        if c: return jsonify(ok=True, me=me_view(c))
        tok = secrets.token_urlsafe(18)
        cid = add_citizen(b.get("name"), "game", "ok" if OPEN_JOIN else "pending", tok)
        if not cid: return jsonify(error="این اسم قبلاً ثبت شده یا کوتاهه"), 400
        save()
        return jsonify(ok=True, token=tok, me=me_view(S["citizens"][cid]))


def me_view(c):
    return {k: c[k] for k in ("id", "name", "status", "city", "job", "color", "hname", "xp")}


@bp.post("/api/tribe/me")
def api_me():
    with lock:
        c = by_token((request.get_json(silent=True) or {}).get("token"))
        return jsonify(me=me_view(c) if c else None)


@bp.post("/api/tribe/set")
def api_set():
    b = request.get_json(silent=True) or {}
    with lock:
        c = by_token(b.get("token"))
        if not c or c["status"] != "ok": return jsonify(error="auth"), 401
        if b.get("job") in JOBS: c["job"] = b["job"]
        if b.get("color") in COLORS: c["color"] = b["color"]
        if "hname" in b: c["hname"] = clean(b["hname"], 18)
        save()
        return jsonify(ok=True, me=me_view(c))


@bp.post("/api/tribe/ping")
def api_ping():
    with lock:
        c = by_token((request.get_json(silent=True) or {}).get("token"))
        if c and c["status"] == "ok" and time.time() - c["ping"] > 600:
            c["ping"] = time.time(); c["xp"] += 1
            save()
        return jsonify(ok=True)


@bp.post("/api/tribe/vote")
def api_vote():
    b = request.get_json(silent=True) or {}
    with lock:
        c = by_token(b.get("token")); v = S["vote"]
        if not c or c["status"] != "ok": return jsonify(error="اول عضو قبیله شو"), 401
        if not v["open"] or b.get("cand") not in v["cands"]: return jsonify(error="رای‌گیری بازه"), 400
        v["votes"]["g:" + c["id"]] = b["cand"]; c["xp"] += 1
        save()
        return jsonify(ok=True)


# ───────── ادمین ─────────
def found_city(winner_id):
    w = S["citizens"].get(winner_id)
    n = len(S["cities"]) + 1
    cid = n
    S["cities"].append({"id": cid, "name": "شهر %s" % ("دوم سوم چهارم پنجم ششم هفتم هشتم نهم دهم".split()[n - 2] if 2 <= n <= 10 else n),
                        "ceo": w["name"] if w else "", "ceo_id": winner_id, "founded": int(time.time())})
    if w:
        w["city"] = cid; w["xp"] += 10
        note("👑 %s با رای مردم مدیرعامل «%s» شد" % (w["name"], S["cities"][-1]["name"]))
    # چند داوطلب مهاجر از شهر پر: ۵ شهروند آخرِ شهر قبلی به شهر جدید می‌روند
    prev = [c for c in S["citizens"].values() if c["status"] == "ok" and c["city"] == cid - 1 and c["id"] != winner_id]
    prev.sort(key=lambda c: c["joined"], reverse=True)
    for c in prev[:5]: c["city"] = cid


@bp.post("/api/tribe/admin")
def api_admin():
    b = request.get_json(silent=True) or {}
    if not ADMIN_KEY or not hmac.compare_digest(str(b.get("key", "")), ADMIN_KEY):
        return jsonify(error="کلید اشتباه یا ADMIN_KEY تنظیم نشده"), 403
    op = b.get("op")
    if op == "sync":
        do_sync(True)
    with lock:
        if op == "add":
            n = 0
            for nm in re.split(r"[\n,،]+", str(b.get("names", ""))):
                if add_citizen(nm, "admin", "ok"): n += 1
            note("➕ %d شهروند جدید" % n) if n else None
        elif op == "approve":
            c = S["citizens"].get(b.get("id"))
            if c and c["status"] == "pending":
                c["status"] = "ok"; note("🎉 %s به قبیله پیوست" % c["name"])
        elif op == "remove":
            S["citizens"].pop(b.get("id"), None)
        elif op == "cap":
            S["cap"] = max(2, min(500, int(b.get("n", 30))))
        elif op == "subs":
            S["subs"] = max(0, int(b.get("n", 0)))
        elif op == "joinvid":
            S["joinvid"] = clean(b.get("video"), 40)
        elif op == "ceo1":                         # مدیرعامل شهر اول (خودت)
            S["cities"][0]["ceo"] = clean(b.get("name")); S["cities"][0]["name"] = clean(b.get("city") or S["cities"][0]["name"], 24)
        elif op == "open_vote":
            v = S["vote"]
            cands = [c for c in b.get("cands", []) if c in S["citizens"]]
            if not cands:
                pool = [c for c in S["citizens"].values() if c["status"] == "ok"]
                pool.sort(key=lambda c: (-c["xp"], c["joined"]))
                cands = [c["id"] for c in pool[:5]]
            if len(cands) < 2: return jsonify(error="حداقل ۲ نامزد لازمه"), 400
            S["vote"] = {"open": True, "cands": cands[:9], "votes": {}, "video": clean(b.get("video"), 40), "title": clean(b.get("title") or "مدیرعامل شهر جدید کیه؟", 60), "city": len(S["cities"]) + 1}
            note("🗳️ رای‌گیری مدیرعامل شهر جدید شروع شد")
        elif op == "close_vote":
            v = S["vote"]
            if v["open"]:
                votes = dict(v["votes"])
                votes.update(tally_yt())
                cnt = {}
                for cand in votes.values(): cnt[cand] = cnt.get(cand, 0) + 1
                win = max(v["cands"], key=lambda c: (cnt.get(c, 0), -S["citizens"][c]["joined"])) if v["cands"] else None
                S["vote"] = {"open": False, "cands": [], "votes": {}, "video": "", "title": "", "city": 0}
                if win: found_city(win)
        save()
        out = public(); out["all"] = [{k: c[k] for k in ("id", "name", "status", "src", "city", "job", "xp")} for c in S["citizens"].values()]
        return jsonify(ok=True, state=out)
