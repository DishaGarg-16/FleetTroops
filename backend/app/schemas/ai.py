from pydantic import BaseModel, Field
from typing import Optional

class PODExtractionResult(BaseModel):
    """
    Structured extraction schema for Proof-of-Delivery (LR/POD) images.
    Adheres strictly to the 6-point verification checklist.
    """
    lr_number_detected: Optional[str] = Field(
        None, description="Lorry Receipt (LR) number detected on document"
    )
    lr_match: bool = Field(
        False, description="Whether detected LR matches the expected Trip LR"
    )
    stamp_detected: bool = Field(
        False, description="Consignee or receiver rubber stamp clearly detected"
    )
    signature_detected: bool = Field(
        False, description="Receiver signature detected on acknowledgment line"
    )
    dispatched_quantity: Optional[int] = Field(
        None, description="Quantity dispatched (bags/cartons/MT/bundles)"
    )
    received_quantity: Optional[int] = Field(
        None, description="Quantity actually received at consignee gate"
    )
    shortage_remark: Optional[str] = Field(
        None, description="Remarks noting shortage e.g. 'Short by 6 cartons'"
    )
    damage_remark: Optional[str] = Field(
        None, description="Remarks noting damage e.g. '2 bags torn, moisture damaged'"
    )
    delivery_date: Optional[str] = Field(
        None, description="Delivery or gate in-time date stamped on receipt"
    )
    confidence_score: float = Field(
        0.0, ge=0.0, le=1.0, description="Overall AI extraction confidence"
    )
    retake_recommended: bool = Field(
        False, description="Whether photo quality requires a retake"
    )
    retake_reason: Optional[str] = Field(
        None, description="Human-readable reason for retake"
    )

class PODVerificationResponse(BaseModel):
    trip_id: str
    status: str
    retake_count: int
    max_retakes_allowed: int = 2
    retake_allowed: bool
    audio_prompt_hi: str
    audio_prompt_mr: str
    extracted_data: PODExtractionResult
    remarks: Optional[str] = None

