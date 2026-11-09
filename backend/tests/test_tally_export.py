import pytest
from datetime import datetime, timezone
from app.models.trip import Invoice
from app.services.tally_service import TallyIntegrationService

def test_tally_xml_format_and_ledgers():
    """
    Validates that generated Tally XML satisfies Tally Prime import schema:
    1. Outer <ENVELOPE> and <HEADER> tags.
    2. <VOUCHER VOUCHERTYPE="Sales"> tag with matching Voucher Number.
    3. Proper double-entry bookkeeping ledger pairs (Party Ledger vs Freight Income).
    4. Shortage deduction ledger included if deduction > 0.
    """
    dummy_invoice = Invoice(
        id=1,
        invoice_number="INV-2026-66120",
        trip_id="TRP-66120",
        client_name="Company B (cement)",
        billing_cycle="2026-W45",
        freight_amount=38500.0,
        deduction_amount=500.0,
        net_payable=38000.0,
        pod_image_url="/uploads/TRP-66120.jpg",
        tally_voucher_number="TL-INV-2026-66120",
        exported_to_tally=True,
        created_at=datetime.now(timezone.utc)
    )

    xml_output = TallyIntegrationService.generate_tally_xml([dummy_invoice])

    # Assertions on Tally Prime XML structure
    assert "<?xml version=" in xml_output
    assert "<ENVELOPE>" in xml_output
    assert '<VOUCHER VOUCHERTYPE="Sales"' in xml_output
    assert "<VOUCHERNUMBER>TL-INV-2026-66120</VOUCHERNUMBER>" in xml_output
    assert "<PARTYLEDGERNAME>Company B (cement)</PARTYLEDGERNAME>" in xml_output
    assert "<LEDGERNAME>Freight Income Account</LEDGERNAME>" in xml_output
    assert "<AMOUNT>38500.00</AMOUNT>" in xml_output
    assert "<LEDGERNAME>Shortage &amp; Damage Deductions</LEDGERNAME>" in xml_output
    assert "<AMOUNT>-500.00</AMOUNT>" in xml_output
    assert "</ENVELOPE>" in xml_output

