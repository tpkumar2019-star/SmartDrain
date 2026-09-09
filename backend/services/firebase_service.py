from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

from config.firebase_config import firebase_db


SEED_LOCATIONS = [
    ("Sainikpuri, Hyderabad", 17.4078, 78.4665),
    ("Madhapur, Hyderabad", 17.4381, 78.3982),
    ("Banjara Hills, Hyderabad", 17.4156, 78.4347),
    ("Secunderabad, Hyderabad", 17.4399, 78.4983),
    ("Ameerpet, Hyderabad", 17.4375, 78.4483),
    ("Kukatpally, Hyderabad", 17.4849, 78.4138),
    ("Gachibowli, Hyderabad", 17.4401, 78.3489),
    ("Abids, Hyderabad", 17.3933, 78.4731),
    ("Nampally, Hyderabad", 17.3935, 78.4654),
    ("Begumpet, Hyderabad", 17.4435, 78.4624),
]


def _generate_seed_manholes() -> List[Dict[str, Any]]:
    manholes = []
    for index in range(1, 61):
        location_name, lat, lon = SEED_LOCATIONS[(index - 1) % len(SEED_LOCATIONS)]
        pipe_length = 100
        if index % 5 == 0:
            distance = 24
            status = "CRITICAL"
            blockage = 76
        elif index % 3 == 0:
            distance = 45
            status = "WARNING"
            blockage = 55
        else:
            distance = 70
            status = "CLEAR"
            blockage = 30

        manholes.append(
            {
                "manholeId": f"{index:02d}D",
                "nodeId": f"NODE_{index:02d}D",
                "sensorId": f"US-{index:02d}D",
                "location": location_name,
                "latitude": round(lat + ((index % 10) * 0.002), 4),
                "longitude": round(lon + ((index % 7) * 0.003), 4),
                "pipeLength": pipe_length,
                "distance": distance,
                "estimatedBlockage": blockage,
                "waterLevel": round(blockage * 0.66, 1),
                "blockageSeverity": "High" if status == "CRITICAL" else "Medium" if status == "WARNING" else "Low",
                "status": status,
                "lastUpdated": datetime.now(timezone.utc).isoformat(),
            }
        )
    return manholes


def _seed_if_empty() -> None:
    try:
        if not firebase_db.child("manholes").get():
            firebase_db.child("manholes").set({_m["manholeId"]: _m for _m in _generate_seed_manholes()})
    except Exception:
        pass


def _normalize_manhole_data(data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "manholeId": data.get("manholeId"),
        "nodeId": data.get("nodeId"),
        "sensorId": data.get("sensorId"),
        "location": data.get("location"),
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude"),
        "pipeLength": data.get("pipeLength", 100),
        "distance": data.get("distance", 0),
        "estimatedBlockage": data.get("estimatedBlockage", 0),
        "waterLevel": data.get("waterLevel", 0),
        "blockageSeverity": data.get("blockageSeverity", "Low"),
        "status": data.get("status", "CLEAR"),
        "lastUpdated": data.get("lastUpdated"),
    }


def _read_node(node_name: str):
    try:
        return firebase_db.child(node_name).get()
    except Exception:
        return None


def get_all_manholes() -> List[Dict[str, Any]]:
    _seed_if_empty()
    try:
        raw = _read_node("manholes")
        if not raw:
            return []
        return [_normalize_manhole_data(item) for item in raw.values()]
    except Exception:
        return []


def get_manhole(manhole_id: str) -> Dict[str, Any]:
    _seed_if_empty()
    try:
        data = firebase_db.child("manholes").child(manhole_id).get()
        if not data:
            return {}
        return _normalize_manhole_data(data)
    except Exception:
        return {}


def upsert_manhole(manhole_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    _seed_if_empty()
    try:
        firebase_db.child("manholes").child(manhole_id).set(payload)
    except Exception:
        fallback = _read_node("manholes") or {}
        fallback[manhole_id] = payload
        firebase_db.child("manholes").set(fallback)
    return payload


def record_history(manhole_id: str, payload: Dict[str, Any]) -> None:
    _seed_if_empty()
    try:
        history_ref = firebase_db.child("history").child(manhole_id)
        history = history_ref.get() or []
        if isinstance(history, dict):
            history = list(history.values())
        history.append(
            {
                "timestamp": payload["lastUpdated"],
                "distance": payload["distance"],
                "blockage": payload["estimatedBlockage"],
                "waterLevel": payload["waterLevel"],
                "status": payload["status"],
            }
        )
        history_ref.set(history[-20:])
    except Exception:
        try:
            history = _read_node("history") or {}
            manhole_history = history.get(manhole_id, [])
            if isinstance(manhole_history, dict):
                manhole_history = list(manhole_history.values())
            manhole_history.append(
                {
                    "timestamp": payload["lastUpdated"],
                    "distance": payload["distance"],
                    "blockage": payload["estimatedBlockage"],
                    "waterLevel": payload["waterLevel"],
                    "status": payload["status"],
                }
            )
            history[manhole_id] = manhole_history[-20:]
            firebase_db.child("history").set(history)
        except Exception:
            pass


def get_active_alerts() -> List[Dict[str, Any]]:
    try:
        manholes = get_all_manholes()
        active = []
        for mh in manholes:
            status = str(mh.get("status", "CLEAR")).upper()
            if status in {"WARNING", "CRITICAL"}:
                active.append(
                    {
                        "manholeId": mh.get("manholeId"),
                        "location": mh.get("location"),
                        "status": status,
                        "estimatedBlockage": mh.get("estimatedBlockage", 0),
                        "obstructionDistance": mh.get("distance", 0),
                        "waterLevel": mh.get("waterLevel", 0),
                        "lastUpdated": mh.get("lastUpdated", datetime.now(timezone.utc).isoformat()),
                        "severity": mh.get("blockageSeverity", "Low"),
                    }
                )
        return active
    except Exception:
        return []


def get_dashboard_summary() -> Dict[str, int]:
    try:
        manholes = get_all_manholes()
        total = len(manholes)
        clear = 0
        warning = 0
        critical = 0

        for mh in manholes:
            status = str(mh.get("status", "CLEAR")).upper()
            if status == "CLEAR":
                clear += 1
            elif status == "WARNING":
                warning += 1
            elif status == "CRITICAL":
                critical += 1

        return {
            "totalManholes": total,
            "clear": clear,
            "warning": warning,
            "critical": critical,
        }
    except Exception:
        return {
            "totalManholes": 0,
            "clear": 0,
            "warning": 0,
            "critical": 0,
        }
