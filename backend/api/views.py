from rest_framework import viewsets, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.pagination import CursorPagination
from django.db.models import Q
from datetime import datetime
from .models import Resume, Project, Task
from .serializers import ResumeSerializer, TaskSerializer, ProjectSerializer, UserSerializer
from .txt_parser import DevParser
from django.db import transaction
from rest_framework.exceptions import ParseError
from django.contrib.auth import get_user_model
from loguru import logger

class TaskCursorPagination(CursorPagination):
    ordering = "-begin_date"

class ImportTasks(APIView):
    @logger.catch
    def post(self, request):
        file = request.FILES.get('file')
        if not file or not file.name.endswith('.txt'):
            return Response({'error': 'Only .txt files are supported.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Decode file
            try:
                content = file.read().decode('utf-8')
            except UnicodeDecodeError:
                raise ParseError("File must be UTF-8 text.")

            # Parse tasks
            parser = DevParser(content)
            parser.parse()  # should raise ValueError for known parse issues
            tasks = parser.tasks

            # Optional project (enforce ownership)
            project = None
            project_id = request.data.get('project_id')
            if project_id:
                project = Project.objects.filter(id=project_id, user=request.user).first()
                if project is None:
                    return Response(
                        {'error': 'Project not found or not owned by user.'},
                        status=status.HTTP_404_NOT_FOUND
                    )

            # Step 1: Collect all project names from tasks
            project_names = set(
                t["project_name"] for t in tasks
                if t.get("project_name") and not request.data.get('project_id')
            )

            # Step 2: Fetch or create all needed projects for the user
            project_map = {}  # name → Project instance
            for name in project_names:
                project, _ = Project.objects.get_or_create(user=request.user, name=name)
                project_map[name] = project

            # Step 3: Create tasks
            created_count = 0
            with transaction.atomic():
                for t in tasks:
                    task_project = project  # default if project_id passed

                    # Override with dynamic project if project_id not passed
                    if not project and t.get("project_name"):
                        task_project = project_map.get(t["project_name"])

                    Task.objects.create(
                        user=request.user,
                        project=task_project,
                        category=t.get("category"),
                        title=t["title"],
                        is_done=t.get("done", False),
                        priority=t.get("priority", "medium"),
                        carry_over=t.get("carry_over", False),
                        description=t.get("description", ""),
                        is_subtask=t.get("sub_task", False),
                        begin_date=t.get("begin_date"),
                        end_date=t["begin_date"] if t.get("done", False) else None,
                    )
                    created_count += 1

            return Response(
                {'status': 'Import successful.', 'imported': created_count},
                status=status.HTTP_201_CREATED
            )

        except ValueError as e:
            # Known parser/input errors (e.g., missing/invalid "Week of")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except ParseError as e:
            # Bad encoding, etc.
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            # Unexpected server-side error
            return Response({'error': f'Unexpected error: {str(e)}'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TaskViewSet(viewsets.ModelViewSet):
    pagination_class = TaskCursorPagination
    serializer_class = TaskSerializer

    @logger.catch
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

    @logger.catch
    def get_queryset(self):
        return Project.objects.filter(user=self.request.user)
    
    
User = get_user_model()

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['id', 'date_joined', 'username', 'email']  # allowed
    ordering = ['-date_joined']  # default if client doesn't pass ?ordering=

    @logger.catch
    def get_queryset(self):
        # Clear ANY model/base default ordering that might include 'created'
        qs = User.objects.filter(id=self.request.user.id).order_by()

        # Optionally enforce a safe default here too:
        return qs.order_by('-date_joined')

class ResumeViewSet(viewsets.ViewSet):
    parser_classes = (MultiPartParser, FormParser)

    @logger.catch
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

    @logger.catch
    def list(self, request):
        resumes = Resume.objects.filter(user=request.user)
        serializer = ResumeSerializer(resumes, many=True)
        return Response(serializer.data)