import os
from datetime import datetime, timezone
from typing import Any, Dict, Tuple


def get_speed_of_sound() -> float:
    return float(os.getenv("SPEED_OF_SOUND", "1480"))


def calculate_distance_from_echo(echo_time_ms: float) -> float:
    speed = get_speed_of_sound()
    return (echo_time_ms * speed) / 2


def calculate_obstruction_score(pipe_length: float, measured_distance: float) -> float:
    if pipe_length <= 0:
        raise ValueError("Pipe length must be greater than zero.")
    if measured_distance < 0:
        raise ValueError("Measured distance cannot be negative.")
    score = ((pipe_length - measured_distance) / pipe_length) * 100
    return round(max(0.0, min(100.0, score)), 2)


def calculate_blockage(pipe_length: float, measured_distance: float) -> float:
    return calculate_obstruction_score(pipe_length, measured_distance)


def calculate_water_level(pipe_length: float, measured_distance: float) -> float:
    score = calculate_obstruction_score(pipe_length, measured_distance)
    raw = (score * 0.7) + 8
    return round(max(0.0, min(100.0, raw)), 1)


def calculate_risk_score(obstruction_score: float, water_level: float) -> float:
    score = (obstruction_score * 0.4) + (water_level * 0.6)
    return round(max(0.0, min(100.0, score)), 2)


def classify_blockage(risk_score: float) -> Tuple[str, str]:
    clear_threshold = float(os.getenv("BLOCKAGE_CLEAR_THRESHOLD", "30"))
    warning_threshold = float(os.getenv("BLOCKAGE_WARNING_THRESHOLD", "60"))

    if risk_score <= clear_threshold:
        return "CLEAR", "Low"
    elif risk_score <= warning_threshold:
        return "WARNING", "Moderate"
    else:
        return "CRITICAL", "High"


def build_processing_result(manhole: Dict[str, Any], distance: float) -> Dict[str, Any]:
    pipe_length = float(manhole.get("pipeLength", 100))
    obstruction_score = calculate_obstruction_score(pipe_length, distance)
    water_level = calculate_water_level(pipe_length, distance)
    risk_score = calculate_risk_score(obstruction_score, water_level)
    status, severity = classify_blockage(risk_score)
    last_updated = datetime.now(timezone.utc).isoformat()

    return {
        "manholeId": manhole["manholeId"],
        "nodeId": manhole["nodeId"],
        "sensorId": manhole["sensorId"],
        "location": manhole["location"],
        "latitude": manhole["latitude"],
        "longitude": manhole["longitude"],
        "pipeLength": int(pipe_length),
        "obstructionDistance": round(distance, 2),
        "distance": round(distance, 2),
        "obstructionScore": obstruction_score,
        "estimatedBlockage": obstruction_score,
        "waterLevel": round(water_level, 2),
        "waterLevelPercentage": round(water_level, 2),
        "riskScore": risk_score,
        "blockageSeverity": severity,
        "status": status,
        "lastUpdated": last_updated,
    }
