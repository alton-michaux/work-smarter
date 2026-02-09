from django.utils import timezone
from rest_framework import serializers
from .models import Resume, Task, Project, User, RecurringTask

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["email", "id", "username"]
        read_only_fields = ["id"]

class TaskSerializer(serializers.ModelSerializer):
    begin_date = serializers.DateField(required=False, allow_null=True, default=None)
    end_date = serializers.DateField(required=False, allow_null=True, default=None)

    recurring_task = serializers.PrimaryKeyRelatedField(
        queryset=RecurringTask.objects.all(),
        required=False,
        allow_null=True,
    )
    recurring_task_id = serializers.IntegerField(source="recurring_task.id", read_only=True)

    parent = serializers.PrimaryKeyRelatedField(
        required=False,
        allow_null=True,
        queryset=Task.objects.none(),
    )

    is_recurring = serializers.SerializerMethodField()
    effective_is_done = serializers.SerializerMethodField()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        user = self.context.get("user") or getattr(self.context.get("request"), "user", None)
        if user and user.is_authenticated:
            self.fields["parent"].queryset = Task.objects.filter(user=user)

    def get_is_recurring(self, obj):
        return obj.recurring_task is not None

    def get_effective_is_done(self, obj):
        today = timezone.localdate()
        auto_done = (
            obj.category == "Meetings"
            and obj.begin_date is not None
            and obj.begin_date < today
        )
        return bool(obj.is_done or auto_done)

    def validate_parent(self, parent):
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

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["user"] = request.user
        validated_data.pop("is_subtask", None)  # derived
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop("is_subtask", None)  # derived
        return super().update(instance, validated_data)

    class Meta:
        model = Task
        fields = [
            "id",
            "user",
            "begin_date",
            "end_date",
            "project",
            "title",
            "category",
            "is_done",
            "effective_is_done",
            "priority",
            "description",
            "created_at",
            "parent",
            "is_subtask",
            "carry_over",
            "recurring_task",
            "recurring_task_id",
            "is_recurring",
        ]
        extra_kwargs = {
            "user": {"read_only": True},
            "is_subtask": {"read_only": True},
            "recurring_task": {"required": False, "allow_null": True},
            "begin_date": {"required": False, "allow_null": True},
            "end_date": {"required": False, "allow_null": True},
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
        fields = '__all__'  # Include all fields from the Resume model

class ResumeAnalysisSerializer(serializers.Serializer):
    suggestions = serializers.ListField(child=serializers.CharField())  # List of suggestions from analysis
    score = serializers.FloatField()  # Score indicating the quality of the resume