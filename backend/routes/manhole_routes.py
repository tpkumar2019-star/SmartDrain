from fastapi import APIRouter, HTTPException, status

from services.firebase_service import get_all_manholes, get_manhole

router = APIRouter(prefix="", tags=["manholes"])


@router.get("/manholes")
async def get_manhole_list():
    return get_all_manholes()


@router.get("/manholes/{manhole_id}")
async def get_single_manhole(manhole_id: str):
    item = get_manhole(manhole_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Manhole not found: {manhole_id}",
        )
    return item
