import structlog
import logging

def get_logger(name: str):
    """Return a structured logger."""
    structlog.configure(
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        logger_factory=structlog.PrintLoggerFactory(),
    )
    return structlog.get_logger(name)
