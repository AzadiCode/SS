# -*- coding: utf-8 -*-
"""منطق دنیا: ساخت اولیه، مهاجرت دیتابیس، اقتصاد (tick)، هدف‌ها، رویدادها و خروجی عمومی (view)."""
import time, random
from datetime import datetime, timezone
from srv_config import (SIZE, CELL, FOOT, GRID_TYPES, PATH_W, DAY, FOOD_PRICE, FOOD_PER_PERSON, FARM_YIELD, MARKET_INCOME, TZ_NAME,
                     CATALOG, COST, TIERS, GOALS, RES, runtime)
from srv_db import lock, fetch, save


def now_iso(): return datetime.now(timezone.utc).isoformat(timespec="seconds")


def in_pond(x, z): return ((x * CELL + 17) / 8.6) ** 2 + ((z * CELL + 17) / 6) ** 2 < 1.15   # برکه؛ سلول → مختصات دنیا (×CELL)


# ───────── ساخت و مهاجرت ─────────
def seed():
    rnd, b = random.Random(7), []
    while len(b) < 110:
        x, z = rnd.randint(-SIZE, SIZE - 1), rnd.randint(-SIZE, SIZE - 1)
        if (-80 < x < 88 and -56 < z < 56) or in_pond(x, z) or any(i["x"] == x and i["z"] == z for i in b): continue
        b.append({"id": len(b) + 1, "type": "tree", "x": x, "z": z, "rot": rnd.choice([0, 90, 180, 270])})
    d = {"_id": "main", "rev": 1, "last": time.time(), "country": {"name": "قبیله", "gov": ""},
            "stats": {"pop": 1, "money": 10_000_000, "food": 0.0, "subs": 0}, "story": {"reached": [], "values": {}},
            "buildings": b, "events": [{"t": now_iso(), "text": "یک زمین خالی، یک بنیان‌گذار و ۱۰ میلیون تومان. قبیله از اینجا شروع می‌شود."}], "next_id": len(b) + 1, **extras()}
    ensure_hq(d)
    return d


def extras(): return {"citizens": {}, "players": {}, "chat": [], "chat_id": 0, "env": {"mode": "live", "hour": 12.0}, "hq_made": False}


def migrate(d):                                           # افزودن فیلدهای جدید به دیتابیس قدیمی
    ch = False
    for k, v in extras().items():
        if k not in d: d[k] = v; ch = True
    return ch


def ensure_hq(d):                                         # دفتر مدیرعامل: یک‌بار به‌صورت خودکار کنار مرکز ساخته می‌شود (بعدش با پنل جابه‌جا/حذف می‌شود)
    if d.get("hq_made"): return False
    d["hq_made"] = True
    if any(b["type"] == "hq" for b in d["buildings"]): return True
    notree = {**d, "buildings": [b for b in d["buildings"] if b["type"] != "tree"]}
    for r in range(0, 64):
        for x in range(-r, r + 1):
            for z in range(-r, r + 1):
                if max(abs(x), abs(z)) != r: continue
                try: check_place(notree, "hq", x, z)
                except ValueError: continue
                tiles = tiles_of(d["buildings"]); cand = {"type": "hq", "x": x, "z": z, "rot": 0}; R = rects_of(cand, tiles)
                d["buildings"] = [b for b in d["buildings"] if not (b["type"] == "tree" and any(_hit(a, c) for a in R for c in rects_of(b, tiles)))]
                d["buildings"].append({"id": d["next_id"], **cand}); d["next_id"] += 1
                return True
    return True


def fix_pond(d):                                          # ساختمان‌های قدیمیِ روی برکه جابه‌جا/حذف می‌شوند
    ch = False
    for b in list(d["buildings"]):
        if in_pond(b["x"], b["z"]):
            ch = True
            if b["type"] == "tree": d["buildings"].remove(b)
            else: b["x"], b["z"] = free_cell(d, b["type"], b["id"])
    return ch


def load():
    d = fetch()
    if not d: d = seed(); save(d)
    elif fix_pond(d) | migrate(d) | ensure_hq(d): save(d)
    return d


# ───────── نقشه و ردپای واقعی ─────────
EPS = 1e-3                                                 # لبه‌به‌لبه (تماس) برخورد نیست
LO, HI = -SIZE * CELL - CELL / 2, SIZE * CELL - CELL / 2    # مرز واقعی نقشه (واحد دنیا)؛ مرکز سلولِ لبه
_D4 = ((1, 0), (-1, 0), (0, 1), (0, -1))


def pond_world(X, Z): return ((X + 17) / 8.6) ** 2 + ((Z + 17) / 6) ** 2 < 1.15


def tiles_of(blds): return {(b["x"], b["z"]) for b in blds if b["type"] in GRID_TYPES}


def _dim(t, rot):
    """اندازهٔ آیتم (w, dp) به سلول، با درنظرگرفتن چرخش ۹۰° که عرض و عمق را جابه‌جا می‌کند."""
    w, dp = FOOT[t] if t in FOOT else FOOT["tree"]
    return (dp, w) if int(rot) % 180 else (w, dp)


