import json
import base64
import os
import httpx
from typing import Optional
from app.core.config import settings
from app.schemas.ai import PODExtractionResult
from app.services.rule_engine import DeterministicRuleEngine

VISION_SYSTEM_PROMPT = """
You are an expert Lorry Receipt (LR) and Proof-of-Delivery (POD) verification agent for Indian full-truckload transport (Company A, Maharashtra).
Examine this photograph of an Indian goods transport consignment note / LR.
Extract the following fields strictly into the specified JSON format:
1. lr_number_detected: String or null. The LR number printed or handwritten on the receipt.
2. lr_match: Boolean. Does the detected LR match the expected LR: '{expected_lr}'?
3. stamp_detected: Boolean. Is there a clear, legible consignee/receiver rubber stamp (e.g. UltraTech, JSW, Tata, dealer seal)?
4. signature_detected: Boolean. Is there a receiver signature on the acknowledgment line?
5. dispatched_quantity: Integer or null. Dispatched quantity in bags/cartons/MT.
6. received_quantity: Integer or null. Received quantity.
7. shortage_remark: String or null. Note any handwritten shortages (e.g., '6 peti kam', 'short 6 cartons', '2 bags short').
8. damage_remark: String or null. Note any damage remarks (e.g., 'torn bags', 'damage').
9. confidence_score: Float between 0.0 and 1.0 representing overall legibility.
10. retake_recommended: Boolean. True if the stamp or signature is missing, illegible, or the photo is cut off/blurry.
11. retake_reason: Short reason if retake is needed (e.g., 'Consignee stamp not visible', 'Photo blurry').

Respond ONLY with valid JSON conforming strictly to the keys above.
"""

class VisionAIService:
    @classmethod
    async def extract_pod(
        cls, 
        image_path: str, 
        expected_lr: str, 
        trip_id: str,
        file_size_kb: float
    ) -> PODExtractionResult:
        # Check if Gemini API key is available and mock mode is not forced
        api_key = settings.GEMINI_API_KEY.strip()
        if not api_key:
            # Fall back directly to deterministic engine (100% free, 100% uptime)
            return DeterministicRuleEngine.evaluate(
                image_path=image_path, 
                expected_lr=expected_lr, 
                trip_id=trip_id,
                file_size_kb=file_size_kb
            )

        try:
            # Encode image to base64
            with open(image_path, "rb") as image_file:
                encoded_image = base64.b64encode(image_file.read()).decode("utf-8")

            # Call Google Gemini 1.5/2.0 Flash via standard REST API (no complex external SDK lock-in)
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
            
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": VISION_SYSTEM_PROMPT.format(expected_lr=expected_lr)},
                            {
                                "inline_data": {
                                    "mime_type": "image/jpeg",
                                    "data": encoded_image
                                }
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "response_mime_type": "application/json",
                    "temperature": 0.1
                }
            }

            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(url, json=payload)
                if response.status_code != 200:
                    # Fallback on rate limit or API error
                    return DeterministicRuleEngine.evaluate(image_path, expected_lr, trip_id, file_size_kb)

                data = response.json()
                raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                extracted_dict = json.loads(raw_text)

                return PODExtractionResult(**extracted_dict)

        except Exception as e:
            # Safe graceful degradation: never crash on AI exceptions
            print(f"[VisionAI] Fallback triggered due to: {e}")
            return DeterministicRuleEngine.evaluate(
                image_path=image_path, 
                expected_lr=expected_lr, 
                trip_id=trip_id,
                file_size_kb=file_size_kb
            )

