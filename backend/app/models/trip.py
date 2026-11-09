from enum import Enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, Enum as SQLEnum, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base

class TripStatus(str, Enum):
    PENDING_POD = "PENDING_POD"
    RETAKE_REQUESTED = "RETAKE_REQUESTED"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    VERIFIED = "VERIFIED"
    INVOICED = "INVOICED"

class VehicleType(str, Enum):
    OWN = "OWN"
    HIRED = "HIRED"

class Trip(Base):
    __tablename__ = "trips"

    trip_id = Column(String(50), primary_key=True, index=True) # e.g. TRP-66120
    lr_number = Column(String(50), unique=True, index=True, nullable=False) # e.g. LR-66120
    eway_bill = Column(String(50), index=True, nullable=False) # e.g. EWB-94810293
    client_name = Column(String(100), index=True, nullable=False) # e.g. Company B (cement)
    vehicle_number = Column(String(20), index=True, nullable=False) # e.g. MH20 EL 4521
    vehicle_type = Column(SQLEnum(VehicleType), default=VehicleType.OWN, nullable=False)
    origin = Column(String(100), default="Chhatrapati Sambhajinagar", nullable=False)
    destination = Column(String(100), nullable=False) # e.g. Nagpur, Pune, Indore
    freight_amount = Column(Float, nullable=False) # e.g. 38500.0
    status = Column(SQLEnum(TripStatus), default=TripStatus.PENDING_POD, nullable=False)
    remarks = Column(Text, nullable=True) # e.g. Short by 6 cartons, Stamp not visible
    retake_count = Column(Integer, default=0, nullable=False) # Capped at 2
    
    # Consignee contact (Protected under DPDP Act 2023)
    consignee_name = Column(String(100), nullable=True)
    consignee_phone = Column(String(20), nullable=True)
    
    # Timestamps
    dispatched_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    delivered_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    pod_submissions = relationship("PODSubmission", back_populates="trip", cascade="all, delete-orphan")
    invoice = relationship("Invoice", back_populates="trip", uselist=False)

class PODSubmission(Base):
    __tablename__ = "pod_submissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    trip_id = Column(String(50), ForeignKey("trips.trip_id"), nullable=False, index=True)
    image_url = Column(String(255), nullable=False)
    file_size_kb = Column(Float, nullable=True) # Compressed target < 300 KB
    gps_lat = Column(Float, nullable=True)
    gps_lng = Column(Float, nullable=True)
    captured_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    # AI Extracted Data
    stamp_detected = Column(Boolean, default=False)
    signature_detected = Column(Boolean, default=False)
    lr_number_detected = Column(String(50), nullable=True)
    lr_match = Column(Boolean, default=False)
    dispatched_quantity = Column(Integer, nullable=True)
    received_quantity = Column(Integer, nullable=True)
    shortage_remark = Column(String(255), nullable=True)
    damage_remark = Column(String(255), nullable=True)
    ai_confidence = Column(Float, default=0.0)
    ai_raw_json = Column(Text, nullable=True)
    
    # Reviewer Override
    is_reviewed = Column(Boolean, default=False)
    reviewed_by = Column(String(100), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    trip = relationship("Trip", back_populates="pod_submissions")

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    invoice_number = Column(String(50), unique=True, index=True, nullable=False) # e.g. INV-2026-0819
    trip_id = Column(String(50), ForeignKey("trips.trip_id"), unique=True, nullable=False)
    client_name = Column(String(100), nullable=False)
    billing_cycle = Column(String(20), nullable=False) # e.g. 2026-W45
    freight_amount = Column(Float, nullable=False)
    deduction_amount = Column(Float, default=0.0) # For shortage/damage
    net_payable = Column(Float, nullable=False)
    pod_image_url = Column(String(255), nullable=False)
    tally_voucher_number = Column(String(50), nullable=True)
    exported_to_tally = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    trip = relationship("Trip", back_populates="invoice")

