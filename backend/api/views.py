from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q
from datetime import datetime
from .models import Resume, Project, Task
from .serializers import ResumeSerializer, TaskSerializer, ProjectSerializer
from .txt_parser import DevParser
import openai

class ImportTasks(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, format=None):
        file = request.FILES.get('file')
        if not file or not file.name.endswith('.txt'):
            return Response({'error': 'Only .txt files are supported.'}, status=400)

        content = file.read().decode('utf-8')
        parser = DevParser(content)
        parser.parse()
        tasks = parser.tasks

        project_id = request.data.get('project_id')
        project = Project.objects.filter(id=project_id, user=request.user).first() if project_id else None

        for task_data in tasks:
            Task.objects.create(
                user=request.user,  # ✅ associate with user
                project=project,
                category=task_data["category"],
                title=task_data["title"],
                is_done=task_data["done"],
                priority=task_data["priority"],
                carry_over=task_data["carry_over"],
                description=task_data["description"],
                is_subtask=task_data["sub_task"],
            )

        return Response({'status': 'Import successful.', 'imported': len(tasks)}, status=201)

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Task.objects.filter(user=user)

        begin_date_str = self.request.query_params.get('begin_date')
        end_date_str = self.request.query_params.get('end_date')

        if begin_date_str and end_date_str:
            try:
                start_of_week = datetime.strptime(begin_date_str, "%Y-%m-%d").date()
                end_of_week = datetime.strptime(end_date_str, "%Y-%m-%d").date()

                queryset = queryset.filter(
                    Q(  # Case 1: begin_date exists
                        Q(begin_date__lte=end_of_week) &
                        (
                            Q(end_date__isnull=True) |
                            Q(end_date__gte=start_of_week)
                        )
                    )
                    |
                    Q(  # Case 2: begin_date is null but end_date is within the week
                        Q(begin_date__isnull=True) &
                        Q(end_date__range=(start_of_week, end_of_week))
                    )
                )
            except ValueError:
                print("[DEBUG] Invalid date format")
                pass

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        
class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
class ResumeViewSet(viewsets.ViewSet):
    parser_classes = (MultiPartParser, FormParser)

    def create(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        resume = Resume(file=file, user=request.user)  # ✅ attach user
        resume.save()

        openai.api_key = request.data.get('api_key')
        response = openai.Completion.create(
            engine="text-davinci-003",
            prompt=f"Pretend that you are a recruiter. Please analyze this resume: {file.name}",
            max_tokens=150
        )

        return Response({"suggestions": response.choices[0].text.strip()}, status=status.HTTP_201_CREATED)

    def list(self, request):
        resumes = Resume.objects.filter(user=request.user)
        serializer = ResumeSerializer(resumes, many=True)
        return Response(serializer.data)