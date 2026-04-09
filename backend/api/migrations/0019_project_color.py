from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0018_recurringtask_google_recurring_event_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="project",
            name="color",
            field=models.CharField(blank=True, default="#3b82f6", max_length=7),
        ),
    ]
