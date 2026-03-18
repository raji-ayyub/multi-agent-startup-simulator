import logging
import os
import time
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from models import Base

load_dotenv()
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment variables")

engine_kwargs = {
    "pool_pre_ping": True,
    "pool_recycle": int(os.getenv("DATABASE_POOL_RECYCLE_SECONDS", "300")),
}

# Supabase/Postgres deployments typically require SSL.
if DATABASE_URL.startswith("postgresql"):
    engine_kwargs["connect_args"] = {
        "sslmode": os.getenv("DATABASE_SSLMODE", "require"),
        "connect_timeout": int(os.getenv("DATABASE_CONNECT_TIMEOUT_SECONDS", "10")),
    }

use_null_pool = os.getenv("DATABASE_USE_NULL_POOL", "1").strip().lower() not in {"0", "false", "no"}
if use_null_pool:
    engine_kwargs["poolclass"] = NullPool
else:
    engine_kwargs["pool_size"] = int(os.getenv("DATABASE_POOL_SIZE", "2"))
    engine_kwargs["max_overflow"] = int(os.getenv("DATABASE_MAX_OVERFLOW", "0"))
    engine_kwargs["pool_timeout"] = int(os.getenv("DATABASE_POOL_TIMEOUT_SECONDS", "10"))

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all database tables with retries for transient pooler saturation."""
    attempts = max(1, int(os.getenv("DATABASE_STARTUP_RETRIES", "3")))
    base_delay = max(0.5, float(os.getenv("DATABASE_STARTUP_RETRY_DELAY_SECONDS", "2")))

    for attempt in range(1, attempts + 1):
        try:
            Base.metadata.create_all(bind=engine)
            return True
        except OperationalError as exc:
            if attempt >= attempts:
                logger.warning("Database schema sync skipped after %s failed startup attempts: %s", attempt, exc)
                return False
            delay = base_delay * attempt
            logger.warning(
                "Database not ready during startup schema sync (attempt %s/%s). Retrying in %.1fs.",
                attempt,
                attempts,
                delay,
            )
            time.sleep(delay)
