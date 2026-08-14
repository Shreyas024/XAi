"""
Tests for the FastAPI API endpoints.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from unittest.mock import patch, AsyncMock

from api.main import app


@pytest.fixture
def mock_mongodb():
    """Mock MongoDB for testing without a real connection."""
    with patch("database.MongoDB") as mock_db:
        mock_db.get_db.return_value = AsyncMock()
        mock_db.client = AsyncMock()
        yield mock_db


@pytest.mark.asyncio
async def test_root_endpoint():
    """Root should return API info."""
    with patch("api.main.MongoDB") as mock_mongo, patch("api.main.create_indexes", new_callable=AsyncMock):
        mock_mongo.connect = AsyncMock()
        mock_mongo.disconnect = AsyncMock()
        mock_mongo.get_db.return_value = AsyncMock()
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/")

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "XAI-SecOps"
    assert body["health"] == "/health"


class TestScanRequestValidation:
    """Test request validation."""

    def test_scan_request_defaults(self):
        from api.models.schemas import ScanRequest
        req = ScanRequest(target="/some/path")
        assert req.config == "auto"
        assert req.use_custom_rules is True

    def test_scan_request_custom(self):
        from api.models.schemas import ScanRequest
        req = ScanRequest(target="/path", config="p/python", use_custom_rules=False)
        assert req.config == "p/python"
        assert req.use_custom_rules is False


class TestResponseModels:
    """Test response model validation."""

    def test_risk_factors_response_bounds(self):
        from api.models.schemas import RiskFactorsResponse
        rf = RiskFactorsResponse(
            severity_weight=0.9,
            exploitability=0.8,
            data_sensitivity=0.5,
            exposure=0.7,
            fix_complexity=0.3,
        )
        assert rf.severity_weight == 0.9

    def test_health_response(self):
        from api.models.schemas import HealthResponse
        hr = HealthResponse(
            status="healthy",
            version="0.1.0",
            mongodb="connected",
            ollama="available",
            semgrep="v1.90.0",
        )
        assert hr.status == "healthy"
