from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0014_recurringtask_skip_weekends'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='begin_time',
            field=models.TimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='task',
            name='end_time',
            field=models.TimeField(blank=True, null=True),
        ),
    ]
