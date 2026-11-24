from django.db import migrations


def forwards(apps, schema_editor):
    Task = apps.get_model("api", "Task")
    Task.objects.filter(carry_over=False, children__isnull=False).exclude(
        category="meeting"
    ).update(carry_over=True)


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0036_recurringtask_parent"),
    ]

    operations = [
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
