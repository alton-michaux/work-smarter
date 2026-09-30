from django.db import migrations, models

# Kept inline rather than imported from api.categories: migrations must stay
# stable even if that module's rules change later.
DEFAULT_CATEGORY = "task"
VALID_CATEGORIES = ("task", "meeting", "note")
ALIASES = {"tasks": "task", "meetings": "meeting", "notes": "note"}


def _normalize(value):
    key = (value or "").strip().lower()
    key = ALIASES.get(key, key)
    return key if key in VALID_CATEGORIES else DEFAULT_CATEGORY


def normalize_categories(apps, schema_editor):
    """Fold NULL/mixed-case/unknown categories onto the three valid choices.

    Rows written by the CSV and TXT importers landed here as NULL, 'Task',
    'Meetings', or a raw section header, none of which match the exact-match
    `?category=` filter on TaskViewSet.
    """
    Task = apps.get_model("api", "Task")

    Task.objects.filter(category__isnull=True).update(category=DEFAULT_CATEGORY)

    stale = (
        Task.objects.exclude(category__in=VALID_CATEGORIES)
        .values_list("category", flat=True)
        .distinct()
    )
    for raw in list(stale):
        Task.objects.filter(category=raw).update(category=_normalize(raw))


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0030_personalapitoken_scope"),
    ]

    operations = [
        migrations.RunPython(normalize_categories, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="task",
            name="category",
            field=models.CharField(
                choices=[("task", "Task"), ("meeting", "Meeting"), ("note", "Note")],
                default="task",
                max_length=10,
            ),
        ),
    ]
