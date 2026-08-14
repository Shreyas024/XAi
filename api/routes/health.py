"""
Health check endpoint — reports status of all system components.
"""

import asyncio
import shutil
import subprocess
import time
from fastapi import APIRouter
from ai_engine.codellama_client import CodeLlamaClient
from database import MongoDB
from api.models.schemas import HealthResponse
from scanner.semgrep_runner import resolve_semgrep_binary

router = APIRouter(tags=["System"])

_health_cache: dict | None = None
_health_cache_at: float = 0.0
_CACHE_TTL = 15.0


def _probe_semgrep() -> str:
    binary = resolve_semgrep_binary()
    if binary == "semgrep" and not shutil.which("semgrep"):
        return "not installed"
    # Binary is present — avoid a slow `--version` on every poll.
    return "installed"


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Check the health of all system components."""
    global _health_cache, _health_cache_at

    now = time.monotonic()
    if _health_cache and (now - _health_cache_at) < _CACHE_TTL:
        return HealthResponse(**_health_cache)

    mongo_status = "disconnected"
    try:
        if MongoDB.client:
            await MongoDB.client.admin.command("ping")
            mongo_status = "connected"
    except Exception:
        mongo_status = "error"

    ollama_status = "unavailable (heuristic fallback)"
    try:
        client = CodeLlamaClient()
        if await client.is_available():
            ollama_status = f"available ({client.model})"
    except Exception:
        pass

    semgrep_status = await asyncio.to_thread(_probe_semgrep)

    overall = "healthy" if mongo_status == "connected" else "degraded"
    if semgrep_status == "not installed":
        overall = "degraded"

    payload = {
        "status": overall,
        "version": "0.1.0",
        "mongodb": mongo_status,
        "ollama": ollama_status,
        "semgrep": semgrep_status,
    }
    _health_cache = payload
    _health_cache_at = now
    return HealthResponse(**payload)
