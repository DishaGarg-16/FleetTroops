import os
import json
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.trip import Trip, PODSubmission, TripStatus
from app.schemas.ai import PODExtractionResult, PODVerificationResponse
from app.services.vision_ai import VisionAIService

# Audio Prompt Templates for Low-Literacy Drivers (Maharashtra Fleet)
AUDIO_PROMPTS = {
    "VERIFIED": {
        "hi": "पीओडी सफलतापूर्वक सत्यापित हो गया है। आपका बहुत धन्यवाद, आप आगे बढ़ सकते हैं।",
        "mr": "पीओडी यशस्वीरित्या पडताळले गेले आहे. धन्यवाद, आपण पुढे जाऊ शकता."
    },
    "RETAKE": {
        "hi": "कृपया ध्यान दें: बिल्टी पर मुहर या हस्ताक्षर स्पष्ट नहीं है। कृपया दुबारा साफ़ फोटो खींचें।",
        "mr": "कृपया लक्ष द्या: पावतीवर शिक्का किंवा स्वाक्षरी स्पष्ट दिसत नाही. कृपया पुन्हा स्पष्ट फोटो काढा."
    },
    "MAX_RETAKES_REVIEW": {
        "hi": "फोटो दर्ज हो गया है और कार्यालय में समीक्षा के लिए भेजा गया है। आप प्रस्थान कर सकते हैं।",
        "mr": "फोटो नोंदवला गेला आहे आणि ऑफिस तपासणीसाठी पाठवला आहे. आपण प्रस्थान करू शकता."
    },
    "SHORTAGE_REVIEW": {
        "hi": "सामान कम होने या क्षति की टिप्पणी पाई गई है। इसे बिलिंग टीम की समीक्षा के लिए भेजा गया है।",
        "mr": "माल कमी किंवा नुकसानीची नोंद आढळली आहे. हे बिलिंग टीमकडे तपासणीसाठी पाठवले आहे."
    }
}

class PODService:
    @classmethod
    async def process_pod_upload(
        cls,
        db: AsyncSession,
        trip: Trip,
        image_path: str,
        file_size_kb: float,
        gps_lat: float | None = None,
        gps_lng: float | None = None
    ) -> PODVerificationResponse:
        """
        Coordinates AI extraction, retake circuit breaker (capped at 2),
        and updates the trip state accordingly.
        """
        # 1. Run AI extraction (or deterministic fallback)
        extracted: PODExtractionResult = await VisionAIService.extract_pod(
            image_path=image_path,
            expected_lr=trip.lr_number,
            trip_id=trip.trip_id,
            file_size_kb=file_size_kb
        )

        now = datetime.now(timezone.utc)
        current_retake_count = trip.retake_count or 0

        # 2. Determine State Transitions & Retake Logic
        retake_allowed = True
        audio_key = "VERIFIED"

        # Check for Shortage or Damage Remarks
        has_shortage_or_damage = bool(extracted.shortage_remark or extracted.damage_remark)
        
        # Check if Retake is Recommended by Vision Engine (missing stamp / unreadable)
        needs_retake = extracted.retake_recommended or (not extracted.stamp_detected)

        if has_shortage_or_damage:
            # Any shortage automatically goes to Billing Review; never auto-invoiced
            trip.status = TripStatus.NEEDS_REVIEW
            trip.remarks = extracted.shortage_remark or extracted.damage_remark
            retake_allowed = False
            audio_key = "SHORTAGE_REVIEW"

        elif needs_retake:
            if current_retake_count < 2:
                # Trigger Retake (1st or 2nd attempt)
                trip.retake_count = current_retake_count + 1
                trip.status = TripStatus.RETAKE_REQUESTED
                trip.remarks = extracted.retake_reason or "Stamp or signature not clearly detected"
                retake_allowed = True
                audio_key = "RETAKE"
            else:
                # Retakes Capped at 2! Transition to NEEDS_REVIEW so driver isn't stuck at gate
                trip.status = TripStatus.NEEDS_REVIEW
                trip.remarks = f"Retake limit reached (2/2): {extracted.retake_reason or 'Stamp not visible'}. Routed to billing desk."
                retake_allowed = False
                audio_key = "MAX_RETAKES_REVIEW"

        else:
            # All verified: LR matches, stamp & signature present, no shortages
            trip.status = TripStatus.VERIFIED
            trip.remarks = None
            trip.delivered_at = now
            retake_allowed = False
            audio_key = "VERIFIED"

        trip.updated_at = now

        # 3. Save or update POD Submission record
        relative_url = f"/uploads/{os.path.basename(image_path)}"
        pod_sub = PODSubmission(
            trip_id=trip.trip_id,
            image_url=relative_url,
            file_size_kb=file_size_kb,
            gps_lat=gps_lat,
            gps_lng=gps_lng,
            captured_at=now,
            stamp_detected=extracted.stamp_detected,
            signature_detected=extracted.signature_detected,
            lr_number_detected=extracted.lr_number_detected,
            lr_match=extracted.lr_match,
            dispatched_quantity=extracted.dispatched_quantity,
            received_quantity=extracted.received_quantity,
            shortage_remark=extracted.shortage_remark,
            damage_remark=extracted.damage_remark,
            ai_confidence=extracted.confidence_score,
            ai_raw_json=extracted.model_dump_json(),
            is_reviewed=(trip.status == TripStatus.VERIFIED)
        )
        db.add(pod_sub)
        await db.commit()
        await db.refresh(trip)

        return PODVerificationResponse(
            trip_id=trip.trip_id,
            status=trip.status.value,
            retake_count=trip.retake_count,
            max_retakes_allowed=2,
            retake_allowed=retake_allowed,
            audio_prompt_hi=AUDIO_PROMPTS[audio_key]["hi"],
            audio_prompt_mr=AUDIO_PROMPTS[audio_key]["mr"],
            extracted_data=extracted,
            remarks=trip.remarks
        )

