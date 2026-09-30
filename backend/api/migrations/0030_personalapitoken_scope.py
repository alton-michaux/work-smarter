from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("api", "0029_personalapitoken"),
    ]

    operations = [
        migrations.AddField(
            model_name="personalapitoken",
            name="scope",
            field=models.CharField(
                choices=[("read", "Read only"), ("read_write", "Read and write")],
                default="read",
                max_length=16,
            ),
        ),
    ]
