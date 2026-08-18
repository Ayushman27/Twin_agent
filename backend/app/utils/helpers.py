"""General helpers."""
import uuid
from datetime import datetime, timezone


def generate_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def paginate(items: list, page: int, page_size: int) -> dict:
    total = len(items)
    start = (page - 1) * page_size
    end   = start + page_size
    return {
        "items":       items[start:end],
        "page":        page,
        "page_size":   page_size,
        "total":       total,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }
