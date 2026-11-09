from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class ReviewUpdateRequest(BaseModel):
    received_quantity: int
    deduction_amount: float = 0.0
    reviewer_notes: Optional[str] = None
    action: str = "APPROVE"  # "APPROVE" (moves to VERIFIED) or "REJECT"

class InvoiceCreateRequest(BaseModel):
    trip_id: str
    billing_cycle: Optional[str] = "2026-W45"

class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str
    trip_id: str
    client_name: str
    billing_cycle: str
    freight_amount: float
    deduction_amount: float
    net_payable: float
    pod_image_url: str
    tally_voucher_number: Optional[str]
    exported_to_tally: bool
    created_at: datetime

    class Config:
        from_attributes = True

class DashboardMetricsResponse(BaseModel):
    total_trips: int
    pending_pod_count: int
    needs_review_count: int
    retake_requested_count: int
    verified_count: int
    invoiced_count: int
    
    # Financial Leakage & ROI Calculations from Company A Brief
    working_capital_unlocked_cr: float # ₹3.24 Cr
    annual_interest_saved_lakh: float  # ₹38.9 Lakh
    dispute_savings_lakh: float        # ₹63.36 Lakh
    total_annual_roi_cr: float         # ₹1.02 Cr
    
    avg_pod_to_invoice_days: float     # Down from 18 days to 4 days
    critical_aging_trips_count: int    # Trips missing POD > 4 days
    
    branch_stats: List[Dict[str, Any]]

