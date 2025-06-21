from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Resume, Project, Task
from .serializers import ResumeSerializer, TaskSerializer, ProjectSerializer
from .txt_parser import DevParser
import openai
import csv
import io

class ImportTasks(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, format=None):
        file = request.FILES.get('file')
        if not file or not file.name.endswith('.txt'):
            return Response({'error': 'Only .txt files are supported.'}, status=400)

        content = file.read().decode('utf-8')
        parser = DevParser(content)
        tasks = parser.parse()

        project_id = request.data.get('project_id')
        project = Project.objects.filter(id=project_id).first() if project_id else None

        for task_data in tasks:
            Task.objects.create(
                project=project,
                title=task_data["title"],
                is_done=task_data["done"],
                priority=task_data["priority"],
                carry_over=task_data["carry_over"],
                description=f'Section: {task_data["section"]}',
                is_subtask=bool(task_data["notes"]),
                notes=task_data["notes"],
            )

        return Response({'status': 'Import successful.', 'imported': len(tasks)}, status=201)

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    
    def list(self, request):
        tasks = Task.objects.all()
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)
        
class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    
    def list(self, request):
        projects = Project.objects.all()
        serializer = ProjectSerializer(projects, many=True)
        return Response(serializer.data)
    
class ResumeViewSet(viewsets.ViewSet):
    parser_classes = (MultiPartParser, FormParser)

    def create(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        # Save the uploaded file
        resume = Resume(file=file)
        resume.save()

        # Analyze the resume with OpenAI API
        openai.api_key = request.data.get('api_key')  # Assuming API key is sent in the request
        response = openai.Completion.create(
            engine="text-davinci-003",
            prompt=f"Pretend that you are a recruiter. Please analyze this resume: {file.name}",
            max_tokens=150
        )

        # Return the suggestions
        return Response({"suggestions": response.choices[0].text.strip()}, status=status.HTTP_201_CREATED)

    def list(self, request):
        resumes = Resume.objects.all()
        serializer = ResumeSerializer(resumes, many=True)
        return Response(serializer.data)