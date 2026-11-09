import pytest
import os
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.trip import Trip, TripStatus, VehicleType
from app.services.pod_service import PODService

@pytest.mark.asyncio
async def test_retake_circuit_breaker_capped_at_two(db_session: AsyncSession, tmp_path):
    """
    Brief Constraint: Retakes are strictly capped at two.
    After 2 retakes, a 3rd failure must transition the trip to NEEDS_REVIEW
    to avoid trapping the driver at the consignee gate.
    """
    dummy_image = tmp_path / "STAMP_MISSING.jpg"
    dummy_image.write_bytes(b"dummy image data")

    # 1. Create a trip that has already undergone 1 retake
    trip = Trip(
        trip_id="TRP-TEST-RETAKE",
        lr_number="LR-TEST-RETAKE",
        eway_bill="EWB-111111",
        client_name="Test Client",
        vehicle_number="MH20 AB 1234",
        vehicle_type=VehicleType.OWN,
        origin="Chhatrapati Sambhajinagar",
        destination="Pune",
        freight_amount=25000.0,
        status=TripStatus.RETAKE_REQUESTED,
        retake_count=1
    )
    db_session.add(trip)
    await db_session.commit()

    # 2. Attempt 2: Still fails stamp check (using 66134 deterministic logic)
    res_2 = await PODService.process_pod_upload(
        db=db_session,
        trip=trip,
        image_path=str(dummy_image),
        file_size_kb=220.0
    )
    assert res_2.status == TripStatus.RETAKE_REQUESTED.value
    assert res_2.retake_count == 2
    assert res_2.retake_allowed is True

    # 3. Attempt 3: Retake limit reached (retake_count >= 2).
    # Must transition directly to NEEDS_REVIEW and disallow further retakes!
    res_3 = await PODService.process_pod_upload(
        db=db_session,
        trip=trip,
        image_path=str(dummy_image),
        file_size_kb=220.0
    )
    assert res_3.status == TripStatus.NEEDS_REVIEW.value
    assert res_3.retake_allowed is False
    assert "Retake limit reached" in res_3.remarks

