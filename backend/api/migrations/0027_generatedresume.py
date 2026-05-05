from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0026_resumeanalysis'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='GeneratedResume',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('content', models.TextField()),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('source_fingerprint', models.CharField(blank=True, default='', max_length=64)),
                ('resume', models.OneToOneField(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='generated',
                    to='api.resume',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='generated_resumes',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
        ),
    ]
