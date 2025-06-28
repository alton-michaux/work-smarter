from rest_framework import serializers
from .models import Resume, Task, Project

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = '__all__'

class ProjectSerializer(serializers.ModelSerializer):
    tasks = TaskSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = ['id', 'name', 'tasks']
        
class ResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resume
        fields = '__all__'  # Include all fields from the Resume model

class ResumeAnalysisSerializer(serializers.Serializer):
    suggestions = serializers.ListField(child=serializers.CharField())  # List of suggestions from analysis
    score = serializers.FloatField()  # Score indicating the quality of the resume