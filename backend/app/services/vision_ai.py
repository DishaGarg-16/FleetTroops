import json
import base64
import os
import httpx
from typing import Optional
from app.core.config import settings
from app.schemas.ai import PODExtractionResult
from app.services.rule_engine import DeterministicRuleEngine

VISION_SYSTEM_PROMPT = """
You are an expert Lorry Receipt (LR) and Proof-of-Delivery (POD) verification agent for Indian transport (Company A, Maharashtra).
Examine this photograph.

CRITICAL INSTRUCTIONS:
1. Is this actually a photograph of a transport document, Lorry Receipt (LR), bilty, or consignment delivery note?
   If this is a random image (selfie, landscape, person, household item, random paper, or NOT a goods delivery receipt), you MUST set:
   - stamp_detected: false
   - signature_detected: false
   - lr_match: false
   - lr_number_detected: null
   - retake_recommended: true
   - retake_reason: "Invalid photo. No transport delivery receipt, consignee stamp or signature detected."

2. If this IS a valid transport delivery document:
   - lr_number_detected: Extract printed or written LR number.
   - lr_match: True if detected LR matches expected LR: '{expected_lr}'.
   - stamp_detected: True ONLY if a rubber seal or stamp of the receiver/consignee is clearly visible.
   - signature_detected: True ONLY if receiver signature is present.
   - dispatched_quantity: Dispatched quantity (bags/cartons/MT) or null.
   - received_quantity: Received quantity or null.
   - shortage_remark: Handwritten shortage notes (e.g. 'short 6 cartons', 'kam', 'shortage') or null.
   - damage_remark: Any damage notes or null.
   - confidence_score: Float between 0.0 and 1.0.
   - retake_recommended: True if stamp or signature is missing, blurred, or document is illegible.
   - retake_reason: Reason for retake if needed.

Respond strictly with valid JSON conforming to these fields.
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
        api_key = settings.GEMINI_API_KEY.strip()
        
        # If mock AI is forced or no key is configured, use deterministic rule engine
        if settings.USE_MOCK_AI or not api_key:
            return DeterministicRuleEngine.evaluate(
                image_path=image_path, 
                expected_lr=expected_lr, 
                trip_id=trip_id,
                file_size_kb=file_size_kb
            )

        # 1. First Attempt: Try Pydantic AI Agent if pydantic-ai is installed
        try:
            from pydantic_ai import Agent
            from pydantic_ai.models.gemini import GeminiModel

            # Normalize model name (handle 'google:gemini-1.5-flash' or 'gemini-1.5-flash')
            raw_model = settings.GEMINI_MODEL.strip()
            clean_model = raw_model.replace("google:", "").strip()
            if not clean_model:
                clean_model = "gemini-1.5-flash"

            model = GeminiModel(clean_model, api_key=api_key)
            agent = Agent(
                model,
                result_type=PODExtractionResult,
                system_prompt=VISION_SYSTEM_PROMPT.format(expected_lr=expected_lr)
            )

            with open(image_path, "rb") as f:
                img_bytes = f.read()

            result = await agent.run(
                "Analyze this uploaded proof-of-delivery photo for verification.",
                message_history=[]
            )
            if result and isinstance(result.data, PODExtractionResult):
                return result.data
        except ImportError:
            pass  # Fall through to direct SDK/REST handler
        except Exception as pydantic_err:
            print(f"[PydanticAI Agent] Warning: {pydantic_err}, trying direct GenAI caller...")

        # 2. Second Attempt: Robust Direct Google GenAI call with x-goog-api-key header
        try:
            with open(image_path, "rb") as image_file:
                encoded_image = base64.b64encode(image_file.read()).decode("utf-8")

            # Clean model name
            raw_model = settings.GEMINI_MODEL.strip().replace("google:", "")
            model_candidate = raw_model if raw_model else "gemini-1.5-flash"

            # Pass API key in header to prevent 404 URL parameter routing bugs
            headers = {
                "Content-Type": "application/json",
                "x-goog-api-key": api_key
            }

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

            # Try candidate model, fallback to gemini-1.5-flash-latest or gemini-2.0-flash if 404
            models_to_try = [model_candidate, "gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-8b"]
            # Deduplicate while preserving order
            seen = set()
            models_to_try = [m for m in models_to_try if not (m in seen or seen.add(m))]

            async with httpx.AsyncClient(timeout=20.0) as client:
                for mod in models_to_try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{mod}:generateContent"
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                        extracted_dict = json.loads(raw_text)
                        return PODExtractionResult(**extracted_dict)
                    elif resp.status_code == 404:
                        print(f"[Gemini Vision] Model {mod} returned 404, trying next model in fallback list...")
                        continue
                    else:
                        print(f"[Gemini Vision] Error {resp.status_code}: {resp.text}")
                        break

        except Exception as e:
            print(f"[VisionAI] Fallback triggered due to: {e}")

        # 3. Deterministic Safety Fallback
        return DeterministicRuleEngine.evaluate(
            image_path=image_path, 
            expected_lr=expected_lr, 
            trip_id=trip_id,
            file_size_kb=file_size_kb
        )
