"""Create a throwaway demo account filled with data for stress-testing the app.

Unlike seed_daily_log_demo, which adds a day of rows to an existing account,
this builds a whole separate login so it never mixes with real data:

    python manage.py seed_demo_account
    python manage.py seed_demo_account --clear

Log in as demo@worksmarter.test / demo-pass-1234. Re-running deletes the demo
account and rebuilds it from scratch, so the command is idempotent.

What it covers:
  * Projects — active and complete, custom colors, roles, long descriptions,
    one with 120+ tasks so paginated project and task lists need a second page.
  * Daily log / weekly tracker — today's tasks with subtasks in a deliberate
    (non-alphabetical) position order for drag-reordering, three-level nesting,
    long-running carry-overs from months ago, overdue and upcoming deadlines,
    very long titles, and evening meetings with agenda items.
  * Recurring series — every frequency, skip-weekends, a series with skip
    exceptions and an ended series.
  * Notes — markdown, plain, and encrypted ones (passphrase: demo-passphrase).
  * Timeline — six months of completed work spread across projects.
  * API keys — read and read/write keys, one never used; raw keys are printed.
  * Resume — a profile with experience, education and skills for AI
    generation, plus an uploaded PDF resume.
"""
import random
from datetime import date, datetime, time, timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from api.models import (
    Education,
    PersonalAPIToken,
    Project,
    RecurringTask,
    RecurringTaskException,
    Resume,
    ResumeProfile,
    Skill,
    Task,
    WorkExperience,
)
from api.services.note_encryption import encrypt_text
from api.services.recurring_tasks import ensure_recurring_tasks_in_range

EMAIL = "demo@worksmarter.test"
USERNAME = "demo"
PASSWORD = "demo-pass-1234"
NOTE_PASSPHRASE = "demo-passphrase"


