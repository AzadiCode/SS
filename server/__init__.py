# -*- coding: utf-8 -*-
"""وب‌سرویس سبک ذخیره‌سازی پیشرفت بازیکن (فایل JSON — بدون دیتابیس خارجی)."""
import json, os, time, uuid
from flask import Flask, request, jsonify, send_from_directory

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(BASE, "web")
DATA = os.path.join(BASE, "data")
os.makedirs(DATA, exist_ok=True)


def create_app():
    app = Flask(__name__, static_folder=None)

    @app.route("/")
    @app.route("/<path:p>")
    def web(p="index.html"):
        return send_from_directory(WEB, p)

    @app.route("/api/join", methods=["POST"])
    def join():
        """شناسه‌ی بازیکن: اولویت با pid ارسالی/ذخیره‌شده است."""
        pid = (request.json or {}).get("pid") or uuid.uuid4().hex[:12]
        f = os.path.join(DATA, f"{pid}.json")
        state = None
        if os.path.exists(f):
            try:
                state = json.load(open(f, encoding="utf-8"))
            except Exception:
                state = None
        return jsonify({"pid": pid, "state": state})

    @app.route("/api/save", methods=["POST"])
    def save():
        body = request.json or {}
        pid = str(body.get("pid") or uuid.uuid4().hex[:12])[:32]
        state = body.get("state")
        if not isinstance(state, dict):
            return jsonify({"ok": False}), 400
        state["_ts"] = time.time()
        json.dump(state, open(os.path.join(DATA, f"{pid}.json"), "w", encoding="utf-8"))
        return jsonify({"ok": True})

    return app
