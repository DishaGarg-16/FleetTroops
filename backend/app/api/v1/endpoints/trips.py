from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from app.core.database import get_db
from app.models.trip import Trip, PODSubmission, TripStatus
from app.schemas.trip import TripResponse, TripListResponse
from app.core.deps import get_current_user
from app.core.dpdp import mask_phone, mask_name

router = APIRouter(prefix="/trips", tags=["Trips"])

@router.get("", response_model=TripListResponse)
async def list_trips(
    status: Optional[TripStatus] = None,
    client_name: Optional[str] = None,
    vehicle_number: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    List trips with role-based filtering and DPDP Act 2023 privacy masking.
    - Drivers only see trips assigned to their vehicle.
    - Consignee contact data is automatically masked for clients & external users.
    """
    query = select(Trip)

    # Role-based restriction: Driver only sees their assigned truck
    user_role = current_user.get("role")
    if user_role == "DRIVER" and current_user.get("vehicle_number"):
        query = query.where(Trip.vehicle_number == current_user["vehicle_number"])
    elif vehicle_number:
        query = query.where(Trip.vehicle_number == vehicle_number)

    if status:
        query = query.where(Trip.status == status)
    if client_name:
        query = query.where(Trip.client_name == client_name)

    query = query.order_by(Trip.dispatched_at.desc())
    result = await db.execute(query)
    trips = result.scalars().all()

    response_items = []
    for t in trips:
        # Check latest POD image
        pod_res = await db.execute(select(PODSubmission).where(PODSubmission.trip_id == t.trip_id))
        pod = pod_res.scalars().first()

        item = TripResponse(
            trip_id=t.trip_id,
            lr_number=t.lr_number,
            eway_bill=t.eway_bill,
            client_name=t.client_name,
            vehicle_number=t.vehicle_number,
            vehicle_type=t.vehicle_type,
            origin=t.origin,
            destination=t.destination,
            freight_amount=t.freight_amount,
            status=t.status,
            remarks=t.remarks,
            retake_count=t.retake_count,
            consignee_name_masked=mask_name(t.consignee_name),
            consignee_phone_masked=mask_phone(t.consignee_phone),
            dispatched_at=t.dispatched_at,
            delivered_at=t.delivered_at,
            pod_count=1 if pod else 0,
            pod_image_url=pod.image_url if pod else None
        )
        response_items.append(item)

    return TripListResponse(total=len(response_items), trips=response_items)

@router.get("/{trip_id}", response_model=TripResponse)
async def get_trip(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    query = select(Trip).where(Trip.trip_id == trip_id)
    result = await db.execute(query)
    trip = result.scalar_one_or_none()
    
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Trip {trip_id} not found")
        
    pod_res = await db.execute(select(PODSubmission).where(PODSubmission.trip_id == trip.trip_id))
    pod = pod_res.scalars().first()

    return TripResponse(
        trip_id=trip.trip_id,
        lr_number=trip.lr_number,
        eway_bill=trip.eway_bill,
        client_name=trip.client_name,
        vehicle_number=trip.vehicle_number,
        vehicle_type=trip.vehicle_type,
        origin=trip.origin,
        destination=trip.destination,
        freight_amount=trip.freight_amount,
        status=trip.status,
        remarks=trip.remarks,
        retake_count=trip.retake_count,
        consignee_name_masked=mask_name(trip.consignee_name),
        consignee_phone_masked=mask_phone(trip.consignee_phone),
        dispatched_at=trip.dispatched_at,
        delivered_at=trip.delivered_at,
        pod_count=1 if pod else 0,
        pod_image_url=pod.image_url if pod else None
    )

