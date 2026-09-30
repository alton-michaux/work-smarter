"""Seed a day's worth of daily-log data with parent tasks and subtasks.

Useful for exercising the daily log by hand — nested rows, collapse toggles,
subtask progress badges, carry-over rows and meeting agendas.

    python manage.py seed_daily_log_demo
    python manage.py seed_daily_log_demo --user alton --date 2026-08-31
    python manage.py seed_daily_log_demo --clear

Every row created here is tagged with MARK in its description, and each run
deletes previously tagged rows before seeding, so the command is safe to
re-run and never touches real data.
"""
from datetime import date, time, timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q

from api.models import Project, Task

MARK = "[seed:daily-log-demo]"


class Command(BaseCommand):
    help = "Seed demo tasks, subtasks and meetings for the daily log."

    def add_arguments(self, parser):
        parser.add_argument(
            "--user",
            help="Username or email to seed for. Defaults to the oldest account.",
        )
        parser.add_argument(
            "--date",
            help="Day to seed, as YYYY-MM-DD. Defaults to today.",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete previously seeded rows and exit without seeding.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Allow the command to run when DEBUG is off.",
        )

    def handle(self, *args, **options):
        if not settings.DEBUG and not options["force"]:
            raise CommandError(
                "Refusing to seed demo data with DEBUG off. Pass --force to override."
            )

        user = self._resolve_user(options["user"])
        day = self._resolve_date(options["date"])

        with transaction.atomic():
            removed, _ = Task.objects.filter(
                user=user, description__contains=MARK
            ).delete()
            if removed:
                self.stdout.write(f"Cleared {removed} previously seeded row(s).")

            if options["clear"]:
                self.stdout.write(self.style.SUCCESS("Done."))
                return

            self._seed(user, day)

        count = Task.objects.filter(user=user, description__contains=MARK).count()
        self.stdout.write(
            self.style.SUCCESS(f"Seeded {count} row(s) for {user.username} on {day}.")
        )
        self.stdout.write("Remove them again with --clear.")

    # ── helpers ──────────────────────────────────────────────────────────

    def _resolve_user(self, identifier):
        User = get_user_model()

        if identifier:
            user = User.objects.filter(
                Q(username=identifier) | Q(email__iexact=identifier)
            ).first()
            if not user:
                raise CommandError(f"No user matching {identifier!r}.")
            return user

        user = User.objects.order_by("id").first()
        if not user:
            raise CommandError("No users exist yet — create one first.")
        self.stdout.write(f"No --user given; seeding for {user.username}.")
        return user

    def _resolve_date(self, raw):
        if not raw:
            return date.today()
        try:
            return date.fromisoformat(raw)
        except ValueError:
            raise CommandError(f"Invalid --date {raw!r}; expected YYYY-MM-DD.")

    def _seed(self, user, day):
        projects = list(Project.objects.filter(user=user).order_by("id")[:2])
        first = projects[0] if projects else None
        second = projects[1] if len(projects) > 1 else first

        def mk(title, parent=None, **kw):
            kw.setdefault("category", "task")
            kw.setdefault("begin_date", day)
            # Task.save() fills end_date for anything marked done, which is what
            # keeps completed rows visible on the day they were finished.
            return Task.objects.create(
                user=user, title=title, parent=parent, description=MARK, **kw
            )

        # ── Tasks panel ──────────────────────────────────────────────────
        # Partly done: subtask badge reads 2/4 and the parent checkbox is
        # indeterminate.
        p1 = mk("Ship collapsible daily log", priority="high", project=first)
        mk("Add chevron toggle to OutlineRow", parent=p1, priority="high", is_done=True)
        mk("Persist collapse state to localStorage", parent=p1, priority="medium", is_done=True)
        mk("Thread state through nested trees", parent=p1, priority="medium")
        mk("Verify compact density alignment", parent=p1, priority="low")

        # Nothing done yet: 0/3.
        p2 = mk("Q3 performance review packet", priority="urgent")
        mk("Collect peer feedback", parent=p2, priority="high")
        mk("Write self-assessment", parent=p2, priority="medium")
        mk("Book review slot", parent=p2, priority="low")

        # Began two days ago with every subtask done: a carry-over row at 5/5.
        older = day - timedelta(days=2)
        p3 = mk("Migrate task API pagination", priority="medium", project=second,
                begin_date=older)
        for title in (
            "Audit cursor ordering",
            "Backfill category column",
            "Add regression test",
            "Update API docs",
            "Deploy to staging",
        ):
            mk(title, parent=p3, priority="medium", begin_date=older, is_done=True)

        # Three levels deep — collapsing the top row hides the grandchild too.
        p4 = mk("Plan Q4 roadmap", priority="low", project=first)
        c4 = mk("Draft roadmap themes", parent=p4, priority="medium")
        mk("Collect team input", parent=c4, priority="low")

        # Childless rows, to check they stay aligned with the chevron rows.
        mk("Renew domain registration", priority="medium")
        mk("Email landlord about lease", priority="low",
           deadline_date=day + timedelta(days=2))

        # ── Meetings panel ───────────────────────────────────────────────
        # Agenda items have to be meetings too, or they land in the tasks tree.
        # Evening times keep auto_complete_past_meetings from checking them off.
        m1 = mk("Sprint planning", category="meeting", priority="high", project=first,
                begin_time=time(18, 0), end_time=time(18, 45))
        mk("Review carry-over tasks", parent=m1, category="meeting", priority="medium",
           begin_time=time(18, 0), end_time=time(18, 20))
        mk("Assign collapse QA", parent=m1, category="meeting", priority="low",
           begin_time=time(18, 20), end_time=time(18, 45), is_done=True)

        mk("1:1 with manager", category="meeting", priority="medium",
           begin_time=time(19, 0), end_time=time(19, 30))
