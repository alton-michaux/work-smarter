from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0034_task_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='recurringtask',
            name='description',
            field=models.TextField(blank=True, default=''),
        ),
    ]
