"""
Tests for the explainability module.
"""

import pytest
from explainability.risk_factors import (
    compute_risk_breakdown,
    compute_risk_score,
    get_risk_level,
    FactorContribution,
)
from explainability.explanation_generator import generate_explanation, generate_summary
from explainability.recommendation_engine import get_recommendation


class TestRiskFactors:
    """Tests for the risk factor computation."""

    def test_compute_risk_breakdown(self):
        """Should return ordered factor contributions."""
        factors = {
            "severity_weight": 0.9,
            "exploitability": 0.8,
            "data_sensitivity": 0.3,
            "exposure": 0.7,
            "fix_complexity": 0.2,
        }
        contributions = compute_risk_breakdown(factors)

        assert len(contributions) == 5
        assert all(isinstance(c, FactorContribution) for c in contributions)
        # Should be sorted by contribution (descending)
        for i in range(len(contributions) - 1):
            assert contributions[i].contribution >= contributions[i + 1].contribution

    def test_compute_risk_score(self):
        """Score should be between 0 and 10."""
        factors = {
            "severity_weight": 0.9,
            "exploitability": 0.8,
            "data_sensitivity": 0.5,
            "exposure": 0.7,
            "fix_complexity": 0.3,
        }
        score = compute_risk_score(factors)

        assert 0.0 <= score <= 10.0

    def test_risk_score_all_zeros(self):
        """All zero factors should give score 0."""
        factors = {k: 0.0 for k in ["severity_weight", "exploitability", "data_sensitivity", "exposure", "fix_complexity"]}
        assert compute_risk_score(factors) == 0.0

    def test_risk_score_all_max(self):
        """All max factors should give score 10."""
        factors = {k: 1.0 for k in ["severity_weight", "exploitability", "data_sensitivity", "exposure", "fix_complexity"]}
        assert compute_risk_score(factors) == 10.0

    def test_get_risk_level(self):
        """Should map scores to correct levels."""
        assert get_risk_level(9.0) == "CRITICAL"
        assert get_risk_level(7.0) == "HIGH"
        assert get_risk_level(5.0) == "MEDIUM"
        assert get_risk_level(3.0) == "LOW"
        assert get_risk_level(1.0) == "INFO"

    def test_factor_contribution_to_dict(self):
        """Should serialize to dict properly."""
        fc = FactorContribution(
            name="severity_weight",
            label="Vulnerability Severity",
            value=0.9,
            weight=0.3,
            contribution=0.27,
            level="high",
            description="Critical severity",
        )
        d = fc.to_dict()
        assert d["name"] == "severity_weight"
        assert d["value"] == 0.9


class TestExplanationGenerator:
    """Tests for explanation text generation."""

    def test_generate_explanation(self):
        """Should produce a multi-line explanation string."""
        explanation = generate_explanation(
            rule_id="test-sql-injection",
            message="SQL injection detected",
            risk_score=8.5,
            risk_factors={
                "severity_weight": 0.9,
                "exploitability": 0.8,
                "data_sensitivity": 0.5,
                "exposure": 0.7,
                "fix_complexity": 0.3,
            },
        )

        assert "test-sql-injection" in explanation
        assert "CRITICAL" in explanation
        assert "8.5" in explanation

    def test_generate_summary_no_findings(self):
        """Should report no issues."""
        summary = generate_summary(0, [])
        assert "No security issues" in summary

    def test_generate_summary_with_findings(self):
        """Should produce counts by severity."""
        summary = generate_summary(3, [9.0, 6.5, 3.0])
        assert "Critical: 1" in summary
        assert "High: 1" in summary
        assert "Low: 1" in summary


class TestRecommendationEngine:
    """Tests for fix recommendations."""

    def test_known_cwe_recommendation(self):
        """Should return specific recommendation for known CWE."""
        rec = get_recommendation(rule_id="test", cwe="CWE-89: SQL Injection")
        assert "SQL Injection" in rec["title"]
        assert "parameterized" in rec["fix"].lower()
        assert len(rec["references"]) > 0

    def test_rule_pattern_fallback(self):
        """Should match by rule ID pattern when no CWE provided."""
        rec = get_recommendation(rule_id="python.sql.injection.format-string")
        assert "SQL" in rec["title"]

    def test_unknown_rule_fallback(self):
        """Should return generic recommendation for unknown rules."""
        rec = get_recommendation(rule_id="completely-unknown-rule-xyz")
        assert "title" in rec
        assert "fix" in rec

    def test_ai_suggestion_included(self):
        """Should include AI suggestion when provided."""
        rec = get_recommendation(
            rule_id="test",
            cwe="CWE-89",
            ai_recommendation="Use ORM instead of raw SQL",
        )
        assert rec.get("ai_suggestion") == "Use ORM instead of raw SQL"

    def test_eval_and_path_traversal_recommendations(self):
        """Should match CWE-95 and CWE-22 recommendations."""
        eval_rec = get_recommendation(rule_id="xai-eval-injection", cwe="CWE-95")
        assert "Eval" in eval_rec["title"] or "Code Injection" in eval_rec["title"]

        path_rec = get_recommendation(rule_id="xai-path-traversal", cwe="CWE-22")
        assert "Path Traversal" in path_rec["title"]
