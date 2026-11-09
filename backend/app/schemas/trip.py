from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.trip import TripStatus, VehicleType

class TripBase(BaseModel):
    trip_id: str
    lr_number: str
    eway_bill: str
    client_name: str
    vehicle_number: str
    vehicle_type: VehicleType = VehicleType.OWN
    origin: str = "Chhatrapati Sambhajinagar"
    destination: str
    freight_amount: float
    status: TripStatus = TripStatus.PENDING_POD
    remarks: Optional[str] = None
    retake_count: int = 0

class TripCreate(TripBase):
    consignee_name: Optional[str] = None
    consignee_phone: Optional[str] = None

class TripResponse(TripBase):
    consignee_name_masked: Optional[str] = None
    consignee_phone_masked: Optional[str] = None
    dispatched_at: datetime
    delivered_at: Optional[datetime] = None
    pod_count: int = 0
    pod_image_url: Optional[str] = None

    class Config:
        from_attributes = True

class PODSubmissionResponse(BaseModel):
    id: int
    trip_id: str
    image_url: str
    file_size_kb: Optional[float]
    gps_lat: Optional[float]
    gps_lng: Optional[float]
    captured_at: datetime
    stamp_detected: bool
    signature_detected: bool
    lr_number_detected: Optional[str]
    lr_match: bool
    dispatched_quantity: Optional[int]
    received_quantity: Optional[int]
    shortage_remark: Optional[str]
    damage_remark: Optional[str]
    ai_confidence: float
    is_reviewed: bool

    class Config:
        from_attributes = True

class TripListResponse(BaseModel):
    total: int
    trips: List[TripResponse]

