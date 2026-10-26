from __future__ import annotations

"""
Scan endpoints — trigger scans, list scans, get scan details.
"""

import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException
from database import MongoDB
from scanner.semgrep_runner import SemgrepRunner, default_custom_rules_path
from ai_engine.risk_scorer import RiskScorer
from explainability.risk_factors import compute_risk_breakdown, get_risk_level
from explainability.explanation_generator import generate_explanation, generate_summary
from explainability.recommendation_engine import get_recommendation
from api.models.schemas import (
    ScanRequest,
    ScanSummaryResponse,
    ScanDetailResponse,
    FindingResponse,
    RiskFactorsResponse,
    FactorContributionResponse,
    RecommendationResponse,
)


def _safe_recommendation(rec) -> RecommendationResponse:
    """
    Safely coerce a recommendation value to RecommendationResponse.
    Old scan records may have stored a plain string; new ones store a dict.
    """
    if isinstance(rec, dict):
        # Ensure required fields have fallbacks
        return RecommendationResponse(
            title=rec.get("title", "Security Issue Detected"),
            description=rec.get("description", "A potential security issue was flagged."),
            fix=rec.get("fix", "Review the flagged code and apply appropriate security controls."),
            references=rec.get("references", []),
            ai_suggestion=rec.get("ai_suggestion"),
        )
    # Legacy: recommendation was stored as a plain string
    return RecommendationResponse(
        title="Security Issue Detected",
        description="A potential security issue was flagged.",
        fix=str(rec) if rec else "Review the flagged code and apply appropriate security controls.",
        references=[],
        ai_suggestion=None,
    )


def _safe_risk_factors(rf) -> RiskFactorsResponse:
    """Safely coerce risk_factors dict to RiskFactorsResponse with fallback defaults."""
    if isinstance(rf, dict):
        return RiskFactorsResponse(
            severity_weight=rf.get("severity_weight", 0.5),
            exploitability=rf.get("exploitability", 0.5),
            data_sensitivity=rf.get("data_sensitivity", 0.5),
            exposure=rf.get("exposure", 0.5),
            fix_complexity=rf.get("fix_complexity", 0.5),
        )
    return RiskFactorsResponse(
        severity_weight=0.5, exploitability=0.5, data_sensitivity=0.5,
        exposure=0.5, fix_complexity=0.5,
    )

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scans", tags=["Scans"])


