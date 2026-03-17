"""
Alan Fraud Detection — FastAPI application entry point.
"""
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from tortoise.contrib.fastapi import RegisterTortoise

from app.database import TORTOISE_ORM
from app.routes.claims import router as claims_router
from app.routes.dashboard import router as dashboard_router
from app.routes.detection_routes import router as detection_router
from app.routes.providers import router as providers_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    async with RegisterTortoise(
        app=app,
        config=TORTOISE_ORM,
        generate_schemas=True,
        add_exception_handlers=True,
    ):
        yield


app = FastAPI(
    title="Alan Fraud Detection API",
    description=(
        "Backend API for detecting fraudulent optical-care claims "
        "submitted to Alan health insurance."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — allow all origins for development
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(providers_router)
app.include_router(claims_router)
app.include_router(detection_router)
app.include_router(dashboard_router)


# ---------------------------------------------------------------------------
# Health check (no auth required)
# ---------------------------------------------------------------------------
@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    """Simple liveness probe — no authentication required."""
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Root
# ---------------------------------------------------------------------------
@app.get("/", tags=["root"])
async def root() -> dict[str, str]:
    return {
        "service": "Alan Fraud Detection API",
        "docs": "/docs",
        "health": "/health",
    }
