"""
Report endpoints — detailed XAI reports for individual findings.
"""

from fastapi import APIRouter, HTTPException
from database import MongoDB
from explainability.risk_factors import compute_risk_breakdown, get_risk_level
from api.models.schemas import FactorContributionResponse

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/{scan_id}/findings/{finding_id}/explain")
async def get_finding_explanation(scan_id: str, finding_id: str):
    """
    Get a detailed XAI explanation for a specific finding.

    Returns the full factor breakdown with SHAP-like contributions,
    showing exactly why each factor contributed to the risk score.
    """
    from bson import ObjectId

    db = MongoDB.get_db()

    try:
        finding = await db.findings.find_one({
            "_id": ObjectId(finding_id),
            "scan_id": scan_id,
        })
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid finding ID")

    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    # Compute factor contributions
    risk_factors = finding.get("risk_factors", {})
    contributions = compute_risk_breakdown(risk_factors)

    return {
        "finding_id": str(finding["_id"]),
        "scan_id": scan_id,
        "rule_id": finding["rule_id"],
        "risk_score": finding["risk_score"],
        "risk_level": get_risk_level(finding["risk_score"]),
        "explanation": finding.get("explanation", ""),
        "factor_contributions": [
            FactorContributionResponse(**c.to_dict()) for c in contributions
        ],
        "recommendation": finding.get("recommendation", {}),
        "code_snippet": finding.get("code_snippet", ""),
        "file": finding.get("file", ""),
        "line_start": finding.get("line_start", 0),
    }


@router.get("/{scan_id}/summary")
async def get_scan_report_summary(scan_id: str):
    """
    Get an aggregated risk report for a scan.

    Includes:
    - Overall risk distribution
    - Top risk factors across all findings
    - Most common vulnerability types
    """
    db = MongoDB.get_db()

    scan = await db.scans.find_one({"scan_id": scan_id}, {"_id": 0})
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    # Aggregate findings
    findings = []
    cursor = db.findings.find({"scan_id": scan_id})
    async for doc in cursor:
        findings.append(doc)

    if not findings:
        return {
            "scan_id": scan_id,
            "total_findings": 0,
            "risk_distribution": {},
            "top_risk_factors": [],
            "common_vulnerabilities": [],
        }

    # Risk distribution
    risk_dist = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
    for f in findings:
        level = get_risk_level(f["risk_score"])
        risk_dist[level] += 1

    # Average risk factors across all findings
    factor_sums = {}
    for f in findings:
        for factor_name, value in f.get("risk_factors", {}).items():
            factor_sums.setdefault(factor_name, []).append(value)

    avg_factors = [
        {
            "factor": name,
            "average_value": round(sum(values) / len(values), 2),
            "max_value": round(max(values), 2),
        }
        for name, values in factor_sums.items()
    ]
    avg_factors.sort(key=lambda x: x["average_value"], reverse=True)

    # Most common vulnerability types
    rule_counts = {}
    for f in findings:
        rule_id = f.get("rule_id", "unknown")
        rule_counts[rule_id] = rule_counts.get(rule_id, 0) + 1

    common_vulns = [
        {"rule_id": rule, "count": count}
        for rule, count in sorted(rule_counts.items(), key=lambda x: -x[1])
    ]

    return {
        "scan_id": scan_id,
        "target": scan.get("target", ""),
        "total_findings": len(findings),
        "avg_risk_score": scan.get("avg_risk_score", 0),
        "risk_distribution": risk_dist,
        "top_risk_factors": avg_factors,
        "common_vulnerabilities": common_vulns[:10],
    }
