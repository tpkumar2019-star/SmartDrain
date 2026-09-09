import os
from datetime import datetime, timezone
from typing import Any, Dict, Tuple


def get_speed_of_sound() -> float:
    return float(os.getenv("SPEED_OF_SOUND", "1480"))


def calculate_distance_from_echo(echo_time_ms: float) -> float:
    speed = get_speed_of_sound()
    return (echo_time_ms * speed) / 2


def calculate_blockage(pipe_length: float, measured_distance: float) -> float:
    if pipe_length <= 0:
        raise ValueError("Pipe length must be greater than zero.")
    if measured_distance < 0:
        raise ValueError("Measured distance cannot be negative.")
    blockage = (1 - (measured_distance / pipe_length)) * 100
    return round(max(0.0, min(100.0, blockage)), 2)


def calculate_water_level(blockage_percent: float) -> float:
    return round(max(0.0, min(100.0, blockage_percent * 0.66)), 1)


def classify_blockage(blockage_percent: float) -> Tuple[str, str]:
    clear_threshold = float(os.getenv("BLOCKAGE_CLEAR_THRESHOLD", "35"))
    warning_threshold = float(os.getenv("BLOCKAGE_WARNING_THRESHOLD", "60"))

    if blockage_percent <= clear_threshold:
        return "CLEAR", "Low"
    elif blockage_percent <= warning_threshold:
        return "WARNING", "Medium"
    else:
        return "CRITICAL", "High"


def build_processing_result(manhole: Dict[str, Any], distance: float) -> Dict[str, Any]:
    pipe_length = float(manhole.get("pipeLength", 100))
    blockage = calculate_blockage(pipe_length, distance)
    status, severity = classify_blockage(blockage)
    water_level = calculate_water_level(blockage)
    last_updated = datetime.now(timezone.utc).isoformat()

    return {
        "manholeId": manhole["manholeId"],
        "nodeId": manhole["nodeId"],
        "sensorId": manhole["sensorId"],
        "location": manhole["location"],
        "latitude": manhole["latitude"],
        "longitude": manhole["longitude"],
        "pipeLength": int(pipe_length),
        "distance": round(distance, 2),
        "estimatedBlockage": blockage,
        "waterLevel": water_level,
        "blockageSeverity": severity,
        "status": status,
        "lastUpdated": last_updated,
    }
