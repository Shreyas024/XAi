"""
Health check endpoint — reports status of all system components.
"""

import subprocess
from fastapi import APIRouter
from ai_engine.codellama_client import CodeLlamaClient
from database import MongoDB
from api.models.schemas import HealthResponse

router = APIRouter(tags=["System"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Check the health of all system components."""

    # MongoDB
    mongo_status = "disconnected"
    try:
        if MongoDB.client:
            await MongoDB.client.admin.command("ping")
            mongo_status = "connected"
    except Exception:
        mongo_status = "error"

    # Ollama / CodeLlama
    ollama_status = "unavailable"
    try:
        client = CodeLlamaClient()
        if await client.is_available():
            ollama_status = f"available ({client.model})"
        else:
            ollama_status = "model not loaded"
    except Exception:
        ollama_status = "error"

    # Semgrep
    semgrep_status = "not installed"
    try:
        result = subprocess.run(
            ["semgrep", "--version"],
            capture_output=True, text=True, timeout=5,
        )
        if result.returncode == 0:
            semgrep_status = f"v{result.stdout.strip()}"
    except Exception:
        pass

    return HealthResponse(
        status="healthy" if mongo_status == "connected" else "degraded",
        version="0.1.0",
        mongodb=mongo_status,
        ollama=ollama_status,
        semgrep=semgrep_status,
    )
