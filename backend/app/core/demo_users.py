from typing import Dict, Any
from app.schemas.auth import UserRole

# Seeded Demo Users for 1-Click Guest Access & Reviewer Evaluation
DEMO_USERS: Dict[UserRole, Dict[str, Any]] = {
    UserRole.DRIVER: {
        "id": "USR-DRV-01",
        "name": "Ramesh Jadhav",
        "phone": "9822012345",
        "role": UserRole.DRIVER,
        "branch": "Chhatrapati Sambhajinagar",
        "vehicle_number": "MH20 EL 4521"
    },
    UserRole.BILLING_EXECUTIVE: {
        "id": "USR-BIL-01",
        "name": "Priya Sharma",
        "phone": "9822054321",
        "role": UserRole.BILLING_EXECUTIVE,
        "branch": "Chhatrapati Sambhajinagar",
        "vehicle_number": None
    },
    UserRole.OPS_HEAD: {
        "id": "USR-OPS-01",
        "name": "Anand Deshmukh",
        "phone": "9822099999",
        "role": UserRole.OPS_HEAD,
        "branch": "Chhatrapati Sambhajinagar",
        "vehicle_number": None
    },
    UserRole.CLIENT: {
        "id": "USR-CLI-01",
        "name": "Company B Audit Desk",
        "phone": "9822088888",
        "role": UserRole.CLIENT,
        "branch": "Nagpur Consignee Hub",
        "vehicle_number": None
    }
}

