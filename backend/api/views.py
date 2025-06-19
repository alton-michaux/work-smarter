from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Resume, Project, Task
from .serializers import ResumeSerializer, TaskSerializer, ProjectSerializer
import openai

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