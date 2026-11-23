import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0035_recurringtask_description'),
    ]

    operations = [
        migrations.AddField(
            model_name='recurringtask',
            name='parent',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='recurring_children', to='api.task'),
        ),
    ]
