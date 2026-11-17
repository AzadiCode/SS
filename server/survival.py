# -*- coding: utf-8 -*-
"""هستهٔ نمونهٔ بازی بقا و پیشرفت تمدن؛ جدا از داده‌های Tribe World اصلی."""
import copy, time
from flask import Blueprint, jsonify, request
from .db import lock
from .config import MONGO_URI

bp = Blueprint("survival", __name__)
_mem = {}
_col = None
if MONGO_URI:
    try:
        from pymongo import MongoClient
        _col = MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000).get_database("tribeworld").survival_world
    except Exception:
        _col = None

ERAS = ["عصر سنگ", "عصر قبیله", "عصر فلز", "قرون میانه", "عصر صنعتی", "عصر مدرن"]

def fresh():
    return {"_id":"main", "rev":1, "era":0, "day":1,
            "resources":{"food":8,"wood":0,"stone":0,"fiber":0,"metal":0,"science":0},
            "buildings":[{"type":"camp","x":0,"z":0,"name":"آتش اردوگاه"}],
            "unlocked":["camp"], "log":["از صفر شروع کردی؛ اول چوب، سنگ و غذا جمع کن."], "last":time.time()}

def load():
    if _col is not None:
        d=_col.find_one({"_id":"main"})
        if not d:
            d=fresh(); _col.insert_one(copy.deepcopy(d))
        return d
    if "main" not in _mem: _mem["main"]=fresh()
    return _mem["main"]

def save(d):
    if _col is not None: _col.replace_one({"_id":"main"},d,upsert=True)
    else: _mem["main"]=d

def view(d):
    return {k:copy.deepcopy(v) for k,v in d.items() if k != "_id"}

def log(d,msg):
    d["log"]=(d["log"]+[msg])[-8:]

COSTS={
 "shelter":{"wood":12,"fiber":5}, "farm":{"wood":15,"stone":4},
 "workshop":{"wood":20,"stone":15}, "forge":{"wood":12,"stone":20,"metal":3},
 "factory":{"wood":35,"stone":25,"metal":20}, "lab":{"wood":25,"stone":20,"metal":15},
 "barracks":{"wood":25,"stone":20,"metal":5}
}
NAMES={"shelter":"پناهگاه","farm":"مزرعه","workshop":"کارگاه","forge":"کوره فلزکاری","factory":"کارخانه","lab":"آزمایشگاه","barracks":"پادگان"}

def action(d,a):
    r=d["resources"]; typ=a.get("type")
    if typ=="gather":
        what=a.get("resource")
        gains={"wood":3,"stone":2,"food":3,"fiber":2}
        if d["era"]>=2: gains["metal"]=2
        if what not in gains: raise ValueError("منبع نامعتبر است")
        r[what]+=gains[what]
        log(d,{"wood":"چوب جمع‌آوری شد.","stone":"سنگ جمع‌آوری شد.","food":"غذا پیدا کردی.","fiber":"الیاف گیاهی جمع کردی.","metal":"سنگ معدن فلزی استخراج کردی."}[what])
    elif typ=="build":
        b=a.get("building")
        if b not in COSTS: raise ValueError("ساختمان نامعتبر است")
        allowed={"shelter":0,"farm":1,"workshop":1,"forge":2,"barracks":2,"factory":4,"lab":4}
        if d["era"]<allowed[b]: raise ValueError("این ساختمان در عصر فعلی باز نیست")
        cost=COSTS[b]
        if any(r.get(k,0)<v for k,v in cost.items()): raise ValueError("منابع کافی نیست؛ ابتدا بیشتر جمع‌آوری کن")
        for k,v in cost.items(): r[k]-=v
        idx=len(d["buildings"]); x=((idx*7)%13)-6; z=((idx*5)%13)-6
        d["buildings"].append({"type":b,"x":x,"z":z,"name":NAMES[b]})
        log(d,NAMES[b]+" ساخته شد.")
    elif typ=="research":
        if d["era"]>=5: raise ValueError("به آخرین عصر رسیده‌ای")
        needs=[{"wood":12,"stone":8},{"wood":25,"stone":18,"science":5},{"wood":35,"metal":8,"science":12},{"metal":20,"science":25},{"metal":35,"science":50}][d["era"]]
        if any(r.get(k,0)<v for k,v in needs.items()): raise ValueError("برای پیشرفت، منابع و دانش بیشتری لازم داری")
        for k,v in needs.items(): r[k]-=v
        d["era"]+=1; d["day"]+=1
        log(d,"به "+ERAS[d["era"]]+" وارد شدی! فناوری‌های تازه باز شدند.")
    elif typ=="study":
        if d["era"]<1: raise ValueError("ابتدا به عصر قبیله برس")
        if r["food"]<2: raise ValueError("برای پژوهش به ۲ غذا نیاز داری")
        r["food"]-=2; r["science"]+=2
        log(d,"دانش قبیله افزایش یافت.")
    else: raise ValueError("فرمان ناشناخته است")
    d["rev"]+=1

@bp.get("/api/survival/state")
def state():
    with lock:
        d=load(); return jsonify(view(d))

@bp.post("/api/survival/action")
def do_action():
    data=request.get_json(silent=True) or {}
    with lock:
        d=load()
        try: action(d,data); save(d); return jsonify(view(d))
        except ValueError as e: return jsonify(error=str(e), **view(d)),400
