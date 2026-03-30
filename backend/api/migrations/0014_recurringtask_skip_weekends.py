from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0013_recurringtask_end_date'),
    ]

    operations = [
        migrations.AddField(
            model_name='recurringtask',
            name='skip_weekends',
            field=models.BooleanField(default=False),
        ),
    ]
