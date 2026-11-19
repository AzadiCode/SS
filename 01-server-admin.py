# -*- coding: utf-8 -*-
"""API مدیر (همه با X-Admin-Token): ساخت/جابه‌جایی/حذف ساختمان (تکی و نقشهٔ ساخت دسته‌ای)، تغییر منابع، مشارکت‌ها،
رأی‌گیری، اتفاق داستانی، نام آدم‌ها، پیام بالای سر، و زمان دنیا. (ورود مدیر ← auth.py | فهرست آنلاین‌ها ← players.py)"""
from flask import Blueprint, request, jsonify
from srv_auth import admin_only
from srv_config import CATALOG, COST, RULES, GOALS
from srv_world import mutate, free_cell, check_cell, log_event, apply_delta

bp = Blueprint("admin", __name__)


@bp.post("/api/admin/building")
@admin_only
def add_building():
    j = request.get_json(silent=True) or {}; t = j.get("type")
    if t not in CATALOG: raise ValueError("نوع ساختمان نامعتبر")
    def f(d):
        if t == "hq" and any(i["type"] == "hq" for i in d["buildings"]): raise ValueError("دفتر مدیرعامل فقط یکی است")
        cost = 0 if j.get("free") else COST[t]
        if d["stats"]["money"] < cost: raise ValueError("پول خزانه کافی نیست")
        x, z = (int(j["x"]), int(j["z"])) if j.get("x") not in (None, "") and j.get("z") not in (None, "") else free_cell(d, t)
        check_cell(d, x, z)
        b = {"id": d["next_id"], "type": t, "x": x, "z": z, "rot": auto_rot(d, t, x, z, j.get("rot"))}
        if t in ("house", "hq") and j.get("rot") is None: b["ar"] = True      # چرخش خودکار (رو به جاده/پیاده‌رو)
        d["next_id"] += 1; d["buildings"].append(b); d["stats"]["money"] -= cost
        if t in ("road", "path"): reorient(d)
        if t != "tree": log_event(d, f"{CATALOG[t]} ساخته شد" + (f" (−{cost/1e6:g} میلیون تومان)." if cost else "."))
        return b
    return jsonify(building=mutate(f))


def auto_rot(d, t, x, z, rot=None):
    """چرخش ساختمان: اگر کاربر rot داده همان؛ وگرنه درِ خانه/دفتر خودکار رو به نزدیک‌ترین جاده/پیاده‌رو
    می‌ایستد (نه تصادفی) تا پیاده‌روی اتصالِ درِ خانه بدون فاصله ساخته شود.
    rot=0 یعنی در به +z، rot=90 به +x، rot=180 به −z، rot=270 به −x.
    برای هر چرخش، فاصلهٔ منهتنِ «سلولِ جلوی در» تا نزدیک‌ترین جاده را می‌سنجیم و کمینه را برمی‌داریم."""
    r = int(rot or 0) % 360
    if t not in ("house", "hq") or rot is not None:
        return r
    roads = [i for i in d["buildings"] if i["type"] in ("road", "path")]
    if not roads:
        return r
    dirs = {0: (0, 1), 90: (1, 0), 180: (0, -1), 270: (-1, 0)}
    best = None  # (فاصله, rot)
    for rot_, (ddx, ddz) in dirs.items():
        fx, fz = x + ddx, z + ddz
        dist = min(abs(i["x"] - fx) + abs(i["z"] - fz) for i in roads)
        if best is None or dist < best[0]:
            best = (dist, rot_)
    return best[1] if best else r


def reorient(d):
    """خانه/دفتری که چرخشش خودکار است (ar) بعد از هر تغییر جاده/پیاده‌رو دوباره رو به نزدیک‌ترین مسیر می‌چرخد
    (مثل بازی‌های شهرسازی: درِ خانه همیشه به مسیر می‌چسبد)."""
    for b in d["buildings"]:
        if b["type"] in ("house", "hq") and b.get("ar"):
            b["rot"] = auto_rot(d, b["type"], b["x"], b["z"], None)


@bp.post("/api/admin/buildings/batch")
@admin_only
def add_buildings_batch():
    """ساخت دسته‌ایِ نقشهٔ ساخت: [{type,x,z,rot?}, …] — همه یا هیچ.
    جاده/پیاده‌رو اول ساخته می‌شوند تا چرخش خودکار خانه‌ها در همان دسته هم درست کار کند.
    free=رایگان؛ هزینهٔ کل یکجا کم می‌شود و یک رویداد جمعی ثبت می‌شود."""
    j = request.get_json(silent=True) or {}
    items = j.get("items") or []
    if not isinstance(items, list) or not (1 <= len(items) <= 400): raise ValueError("فهرست نامعتبر (۱ تا ۴۰۰ مورد)")
    free = bool(j.get("free"))
    def f(d):
        clean = []
        for i in items:
            t = i.get("type")
            if t not in CATALOG: raise ValueError("نوع ساختمان نامعتبر")
            x, z = int(i["x"]), int(i["z"])
            check_cell(d, x, z)          # پر بودن/برکه/خارج نقشه ← خطا و هیچی ساخته نمی‌شود
            clean.append((t, x, z, i.get("rot")))
        if any(t == "hq" for t, *_ in clean) and any(i["type"] == "hq" for i in d["buildings"]):
            raise ValueError("دفتر مدیرعامل فقط یکی است")
        total = 0 if free else sum(COST[t] for t, *_ in clean)
        if d["stats"]["money"] < total: raise ValueError("پول خزانه کافی نیست")
        # جاده/پیاده‌رو اول تا چرخش خودکار خانه‌ها به آن‌ها درست حساب شود
        clean.sort(key=lambda c: 0 if c[0] in ("road", "path") else 1)
        made = []
        for t, x, z, rot in clean:
            b = {"id": d["next_id"], "type": t, "x": x, "z": z, "rot": auto_rot(d, t, x, z, rot)}
            if t in ("house", "hq") and rot is None: b["ar"] = True
            d["next_id"] += 1; d["buildings"].append(b); made.append(b)
        reorient(d)
        d["stats"]["money"] -= total
        kinds = {}
        for t, *_ in clean: kinds[CATALOG[t]] = kinds.get(CATALOG[t], 0) + 1
        log_event(d, "نقشهٔ ساخت اجرا شد: " + "، ".join(f"{n}× {k}" for k, n in kinds.items()) + (f" (−{total/1e6:g} میلیون تومان)." if total else "."))
        return made
    return jsonify(buildings=mutate(f), ok=True)