@router.post("", response_model=ScanDetailResponse, status_code=201)
async def create_scan(request: ScanRequest):
    """
    Trigger a new security scan.

    Pipeline: Semgrep scan → CodeLlama analysis → risk scoring → XAI explanation → store results.
    """
    # Validate target path (strip surrounding quotes if copied from Windows Explorer)
    raw_target = request.target.strip().strip('"').strip("'")
    target_path = Path(raw_target)
    if not target_path.exists():
        # Also check relative to project root
        project_root = Path(__file__).resolve().parent.parent.parent
        if (project_root / raw_target).exists():
            target_path = project_root / raw_target
        else:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Target path '{request.target}' does not exist. "
                    "Use a valid path on this machine (e.g., C:\\path\\to\\project) "
                    "or relative to the project root (e.g., tests/sample_vulnerable_app.py)."
                ),
            )

    db = MongoDB.get_db()

    # Create scan record
    scan_id = str(uuid.uuid4())
    scan_doc = {
        "scan_id": scan_id,
        "target": str(target_path.resolve()),
        "status": "running",
        "total_findings": 0,
        "critical_count": 0,
        "high_count": 0,
        "medium_count": 0,
        "low_count": 0,
        "avg_risk_score": 0.0,
        "created_at": datetime.now(timezone.utc),
        "completed_at": None,
        "error": None,
    }
    await db.scans.insert_one(scan_doc)

    try:
        # ── Step 1: Run Semgrep ──
        logger.info(f"[{scan_id}] Running Semgrep on {request.target}")
        rules_path = default_custom_rules_path()
        if request.config in ("auto", "") and request.use_custom_rules:
            scan_config = rules_path
            extra_rules = None
        else:
            scan_config = request.config or "auto"
            extra_rules = rules_path if request.use_custom_rules else None

        scanner = SemgrepRunner(custom_rules_path=extra_rules)
        findings = scanner.scan(str(target_path), config=scan_config)

        if not findings:
            # No findings — update scan and return
            await db.scans.update_one(
                {"scan_id": scan_id},
                {"$set": {
                    "status": "completed",
                    "completed_at": datetime.now(timezone.utc),
                }},
            )
            return ScanDetailResponse(
                scan_id=scan_id,
                target=str(target_path.resolve()),
                status="completed",
                total_findings=0,
                critical_count=0,
                high_count=0,
                medium_count=0,
                low_count=0,
                avg_risk_score=0.0,
                created_at=scan_doc["created_at"],
                completed_at=datetime.now(timezone.utc),
                findings=[],
                summary_text="✅ No security issues found!",
            )

        # ── Step 2: Score findings with CodeLlama ──
        logger.info(f"[{scan_id}] Scoring {len(findings)} findings (fast_mode={request.fast_mode})")
        scorer = RiskScorer(force_heuristic=request.fast_mode)
        scored_findings = await scorer.score_findings(findings)

        # ── Step 3: Generate explanations and recommendations ──
        finding_docs = []
        finding_responses = []

        for sf in scored_findings:
            # Generate explanation
            explanation = generate_explanation(
                rule_id=sf["rule_id"],
                message=sf["message"],
                risk_score=sf["risk_score"],
                risk_factors=sf["risk_factors"],
                ai_analysis=sf.get("ai_analysis"),
            )

            # Get recommendation
            rec = get_recommendation(
                rule_id=sf["rule_id"],
                cwe=sf.get("cwe"),
                code_snippet=sf["code_snippet"],
                ai_recommendation=sf.get("recommendation"),
            )

            risk_level = get_risk_level(sf["risk_score"])

            # MongoDB document
            finding_doc = {
                "scan_id": scan_id,
                "rule_id": sf["rule_id"],
                "severity": sf["severity"],
                "file": sf["file"],
                "line_start": sf["line_start"],
                "line_end": sf["line_end"],
                "code_snippet": sf["code_snippet"],
                "message": sf["message"],
                "risk_score": sf["risk_score"],
                "risk_level": risk_level,
                "risk_factors": sf["risk_factors"],
                "explanation": explanation,
                "recommendation": rec,
                "cwe": sf.get("cwe"),
                "owasp": sf.get("owasp"),
                "ai_analysis": sf.get("ai_analysis"),
                "created_at": datetime.now(timezone.utc),
            }
            finding_docs.append(finding_doc)

        # ── Step 4: Store in MongoDB ──
        if finding_docs:
            result = await db.findings.insert_many(finding_docs)

            # Build response objects
            for doc, inserted_id in zip(finding_docs, result.inserted_ids):
                finding_responses.append(
                    FindingResponse(
                        id=str(inserted_id),
                        scan_id=doc["scan_id"],
                        rule_id=doc["rule_id"],
                        severity=doc["severity"],
                        file=doc["file"],
                        line_start=doc["line_start"],
                        line_end=doc["line_end"],
                        code_snippet=doc["code_snippet"],
                        message=doc["message"],
                        risk_score=doc["risk_score"],
                        risk_level=doc["risk_level"],
                        risk_factors=_safe_risk_factors(doc.get("risk_factors")),
                        explanation=doc.get("explanation", ""),
                        recommendation=_safe_recommendation(doc.get("recommendation")),
                        cwe=doc.get("cwe"),
                        owasp=doc.get("owasp"),
                        ai_analysis=doc.get("ai_analysis"),
                        created_at=doc["created_at"],
                    )
                )

        # ── Step 5: Update scan summary ──
        risk_scores = [f["risk_score"] for f in finding_docs]
        avg_score = sum(risk_scores) / len(risk_scores) if risk_scores else 0.0

        summary_update = {
            "status": "completed",
            "total_findings": len(finding_docs),
            "critical_count": sum(1 for s in risk_scores if s >= 8.0),
            "high_count": sum(1 for s in risk_scores if 6.0 <= s < 8.0),
            "medium_count": sum(1 for s in risk_scores if 4.0 <= s < 6.0),
            "low_count": sum(1 for s in risk_scores if s < 4.0),
            "avg_risk_score": round(avg_score, 1),
            "completed_at": datetime.now(timezone.utc),
        }
        await db.scans.update_one({"scan_id": scan_id}, {"$set": summary_update})

        summary_text = generate_summary(len(finding_docs), risk_scores)

        return ScanDetailResponse(
            scan_id=scan_id,
            target=str(target_path.resolve()),
            status="completed",
            total_findings=summary_update["total_findings"],
            critical_count=summary_update["critical_count"],
            high_count=summary_update["high_count"],
            medium_count=summary_update["medium_count"],
            low_count=summary_update["low_count"],
            avg_risk_score=summary_update["avg_risk_score"],
            created_at=scan_doc["created_at"],
            completed_at=summary_update["completed_at"],
            findings=finding_responses,
            summary_text=summary_text,
        )

    except Exception as e:
        logger.error(f"[{scan_id}] Scan failed: {e}")
        await db.scans.update_one(
            {"scan_id": scan_id},
            {"$set": {
                "status": "failed",
                "error": str(e),
                "completed_at": datetime.now(timezone.utc),
            }},
        )
        raise HTTPException(status_code=500, detail=f"Scan failed: {str(e)}")


