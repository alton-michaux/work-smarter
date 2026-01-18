from loguru import logger
import sys

def setup_logging():
    logger.remove()

    # Human-readable errors (only ERROR+)
    logger.add(
        sys.stderr,
        level="ERROR",
        enqueue=True,
        backtrace=False,
        diagnose=False,
        serialize=False,
        format=(
            "{time:YYYY-MM-DD HH:mm:ss} | {level} | "
            "{name}:{function}:{line}\n"
            "{message}\n"
            "{exception}\n"
        ),
    )

    # JSON logs for everything (INFO+)
    logger.add(
        sys.stdout,
        level="INFO",
        enqueue=True,
        backtrace=False,
        diagnose=False,
        serialize=True,
        filter=lambda r: r["level"].no < 40,  # 40 == ERROR
    )