class Command(BaseCommand):
    help = "Create (or rebuild) a demo account full of stress-test data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete the demo account and exit without seeding.",
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

        User = get_user_model()
        # Seeded with a fixed value so every rebuild produces the same data.
        self.rng = random.Random(42)
        self.today = date.today()

        with transaction.atomic():
            existing = User.objects.filter(email__iexact=EMAIL)
            if existing.exists():
                for user in existing:
                    # Resume files live on disk; the row delete alone leaves them.
                    for resume in user.resume.all():
                        resume.file.delete(save=False)
                existing.delete()
                self.stdout.write("Deleted the existing demo account.")

            if options["clear"]:
                self.stdout.write(self.style.SUCCESS("Done."))
                return

            user = User.objects.create_user(
                username=USERNAME,
                email=EMAIL,
                password=PASSWORD,
                first_name="Dana",
                last_name="Demo",
            )
            self._verify_email(user)
            projects = self._seed_projects(user)
            self._seed_today(user, projects)
            self._seed_carry_overs(user, projects)
            self._seed_history(user, projects)
            self._seed_bulk_project(user, projects["platform"])
            self._seed_recurring(user, projects)
            self._seed_notes(user, projects)
            keys = self._seed_api_keys(user)
            self._seed_resume(user)

        self._report(user, keys)

    # ── account ──────────────────────────────────────────────────────────

    def _verify_email(self, user):
        try:
            from allauth.account.models import EmailAddress
        except ImportError:
            return
        EmailAddress.objects.create(user=user, email=EMAIL, verified=True, primary=True)

    def _task(self, user, title, **kw):
        kw.setdefault("category", "task")
        kw.setdefault("begin_date", self.today)
        return Task.objects.create(user=user, title=title, **kw)

    # ── projects ─────────────────────────────────────────────────────────

    def _seed_projects(self, user):
        specs = {
            "platform": dict(
                name="Platform Rewrite",
                color="#6366f1",
                role="Tech Lead",
                description=(
                    "Replacing the legacy monolith with a service-oriented backend. "
                    "Covers auth, billing, notifications and the public API. "
                    "This description is intentionally long so the project card has "
                    "to truncate it rather than letting it push the layout around. "
                    * 2
                ).strip(),
            ),
            "mobile": dict(
                name="Mobile App v2",
                color="#10b981",
                role="Senior Engineer",
                description="React Native rebuild with offline sync.",
            ),
            "hiring": dict(
                name="Hiring",
                color="#f59e0b",
                role="Interviewer",
                description="Backend and frontend loops for Q4.",
            ),
            "legacy": dict(
                name="Legacy Billing Sunset",
                color="#ef4444",
                role="Engineer",
                status="complete",
                description="Retired the old invoicing system. Complete.",
            ),
            # Near-identical color to platform, to check the two stay distinguishable.
            "research": dict(
                name="Research: Vector Search Evaluation for In-App Semantic Lookup",
                color="#6d6af0",
                role="",
                description="",
            ),
        }
        return {key: Project.objects.create(user=user, **spec) for key, spec in specs.items()}

    # ── today: daily log, subtasks, meetings ─────────────────────────────

    def _seed_today(self, user, p):
        t = self.today

        # Subtasks created out of position order so the list only reads
        # correctly if the UI sorts by position rather than id or title.
        parent = self._task(user, "Cut over auth service to production",
                            priority="urgent", project=p["platform"],
                            deadline_date=t + timedelta(days=1))
        for pos, (title, done) in {
            3: ("Flip DNS to new auth cluster", False),
            0: ("Freeze session schema", True),
            4: ("Delete legacy session table", False),
            1: ("Run dual-write for 24h", True),
            2: ("Compare token validation error rates", False),
            5: ("Write post-cutover announcement", False),
            6: ("Update on-call runbook", False),
        }.items():
            self._task(user, title, parent=parent, position=pos, is_done=done,
                       priority="high", project=p["platform"])

        # Three levels deep, mixed completion at each level.
        epic = self._task(user, "Offline sync for mobile", priority="high", project=p["mobile"])
        conflict = self._task(user, "Conflict resolution", parent=epic, position=0,
                              priority="high", project=p["mobile"])
        self._task(user, "Last-write-wins for scalar fields", parent=conflict, position=0,
                   is_done=True, project=p["mobile"])
        self._task(user, "Merge strategy for list fields", parent=conflict, position=1,
                   project=p["mobile"])
        self._task(user, "Surface unresolved conflicts to the user", parent=conflict,
                   position=2, project=p["mobile"])
        queue = self._task(user, "Outbound mutation queue", parent=epic, position=1,
                           project=p["mobile"], is_done=True)
        self._task(user, "Persist queue to SQLite", parent=queue, position=0,
                   is_done=True, project=p["mobile"])
        self._task(user, "Retry with backoff", parent=queue, position=1,
                   is_done=True, project=p["mobile"])

        # A parent with many subtasks, for reorder and scroll behaviour.
        big = self._task(user, "Pre-launch checklist", priority="medium", project=p["mobile"])
        for i in range(15):
            self._task(user, f"Checklist item {i + 1:02d}", parent=big, position=i,
                       is_done=i % 4 == 0, priority="low", project=p["mobile"])

        # Layout stress: long unbroken title, long title with spaces, emoji, markup.
        self._task(user, "Investigate " + "x" * 120, priority="low")
        self._task(user,
                   "Write a thorough migration guide covering every breaking change in "
                   "the v2 API, including pagination, error envelopes, auth headers, "
                   "rate-limit responses, and the renamed task category field",
                   priority="medium", project=p["platform"])
        self._task(user, "🚀 Ship release notes — «v2.4» & <script>alert(1)</script>",
                   priority="high", project=p["mobile"])

        # Deadlines: overdue, due today, soon, far.
        self._task(user, "Submit expense report", priority="urgent",
                   deadline_date=t - timedelta(days=3), begin_date=t - timedelta(days=10))
        self._task(user, "Renew TLS certificates", priority="high", project=p["platform"],
                   deadline_date=t)
        self._task(user, "Prepare interview rubric", priority="medium", project=p["hiring"],
                   deadline_date=t + timedelta(days=4))
        self._task(user, "Plan offsite", priority="low", deadline_date=t + timedelta(days=45))

        # Done today — should still show as completed on today's log.
        self._task(user, "Reply to security questionnaire", is_done=True, priority="medium")
        self._task(user, "Merge dependency bumps", is_done=True, priority="low",
                   project=p["platform"])

        # Meetings. Times are evening so auto_complete_past_meetings leaves
        # them undone during a normal working day.
        standup = self._task(user, "Platform sync", category="meeting", priority="high",
                             project=p["platform"], begin_time=time(17, 0),
                             end_time=time(17, 30))
        for pos, title in enumerate(("Cutover go/no-go", "Error budget review",
                                     "Open questions")):
            self._task(user, title, category="meeting", parent=standup, position=pos,
                       project=p["platform"], begin_time=time(17, 0),
                       end_time=time(17, 30))
        self._task(user, "Candidate loop: backend (panel)", category="meeting",
                   project=p["hiring"], begin_time=time(18, 0), end_time=time(19, 30))
        self._task(user, "1:1 with manager", category="meeting", begin_time=time(19, 45),
                   end_time=time(20, 15))
        # Overlapping meetings and one without a project.
        self._task(user, "Design review — offline sync", category="meeting",
                   project=p["mobile"], begin_time=time(18, 30), end_time=time(19, 0))
        self._task(user, "Coffee chat", category="meeting", begin_time=time(21, 0),
                   end_time=time(21, 15))

        # Upcoming meetings, for the project page's future-meetings list.
        for days, title, proj in ((1, "Mobile beta retro", "mobile"),
                                  (2, "Platform architecture review", "platform"),
                                  (6, "Hiring calibration", "hiring"),
                                  (13, "Quarterly planning", None)):
            self._task(user, title, category="meeting", begin_date=t + timedelta(days=days),
                       project=p[proj] if proj else None, begin_time=time(15, 0),
                       end_time=time(16, 0))

    # ── long-running carry-overs ─────────────────────────────────────────

    def _seed_carry_overs(self, user, p):
        t = self.today
        for days, title, proj, prio in (
            (1, "Review open PRs from yesterday", "platform", "medium"),
            (6, "Refactor notification templates", "platform", "medium"),
            (21, "Write ADR for event bus", "platform", "high"),
            (75, "Migrate CI to new runners", "platform", "low"),
            (160, "Keep dependency upgrade log current", None, "low"),
        ):
            self._task(user, title, begin_date=t - timedelta(days=days),
                       project=p[proj] if proj else None, priority=prio)

        # A carry-over parent from last week with a subtask finished today.
        parent = self._task(user, "Accessibility audit", begin_date=t - timedelta(days=8),
                            project=p["mobile"], priority="high")
        for pos, (title, done) in enumerate((("Screen reader labels", True),
                                             ("Color contrast pass", True),
                                             ("Focus order on forms", False),
                                             ("Dynamic type support", False))):
            self._task(user, title, parent=parent, position=pos, is_done=done,
                       begin_date=t - timedelta(days=8), project=p["mobile"])

        # carry_over=False. The daily-log query doesn't consult this flag yet, so
        # today this row still carries over; it's here to probe that behaviour.
        self._task(user, "One-off: check staging banner", carry_over=False,
                   begin_date=t - timedelta(days=2), priority="low")

    # ── six months of history for the timeline and weekly tracker ───────

    def _seed_history(self, user, p):
        verbs = ("Fix", "Add", "Refactor", "Document", "Test", "Review", "Tune", "Remove")
        nouns = ("rate limiter", "billing webhook", "search index", "CSV importer",
                 "login flow", "settings page", "push notifications", "cache layer",
                 "task serializer", "calendar sync", "export job", "audit log")
        weights = [("platform", 5), ("mobile", 3), ("hiring", 1), ("legacy", 2), (None, 1)]
        keys = [k for k, w in weights for _ in range(w)]

        for day_offset in range(180, 0, -1):
            d = self.today - timedelta(days=day_offset)
            if d.weekday() >= 5:
                continue
            for _ in range(self.rng.randint(0, 2)):
                key = self.rng.choice(keys)
                # Legacy Billing only had work before it was completed.
                if key == "legacy" and day_offset < 60:
                    key = "platform"
                span = self.rng.choice((0, 0, 0, 1, 2, 5, 12))
                title = f"{self.rng.choice(verbs)} {self.rng.choice(nouns)}"
                task = Task(
                    user=user,
                    title=f"{title} (#{self.rng.randint(100, 999)})",
                    category="task",
                    begin_date=d,
                    project=p[key] if key else None,
                    priority=self.rng.choice(("urgent", "high", "medium", "medium", "low")),
                    is_done=True,
                    end_date=min(d + timedelta(days=span), self.today - timedelta(days=1)),
                )
                task.save()

            # A past meeting most weekdays, already completed.
            if self.rng.random() < 0.6:
                Task.objects.create(
                    user=user, title=self.rng.choice(("Standup", "Sprint review",
                                                     "Customer call", "Retro")),
                    category="meeting", begin_date=d, end_date=d, is_done=True,
                    begin_time=time(10, 0), end_time=time(10, 30),
                    project=p[self.rng.choice(("platform", "mobile"))],
                )

    def _seed_bulk_project(self, user, project):
        # Open tasks on one project, well past the 50-row cursor page size.
        for i in range(120):
            self._task(user, f"Backlog item {i + 1:03d}: migrate endpoint group {i % 12}",
                       project=project, begin_date=self.today + timedelta(days=30 + i % 20),
                       priority=("low", "medium", "high")[i % 3], carry_over=False)

    # ── recurring series ─────────────────────────────────────────────────

    def _seed_recurring(self, user, p):
        t = self.today
        monday = t - timedelta(days=t.weekday())

        def series(title, **kw):
            kw.setdefault("start_date", t - timedelta(days=60))
            kw.setdefault("category", "task")
            return RecurringTask.objects.create(user=user, title=title, **kw)

        series("Check error dashboards", frequency="daily", skip_weekends=True,
               project=p["platform"])
        series("Water the plants", frequency="daily")
        standup = series("Daily standup", frequency="daily", skip_weekends=True,
                         category="meeting", project=p["platform"])
        series("Weekly planning", frequency="weekly", day_of_week=0, category="meeting",
               project=p["platform"], start_date=monday - timedelta(weeks=8))
        series("Sprint demo", frequency="biweekly", day_of_week=3, category="meeting",
               project=p["mobile"], start_date=monday - timedelta(weeks=8) + timedelta(days=3))
        series("Send status report", frequency="monthly",
               start_date=t.replace(day=min(t.day, 28)) - timedelta(days=90))
        series("Quarterly access review", frequency="quarterly", project=p["platform"],
               start_date=t - timedelta(days=180))
        # Ended last week: generated rows should stop at end_date.
        series("Legacy billing reconciliation", frequency="weekly", day_of_week=2,
               project=p["legacy"], start_date=t - timedelta(days=120),
               end_date=t - timedelta(days=7))

        # Skip the standup on a few days, including one in the coming week.
        for offset in (-3, -1, 2):
            d = t + timedelta(days=offset)
            if d.weekday() < 5:
                RecurringTaskException.objects.create(user=user, recurring_task=standup,
                                                      date=d)

        # Materialise past occurrences and check them off, as a regular user
        # would have. Undone past task occurrences carry over, so leaving 60
        # days of them open would bury the daily log. Keep two missed ones
        # from this week so the carry-over path still has something to show.
        ensure_recurring_tasks_in_range(t - timedelta(days=180), t - timedelta(days=1),
                                        user=user)
        missed = {("Check error dashboards", 1), ("Water the plants", 3)}
        for occ in Task.objects.filter(user=user, recurring_task__isnull=False,
                                       begin_date__lt=t):
            if (occ.title, (t - occ.begin_date).days) in missed:
                continue
            occ.is_done = True
            occ.end_date = occ.begin_date
            occ.save()

    # ── notes ────────────────────────────────────────────────────────────

    def _seed_notes(self, user, p):
        t = self.today
        markdown = (
            "## Cutover plan\n\n"
            "1. Freeze schema\n2. Dual-write\n3. **Flip DNS**\n\n"
            "- [ ] Tell support\n- [x] Draft rollback steps\n\n"
            "```sql\nSELECT count(*) FROM sessions WHERE expires_at < now();\n```\n\n"
            "> Rollback must be possible within 5 minutes.\n\n"
            "See [the runbook](https://example.com/runbook)."
        )
        notes = [
            ("Auth cutover notes", markdown, "platform", 0),
            ("Interview question bank",
             "\n".join(f"- Question {i}: design a {n}" for i, n in enumerate(
                 ("URL shortener", "rate limiter", "chat backend", "feed ranker",
                  "job queue", "calendar sync", "search autocomplete"), 1)), "hiring", 3),
            ("Scratch", "short", None, 0),
            ("Very long note", ("Lorem ipsum dolor sit amet, consectetur adipiscing elit. "
                                * 80).strip(), None, 5),
            ("Mobile offline edge cases",
             "What happens when a task is deleted on one device and edited on another?",
             "mobile", 12),
        ]
        for title, body, proj, age in notes:
            self._task(user, title, category="note", description=body,
                       project=p[proj] if proj else None, begin_date=t - timedelta(days=age))

        for title, body, proj in (
            ("Salary negotiation notes", "Target: top of band. Walk-away: current + 10%.",
             None),
            ("Prod DB credentials rotation", "Rotation schedule and break-glass contacts.",
             "platform"),
        ):
            ciphertext, salt = encrypt_text(body, NOTE_PASSPHRASE)
            self._task(user, title, category="note", description="", is_encrypted=True,
                       encrypted_description=ciphertext, encryption_salt=salt,
                       project=p[proj] if proj else None, begin_date=t - timedelta(days=2))

    # ── API keys ─────────────────────────────────────────────────────────

    def _seed_api_keys(self, user):
        keys = {}
        for name, scope, last_used in (
            ("laptop scripts", PersonalAPIToken.SCOPE_READ, timedelta(hours=3)),
            ("zapier automation", PersonalAPIToken.SCOPE_READ_WRITE, timedelta(days=12)),
            ("", PersonalAPIToken.SCOPE_READ, None),
        ):
            token, raw = PersonalAPIToken.generate(user, name=name, scope=scope)
            if last_used:
                token.last_used_at = timezone.now() - last_used
                token.save(update_fields=["last_used_at"])
            keys[name or "(unnamed)"] = (scope, raw)
        return keys

    # ── resume ───────────────────────────────────────────────────────────

    def _seed_resume(self, user):
        profile = ResumeProfile.objects.create(
            user=user,
            headline="Senior Software Engineer",
            summary="Backend-leaning engineer who likes boring, reliable systems.",
            location="Denver, CO",
            linkedin_url="https://www.linkedin.com/in/example-demo",
        )
        WorkExperience.objects.create(
            profile=profile, title="Tech Lead", company="Acme Corp", location="Remote",
            start_date=date(2022, 3, 1), is_current=True,
            description="Leading the platform rewrite; owns auth and billing services.",
        )
        WorkExperience.objects.create(
            profile=profile, title="Software Engineer", company="Initech",
            location="Austin, TX", start_date=date(2018, 6, 1), end_date=date(2022, 2, 1),
            description="Built the invoicing pipeline and internal reporting tools.",
        )
        Education.objects.create(
            profile=profile, school="State University", degree="B.S.",
            field_of_study="Computer Science", start_date=date(2014, 8, 1),
            end_date=date(2018, 5, 1),
        )
        for name in ("Python", "Django", "PostgreSQL", "TypeScript", "React", "AWS",
                     "Kubernetes"):
            Skill.objects.create(profile=profile, name=name)

        resume = Resume(user=user, title="Dana Demo — Resume")
        resume.file.save("dana-demo-resume.pdf", ContentFile(_resume_pdf()), save=True)

    # ── output ───────────────────────────────────────────────────────────

    def _report(self, user, keys):
        counts = {
            "projects": user.projects.count(),
            "tasks": Task.objects.filter(user=user, category="task").count(),
            "meetings": Task.objects.filter(user=user, category="meeting").count(),
            "notes": Task.objects.filter(user=user, category="note").count(),
            "recurring series": user.recurring_tasks.count(),
        }
        self.stdout.write(self.style.SUCCESS("Demo account ready."))
        self.stdout.write(f"  Login:            {EMAIL} / {PASSWORD}")
        self.stdout.write(f"  Note passphrase:  {NOTE_PASSPHRASE}")
        self.stdout.write("  " + ", ".join(f"{n} {k}" for k, n in counts.items()))
        self.stdout.write("  API keys (shown once — the DB only stores hashes):")
        for name, (scope, raw) in keys.items():
            self.stdout.write(f"    {name:<18} {scope:<10} {raw}")
        self.stdout.write("Remove it again with --clear.")


