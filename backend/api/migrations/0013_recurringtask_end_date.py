from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0012_alter_recurringtask_frequency'),
    ]

    operations = [
        migrations.AddField(
            model_name='recurringtask',
            name='end_date',
            field=models.DateField(blank=True, null=True),
        ),
    ]
