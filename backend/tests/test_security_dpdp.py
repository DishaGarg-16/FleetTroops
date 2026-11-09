import pytest
from httpx import AsyncClient
from app.core.dpdp import mask_phone, mask_name

@pytest.mark.asyncio
async def test_driver_blocked_from_billing_review_api(client: AsyncClient, driver_token: str):
    """
    Security check: Drivers must receive HTTP 403 Forbidden
    when attempting to access the billing exception review queue.
    """
    response = await client.get(
        "/api/v1/billing/review-queue",
        headers={"Authorization": f"Bearer {driver_token}"}
    )
    assert response.status_code == 403
    assert "Access denied" in response.json()["detail"]

@pytest.mark.asyncio
async def test_billing_executive_allowed_access(client: AsyncClient, billing_token: str):
    """Billing executives must have full access to the review queue."""
    response = await client.get(
        "/api/v1/billing/review-queue",
        headers={"Authorization": f"Bearer {billing_token}"}
    )
    assert response.status_code == 200

def test_dpdp_privacy_masking_rules():
    """
    Compliance test: DPDP Act 2023 requires masking personal phone numbers and names
    before serving to client portals or external viewers.
    """
    # Phone number masking
    assert mask_phone("+91 98230 11223") == "+91 ******1223"
    assert mask_phone("9823044556") == "+91 ******4556"
    assert mask_phone(None) is None

    # Name masking
    assert mask_name("Ramesh Sharma") == "R***** S*****"
    assert mask_name("Anand") == "A****"
    assert mask_name(None) is None

