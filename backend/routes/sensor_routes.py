from fastapi import APIRouter, HTTPException, status

from models.sensor_models import SensorReadingRequest
from services.blockage_service import build_processing_result
from services.firebase_service import get_all_manholes, upsert_manhole, record_history

router = APIRouter(prefix="", tags=["sensor"])

MANHOLE_MAP = {
    "NODE_59D": {
        "manholeId": "59D",
        "nodeId": "NODE_59D",
        "sensorId": "US-59D",
        "location": "Sainikpuri, Hyderabad",
        "latitude": 17.4078,
        "longitude": 78.4665,
        "pipeLength": 100,
    },
    "NODE_55D": {
        "manholeId": "55D",
        "nodeId": "NODE_55D",
        "sensorId": "US-55D",
        "location": "Madhapur, Hyderabad",
        "latitude": 17.4381,
        "longitude": 78.3982,
        "pipeLength": 100,
    },
}


def _find_manhole(node_id: str):
    manhole = MANHOLE_MAP.get(node_id)
    if manhole:
        return manhole

    current = get_all_manholes()
    for item in current:
        if str(item.get("nodeId")) == node_id:
            return item

    return None


@router.post("/sensor-data")
async def ingest_sensor_data(payload: SensorReadingRequest):
    manhole = _find_manhole(payload.nodeId)
    if not manhole:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown nodeId: {payload.nodeId}",
        )

    processed = build_processing_result(manhole, float(payload.distance))
    upsert_manhole(processed["manholeId"], processed)
    record_history(processed["manholeId"], processed)

    return processed