def _resume_pdf():
    """A minimal single-page text PDF, with a correct xref so parsers accept it."""
    lines = [
        "Dana Demo",
        "Senior Software Engineer - Denver, CO - demo@worksmarter.test",
        "",
        "EXPERIENCE",
        "Tech Lead, Acme Corp (2022 - Present)",
        "- Led rewrite of auth service; cut login p95 latency by 40%.",
        "- Introduced cursor pagination across the public API.",
        "Software Engineer, Initech (2018 - 2022)",
        "- Built invoicing pipeline processing 2M invoices/month.",
        "",
        "EDUCATION",
        "B.S. Computer Science, State University (2018)",
        "",
        "SKILLS",
        "Python, Django, PostgreSQL, TypeScript, React, AWS, Kubernetes",
    ]
    text = ["BT", "/F1 11 Tf", "14 TL", "72 740 Td"]
    for line in lines:
        escaped = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        text.append(f"({escaped}) Tj T*")
    text.append("ET")
    stream = "\n".join(text).encode("latin-1")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length %d >>\nstream\n%s\nendstream" % (len(stream), stream),
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for i, body in enumerate(objects, 1):
        offsets.append(len(out))
        out += b"%d 0 obj\n%s\nendobj\n" % (i, body)
    xref = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1)
    for off in offsets:
        out += b"%010d 00000 n \n" % off
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%EOF\n" % (
        len(objects) + 1, xref)
    return bytes(out)
