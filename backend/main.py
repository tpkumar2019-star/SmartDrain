import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.sensor_routes import router as sensor_router
from routes.manhole_routes import router as manhole_router
from routes.alert_routes import router as alert_router

app = FastAPI(
    title="SmartDrain Backend",
    description="FastAPI backend for SmartDrain sensor simulation and drainage monitoring.",
    version="1.0.0",
)

origins = []
raw_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5500,http://127.0.0.1:5500,http://localhost:8000,http://127.0.0.1:8000,http://localhost:8001,http://127.0.0.1:8001",
)
for item in raw_origins.split(","):
    value = item.strip()
    if value:
        origins.append(value)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sensor_router)
app.include_router(manhole_router)
app.include_router(alert_router)


@app.get("/")
async def root():
    return {
        "message": "SmartDrain backend is running",
        "docs": "/docs",
        "status": "ok",
    }


@app.get("/dashboard/summary")
async def get_dashboard_summary():
    from services.firebase_service import get_dashboard_summary

    return get_dashboard_summary()
