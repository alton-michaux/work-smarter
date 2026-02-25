from django.core.management.base import BaseCommand
from django.db import transaction
from api.models import Task

class Command(BaseCommand):
    help = "Fix invalid Task.category values by mapping them to valid ones."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would change, but don't write to the database.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Only process up to N records (useful for testing).",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        limit = options["limit"]

        # ✅ Define your mapping here
        mapping = {
            "Meetings": "meeting",
            "Meeting": "meeting",
            "meetings": "meeting",
            "Vamos": "meeting",
            "Datos": "meeting",
            "Tasks": "task",
            "Task": "task",
            "tasks": "task",
            "Notes": "note",
            "Note": "note",
            "notes": "note",
        }

        # Find tasks with invalid values (example strategy)
        qs = Task.objects.exclude(category__in=["meeting", "work", "admin"]).exclude(category__isnull=True)

        if limit:
            qs = qs[:limit]

        total = qs.count()
        self.stdout.write(self.style.WARNING(f"Found {total} tasks with potentially invalid category."))

        changes = 0

        with transaction.atomic():
            for t in qs.iterator(chunk_size=1000):
                old = t.category
                new = mapping.get(old)

                if not new:
                    # Skip anything not in mapping (keeps it safe)
                    continue

                changes += 1
                self.stdout.write(f"Task {t.id}: {old} -> {new}")

                if not dry_run:
                    t.category = new
                    t.save(update_fields=["category"])

            if dry_run:
                # Forces rollback even inside atomic block
                raise transaction.TransactionManagementError("Dry run complete, rolling back.")

        self.stdout.write(self.style.SUCCESS(f"Done. Would change {changes} record(s)." if dry_run else f"Done. Changed {changes} record(s)."))
        