from django.db import migrations


def clear_stale_end_dates(apps, schema_editor):
    Task = apps.get_model("api", "Task")
    Task.objects.filter(is_done=False, end_date__isnull=False).update(end_date=None)


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0027_generatedresume"),
    ]

    operations = [
        migrations.RunPython(clear_stale_end_dates, migrations.RunPython.noop),
    ]
