from django.db import migrations


def delete_home_working_location_tasks(apps, schema_editor):
    Task = apps.get_model("api", "Task")
    Task.objects.filter(
        title="Home",
        category="meeting",
        google_event_id__isnull=False,
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0016_task_google_event_id_googlecalendartoken"),
    ]

    operations = [
        migrations.RunPython(
            delete_home_working_location_tasks,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
