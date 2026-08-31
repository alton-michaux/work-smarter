from django.db import migrations, models

# Kept inline rather than imported from elsewhere: migrations must stay stable
# even if the UI's sort rules change later.
PRIORITY_RANK = {"urgent": 0, "high": 1, "medium": 2, "low": 3}


def backfill_positions(apps, schema_editor):
    """Give existing subtasks distinct positions in their current display order.

    Before this field the daily log sorted subtasks by priority, so seeding
    positions the same way means nothing visibly moves the first time the page
    is loaded after deploy. Leaving every row at the default 0 would instead
    hand the order to whatever the database happened to return.
    """
    Task = apps.get_model("api", "Task")

    subtasks = Task.objects.filter(parent__isnull=False).only(
        "id", "parent_id", "priority", "position"
    )

    by_parent = {}
    for task in subtasks:
        by_parent.setdefault(task.parent_id, []).append(task)

    updates = []
    for siblings in by_parent.values():
        siblings.sort(
            key=lambda t: (PRIORITY_RANK.get((t.priority or "").lower(), 4), t.id)
        )
        for position, task in enumerate(siblings):
            task.position = position
            updates.append(task)

    if updates:
        Task.objects.bulk_update(updates, ["position"], batch_size=500)


def noop(apps, schema_editor):
    """Nothing to undo — reversing the AddField drops the column outright."""


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0031_normalize_task_category"),
    ]

    operations = [
        migrations.AddField(
            model_name="task",
            name="position",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.RunPython(backfill_positions, noop),
    ]
