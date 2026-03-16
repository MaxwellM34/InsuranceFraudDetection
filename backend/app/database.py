import os
from pathlib import Path

from dotenv import load_dotenv

# Load base env, then .env.local overrides (local dev)
_base = Path(__file__).resolve().parents[1]
load_dotenv(_base / ".env")
load_dotenv(_base / ".env.local", override=True)

DATABASE_URL = os.getenv("DATABASE_URL", "postgres://alan:alan@postgres:5432/alandb")

TORTOISE_ORM = {
    "connections": {
        "default": DATABASE_URL,
    },
    "apps": {
        "models": {
            "models": ["app.models"],
            "default_connection": "default",
        },
    },
}
