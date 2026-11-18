# -*- coding: utf-8 -*-
"""نام دلخواه خانه (روی پلاک خانه نمایش داده می‌شود). خالی = نام صاحب خانه."""
from flask import Blueprint, request, jsonify
from .auth import admin_only
from .world import mutate

bp = Blueprint("plates", __name__)


@bp.put("/api/admin/building/<int:bid>/name")
@admin_only
def set_house_name(bid):
    name = str((request.get_json(silent=True) or {}).get("name", "")).strip()[:24]
    def f(d):
        b = next((i for i in d["buildings"] if i["id"] == bid), None)
        if not b or b["type"] not in ("house", "hq"): raise ValueError("فقط خانه یا دفتر مدیرعامل نام می‌گیرد")
        if name: b["name"] = name
        else: b.pop("name", None)
    mutate(f); return jsonify(ok=True)
