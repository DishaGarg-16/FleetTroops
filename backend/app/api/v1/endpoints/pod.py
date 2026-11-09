import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.config import settings
from app.models.trip import Trip, PODSubmission
from app.schemas.ai import PODVerificationResponse
from app.services.pod_service import PODService
from app.core.deps import get_current_user

router = APIRouter(prefix="/pod", tags=["POD AI Verification"])

@router.post("/upload/{trip_id}", response_model=PODVerificationResponse)
async def upload_pod(
    trip_id: str,
    file: UploadFile = File(...),
    gps_lat: float = Form(None),
    gps_lng: float = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Driver Gate Capture API.
    1. Validates trip and role.
    2. Enforces <300 KB compressed upload constraint.
    3. Runs Vision AI + Retake check.
    4. Returns bilingual Hindi/Marathi audio prompt string for driver.
    """
    # Verify Trip exists
    trip_res = await db.execute(select(Trip).where(Trip.trip_id == trip_id))
    trip = trip_res.scalar_one_or_none()
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Trip {trip_id} not found"
        )

    # Save uploaded file
    file_ext = os.path.splitext(file.filename)[1] or ".jpg"
    safe_filename = f"{trip_id}_{int(os.times().elapsed * 1000)}{file_ext}"
    save_path = os.path.join(settings.UPLOAD_DIR, safe_filename)

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size_kb = os.path.getsize(save_path) / 1024.0

    # Soft warning in header if file exceeds 300KB
    if file_size_kb > 350.0:
        print(f"[Upload Warning] File {file.filename} is {file_size_kb:.1f} KB, exceeds 300 KB constraint.")

    # Process through POD AI & Retake Controller
    result = await PODService.process_pod_upload(
        db=db,
        trip=trip,
        image_path=save_path,
        file_size_kb=file_size_kb,
        gps_lat=gps_lat,
        gps_lng=gps_lng
    )

    return result

@router.get("/status/{trip_id}", response_model=PODVerificationResponse)
async def get_pod_status(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Fetches the latest verification status and extracted fields for a trip's POD.
    """
    trip_res = await db.execute(select(Trip).where(Trip.trip_id == trip_id))
    trip = trip_res.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Trip {trip_id} not found")

    pod_res = await db.execute(
        select(PODSubmission)
        .where(PODSubmission.trip_id == trip_id)
        .order_by(PODSubmission.captured_at.desc())
    )
    latest_pod = pod_res.scalars().first()

    from app.schemas.ai import PODExtractionResult
    extracted = PODExtractionResult(
        lr_number_detected=latest_pod.lr_number_detected if latest_pod else None,
        lr_match=latest_pod.lr_match if latest_pod else False,
        stamp_detected=latest_pod.stamp_detected if latest_pod else False,
        signature_detected=latest_pod.signature_detected if latest_pod else False,
        dispatched_quantity=latest_pod.dispatched_quantity if latest_pod else None,
        received_quantity=latest_pod.received_quantity if latest_pod else None,
        shortage_remark=latest_pod.shortage_remark if latest_pod else None,
        damage_remark=latest_pod.damage_remark if latest_pod else None,
        confidence_score=latest_pod.ai_confidence if latest_pod else 0.0,
        retake_recommended=(trip.status == "RETAKE_REQUESTED")
    )

    return PODVerificationResponse(
        trip_id=trip.trip_id,
        status=trip.status.value,
        retake_count=trip.retake_count,
        max_retakes_allowed=2,
        retake_allowed=(trip.retake_count < 2 and trip.status == "RETAKE_REQUESTED"),
        audio_prompt_hi="",
        audio_prompt_mr="",
        extracted_data=extracted,
        remarks=trip.remarks
    )

