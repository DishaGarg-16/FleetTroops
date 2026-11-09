from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from typing import List

from app.core.database import get_db
from app.models.trip import Trip, PODSubmission, Invoice, TripStatus
from app.schemas.billing import ReviewUpdateRequest, InvoiceCreateRequest, InvoiceResponse
from app.schemas.trip import TripResponse
from app.services.tally_service import TallyIntegrationService
from app.core.deps import get_current_user, require_roles
from app.schemas.auth import UserRole
from app.core.dpdp import mask_name, mask_phone

router = APIRouter(prefix="/billing", tags=["Billing & Tally Desk"])

@router.get("/review-queue", response_model=List[TripResponse])
async def get_review_queue(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_roles([UserRole.BILLING_EXECUTIVE, UserRole.OPS_HEAD]))
):
    """
    Exception Review Queue: Trips with shortages, damage, or max retakes reached.
    Billing executive has the raw image as the source of truth.
    """
    query = select(Trip).where(Trip.status.in_([TripStatus.NEEDS_REVIEW, TripStatus.RETAKE_REQUESTED]))
    result = await db.execute(query)
    trips = result.scalars().all()

    items = []
    for t in trips:
        pod_res = await db.execute(select(PODSubmission).where(PODSubmission.trip_id == t.trip_id))
        pod = pod_res.scalars().first()
        items.append(
            TripResponse(
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
        )
    return items

@router.post("/review/{trip_id}")
async def submit_review(
    trip_id: str,
    payload: ReviewUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_roles([UserRole.BILLING_EXECUTIVE, UserRole.OPS_HEAD]))
):
    """
    Human-in-the-Loop review override.
    Resolves discrepancies and transitions trip to VERIFIED for invoicing.
    """
    trip_res = await db.execute(select(Trip).where(Trip.trip_id == trip_id))
    trip = trip_res.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    pod_res = await db.execute(select(PODSubmission).where(PODSubmission.trip_id == trip_id))
    pod = pod_res.scalars().first()

    now = datetime.now(timezone.utc)
    if payload.action == "APPROVE":
        trip.status = TripStatus.VERIFIED
        trip.remarks = f"Approved by billing desk: {payload.reviewer_notes or 'OK'}"
        if pod:
            pod.is_reviewed = True
            pod.reviewed_by = current_user.get("name", "Billing Executive")
            pod.reviewed_at = now
            pod.received_quantity = payload.received_quantity
    else:
        trip.status = TripStatus.RETAKE_REQUESTED
        trip.remarks = f"Rejected by billing desk: {payload.reviewer_notes or 'Unclear photo'}"

    await db.commit()
    return {"message": f"Trip {trip_id} status updated to {trip.status.value}"}

@router.get("/queue", response_model=List[TripResponse])
async def get_billing_queue(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_roles([UserRole.BILLING_EXECUTIVE, UserRole.OPS_HEAD]))
):
    """
    Verified Trips ready for invoicing, grouped by client and cycle.
    """
    query = select(Trip).where(Trip.status == TripStatus.VERIFIED)
    result = await db.execute(query)
    trips = result.scalars().all()

    items = []
    for t in trips:
        pod_res = await db.execute(select(PODSubmission).where(PODSubmission.trip_id == t.trip_id))
        pod = pod_res.scalars().first()
        items.append(
            TripResponse(
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
        )
    return items

@router.post("/generate-invoice/{trip_id}", response_model=InvoiceResponse)
async def generate_invoice(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_roles([UserRole.BILLING_EXECUTIVE, UserRole.OPS_HEAD]))
):
    """
    Generates customer invoice with attached POD proof.
    """
    trip_res = await db.execute(select(Trip).where(Trip.trip_id == trip_id))
    trip = trip_res.scalar_one_or_none()
    if not trip or trip.status != TripStatus.VERIFIED:
        raise HTTPException(status_code=400, detail="Trip must be in VERIFIED state to invoice")

    pod_res = await db.execute(select(PODSubmission).where(PODSubmission.trip_id == trip_id))
    pod = pod_res.scalars().first()
    pod_url = pod.image_url if pod else f"/storage/sample_pods/{trip.trip_id}.jpg"

    inv_number = f"INV-2026-{trip.trip_id.split('-')[1]}"
    invoice = Invoice(
        invoice_number=inv_number,
        trip_id=trip.trip_id,
        client_name=trip.client_name,
        billing_cycle="2026-W45",
        freight_amount=trip.freight_amount,
        deduction_amount=0.0,
        net_payable=trip.freight_amount,
        pod_image_url=pod_url,
        tally_voucher_number=f"TL-SALES-{trip.trip_id.split('-')[1]}",
        exported_to_tally=False,
        created_at=datetime.now(timezone.utc)
    )
    trip.status = TripStatus.INVOICED
    db.add(invoice)
    await db.commit()
    await db.refresh(invoice)
    return invoice

@router.get("/export/tally-xml")
async def export_tally_xml(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_roles([UserRole.BILLING_EXECUTIVE, UserRole.OPS_HEAD]))
):
    """
    Downloads compliant Tally XML for verified/invoiced trips.
    """
    result = await db.execute(select(Invoice))
    invoices = result.scalars().all()

    xml_content = TallyIntegrationService.generate_tally_xml(invoices)
    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={"Content-Disposition": 'attachment; filename="tally_vouchers_export.xml"'}
    )

