import os
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_base = Path(__file__).resolve().parents[1]
load_dotenv(_base / ".env")
load_dotenv(_base / ".env.local", override=True)

DEMO_TOKEN = os.getenv("DEMO_TOKEN", "alanadmin")
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "")

security = HTTPBearer(auto_error=False)


async def verify_clerk_token(token: str) -> dict:
    """Verify a Clerk JWT token by calling the Clerk API."""
    if not CLERK_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Clerk secret key not configured",
        )

    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.clerk.com/v1/tokens/verify",
            headers={
                "Authorization": f"Bearer {CLERK_SECRET_KEY}",
                "Content-Type": "application/json",
            },
            params={"token": token},
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    return response.json()


async def get_current_user(request: Request) -> dict:
    """
    Extract and verify the current user from the request.

    Checks in order:
    1. X-Demo-Token header — if it matches DEMO_TOKEN, skip Clerk verification.
    2. Authorization: Bearer <clerk_jwt> header — verify with Clerk.
    """
    demo_token = request.headers.get("X-Demo-Token")
    if demo_token is not None:
        if demo_token == DEMO_TOKEN:
            return {"user_id": "demo-user", "mode": "demo"}
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid demo token",
        )

    authorization: Optional[str] = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header",
        )

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty bearer token",
        )

    user_data = await verify_clerk_token(token)
    return {"user_id": user_data.get("sub", "unknown"), "mode": "clerk"}
