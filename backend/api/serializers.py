from django.utils import timezone
from datetime import timedelta, timezone as dt_timezone
from rest_framework import serializers
from .categories import DEFAULT_CATEGORY
from .models import Resume, Task, Project, User, RecurringTask, CalendarBlacklist, ResumeProfile, WorkExperience, Education, Skill, PersonalAPIToken
from .services.note_encryption import encrypt_text, decrypt_text, InvalidToken

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["email", "id", "username"]
        read_only_fields = ["id"]

class TaskSerializer(serializers.ModelSerializer):
    begin_date = serializers.DateField(required=False, allow_null=True, default=None)
    end_date = serializers.DateField(required=False, allow_null=True, default=None)
    deadline_date = serializers.DateField(required=False, allow_null=True, default=None)
    begin_time = serializers.TimeField(required=False, allow_null=True, default=None)
    end_time = serializers.TimeField(required=False, allow_null=True, default=None)

    recurring_task = serializers.PrimaryKeyRelatedField(
        queryset=RecurringTask.objects.all(),
        required=False,
        allow_null=True,
    )
    recurring_task_id = serializers.IntegerField(source="recurring_task.id", read_only=True)
    recurring_frequency = serializers.CharField(source="recurring_task.frequency", read_only=True, allow_null=True, default=None)

    parent = serializers.PrimaryKeyRelatedField(
        required=False,
        allow_null=True,
        queryset=Task.objects.none(),
    )

    is_recurring = serializers.SerializerMethodField()
    effective_is_done = serializers.SerializerMethodField()

    # Accepted on write only, used to encrypt/decrypt `description` — never
    # stored as-is and never returned. See create()/update() below.
    passphrase = serializers.CharField(write_only=True, required=False, allow_blank=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        user = self.context.get("user") or getattr(self.context.get("request"), "user", None)
        if user and user.is_authenticated:
            self.fields["parent"].queryset = Task.objects.filter(user=user)

    def get_is_recurring(self, obj):
        return obj.recurring_task is not None

    def get_effective_is_done(self, obj):
        tz_offset = self.context.get("tz_offset", 0)
        user_tz = dt_timezone(timedelta(minutes=tz_offset))
        now = timezone.now().astimezone(user_tz)
        today = now.date()
        current_time = now.time().replace(tzinfo=None)

        if obj.category == "meeting" and obj.begin_date is not None:
            if obj.begin_date < today:
                return True
            if obj.begin_date == today:
                threshold = obj.end_time if obj.end_time is not None else obj.begin_time
                if threshold is not None and threshold < current_time:
                    return True

        return bool(obj.is_done)

    def validate_category(self, value):
        # Clients (and the calendar sync) still send `category: null` for
        # uncategorized rows; the column is no longer nullable, so fold those
        # to the model default instead of rejecting the request.
        return value or DEFAULT_CATEGORY

    def validate_parent(self, parent):
        if parent is None:
            return None

        if self.instance and parent.id == self.instance.id:
            raise serializers.ValidationError("A task cannot be its own parent.")

        if parent.parent_id is not None:
            raise serializers.ValidationError("Subtasks cannot have subtasks (max depth is 1).")

        return parent

    def to_internal_value(self, data):
        attrs = super().to_internal_value(data)
        # DRF auto-adds a UniqueTogetherValidator for the model's
        # (recurring_task, begin_date) constraint, and on create it rejects
        # any payload that omits one of those fields — overriding our
        # required=False. Treat an omitted recurring_task as "not recurring"
        # on create only; a default=None on the field would instead null the
        # FK on every full PUT that leaves it out.
        if self.instance is None:
            attrs.setdefault("recurring_task", None)
        return attrs

    def validate(self, attrs):
        parent = attrs.get("parent", getattr(self.instance, "parent", None))
        begin_date = attrs.get("begin_date", getattr(self.instance, "begin_date", None))

        if parent is not None:
            # auto-copy begin_date from parent if omitted
            if begin_date is None and parent.begin_date is not None:
                attrs["begin_date"] = parent.begin_date
                begin_date = parent.begin_date

            # enforce same-date
            if begin_date is not None and parent.begin_date is not None and begin_date != parent.begin_date:
                raise serializers.ValidationError({
                    "begin_date": "Subtask begin_date must match its parent begin_date."
                })

            # if parent has begin_date, child must end up with one
            if parent.begin_date is not None and begin_date is None:
                raise serializers.ValidationError({
                    "begin_date": "Subtask requires a begin_date when parent has a begin_date."
                })

        category = attrs.get("category", getattr(self.instance, "category", None))
        is_encrypted = attrs.get("is_encrypted", getattr(self.instance, "is_encrypted", False))
        if is_encrypted and category != "note":
            raise serializers.ValidationError({"is_encrypted": "Only notes can be encrypted."})

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["user"] = request.user
        validated_data.pop("is_subtask", None)  # derived
        passphrase = validated_data.pop("passphrase", "")

        # If created as done, stamp end_date if missing
        if validated_data.get("is_done") and not validated_data.get("end_date"):
            validated_data["end_date"] = timezone.localdate()

        if validated_data.get("is_encrypted"):
            if not passphrase:
                raise serializers.ValidationError({"passphrase": "A passphrase is required."})
            plaintext = validated_data.get("description", "")
            ciphertext, salt = encrypt_text(plaintext, passphrase)
            validated_data["encrypted_description"] = ciphertext
            validated_data["encryption_salt"] = salt
            validated_data["description"] = ""

        return super().create(validated_data)


    def update(self, instance, validated_data):
        validated_data.pop("is_subtask", None)  # derived
        passphrase = validated_data.pop("passphrase", "")

        next_done = validated_data.get("is_done", instance.is_done)

        # Transition: not done → done
        if next_done and not instance.is_done:
            if not validated_data.get("end_date"):
                validated_data["end_date"] = timezone.localdate()

        # Transition: done → not done
        if not next_done and instance.is_done:
            validated_data["end_date"] = None

        was_encrypted = instance.is_encrypted
        next_is_encrypted = validated_data.get("is_encrypted", was_encrypted)
        # Callers that PUT the whole task (e.g. the generic task-edit form)
        # always send `description`, even unchanged — for a locked encrypted
        # note that's always "" (the API never returns plaintext), so an
        # empty string here means "not touched", not "clear the note".
        incoming_description = validated_data.get("description") or None

        turning_on = next_is_encrypted and not was_encrypted
        turning_off = was_encrypted and not next_is_encrypted
        rewriting = was_encrypted and next_is_encrypted and incoming_description is not None

        if turning_on or rewriting:
            if not passphrase:
                raise serializers.ValidationError({"passphrase": "A passphrase is required."})
            plaintext = incoming_description or ""
            ciphertext, salt = encrypt_text(plaintext, passphrase)
            validated_data["encrypted_description"] = ciphertext
            validated_data["encryption_salt"] = salt
            validated_data["description"] = ""
        elif turning_off:
            if not passphrase:
                raise serializers.ValidationError({"passphrase": "A passphrase is required."})
            try:
                plaintext = decrypt_text(instance.encrypted_description, instance.encryption_salt, passphrase)
            except InvalidToken:
                raise serializers.ValidationError({"passphrase": "Incorrect passphrase."})
            validated_data["description"] = plaintext
            validated_data["encrypted_description"] = None
            validated_data["encryption_salt"] = None
        elif was_encrypted and next_is_encrypted:
            # Encrypted note, no real content change in this request — never
            # let a blank placeholder description overwrite real ciphertext.
            validated_data.pop("description", None)

        return super().update(instance, validated_data)

    class Meta:
        model = Task
        fields = [
            "id",
            "user",
            "begin_date",
            "end_date",
            "deadline_date",
            "begin_time",
            "end_time",
            "project",
            "title",
            "category",
            "position",
            "is_done",
            "effective_is_done",
            "priority",
            "description",
            "is_encrypted",
            "passphrase",
            "created_at",
            "parent",
            "is_subtask",
            "carry_over",
            "recurring_task",
            "recurring_task_id",
            "recurring_frequency",
            "is_recurring",
            "google_event_id",
            "deadline_event_id",
        ]
        extra_kwargs = {
            "user": {"read_only": True},
            "is_subtask": {"read_only": True},
            "category": {"required": False, "allow_null": True},
            "recurring_task": {"required": False, "allow_null": True},
            "begin_date": {"required": False, "allow_null": True},
            "end_date": {"required": False, "allow_null": True},
            "deadline_date": {"required": False, "allow_null": True},
            "begin_time": {"required": False, "allow_null": True},
            "end_time": {"required": False, "allow_null": True},
            "google_event_id": {"read_only": True},
            "deadline_event_id": {"read_only": True},
        }
        
class RecurringTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecurringTask
        fields = "__all__"
        read_only_fields = ("user",)

class ProjectSerializer(serializers.ModelSerializer):
    tasks = TaskSerializer(many=True, read_only=True)
    dashboard_tasks = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = "__all__"

    def get_dashboard_tasks(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return []

        today = timezone.localdate()

        non_recurring = obj.tasks.filter(user=user, recurring_task__isnull=True)

        next_recurring = (
            obj.tasks
            .filter(
                user=user,
                recurring_task__isnull=False,
                begin_date__gte=today,
            )
            .order_by("recurring_task_id", "begin_date")
            .distinct("recurring_task_id")
        )

        combined = list(non_recurring) + list(next_recurring)
        combined.sort(key=lambda t: (t.begin_date or "9999-12-31", str(t.id)))

        return TaskSerializer(combined, many=True, context=self.context).data
        
class ResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resume
        fields = ['id', 'title', 'file', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']

class GeneratedResumeSerializer(serializers.Serializer):
    content = serializers.CharField()
    updated_at = serializers.DateTimeField()
    source_fingerprint = serializers.CharField()
    is_cached = serializers.BooleanField()


class ResumeAnalysisSerializer(serializers.Serializer):
    score = serializers.FloatField()
    summary = serializers.CharField()
    suggestions = serializers.ListField(child=serializers.CharField())
    accomplishments = serializers.ListField(child=serializers.CharField())
    bullet_rewrites = serializers.DictField(child=serializers.CharField())
    analyzed_at = serializers.DateTimeField()
    is_cached = serializers.BooleanField()

class CalendarBlacklistSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalendarBlacklist
        fields = ["id", "google_event_id", "title", "created_at"]
        read_only_fields = ["id", "created_at"]


class WorkExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkExperience
        fields = ["id", "title", "company", "location", "start_date", "end_date", "is_current", "description"]


class EducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = ["id", "school", "degree", "field_of_study", "start_date", "end_date"]


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ["id", "name"]


class ResumeProfileSerializer(serializers.ModelSerializer):
    work_experiences = WorkExperienceSerializer(many=True, read_only=True)
    educations = EducationSerializer(many=True, read_only=True)
    skills = SkillSerializer(many=True, read_only=True)

    class Meta:
        model = ResumeProfile
        fields = ["id", "headline", "summary", "location", "photo_url", "linkedin_url", "work_experiences", "educations", "skills"]
        read_only_fields = ["id"]

class PersonalAPITokenSerializer(serializers.ModelSerializer):
    """Key metadata. Never carries the secret — see PersonalAPIToken.generate."""

    prefix = serializers.CharField(source="display_prefix", read_only=True)

    class Meta:
        model = PersonalAPIToken
        fields = ["id", "name", "prefix", "scope", "created_at", "last_used_at"]
        read_only_fields = fields


# --- Public v1 API ----------------------------------------------------------
# These are a deliberately narrow, stable contract for external consumers. They
# are kept separate from TaskSerializer/ProjectSerializer so that internal
# reshaping of the app's own payloads cannot silently break third-party clients.

PUBLIC_TASK_FIELDS = [
    "id",
    "title",
    "description",
    "category",
    "priority",
    "is_done",
    "begin_date",
    "end_date",
    "deadline_date",
    "begin_time",
    "end_time",
    "project",
    "project_name",
    "parent",
    "is_subtask",
    "is_recurring",
    "recurring_frequency",
    "created_at",
]


# Everything else in PUBLIC_TASK_FIELDS is derived or assigned by the server:
# `user` comes from the key, `is_subtask` from `parent`, and recurrence is
# managed in the app rather than over the API.
PUBLIC_TASK_WRITABLE_FIELDS = [
    "title",
    "description",
    "category",
    "priority",
    "is_done",
    "begin_date",
    "end_date",
    "deadline_date",
    "begin_time",
    "end_time",
    "project",
    "parent",
]


class PublicTaskSerializer(serializers.ModelSerializer):
    """Reads and writes a task over the v1 API.

    Relations are re-scoped to the requesting user in ``__init__``, so a caller
    cannot file a task under someone else's project or parent by guessing an id
    — DRF would otherwise resolve those against every row in the table.
    """

    project_name = serializers.CharField(source="project.name", read_only=True, default=None)
    is_recurring = serializers.SerializerMethodField()
    recurring_frequency = serializers.CharField(
        source="recurring_task.frequency", read_only=True, default=None
    )

    class Meta:
        model = Task
        fields = PUBLIC_TASK_FIELDS
        read_only_fields = [
            field for field in PUBLIC_TASK_FIELDS
            if field not in PUBLIC_TASK_WRITABLE_FIELDS
        ]
        extra_kwargs = {
            # The model allows null on these; over the API they are optional
            # rather than required-and-nullable, so a minimal POST is just a title.
            "begin_date": {"required": False, "allow_null": True},
            "end_date": {"required": False, "allow_null": True},
            "deadline_date": {"required": False, "allow_null": True},
            "begin_time": {"required": False, "allow_null": True},
            "end_time": {"required": False, "allow_null": True},
            "project": {"required": False, "allow_null": True},
            "parent": {"required": False, "allow_null": True},
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        user = getattr(self.context.get("request"), "user", None)
        if user is not None and user.is_authenticated:
            self.fields["project"].queryset = Project.objects.filter(user=user)
            self.fields["parent"].queryset = Task.objects.filter(user=user)
        else:
            # No authenticated user means no writes are possible anyway; an empty
            # queryset is the safe reading of "no relation is resolvable".
            self.fields["project"].queryset = Project.objects.none()
            self.fields["parent"].queryset = Task.objects.none()

    def get_is_recurring(self, obj):
        return obj.recurring_task_id is not None

    def validate_title(self, title):
        title = title.strip()
        if not title:
            raise serializers.ValidationError("This field may not be blank.")
        return title

    def validate_parent(self, parent):
        # Mirrors TaskSerializer: the app assumes a single level of subtasks, and
        # the API must not be a way to create shapes the UI cannot render.
        if parent is None:
            return None
        if self.instance and parent.id == self.instance.id:
            raise serializers.ValidationError("A task cannot be its own parent.")
        if parent.parent_id is not None:
            raise serializers.ValidationError("Subtasks cannot have subtasks (max depth is 1).")
        return parent

    def validate(self, attrs):
        parent = attrs.get("parent", getattr(self.instance, "parent", None))
        begin_date = attrs.get("begin_date", getattr(self.instance, "begin_date", None))

        if parent is not None and parent.begin_date is not None:
            if begin_date is None:
                # Same convenience the app offers: inherit the parent's date
                # rather than rejecting a payload whose intent is unambiguous.
                attrs["begin_date"] = parent.begin_date
            elif begin_date != parent.begin_date:
                raise serializers.ValidationError({
                    "begin_date": "Subtask begin_date must match its parent begin_date."
                })

        return attrs

    @staticmethod
    def _replacement_default(name):
        """The value an omitted field takes on a PUT."""
        field = Task._meta.get_field(name)
        if field.has_default():
            return field.get_default()
        if field.null:
            return None
        return "" if field.empty_strings_allowed else None

    def update(self, instance, validated_data):
        if not self.partial:
            # PUT replaces the task. DRF would otherwise leave omitted optional
            # fields untouched, making PUT a silent alias for PATCH — precisely
            # the kind of surprise this API is meant not to have.
            for name in PUBLIC_TASK_WRITABLE_FIELDS:
                validated_data.setdefault(name, self._replacement_default(name))
        return super().update(instance, validated_data)


PUBLIC_PROJECT_FIELDS = [
    "id",
    "name",
    "color",
    "status",
    "description",
    "role",
    "created",
    "task_count",
]


class PublicProjectSerializer(serializers.ModelSerializer):
    """Read-only: projects are created and retired in the app, not over the API."""

    task_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Project
        fields = PUBLIC_PROJECT_FIELDS
        read_only_fields = PUBLIC_PROJECT_FIELDS
