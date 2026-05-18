"""
Tests for the AI engine (CodeLlama heuristic fallback).
"""

import pytest
from ai_engine.codellama_client import CodeLlamaClient


class TestCodeLlamaHeuristic:
    """Test the heuristic fallback scoring."""

    def test_sql_injection_scoring(self):
        """SQL injection should score high."""
        result = CodeLlamaClient._heuristic_analysis(
            code_snippet="cursor.execute(f'SELECT * FROM users WHERE id = {request.args.get(\"id\")}')",
            vulnerability_type="CWE-89: SQL Injection",
            message="SQL injection via string formatting",
        )

        assert result["risk_score"] > 6.0
        assert result["factors"]["severity_weight"] >= 0.9
        assert result["factors"]["exploitability"] >= 0.7  # "request" keyword

    def test_weak_hash_scoring(self):
        """Weak hash should score lower than injection."""
        result = CodeLlamaClient._heuristic_analysis(
            code_snippet="h = hashlib.md5(data.encode())",
            vulnerability_type="CWE-328: Weak Hash",
            message="Use of MD5",
        )

        assert result["risk_score"] < 7.0
        assert result["factors"]["severity_weight"] >= 0.4

    def test_hardcoded_secret_with_sensitive_data(self):
        """Hardcoded password should detect data sensitivity."""
        result = CodeLlamaClient._heuristic_analysis(
            code_snippet='password = "admin123"',
            vulnerability_type="CWE-798: Hardcoded Credentials",
            message="Hardcoded password",
        )

        assert result["factors"]["data_sensitivity"] >= 0.7

    def test_route_handler_exposure(self):
        """Code in a route handler should have high exposure."""
        result = CodeLlamaClient._heuristic_analysis(
            code_snippet='@app.post("/login")\ndef login(request): ...',
            vulnerability_type="test-vuln",
            message="Test",
        )

        assert result["factors"]["exposure"] >= 0.7

    def test_result_structure(self):
        """Result should have all required keys."""
        result = CodeLlamaClient._heuristic_analysis(
            code_snippet="x = 1",
            vulnerability_type="test",
            message="test",
        )

        assert "risk_score" in result
        assert "factors" in result
        assert "analysis" in result
        assert "recommendation" in result
        assert set(result["factors"].keys()) == {
            "severity_weight", "exploitability", "data_sensitivity",
            "exposure", "fix_complexity",
        }

    def test_risk_score_range(self):
        """Risk score should always be 0-10."""
        for vuln_type in ["sql injection", "xss", "md5", "unknown", ""]:
            result = CodeLlamaClient._heuristic_analysis("code", vuln_type, "msg")
            assert 0.0 <= result["risk_score"] <= 10.0
