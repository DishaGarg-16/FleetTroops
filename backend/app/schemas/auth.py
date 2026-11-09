from enum import Enum
from pydantic import BaseModel
from typing import Optional

class UserRole(str, Enum):
    DRIVER = "DRIVER"
    BILLING_EXECUTIVE = "BILLING_EXECUTIVE"
    OPS_HEAD = "OPS_HEAD"
    CLIENT = "CLIENT"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    user_name: str
    phone: Optional[str] = None
    vehicle_number: Optional[str] = None

class LoginRequest(BaseModel):
    phone: str
    password: str

class UserProfile(BaseModel):
    id: str
    name: str
    phone: str
    role: UserRole
    branch: Optional[str] = "Chhatrapati Sambhajinagar"
    vehicle_number: Optional[str] = None