@router.get("", response_model=list[ScanSummaryResponse])
async def list_scans(limit: int = 20, skip: int = 0):
    """List all scans, most recent first."""
    db = MongoDB.get_db()
    cursor = db.scans.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(limit)

    scans = []
    async for doc in cursor:
        scans.append(ScanSummaryResponse(**doc))

    return scans


@router.get("/{scan_id}", response_model=ScanDetailResponse)
async def get_scan(scan_id: str):
    """Get full scan details with all findings."""
    db = MongoDB.get_db()

    # Get scan
    scan = await db.scans.find_one({"scan_id": scan_id}, {"_id": 0})
    if not scan:
        raise HTTPException(status_code=404, detail=f"Scan not found: {scan_id}")

    # Get findings
    findings = []
    cursor = db.findings.find({"scan_id": scan_id}).sort("risk_score", -1)
    async for doc in cursor:
        findings.append(
            FindingResponse(
                id=str(doc["_id"]),
                scan_id=doc["scan_id"],
                rule_id=doc["rule_id"],
                severity=doc["severity"],
                file=doc["file"],
                line_start=doc["line_start"],
                line_end=doc["line_end"],
                code_snippet=doc["code_snippet"],
                message=doc["message"],
                risk_score=doc["risk_score"],
                risk_level=doc.get("risk_level", get_risk_level(doc["risk_score"])),
                risk_factors=_safe_risk_factors(doc.get("risk_factors")),
                explanation=doc.get("explanation", ""),
                recommendation=_safe_recommendation(doc.get("recommendation")),
                cwe=doc.get("cwe"),
                owasp=doc.get("owasp"),
                ai_analysis=doc.get("ai_analysis"),
                created_at=doc["created_at"],
            )
        )

    risk_scores = [f.risk_score for f in findings]
    summary_text = generate_summary(len(findings), risk_scores)

    return ScanDetailResponse(
        **scan,
        findings=findings,
        summary_text=summary_text,
    )


@router.delete("/{scan_id}", status_code=204)
async def delete_scan(scan_id: str):
    """Delete a scan and all its findings."""
    db = MongoDB.get_db()

    result = await db.scans.delete_one({"scan_id": scan_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Scan not found: {scan_id}")

    await db.findings.delete_many({"scan_id": scan_id})
