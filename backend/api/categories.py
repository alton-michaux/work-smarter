"""Single source of truth for Task.category values.

`Task.category` used to allow NULL, and the importers wrote whatever the source
file happened to contain ("Task", "Tasks", a project header, nothing at all).
`TaskViewSet.get_queryset` filters with an exact match, so those rows were
invisible to `?category=task`. Every write path now normalizes through here.
"""

DEFAULT_CATEGORY = "task"

VALID_CATEGORIES = frozenset({"task", "meeting", "note"})

# Plural section headers used by the TXT importer.
_ALIASES = {
    "tasks": "task",
    "meetings": "meeting",
    "notes": "note",
}


def normalize_category(value):
    """Return a valid category for `value`.

    Case and surrounding whitespace are ignored, known plurals are folded to
    their singular form, and anything empty or unrecognized falls back to
    DEFAULT_CATEGORY.
    """
    key = (value or "").strip().lower()
    key = _ALIASES.get(key, key)
    return key if key in VALID_CATEGORIES else DEFAULT_CATEGORY
