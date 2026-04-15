import logging
import os
import time
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
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


def _has_column(inspector, table_name: str, column_name: str) -> bool:
    try:
        return any(col.get("name") == column_name for col in inspector.get_columns(table_name))
    except Exception:
        return False


def _run_lightweight_migrations() -> None:
    """Best-effort additive migrations for deployments without Alembic."""
    try:
        inspector = inspect(engine)
    except Exception:
        return

    with engine.begin() as conn:
        # user_access_profiles.is_pro
        if _has_column(inspector, "user_access_profiles", "is_pro") is False:
            conn.execute(text("ALTER TABLE user_access_profiles ADD COLUMN is_pro BOOLEAN DEFAULT FALSE"))
            conn.execute(text("UPDATE user_access_profiles SET is_pro = FALSE WHERE is_pro IS NULL"))

        # business_insight_reports version pointers
        if _has_column(inspector, "business_insight_reports", "published_version_id") is False:
            conn.execute(text("ALTER TABLE business_insight_reports ADD COLUMN published_version_id VARCHAR(36)"))
        if _has_column(inspector, "business_insight_reports", "latest_draft_version_id") is False:
            conn.execute(text("ALTER TABLE business_insight_reports ADD COLUMN latest_draft_version_id VARCHAR(36)"))
        if _has_column(inspector, "business_insight_reports", "report_type") is False:
            conn.execute(text("ALTER TABLE business_insight_reports ADD COLUMN report_type VARCHAR(64) DEFAULT 'viability_report'"))
        if _has_column(inspector, "business_insight_reports", "template_id") is False:
            conn.execute(text("ALTER TABLE business_insight_reports ADD COLUMN template_id VARCHAR(64) DEFAULT 'obsidian_board'"))

        # indexes (ignore failures if already present)
        for statement in [
            "CREATE INDEX IF NOT EXISTS ix_user_access_profiles_is_pro ON user_access_profiles (is_pro)",
            "CREATE INDEX IF NOT EXISTS ix_business_insight_reports_published_version_id ON business_insight_reports (published_version_id)",
            "CREATE INDEX IF NOT EXISTS ix_business_insight_reports_latest_draft_version_id ON business_insight_reports (latest_draft_version_id)",
            "CREATE INDEX IF NOT EXISTS ix_business_insight_reports_report_type ON business_insight_reports (report_type)",
            "CREATE INDEX IF NOT EXISTS ix_business_insight_report_versions_report_id ON business_insight_report_versions (report_id)",
            "CREATE INDEX IF NOT EXISTS ix_business_insight_report_versions_status ON business_insight_report_versions (status)",
            "CREATE INDEX IF NOT EXISTS ix_business_insight_report_versions_content_hash ON business_insight_report_versions (content_hash)",
        ]:
            try:
                conn.execute(text(statement))
            except Exception:
                pass


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
            _run_lightweight_migrations()
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
