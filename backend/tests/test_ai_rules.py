import pytest
from app.services.rule_engine import DeterministicRuleEngine
from app.schemas.ai import PODExtractionResult

def test_deterministic_verified_extraction():
    """Tests normal clean POD extraction: Stamp & signature present, no shortages."""
    result = DeterministicRuleEngine.evaluate(
        image_path="sample_clean_pod.jpg",
        expected_lr="LR-66120",
        trip_id="TRP-66120",
        file_size_kb=240.0
    )
    assert isinstance(result, PODExtractionResult)
    assert result.lr_match is True
    assert result.stamp_detected is True
    assert result.signature_detected is True
    assert result.shortage_remark is None
    assert result.retake_recommended is False
    assert result.confidence_score >= 0.90

def test_deterministic_missing_stamp_retake():
    """Tests canonical trip TRP-66134: Stamp missing triggers retake recommendation."""
    result = DeterministicRuleEngine.evaluate(
        image_path="sample_missing_stamp.jpg",
        expected_lr="LR-66134",
        trip_id="TRP-66134",
        file_size_kb=210.0
    )
    assert result.stamp_detected is False
    assert result.retake_recommended is True
    assert "stamp is missing" in result.retake_reason.lower()

def test_deterministic_shortage_detection():
    """Tests canonical trip TRP-66141: Shortage remark routes without recommending retake."""
    result = DeterministicRuleEngine.evaluate(
        image_path="sample_shortage.jpg",
        expected_lr="LR-66141",
        trip_id="TRP-66141",
        file_size_kb=225.0
    )
    assert result.stamp_detected is True
    assert result.signature_detected is True
    assert result.shortage_remark == "Short by 6 cartons"
    assert result.received_quantity == 494
    # Shortages should route to billing review, NOT ask driver for retake
    assert result.retake_recommended is False

