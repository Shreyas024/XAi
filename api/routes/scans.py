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
from scanner.semgrep_runner import SemgrepRunner
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

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scans", tags=["Scans"])


@router.post("", response_model=ScanDetailResponse, status_code=201)
async def create_scan(request: ScanRequest):
    """
    Trigger a new security scan.

    Pipeline: Semgrep scan → CodeLlama analysis → risk scoring → XAI explanation → store results.
    """
    db = MongoDB.get_db()

    # Validate target path
    target_path = Path(request.target)
    if not target_path.exists():
        raise HTTPException(
            status_code=400, 
            detail=f"Target path '{request.target}' does not exist inside the Docker container. Use '.' to scan the app itself, or mount a directory to '/targets'."
        )

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
        scanner = SemgrepRunner(
            custom_rules_path="scanner/rules/custom_rules.yaml" if request.use_custom_rules else None
        )
        findings = scanner.scan(str(target_path), config=request.config)

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
        logger.info(f"[{scan_id}] Scoring {len(findings)} findings")
        scorer = RiskScorer()
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
                        risk_factors=RiskFactorsResponse(**doc["risk_factors"]),
                        explanation=doc["explanation"],
                        recommendation=RecommendationResponse(**doc["recommendation"]),
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
                risk_factors=RiskFactorsResponse(**doc["risk_factors"]),
                explanation=doc.get("explanation", ""),
                recommendation=RecommendationResponse(**doc["recommendation"]),
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
