# -*- coding: utf-8 -*-
"""API مدیر (همه با X-Admin-Token): ساخت/جابه‌جایی/حذف ساختمان (تکی و نقشهٔ ساخت دسته‌ای)، تغییر منابع، مشارکت‌ها،
رأی‌گیری، اتفاق داستانی، نام آدم‌ها، پیام بالای سر، و زمان دنیا. (ورود مدیر ← auth.py | فهرست آنلاین‌ها ← players.py)"""
from flask import Blueprint, request, jsonify
from srv_auth import admin_only
from srv_config import CATALOG, COST, RULES, GOALS, FOOT, U, GRID_TYPES
from srv_world import mutate, free_cell, check_place, log_event, apply_delta, rects_of, tiles_of

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
        x, z = (float(j["x"]), float(j["z"])) if j.get("x") not in (None, "") and j.get("z") not in (None, "") else free_cell(d, t)
        x, z, rot = check_place(d, t, x, z, auto_rot(d, t, x, z, j.get("rot"), auto=bool(j.get("ar"))))
        b = {"id": d["next_id"], "type": t, "x": x, "z": z, "gx": x, "gz": z, "rot": rot}
        d["next_id"] += 1; d["buildings"].append(b); d["stats"]["money"] -= cost
        if t != "tree": log_event(d, f"{CATALOG[t]} ساخته شد" + (f" (−{cost/1e6:g} میلیون تومان)." if cost else "."))
        return b
    return jsonify(building=mutate(f))


def auto_rot(d, t, x, z, rot=None, extra=(), auto=False):
    """Orient house/HQ toward the closest adjacent occupied road/path cell."""
    r = int(rot or 0) % 360
    if t not in ("house", "hq") or (rot is not None and not auto):
        return r
    roads = [b for b in list(d["buildings"]) + list(extra) if b["type"] in ("road", "path")]
    if not roads:
        return r
    dirs = {0: (0, 1), 90: (1, 0), 180: (0, -1), 270: (-1, 0)}
    best = None
    for angle, (dx, dz) in dirs.items():
        w, h = FOOT[t]
        if angle % 180: w, h = h, w
        if dx:
            gx = x + (w // 2 if dx > 0 else -(w // 2 + 1))
            edge = [(gx, z + q) for q in range(-(h // 2), h - h // 2)]
        else:
            gz = z + (h // 2 if dz > 0 else -(h // 2 + 1))
            edge = [(x + q, gz) for q in range(-(w // 2), w - w // 2)]
        dist = 10**9
        road_tiles = tiles_of(roads)
        for road in roads:
            cells = set().union(*rects_of(road, road_tiles))
            for ex, ez in edge:
                if cells:
                    dist = min(dist, min(abs(ex-cx)+abs(ez-cz) for cx,cz in cells))
        if best is None or dist < best[0]:
            best = (dist, angle)
    return best[1] if best else r


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
        for i in items:
            if i.get("type") not in CATALOG: raise ValueError("نوع ساختمان نامعتبر")
        if sum(1 for i in items if i["type"] == "hq") + sum(1 for i in d["buildings"] if i["type"] == "hq") > 1: raise ValueError("دفتر مدیرعامل فقط یکی است")
        # جاده/پیاده‌رو اول تا چرخش خودکار خانه‌ها به آن‌ها درست حساب شود
        order = sorted(items, key=lambda i: 0 if i["type"] in ("road", "path") else 1)
        made = []
        for k, i in enumerate(order):                      # همه یا هیچ: روی فهرست جدا کار می‌کنیم و آخر یکجا اعمال می‌شود
            t = i["type"]
            x, z, rot = check_place(d, t, i["x"], i["z"], auto_rot(d, t, float(i["x"]), float(i["z"]), i.get("rot"), made, bool(i.get("ar"))), None, made)
            made.append({"id": d["next_id"] + k, "type": t, "x": x, "z": z, "gx": x, "gz": z, "rot": rot, **({"style": "dirt" if i.get("style") == "dirt" else "stone"} if t == "path" else {})})
        total = 0 if free else sum(COST[b["type"]] for b in made)
        if d["stats"]["money"] < total: raise ValueError("پول خزانه کافی نیست")
        d["next_id"] += len(made); d["buildings"].extend(made); d["stats"]["money"] -= total
        kinds = {}
        for b in made: kinds[CATALOG[b["type"]]] = kinds.get(CATALOG[b["type"]], 0) + 1
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
        if b["type"] != "tree": log_event(d, f"{CATALOG[b['type']]} برداشته شد.")
    mutate(f); return jsonify(ok=True)


@bp.put("/api/admin/building/<int:bid>")
@admin_only
def move_building(bid):
    j = request.get_json(silent=True) or {}
    def f(d):
        b = next((i for i in d["buildings"] if i["id"] == bid), None)
        if not b: raise ValueError("پیدا نشد")
        b["x"], b["z"], b["rot"] = check_place(d, b["type"], j["x"], j["z"], j["rot"] if "rot" in j else b.get("rot", 0), bid)
        b["gx"], b["gz"] = b["x"], b["z"]
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