def rects_of(b, tiles):
    """مستطیل واقعی یک آیتم (x0,x1,z0,z1) به واحد دنیا. پیاده‌رو = مربع مرکزی + بازو به همسایه‌های مسیر.
    همهٔ آیتم‌ها روی شبکه‌اند؛ مختصات x,z عدد صحیح (سلول)، مرکز دنیا = (x+0.5)*CELL نیست، بلکه x*CELL (مرکز سلول)؛
    برای سادگی و سازگاری با مدل‌ها، مرکز سلول = x*CELL و مستطیل از مرکز ± w/2 است."""
    t = b["type"]; x, z = b["x"] * CELL, b["z"] * CELL
    if t == "path":
        h = PATH_W / 2; R = [(x - h, x + h, z - h, z + h)]
        for dx, dz in _D4:
            if (b["x"] + dx, b["z"] + dz) in tiles:
                if dx: R.append((x if dx > 0 else x - CELL, x + CELL if dx > 0 else x, z - h, z + h))
                else:  R.append((x - h, x + h, z if dz > 0 else z - CELL, z + CELL if dz > 0 else z))
        return R
    w, dp = _dim(t, b.get("rot", 0))
    return [(x - w * CELL / 2, x + w * CELL / 2, z - dp * CELL / 2, z + dp * CELL / 2)]


def _hit(a, b): return min(a[1], b[1]) - max(a[0], b[0]) > EPS and min(a[3], b[3]) - max(a[2], b[2]) > EPS


def check_place(d, t, x, z, rot=0, ignore=None, extra=()):
    """اعتبارسنجی روی شبکهٔ سلولی: همهٔ آیتم‌ها عدد صحیح‌اند. داخل نقشه، نه روی برکه، بدون هم‌پوشانی واقعی.
    لبه‌به‌لبه (تماس) مجاز است. خروجی: (x, z, rot) نرمال‌شده."""
    x, z, rot = int(round(float(x))), int(round(float(z))), (int(round(int(rot) / 90)) * 90) % 360
    oth = [b for b in list(d["buildings"]) + list(extra) if b.get("id") != ignore]
    tiles = tiles_of(oth); tiles.add((x, z))
    cand = {"type": t, "x": x, "z": z, "rot": rot}; R = rects_of(cand, tiles)
    if any(r[0] < LO - EPS or r[1] > HI + EPS or r[2] < LO - EPS or r[3] > HI + EPS for r in R): raise ValueError("خارج از نقشه")
    if any(pond_world(px, pz) for r in R for px in (r[0], (r[0] + r[1]) / 2, r[1]) for pz in (r[2], (r[2] + r[3]) / 2, r[3])):
        raise ValueError("اینجا برکه است")
    near = [o for o in oth if abs(o["x"] - x) <= 4 and abs(o["z"] - z) <= 4]
    for o in near:
        if any(_hit(a, c) for a in R for c in rects_of(o, tiles)): raise ValueError("با ساختمان دیگری برخورد دارد")
    return x, z, rot


def free_cell(d, t, ignore=None):
    for r in range(0, SIZE * 2):
        for x in range(-r, r + 1):
            for z in range(-r, r + 1):
                if max(abs(x), abs(z)) == r and -SIZE <= x < SIZE and -SIZE <= z < SIZE:
                    try: check_place(d, t, x, z, 0, ignore)
                    except ValueError: continue
                    return x, z
    raise ValueError("جایی خالی نیست")


# ───────── اقتصاد و رویدادها ─────────
def counts(d):
    c = {}
    for b in d["buildings"]: c[b["type"]] = c.get(b["type"], 0) + 1
    return c


def capacity(d): return counts(d).get("house", 0) * 4


def tick(d):
    n = min(int((time.time() - d["last"]) // DAY), 60)
    if n <= 0: return False
    d["last"] = time.time() if n == 60 else d["last"] + n * DAY
    c, s = counts(d), d["stats"]
    for _ in range(n):
        s["food"] += c.get("farm", 0) * FARM_YIELD; s["money"] += c.get("market", 0) * MARKET_INCOME
        need = s["pop"] * FOOD_PER_PERSON
        if s["food"] >= need: s["food"] -= need
        else:                                              # کمبود غذا: خرید از خزانه
            buy = need - s["food"]; s["food"] = 0; s["money"] = max(0, s["money"] - buy * FOOD_PRICE)
    s["food"], s["money"] = round(s["food"], 1), int(s["money"])
    d["rev"] += 1
    return True


def check_goals(d):
    for at, key, title in GOALS:
        if d["stats"]["subs"] >= at and key not in d["story"]["reached"]:
            d["story"]["reached"].append(key); log_event(d, f"به {at} نفر رسیدیم! {title} — منتظر رأی شما باشید.")


def log_event(d, text):
    d["events"] = ([{"t": now_iso(), "text": text}] + d["events"])[:50]


def apply_delta(d, delta):
    for k in RES:
        v = float(delta.get(k, 0) or 0)
        if v: d["stats"][k] = max(0, int(d["stats"][k] + v) if k != "food" else round(d["stats"][k] + v, 1))
    check_goals(d)


# ───────── خروجی عمومی و تغییر ─────────
def view(d):
    return {"rev": d["rev"], "country": d["country"], "stats": d["stats"], "capacity": capacity(d),
            "buildings": d["buildings"], "events": d["events"][:20], "catalog": CATALOG, "cost": COST, "day": DAY,
            "tier": [n for at, n in TIERS if d["stats"]["subs"] >= at][-1], "tiers": [n for _, n in TIERS],
            "citizens": d["citizens"], "bot": runtime["bot_user"], "chat": d["chat"][-12:], "env": d["env"], "tz": TZ_NAME,
            "goals": [{"at": a, "key": k, "title": t, "value": d["story"]["values"].get(k)} for a, k, t in GOALS]}


def mutate(fn):
    """الگوی همه‌ی تغییرات: قفل ← بارگذاری ← tick ← اجرای fn ← rev+1 ← ذخیره"""
    with lock:
        d = load(); tick(d); out = fn(d); d["rev"] += 1; save(d); return out
