import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import engine, Base, AsyncSessionLocal
from app.models.trip import Trip, PODSubmission, Invoice, TripStatus, VehicleType

# 3 Canonical Trips from Company A Prompt + Realistic Fleet Cross-Section
SEED_TRIPS = [
    {
        "trip_id": "TRP-66120",
        "lr_number": "LR-66120",
        "eway_bill": "EWB-281903829102",
        "client_name": "Company B (cement)",
        "vehicle_number": "MH20 EL 4521",
        "vehicle_type": VehicleType.OWN,
        "origin": "Chhatrapati Sambhajinagar",
        "destination": "Nagpur",
        "freight_amount": 38500.0,
        "status": TripStatus.VERIFIED,
        "remarks": None,
        "retake_count": 0,
        "consignee_name": "UltraTech Depot Nagpur",
        "consignee_phone": "+91 98230 11223",
        "days_ago": 2,
        "has_pod": True,
        "pod_stamp": True,
        "pod_sig": True,
        "pod_match": True,
        "pod_shortage": None,
        "ai_conf": 0.96
    },
    {
        "trip_id": "TRP-66134",
        "lr_number": "LR-66134",
        "eway_bill": "EWB-482019284711",
        "client_name": "Company C (steel)",
        "vehicle_number": "MH20 GT 7718",
        "vehicle_type": VehicleType.OWN,
        "origin": "Chhatrapati Sambhajinagar",
        "destination": "Pune",
        "freight_amount": 26000.0,
        "status": TripStatus.RETAKE_REQUESTED,
        "remarks": "Stamp not visible",
        "retake_count": 1,
        "consignee_name": "Tata BlueScope Warehousing",
        "consignee_phone": "+91 98230 44556",
        "days_ago": 3,
        "has_pod": True,
        "pod_stamp": False, # Triggered retake
        "pod_sig": True,
        "pod_match": True,
        "pod_shortage": None,
        "ai_conf": 0.62
    },
    {
        "trip_id": "TRP-66141",
        "lr_number": "LR-66141",
        "eway_bill": "EWB-571938201948",
        "client_name": "Company D (packaged foods)",
        "vehicle_number": "MH17 BY 3092",
        "vehicle_type": VehicleType.HIRED, # Hired truck
        "origin": "Chhatrapati Sambhajinagar",
        "destination": "Indore",
        "freight_amount": 41200.0,
        "status": TripStatus.NEEDS_REVIEW,
        "remarks": "Short by 6 cartons",
        "retake_count": 0,
        "consignee_name": "ITC Distribution Hub Indore",
        "consignee_phone": "+91 98230 77889",
        "days_ago": 4,
        "has_pod": True,
        "pod_stamp": True,
        "pod_sig": True,
        "pod_match": True,
        "pod_shortage": "Short by 6 cartons",
        "ai_conf": 0.91
    },
    # Additional Realistic Trips for Operations Dashboard (Aging & Missing PODs)
    {
        "trip_id": "TRP-66155",
        "lr_number": "LR-66155",
        "eway_bill": "EWB-839201827401",
        "client_name": "Company B (cement)",
        "vehicle_number": "MH20 EL 9912",
        "vehicle_type": VehicleType.OWN,
        "origin": "Chhatrapati Sambhajinagar",
        "destination": "Nashik",
        "freight_amount": 24000.0,
        "status": TripStatus.PENDING_POD,
        "remarks": "Trip delivered 5 days ago; POD missing",
        "retake_count": 0,
        "consignee_name": "ACC Cement Dealer",
        "consignee_phone": "+91 98230 99001",
        "days_ago": 5,
        "has_pod": False,
        "ai_conf": 0.0
    },
    {
        "trip_id": "TRP-66162",
        "lr_number": "LR-66162",
        "eway_bill": "EWB-102938475612",
        "client_name": "Company C (steel)",
        "vehicle_number": "MH15 AB 4910",
        "vehicle_type": VehicleType.HIRED,
        "origin": "Chhatrapati Sambhajinagar",
        "destination": "Mumbai (JNPT)",
        "freight_amount": 46500.0,
        "status": TripStatus.PENDING_POD,
        "remarks": "In dead zone near Kasara Ghat",
        "retake_count": 0,
        "consignee_name": "JSW Logistics Yard",
        "consignee_phone": "+91 98230 22334",
        "days_ago": 8, # Critical aging (>4 days)
        "has_pod": False,
        "ai_conf": 0.0
    },
    {
        "trip_id": "TRP-66110",
        "lr_number": "LR-66110",
        "eway_bill": "EWB-994820193820",
        "client_name": "Company B (cement)",
        "vehicle_number": "MH20 EL 3211",
        "vehicle_type": VehicleType.OWN,
        "origin": "Chhatrapati Sambhajinagar",
        "destination": "Kolhapur",
        "freight_amount": 35000.0,
        "status": TripStatus.INVOICED,
        "remarks": "Billed in Tally (INV-2026-0810)",
        "retake_count": 0,
        "consignee_name": "Ambuja Regional Hub",
        "consignee_phone": "+91 98230 55667",
        "days_ago": 12,
        "has_pod": True,
        "pod_stamp": True,
        "pod_sig": True,
        "pod_match": True,
        "pod_shortage": None,
        "ai_conf": 0.98
    }
]

