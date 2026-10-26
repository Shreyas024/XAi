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


@pytest.mark.asyncio
async def test_health_endpoint():
    """Health check endpoint should return 200 with component statuses."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "mongodb" in data
    assert "ollama" in data
    assert "semgrep" in data


@pytest.mark.asyncio
async def test_scan_nonexistent_target_returns_400():
    """Triggering a scan on a non-existent path should return 400 Bad Request."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/scans",
            json={"target": "nonexistent_directory/fake_file.py"},
        )

    assert response.status_code == 400
    assert "does not exist" in response.json()["detail"]


@pytest.mark.asyncio
async def test_full_scan_pipeline_api():
    """Integration test: scan sample vulnerable app through FastAPI endpoints."""
    from database import MongoDB
    from ai_engine.codellama_client import CodeLlamaClient

    try:
        await MongoDB.connect()
    except Exception:
        pytest.skip("MongoDB service not accessible for live scan integration test")

    with patch.object(CodeLlamaClient, "is_available", new_callable=AsyncMock, return_value=False):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Trigger scan
            post_resp = await client.post(
                "/scans",
                json={"target": "tests/sample_vulnerable_app_demo.py"},
            )
            assert post_resp.status_code == 201
            scan_data = post_resp.json()
            scan_id = scan_data["scan_id"]
            assert scan_data["status"] == "completed"
            assert scan_data["total_findings"] > 0
            assert len(scan_data["findings"]) > 0

            # 2. Get scan detail
            get_resp = await client.get(f"/scans/{scan_id}")
            assert get_resp.status_code == 200
            get_data = get_resp.json()
            assert get_data["scan_id"] == scan_id
            assert len(get_data["findings"]) == scan_data["total_findings"]

            # 3. Get scan report summary
            summary_resp = await client.get(f"/reports/{scan_id}/summary")
            assert summary_resp.status_code == 200
            summary_data = summary_resp.json()
            assert summary_data["total_findings"] > 0
            assert "risk_distribution" in summary_data

            # 4. Get finding XAI explanation
            first_finding_id = get_data["findings"][0]["id"]
            explain_resp = await client.get(f"/reports/{scan_id}/findings/{first_finding_id}/explain")
            assert explain_resp.status_code == 200
            explain_data = explain_resp.json()
            assert explain_data["finding_id"] == first_finding_id
            assert len(explain_data["factor_contributions"]) == 5

            # 5. Clean up by deleting scan
            del_resp = await client.delete(f"/scans/{scan_id}")
            assert del_resp.status_code == 204
