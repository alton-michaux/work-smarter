import hashlib
import secrets

from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from datetime import date

User = get_user_model()
# To extend the existing User model from AllAuth, create a separate Profile model with a OneToOneField to User.
# Example:
# class Profile(models.Model):
#     user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
#     # Add custom fields here, e.g.:
#     # bio = models.TextField(blank=True)
#     # avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
#
# Then, use signals to automatically create/update the Profile when a User is created.

class PersonalAPIToken(models.Model):
    """A long-lived, user-scoped key granting programmatic access to the v1 API.

    A key carries a ``scope``: ``read`` keys can only read, ``read_write`` keys
    can also create, edit and delete tasks. Read remains the default so that
    handing out a key is never accidentally handing out write access.

    The raw key is shown to the user exactly once, at creation. Only its SHA-256
    digest is stored, alongside a non-secret ``public_id`` used to look the row up
    without scanning every hash. Plain SHA-256 (no salt/KDF) is appropriate here
    because the secret is 256 bits of CSPRNG output, not a user-chosen password.
    """

    PREFIX = "ws_live_"
    PUBLIC_ID_BYTES = 4   # 8 hex characters
    SECRET_BYTES = 32

    SCOPE_READ = "read"
    SCOPE_READ_WRITE = "read_write"
    SCOPE_CHOICES = [
        (SCOPE_READ, "Read only"),
        (SCOPE_READ_WRITE, "Read and write"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="api_tokens")
    name = models.CharField(max_length=100, blank=True, default="")
    public_id = models.CharField(max_length=16, unique=True, db_index=True)
    hashed_secret = models.CharField(max_length=64)
    # Defaults to read: keys minted before write access existed were promised
    # they could not change anything, and a migration must not quietly widen them.
    scope = models.CharField(max_length=16, choices=SCOPE_CHOICES, default=SCOPE_READ)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.display_prefix} ({self.user})"

    @staticmethod
    def hash_secret(secret):
        return hashlib.sha256(secret.encode()).hexdigest()

    @classmethod
    def generate(cls, user, name="", scope=SCOPE_READ):
        """Create a token and return ``(token, raw_key)``.

        ``raw_key`` is the only time the secret exists in plaintext — the caller
        must hand it straight to the user and never persist it.
        """
        public_id = secrets.token_hex(cls.PUBLIC_ID_BYTES)
        secret = secrets.token_urlsafe(cls.SECRET_BYTES)
        token = cls.objects.create(
            user=user,
            name=name,
            scope=scope,
            public_id=public_id,
            hashed_secret=cls.hash_secret(secret),
        )
        return token, f"{cls.PREFIX}{public_id}.{secret}"

    def secret_matches(self, secret):
        return secrets.compare_digest(self.hashed_secret, self.hash_secret(secret))

    @property
    def can_write(self):
        return self.scope == self.SCOPE_READ_WRITE

    @property
    def display_prefix(self):
        """The non-secret half of the key, safe to show in a key list."""
        return f"{self.PREFIX}{self.public_id}"


class GoogleCalendarToken(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='google_calendar_token')
    access_token = models.TextField()
    refresh_token = models.TextField()
    token_expiry = models.DateTimeField()
    selected_calendar_id = models.CharField(max_length=255, blank=True, default='primary')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user}'s Google Calendar Token"


class CalendarBlacklist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="calendar_blacklist")
    google_event_id = models.CharField(max_length=255)
    title = models.CharField(max_length=500, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "google_event_id"],
                name="uniq_blacklist_user_event",
            )
        ]

    def __str__(self):
        return f"{self.user} — blacklisted {self.google_event_id}"


class Resume(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="resume", null=False, blank=False)
    title = models.CharField(max_length=200, blank=True, default='')
    file = models.FileField(upload_to='resumes/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user}'s Resume"


class ResumeAnalysis(models.Model):
    resume = models.OneToOneField(Resume, on_delete=models.CASCADE, related_name='analysis')
    score = models.FloatField()
    summary = models.TextField(blank=True, default='')
    suggestions = models.JSONField(default=list)
    accomplishments = models.JSONField(default=list)
    bullet_rewrites = models.JSONField(default=dict)
    analyzed_at = models.DateTimeField(auto_now=True)
    resume_fingerprint = models.CharField(max_length=64, blank=True, default='')

    class Meta:
        verbose_name = 'Resume Analysis'
        verbose_name_plural = 'Resume Analyses'

    def __str__(self):
        return f"Analysis for {self.resume}"


class GeneratedResume(models.Model):
    # resume is null for "generate from scratch" entries
    resume = models.OneToOneField(Resume, on_delete=models.CASCADE, null=True, blank=True, related_name='generated')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='generated_resumes')
    content = models.TextField()
    updated_at = models.DateTimeField(auto_now=True)
    source_fingerprint = models.CharField(max_length=64, blank=True, default='')

    def __str__(self):
        label = self.resume.title if self.resume else 'scratch'
        return f"Generated resume ({label}) for {self.user}"


class ResumeProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='resume_profile')
    headline = models.CharField(max_length=255, blank=True, default='')
    summary = models.TextField(blank=True, default='')
    location = models.CharField(max_length=255, blank=True, default='')
    photo_url = models.URLField(blank=True, default='')
    linkedin_url = models.URLField(blank=True, default='')

    def __str__(self):
        return f"{self.user}'s Resume Profile"


class WorkExperience(models.Model):
    profile = models.ForeignKey(ResumeProfile, on_delete=models.CASCADE, related_name='work_experiences')
    title = models.CharField(max_length=255)
    company = models.CharField(max_length=255)
    location = models.CharField(max_length=255, blank=True, default='')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=False)
    description = models.TextField(blank=True, default='')

    def __str__(self):
        return f"{self.title} at {self.company}"


class Education(models.Model):
    profile = models.ForeignKey(ResumeProfile, on_delete=models.CASCADE, related_name='educations')
    school = models.CharField(max_length=255)
    degree = models.CharField(max_length=255, blank=True, default='')
    field_of_study = models.CharField(max_length=255, blank=True, default='')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.degree} at {self.school}"


class Skill(models.Model):
    profile = models.ForeignKey(ResumeProfile, on_delete=models.CASCADE, related_name='skills')
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name
    
class Project(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('complete', 'Complete'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="projects", null=False, blank=False)
    name = models.CharField(max_length=100)
    color = models.CharField(max_length=7, default='#3b82f6', blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    description = models.TextField(blank=True, default='')
    role = models.CharField(max_length=100, blank=True, default='')
    created = models.DateTimeField(auto_now_add=True)

class RecurringTask(models.Model):        
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recurring_tasks",
    )
    title = models.CharField(max_length=255)
    project = models.ForeignKey(Project, null=True, on_delete=models.CASCADE)
    category = models.CharField(max_length=50, null=True)
    frequency = models.CharField(
        max_length=10,
        choices=[('daily', 'Daily'), ('weekly', 'Weekly'), ('biweekly', 'Bi-weekly'), ('monthly', 'Monthly'), ('quarterly', 'Quarterly')]
    )
    day_of_week = models.IntegerField(null=True, blank=True)  # 0–6
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    last_generated_at = models.DateField(null=True, blank=True)
    skip_weekends = models.BooleanField(default=False)
    google_recurring_event_id = models.CharField(max_length=255, null=True, blank=True, unique=True)

class RecurringTaskException(models.Model):
    TYPE_SKIP = "skip"
    TYPE_CHOICES = [
        (TYPE_SKIP, "Skip"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    recurring_task = models.ForeignKey(
        "RecurringTask",
        on_delete=models.CASCADE,
        related_name="exceptions",
    )
    date = models.DateField()
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_SKIP)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "recurring_task", "date", "type"],
                name="uniq_recurring_exception_per_day",
            )
        ]

    def __str__(self):
        return f"{self.user_id} {self.recurring_task_id} {self.date} {self.type}"

class Task(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="tasks", null=False, blank=False)
    PRIORITY_CHOICES = [
        ('urgent', 'Urgent'),
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    ]
    
    CATEGORY_CHOICES = [
        ('task', 'Task'),
        ('meeting', 'Meeting'),
        ('note', 'Note'),
    ]

    begin_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    deadline_date = models.DateField(null=True, blank=True)
    begin_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks', null=True, blank=True)
    title = models.TextField()
    category = models.CharField(max_length=10, choices=CATEGORY_CHOICES, default='task')
    is_done = models.BooleanField(default=False)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    description = models.TextField(blank=True)
    created_at = models.DateField(auto_now_add=True)
    
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        related_name='children',
        on_delete=models.SET_NULL,
    )
    is_subtask = models.BooleanField(default=False)
    # Manual sort order among siblings sharing a parent. Only meaningful for
    # subtasks; top-level rows are still ordered by priority/time.
    position = models.PositiveIntegerField(default=0)
    
    carry_over = models.BooleanField(default=True)
    google_event_id = models.CharField(max_length=255, null=True, blank=True)
    deadline_event_id = models.CharField(max_length=255, null=True, blank=True)
    recurring_task = models.ForeignKey(
        RecurringTask,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="tasks",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["recurring_task", "begin_date"],
                name="uniq_task_recurring_task_begin_date",
            )
        ]
    
    def save(self, *args, **kwargs):
        self.is_subtask = self.parent_id is not None
        if self.is_done and self.end_date is None:
            self.end_date = date.today()
        elif not self.is_done and self.end_date:
            self.end_date = None
        super().save(*args, **kwargs)
        
    models.UniqueConstraint(
        fields=["user", "title", "begin_date", "project", "parent"],
        name="uniq_task_user_title_begin_project_parent",
    )
