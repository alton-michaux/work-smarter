from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0017_delete_home_working_location_tasks"),
    ]

    operations = [
        migrations.AddField(
            model_name="recurringtask",
            name="google_recurring_event_id",
            field=models.CharField(max_length=255, null=True, blank=True, unique=True),
        ),
    ]