async def seed_database():
    print("Initializing Database Tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as session:
        now = datetime.now(timezone.utc)
        print("Seeding Company A Logistics Trips & PODs...")

        for data in SEED_TRIPS:
            dispatched = now - timedelta(days=data["days_ago"])
            delivered = dispatched + timedelta(hours=28)

            trip = Trip(
                trip_id=data["trip_id"],
                lr_number=data["lr_number"],
                eway_bill=data["eway_bill"],
                client_name=data["client_name"],
                vehicle_number=data["vehicle_number"],
                vehicle_type=data["vehicle_type"],
                origin=data["origin"],
                destination=data["destination"],
                freight_amount=data["freight_amount"],
                status=data["status"],
                remarks=data["remarks"],
                retake_count=data["retake_count"],
                consignee_name=data["consignee_name"],
                consignee_phone=data["consignee_phone"],
                dispatched_at=dispatched,
                delivered_at=delivered
            )
            session.add(trip)
            await session.flush()

            if data.get("has_pod"):
                pod = PODSubmission(
                    trip_id=trip.trip_id,
                    image_url=f"/storage/sample_pods/{trip.trip_id}.jpg",
                    file_size_kb=242.5,
                    gps_lat=19.8762, # Consignee gate near destination
                    gps_lng=75.3433,
                    captured_at=delivered,
                    stamp_detected=data.get("pod_stamp", True),
                    signature_detected=data.get("pod_sig", True),
                    lr_number_detected=data["lr_number"],
                    lr_match=data.get("pod_match", True),
                    dispatched_quantity=500,
                    received_quantity=494 if data.get("pod_shortage") else 500,
                    shortage_remark=data.get("pod_shortage"),
                    ai_confidence=data.get("ai_conf", 0.95),
                    is_reviewed=(data["status"] in [TripStatus.VERIFIED, TripStatus.INVOICED])
                )
                session.add(pod)

            if data["status"] == TripStatus.INVOICED:
                invoice = Invoice(
                    invoice_number=f"INV-2026-{trip.trip_id.split('-')[1]}",
                    trip_id=trip.trip_id,
                    client_name=trip.client_name,
                    billing_cycle="2026-W44",
                    freight_amount=trip.freight_amount,
                    deduction_amount=0.0,
                    net_payable=trip.freight_amount,
                    pod_image_url=f"/storage/sample_pods/{trip.trip_id}.jpg",
                    tally_voucher_number=f"TL-SALES-{trip.trip_id.split('-')[1]}",
                    exported_to_tally=True,
                    created_at=delivered + timedelta(days=1)
                )
                session.add(invoice)

        await session.commit()
        print("Database seeded successfully with Company A test fleet data.")

if __name__ == "__main__":
    asyncio.run(seed_database())

