from __future__ import annotations

"""
Pydantic models for API request/response schemas.
"""

from datetime import datetime
from pydantic import BaseModel, Field


# ──────────────────────────────────────────
# Request Models
# ──────────────────────────────────────────

class ScanRequest(BaseModel):
    """Request to start a new scan."""
    target: str = Field(..., description="Path to directory or file to scan")
    config: str = Field(default="auto", description="Semgrep config: 'auto' or path to rules")
    use_custom_rules: bool = Field(default=True, description="Include custom XAI-SecOps rules")


# ──────────────────────────────────────────
# Response Models
# ──────────────────────────────────────────

class RiskFactorsResponse(BaseModel):
    """Risk factor breakdown."""
    severity_weight: float = Field(..., ge=0, le=1)
    exploitability: float = Field(..., ge=0, le=1)
    data_sensitivity: float = Field(..., ge=0, le=1)
    exposure: float = Field(..., ge=0, le=1)
    fix_complexity: float = Field(..., ge=0, le=1)


class FactorContributionResponse(BaseModel):
    """Individual factor contribution for XAI breakdown."""
    name: str
    label: str
    value: float
    weight: float
    contribution: float
    level: str
    description: str


class RecommendationResponse(BaseModel):
    """Fix recommendation."""
    title: str
    description: str
    fix: str
    references: list[str] = []
    ai_suggestion: str | None = None


class FindingResponse(BaseModel):
    """A single enriched finding."""
    id: str = Field(..., description="MongoDB document ID")
    scan_id: str
    rule_id: str
    severity: str
    file: str
    line_start: int
    line_end: int
    code_snippet: str
    message: str
    risk_score: float
    risk_level: str
    risk_factors: RiskFactorsResponse
    explanation: str
    recommendation: RecommendationResponse
    cwe: str | None = None
    owasp: str | None = None
    ai_analysis: str | None = None
    created_at: datetime


class ScanSummaryResponse(BaseModel):
    """Scan metadata and summary."""
    scan_id: str
    target: str
    status: str
    total_findings: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    avg_risk_score: float
    created_at: datetime
    completed_at: datetime | None = None
    error: str | None = None


class ScanDetailResponse(ScanSummaryResponse):
    """Full scan response with findings."""
    findings: list[FindingResponse] = []
    summary_text: str = ""


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    version: str
    mongodb: str
    ollama: str
    semgrep: str
