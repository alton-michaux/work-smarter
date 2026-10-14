from django.db import migrations, models


def is_done_to_status(apps, schema_editor):
    Task = apps.get_model('api', 'Task')
    Task.objects.filter(is_done=True).update(status='done')


def status_to_is_done(apps, schema_editor):
    Task = apps.get_model('api', 'Task')
    Task.objects.filter(status='done').update(is_done=True)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0033_task_note_encryption'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='status',
            field=models.CharField(
                choices=[('open', 'Open'), ('in_progress', 'In progress'), ('done', 'Done')],
                db_index=True,
                default='open',
                max_length=12,
            ),
        ),
        migrations.AddField(
            model_name='task',
            name='started_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.RunPython(is_done_to_status, status_to_is_done),
        migrations.RemoveField(
            model_name='task',
            name='is_done',
        ),
    ]
