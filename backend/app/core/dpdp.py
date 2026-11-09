import re
from typing import Optional

def mask_phone(phone: Optional[str]) -> Optional[str]:
    """
    DPDP Act 2023 Masking: Keeps country code & last 4 digits visible.
    e.g. '+91 98230 11223' -> '+91 ******1223'
    """
    if not phone:
        return None
    cleaned = re.sub(r'[\s\-]', '', phone)
    if len(cleaned) <= 4:
        return "****"
    return f"+91 ******{cleaned[-4:]}"

def mask_name(name: Optional[str]) -> Optional[str]:
    """
    DPDP Act 2023 Masking: Masks consignee individual names for public portals.
    e.g. 'Ramesh Sharma' -> 'R***** S*****'
    """
    if not name:
        return None
    parts = name.split()
    masked_parts = [f"{p[0]}{'*' * (len(p) - 1)}" if len(p) > 1 else p for p in parts]
    return " ".join(masked_parts)

