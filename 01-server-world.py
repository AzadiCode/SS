# -*- coding: utf-8 -*-
"""منطق دنیا: ساخت اولیه، مهاجرت دیتابیس، اقتصاد (tick)، هدف‌ها، رویدادها و خروجی عمومی (view)."""
import time, random, math
from datetime import datetime, timezone
from srv_config import (SIZE, CELL, FOOT, GRID_TYPES, DAY, FOOD_PRICE, FOOD_PER_PERSON, FARM_YIELD, MARKET_INCOME, TZ_NAME,
                     CATALOG, COST, TIERS, GOALS, RES, runtime)
from srv_db import lock, fetch, save


def now_iso(): return datetime.now(timezone.utc).isoformat(timespec="seconds")


def in_pond(x, z): return ((x * 2 + 17) / 8.6) ** 2 + ((z * 2 + 17) / 6) ** 2 < 1.15   # برکه؛ سلول‌ها → مختصات دنیا (×۲)


# ───────── ساخت و مهاجرت ─────────
def seed():
    rnd, b = random.Random(7), []
    while len(b) < 110:
        x, z = rnd.randint(-SIZE, SIZE - 1), rnd.randint(-SIZE, SIZE - 1)
        if (-10 < x < 11 and -7 < z < 7) or in_pond(x, z) or any(i["x"] == x and i["z"] == z for i in b): continue
        b.append({"id": len(b) + 1, "type": "tree", "x": x, "z": z, "rot": rnd.choice([0, 90, 180, 270])})
    d = {"_id": "main", "rev": 1, "last": time.time(), "country": {"name": "قبیله", "gov": ""},
            "stats": {"pop": 1, "money": 10_000_000, "food": 0.0, "subs": 0}, "story": {"reached": [], "values": {}},
            "buildings": b, "events": [{"t": now_iso(), "text": "یک زمین خالی، یک بنیان‌گذار و ۱۰ میلیون تومان. قبیله از اینجا شروع می‌شود."}], "next_id": len(b) + 1, **extras()}
    ensure_hq(d)
    return d


def extras(): return {"citizens": {}, "players": {}, "chat": [], "chat_id": 0, "env": {"mode": "live", "hour": 12.0}, "hq_made": False, "infrastructure": None}


def migrate(d):                                           # افزودن فیلدهای جدید به دیتابیس قدیمی
    ch = False
    for k, v in extras().items():
        if k not in d: d[k] = v; ch = True
    from srv_infra import infra_migrate                   # کاشی‌های قدیمی ← مسیرهای هندسی v2 (تکرارپذیر)
    if infra_migrate(d): ch = True
    return ch


def ensure_hq(d):                                         # دفتر مدیرعامل: یک‌بار به‌صورت خودکار کنار مرکز ساخته می‌شود (بعدش با پنل جابه‌جا/حذف می‌شود)
    if d.get("hq_made"): return False
    d["hq_made"] = True
    if any(b["type"] == "hq" for b in d["buildings"]): return True
    notree = {**d, "buildings": [b for b in d["buildings"] if b["type"] != "tree"]}
    for r in range(0, 8):
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
LO, HI = -SIZE * CELL - 1, SIZE * CELL - 1                 # مرز واقعی نقشه (واحد دنیا)
_D4 = ((1, 0), (-1, 0), (0, 1), (0, -1))


def pond_world(X, Z): return ((X + 17) / 8.6) ** 2 + ((Z + 17) / 6) ** 2 < 1.15


def tiles_of(blds): return {(b["x"], b["z"]) for b in blds if b["type"] in GRID_TYPES}


def rects_of(b, tiles):
    """مستطیل‌های واقعی یک آیتم (x0,x1,z0,z1) به واحد دنیا. پیاده‌رو = مربع مرکزی + بازو به همسایه‌های مسیر."""
    t = b["type"]; x, z = b["x"] * CELL, b["z"] * CELL; w, dp, ox, oz = FOOT[t]
    if t == "path":
        h = .33; R = [(x - h, x + h, z - h, z + h)]
        for dx, dz in _D4:
            if (b["x"] + dx, b["z"] + dz) in tiles:
                R.append(((x if dx > 0 else x - 1), (x + 1 if dx > 0 else x), z - .3, z + .3) if dx else (x - .3, x + .3, (z if dz > 0 else z - 1), (z + 1 if dz > 0 else z)))
        return R
    a = 0 if t in GRID_TYPES else math.radians(b.get("rot", 0)); s, c = round(math.sin(a)), round(math.cos(a))
    cx, cz = x + ox * c + oz * s, z - ox * s + oz * c
    if s: w, dp = dp, w
    return [(cx - w / 2, cx + w / 2, cz - dp / 2, cz + dp / 2)]


