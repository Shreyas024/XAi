"""
XAI-SecOps — FastAPI Application Entry Point.

Explainable AI DevSecOps Security Assistant.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import MongoDB
from database.models import create_indexes
from api.routes import health, scans, reports

# ── Logging ──
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s │ %(levelname)-8s │ %(name)s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("xai-secops")


# ── Lifespan ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup
    logger.info("[START] Starting XAI-SecOps...")
    try:
        await MongoDB.connect()
        await create_indexes(MongoDB.get_db())
        logger.info("[OK] XAI-SecOps is ready and connected to MongoDB")
    except Exception as e:
        logger.warning(f"[WARN] MongoDB unavailable at startup: {e}. Running in degraded/offline mode.")

    yield

    # Shutdown
    logger.info("[STOP] Shutting down XAI-SecOps...")
    try:
        await MongoDB.disconnect()
    except Exception:
        pass


# ── App ──
app = FastAPI(
    title="XAI-SecOps",
    description=(
        "Explainable AI DevSecOps Security Assistant — "
        "Scans code for vulnerabilities using Semgrep, scores risk with CodeLlama, "
        "and provides SHAP-like explainable risk factor breakdowns."
    ),
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ──
app.include_router(health.router)
app.include_router(scans.router)
app.include_router(reports.router)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint — API info."""
    return {
        "name": "XAI-SecOps",
        "version": "0.1.0",
        "description": "Explainable AI DevSecOps Security Assistant",
        "docs": "/docs",
        "health": "/health",
    }
