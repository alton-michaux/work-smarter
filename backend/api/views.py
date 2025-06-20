from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Resume, Project, Task
from .serializers import ResumeSerializer, TaskSerializer, ProjectSerializer
import openai
import csv
import io

class ImportTasks(APIView):
    def post(self, request, format=None):
        file = request.FILES.get('file')
        project_id = request.data.get('project_id', None)
        project = None

        if project_id:
            try:
                project = Project.objects.get(id=project_id)
            except Project.DoesNotExist:
                return Response({'error': 'Project not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not file:
            return Response({'error': 'File is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
        if file.name.endswith('.csv'):
            decoded_file = file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
            for row in reader:
                Task.objects.create(
                    project=project,
                    title=row.get('title', ''),
                    description=row.get('description', ''),
                    priority=row.get('priority', 'medium'),
                    scheduled_for=row.get('scheduled_for', None),
                    notes=row.get('notes', ''),
                )
        elif file.name.endswith('.txt'):
            decoded_file = file.read().decode('utf-8')
            lines = decoded_file.splitlines()
            for line in lines:
                # Example: title|description|priority|scheduled_for|notes
                parts = line.split('|')
                if len(parts) >= 4:
                    Task.objects.create(
                        project=project,
                        title=parts[0],
                        description=parts[1],
                        priority=parts[2],
                        scheduled_for=parts[3],
                        notes=parts[4] if len(parts) > 4 else '',
                    )
        else:
            return Response({'error': 'Unsupported file type.'}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({'status': 'Import successful.'}, status=status.HTTP_201_CREATED)

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