def _hit(a, b): return min(a[1], b[1]) - max(a[0], b[0]) > EPS and min(a[3], b[3]) - max(a[2], b[2]) > EPS


def check_place(d, t, x, z, rot=0, ignore=None, extra=()):
    """اعتبارسنجی با شکل واقعی: داخل نقشه، نه روی برکه، بدون هم‌پوشانیِ واقعی با هیچ آیتمی. خروجی: (x, z, rot) نرمال‌شده.
    زیرساخت v2: جاده/پیاده‌روی جدید (کاشی) پذیرفته نمی‌شود (باید از /api/admin/infra بیاید)؛
    ساختمان هم نباید روی مسیرهای هندسی v2 بیفتد (برخورد واقعی چندضلعی-مستطیل)."""
    from srv_infra import infra_view, infra_load, edge_polys, poly_vs_rect
    if t in GRID_TYPES: x, z, rot = int(round(float(x))), int(round(float(z))), 0
    else: x, z, rot = round(float(x), 4), round(float(z), 4), (int(round(int(rot) / 90)) * 90) % 360
    oth = [b for b in list(d["buildings"]) + list(extra) if b.get("id") != ignore]
    tiles = tiles_of(oth)
    if t in GRID_TYPES: tiles.add((x, z))
    cand = {"type": t, "x": x, "z": z, "rot": rot}; R = rects_of(cand, tiles)
    if any(r[0] < LO - EPS or r[1] > HI + EPS or r[2] < LO - EPS or r[3] > HI + EPS for r in R): raise ValueError("خارج از نقشه")
    if pond_world(x * CELL, z * CELL) if t in GRID_TYPES else any(pond_world(px, pz) for r in R for px in (r[0], (r[0] + r[1]) / 2, r[1]) for pz in (r[2], (r[2] + r[3]) / 2, r[3])):
        raise ValueError("اینجا برکه است")
    # برخورد با مسیرهای هندسی v2 (تماس لبه‌به‌لبه مجاز — poly_vs_rect همین را رعایت می‌کند)
    inf = infra_load(infra_view(d))
    for eid in inf["edges"]:
        _, poly = edge_polys(inf, eid)
        for r in R:
            if poly_vs_rect(poly, (r[0], r[1], r[2], r[3])): raise ValueError("با جاده یا پیاده‌رو برخورد دارد")
    for sid, s in inf["surfaces"].items():                # ساختمان روی سطح خاکی مجاز است (سطح پایه است) — فقط مسیرها مانع‌اند
        pass
    near = [o for o in oth if abs(o["x"] - x) <= 2 and abs(o["z"] - z) <= 2]
    for o in near:
        if any(_hit(a, c) for a in R for c in rects_of(o, tiles)): raise ValueError("با ساختمان دیگری برخورد دارد")
    if t in GRID_TYPES:                                    # بازوی تازهٔ همسایه‌های مسیر هم نباید روی چیزی بیفتد
        for dx, dz in _D4:
            n = next((o for o in oth if o["type"] in GRID_TYPES and o["x"] == x + dx and o["z"] == z + dz), None)
            if not n: continue
            Rn = rects_of(n, tiles)
            for o in oth:
                if o is n or abs(o["x"] - n["x"]) > 2 or abs(o["z"] - n["z"]) > 2: continue
                if any(_hit(a, c) for a in Rn for c in rects_of(o, tiles)): raise ValueError("با ساختمان دیگری برخورد دارد")
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
    from srv_infra import infra_view
    return {"rev": d["rev"], "country": d["country"], "stats": d["stats"], "capacity": capacity(d),
            "buildings": d["buildings"], "events": d["events"][:20], "catalog": CATALOG, "cost": COST, "day": DAY,
            "tier": [n for at, n in TIERS if d["stats"]["subs"] >= at][-1], "tiers": [n for _, n in TIERS],
            "citizens": d["citizens"], "bot": runtime["bot_user"], "chat": d["chat"][-12:], "env": d["env"], "tz": TZ_NAME,
            "infrastructure": infra_view(d),
            "goals": [{"at": a, "key": k, "title": t, "value": d["story"]["values"].get(k)} for a, k, t in GOALS]}


def mutate(fn):
    """الگوی همه‌ی تغییرات: قفل ← بارگذاری ← tick ← اجرای fn ← rev+1 ← ذخیره"""
    with lock:
        d = load(); tick(d); out = fn(d); d["rev"] += 1; save(d); return out
