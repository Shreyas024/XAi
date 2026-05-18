"""
MongoDB collection schemas and index definitions.
Using Motor (async) — no ORM, just structured dictionaries with validation via Pydantic.
"""

from motor.motor_asyncio import AsyncIOMotorDatabase


async def create_indexes(db: AsyncIOMotorDatabase) -> None:
    """Create MongoDB indexes for performance."""

    # Scans collection
    await db.scans.create_index("created_at")
    await db.scans.create_index("status")

    # Findings collection
    await db.findings.create_index("scan_id")
    await db.findings.create_index("risk_score")
    await db.findings.create_index([("scan_id", 1), ("risk_score", -1)])
    await db.findings.create_index("severity")

    print("📇 MongoDB indexes created")


# ──────────────────────────────────────────
# Document Schemas (for reference)
# ──────────────────────────────────────────
#
# scans:
# {
#     "_id": ObjectId,
#     "scan_id": str (UUID),
#     "target": str (path or repo URL),
#     "status": str ("pending" | "running" | "completed" | "failed"),
#     "total_findings": int,
#     "critical_count": int,
#     "high_count": int,
#     "medium_count": int,
#     "low_count": int,
#     "avg_risk_score": float,
#     "created_at": datetime,
#     "completed_at": datetime | None,
#     "error": str | None
# }
#
# findings:
# {
#     "_id": ObjectId,
#     "scan_id": str (UUID),
#     "rule_id": str (Semgrep rule ID),
#     "severity": str ("ERROR" | "WARNING" | "INFO"),
#     "file": str,
#     "line_start": int,
#     "line_end": int,
#     "code_snippet": str,
#     "message": str (Semgrep message),
#     "risk_score": float (0-10),
#     "risk_factors": {
#         "severity_weight": float,
#         "exploitability": float,
#         "data_sensitivity": float,
#         "exposure": float,
#         "fix_complexity": float
#     },
#     "explanation": str (human-readable),
#     "recommendation": str (fix suggestion),
#     "cwe": str | None,
#     "owasp": str | None,
#     "ai_analysis": str | None (raw CodeLlama output),
#     "created_at": datetime
# }
