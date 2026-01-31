from rest_framework import serializers
from .models import Resume, Task, Project, User, RecurringTask

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["email", "id", "username"]
        read_only_fields = ["id"]

class TaskSerializer(serializers.ModelSerializer):
    recurring_task_id = serializers.IntegerField(
        source="recurring_task.id",
        read_only=True
    )
    is_recurring = serializers.SerializerMethodField()

    def get_is_recurring(self, obj):
        return obj.recurring_task is not None

    class Meta:
        model = Task
        fields = "__all__"
        
class RecurringTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecurringTask
        fields = "__all__"
        read_only_fields = ("user",)

class ProjectSerializer(serializers.ModelSerializer):
    tasks = TaskSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = '__all__'
        
class ResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resume
        fields = '__all__'  # Include all fields from the Resume model

class ResumeAnalysisSerializer(serializers.Serializer):
    suggestions = serializers.ListField(child=serializers.CharField())  # List of suggestions from analysis
    score = serializers.FloatField()  # Score indicating the quality of the resume