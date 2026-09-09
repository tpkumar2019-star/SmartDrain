from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class SensorReadingRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nodeId: str = Field(..., min_length=1)
    sensorId: str = Field(..., min_length=1)
    distance: float = Field(..., gt=0)


class ManholeBase(BaseModel):
    manholeId: str
    nodeId: str
    sensorId: str
    location: str
    latitude: float
    longitude: float
    pipeLength: int
    distance: float
    estimatedBlockage: float
    waterLevel: float
    blockageSeverity: str
    status: str
    lastUpdated: Optional[str] = None


class AlertItem(BaseModel):
    manholeId: str
    location: str
    status: str
    estimatedBlockage: float
    obstructionDistance: float
    waterLevel: float
    lastUpdated: str
    severity: str


class DashboardSummary(BaseModel):
    totalManholes: int
    clear: int
    warning: int
    critical: int
