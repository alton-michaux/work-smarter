from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q, F
from django.utils import timezone
from api.models import Task


class Command(BaseCommand):
    help = "Set end_date = begin_date and mark past meetings as done."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show changes without saving.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Limit number of records processed.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        limit = options["limit"]

        today = timezone.localdate()

        qs = Task.objects.filter(
            category="meeting",
            begin_date__isnull=False,
            begin_date__lt=today,  # ✅ only meetings in the past
        ).filter(
            # only bother updating tasks that aren't already correct
            Q(end_date__isnull=True) | ~Q(end_date=F("begin_date")) | Q(is_done=False)
        )

        if limit:
            qs = qs[:limit]

        total = qs.count()
        self.stdout.write(self.style.WARNING(f"Found {total} past meeting task(s) to update."))

        updated = 0

        with transaction.atomic():
            for task in qs.iterator(chunk_size=1000):
                old_end = task.end_date
                old_done = task.is_done

                task.end_date = task.begin_date
                task.is_done = True

                updated += 1
                self.stdout.write(
                    f"Task {task.id}: end_date {old_end} -> {task.begin_date}, "
                    f"is_done {old_done} -> True"
                )

                if not dry_run:
                    task.save(update_fields=["end_date", "is_done"])

            if dry_run:
                raise transaction.TransactionManagementError("Dry run complete, rolling back.")

        self.stdout.write(self.style.SUCCESS(
            f"{'Would update' if dry_run else 'Updated'} {updated} task(s)."
        ))