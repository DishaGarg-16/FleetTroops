from fastapi import APIRouter, HTTPException, status
from app.schemas.auth import TokenResponse, UserRole
from app.core.security import create_access_token
from app.core.demo_users import DEMO_USERS

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/demo-login/{role}", response_model=TokenResponse)
async def demo_login(role: UserRole):
    """
    1-Click Demo Login for Evaluator Review.
    Issues a fully verified JWT token scoped to the selected role.
    """
    user = DEMO_USERS.get(role)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Demo profile for role {role} not found"
        )
    
    token_data = {
        "sub": user["id"],
        "name": user["name"],
        "role": user["role"],
        "phone": user["phone"],
        "vehicle_number": user["vehicle_number"],
        "branch": user["branch"]
    }
    
    token = create_access_token(token_data)
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user["role"],
        user_name=user["name"],
        phone=user["phone"],
        vehicle_number=user["vehicle_number"]
    )