@bp.delete("/api/admin/building/<int:bid>")
@admin_only
def del_building(bid):
    def f(d):
        b = next((i for i in d["buildings"] if i["id"] == bid), None)
        if not b: raise ValueError("پیدا نشد")
        d["buildings"].remove(b)
        if b["type"] in ("road", "path"): reorient(d)
        if b["type"] != "tree": log_event(d, f"{CATALOG[b['type']]} برداشته شد.")
    mutate(f); return jsonify(ok=True)


@bp.put("/api/admin/building/<int:bid>")
@admin_only
def move_building(bid):
    j = request.get_json(silent=True) or {}
    def f(d):
        b = next((i for i in d["buildings"] if i["id"] == bid), None)
        if not b: raise ValueError("پیدا نشد")
        x, z = int(j["x"]), int(j["z"]); check_cell(d, x, z, bid); b["x"], b["z"] = x, z
        if "rot" in j and int(j["rot"]) % 360 != b["rot"]: b["rot"] = int(j["rot"]) % 360; b["ar"] = False   # چرخش دستی ← دیگر خودکار نیست
        reorient(d)
    mutate(f); return jsonify(ok=True)


@bp.post("/api/admin/adjust")
@admin_only
def adjust():
    j = request.get_json(silent=True) or {}
    def f(d):
        apply_delta(d, j)
        if j.get("name"): d["country"]["name"] = str(j["name"])[:40]
        if j.get("note"): log_event(d, str(j["note"])[:200])
    mutate(f); return jsonify(ok=True)


@bp.post("/api/admin/contribution")
@admin_only
def contribution():
    j = request.get_json(silent=True) or {}; kind = j.get("kind"); n = max(1, min(int(j.get("count", 1)), 100000))
    if kind not in RULES: raise ValueError("نوع نامعتبر")
    def f(d):
        apply_delta(d, {k: v * n for k, v in RULES[kind].items()})
        who = "مشترک جدید" if kind == "subscriber" else "مشارکت"
        log_event(d, f"{n} {who}" + (f" — {str(j['note'])[:120]}" if j.get("note") else "") + " به قبیله پیوست.")
    mutate(f); return jsonify(ok=True)


@bp.post("/api/admin/milestone")
@admin_only
def milestone():
    j = request.get_json(silent=True) or {}; key, val = j.get("key"), str(j.get("value", "")).strip()[:40]
    if key not in [g[1] for g in GOALS] or not val: raise ValueError("کلید یا مقدار نامعتبر")
    def f(d):
        d["story"]["values"][key] = val
        if key == "name": d["country"]["name"] = val; log_event(d, f"با رأی شما نام قبیله شد «{val}».")
        else: d["country"]["gov"] = val; log_event(d, f"نظام حکومت: {val}.")
    mutate(f); return jsonify(ok=True)


@bp.post("/api/admin/event")
@admin_only
def story_event():
    j = request.get_json(silent=True) or {}; text = str(j.get("text", "")).strip()[:200]
    if not text: raise ValueError("متن اتفاق خالی است")
    def f(d): apply_delta(d, j.get("effects") or {}); log_event(d, "" + text)
    mutate(f); return jsonify(ok=True)


@bp.put("/api/admin/citizen/<int:i>")
@admin_only
def set_citizen(i):                                       # نام مستعار آدم‌ها (خالی = پیش‌فرض)
    name = str((request.get_json(silent=True) or {}).get("name", "")).strip()[:20]
    if not 0 <= i < 500: raise ValueError("شناسه نامعتبر")
    def f(d):
        if name: d["citizens"][str(i)] = {"name": name}
        else: d["citizens"].pop(str(i), None)
    mutate(f); return jsonify(ok=True)


@bp.post("/api/admin/say")
@admin_only
def say():                                                # پیام بالای سر یک آدم (cid خالی = تصادفی)
    j = request.get_json(silent=True) or {}; text = str(j.get("text", "")).strip()[:120]
    if not text: raise ValueError("پیام خالی است")
    cid = int(j["cid"]) if j.get("cid") not in (None, "") else -1
    def f(d):
        d["chat_id"] += 1; d["chat"] = (d["chat"] + [{"id": d["chat_id"], "cid": cid, "text": text}])[-40:]
    mutate(f); return jsonify(ok=True)


@bp.post("/api/admin/env")
@admin_only
def set_env():                                            # live = ساعت واقعی | fixed = ساعت ثابت | lapse = گذر سریع روز
    j = request.get_json(silent=True) or {}; mode = j.get("mode", "live")
    if mode not in ("live", "fixed", "lapse"): raise ValueError("حالت نامعتبر")
    hour = float(j.get("hour") or 0) % 24
    def f(d): d["env"] = {"mode": mode, "hour": hour}
    mutate(f); return jsonify(ok=True)
