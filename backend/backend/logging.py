from loguru import logger
import sys

def setup_logging():
    logger.remove()

    logger.add(
        sys.stdout,
        level="INFO",
        enqueue=True,
        backtrace=False,   # turn on only in DEBUG
        diagnose=False,    # expensive, DEBUG only
        serialize=True,    # JSON logs
    )
