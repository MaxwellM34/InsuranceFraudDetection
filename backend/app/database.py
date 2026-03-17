import os
import urllib.parse
from pathlib import Path

from dotenv import load_dotenv

# Load base env, then .env.local overrides (local dev only — docker env vars take priority)
_base = Path(__file__).resolve().parents[1]
load_dotenv(_base / ".env")
load_dotenv(_base / ".env.local")

DATABASE_URL = os.getenv("DATABASE_URL", "postgres://alan:alan@postgres:5432/alandb")


def _parse_db_url(url: str) -> dict:
    """Parse a postgres:// URL into a credentials dict for tortoise-orm.

    Using a credentials dict avoids passing 'sslmode' as a keyword argument
    to asyncpg (which was removed in asyncpg 0.29.0).
    """
    parsed = urllib.parse.urlparse(url)
    return {
        "host": parsed.hostname,
        "port": parsed.port or 5432,
        "user": parsed.username,
        "password": parsed.password,
        "database": parsed.path.lstrip("/"),
    }


TORTOISE_ORM = {
    "connections": {
        "default": {
            "engine": "tortoise.backends.asyncpg",
            "credentials": _parse_db_url(DATABASE_URL),
        }
    },
    "apps": {
        "models": {
            "models": ["app.models"],
            "default_connection": "default",
        },
    },
}
