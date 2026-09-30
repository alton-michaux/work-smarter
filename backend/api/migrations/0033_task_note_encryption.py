from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0032_task_position'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='is_encrypted',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='task',
            name='encrypted_description',
            field=models.BinaryField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='task',
            name='encryption_salt',
            field=models.BinaryField(blank=True, null=True),
        ),
    ]
