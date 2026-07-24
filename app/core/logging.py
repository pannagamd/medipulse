import logging
import os


def configure_logging() -> None:
    env = os.getenv("ENVIRONMENT", "development").lower()
    level = logging.DEBUG if env == "development" else logging.INFO

    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )

    # Suppress overly verbose third-party loggers in production
    if env != "development":
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    else:
        # Show SQL queries in development for easier debugging
        logging.getLogger("sqlalchemy.engine").setLevel(logging.INFO)
