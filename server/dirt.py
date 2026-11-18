# -*- coding: utf-8 -*-
"""مسیرهای خاکیِ دست‌آزاد: هر مسیر یک خط کشیده‌شده است (نه خانهٔ شبکه‌ای).
شکل ذخیره: {id, m: جنس(۰ خاک ۱ شن ۲ سنگ)، w: اندازهٔ قلم(۰..۳)، p: [[x,z],...]} با مختصات دنیا × ۵۰ (عدد صحیح)."""
from flask import Blueprint, request, jsonify
from .auth import admin_only
from .world import mutate

bp = Blueprint("dirt", __name__)
MATS, WIDTHS, MAXS, MAXP, LIM = 3, 4, 500, 400, 50 * 48


@bp.post("/api/admin/dirt")
@admin_only
def add_dirt():
    j = request.get_json(silent=True) or {}
    try: m, w = int(j.get("m", 0)), int(j.get("w", 1))
    except (TypeError, ValueError): raise ValueError("جنس یا اندازهٔ نامعتبر")
    p = j.get("p")
    if not (0 <= m < MATS and 0 <= w < WIDTHS): raise ValueError("جنس یا اندازهٔ نامعتبر")
    if not isinstance(p, list) or not 1 <= len(p) <= MAXP: raise ValueError("مسیر نامعتبر")
    pts = []
    for q in p:
        if not (isinstance(q, (list, tuple)) and len(q) == 2): raise ValueError("مسیر نامعتبر")
        x, z = int(q[0]), int(q[1])
        if abs(x) > LIM or abs(z) > LIM: raise ValueError("خارج از نقشه")
        pts.append([x, z])
    def f(d):
        L = d.setdefault("dirt", [])
        if len(L) >= MAXS: raise ValueError("به سقف تعداد مسیرها رسیدی؛ چند مسیر قدیمی را پاک کن")
        d["dirt_id"] = d.get("dirt_id", 0) + 1
        s = {"id": d["dirt_id"], "m": m, "w": w, "p": pts}; L.append(s); return s
    return jsonify(stroke=mutate(f))


@bp.delete("/api/admin/dirt/<int:sid>")
@admin_only
def del_dirt(sid):
    def f(d): d["dirt"] = [s for s in d.get("dirt", []) if s["id"] != sid]
    mutate(f); return jsonify(ok=True)
