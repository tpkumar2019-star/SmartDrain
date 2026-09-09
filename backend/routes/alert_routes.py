from fastapi import APIRouter

from services.firebase_service import get_active_alerts

router = APIRouter(prefix="", tags=["alerts"])


@router.get("/alerts")
async def get_alerts():
    return get_active_alerts()
