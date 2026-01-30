import csv
from rest_framework import viewsets, status, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import HttpResponse
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.pagination import CursorPagination
from django.db.models import Q
from datetime import date, datetime
from .models import Resume, Project, Task
from .serializers import ResumeSerializer, TaskSerializer, ProjectSerializer, UserSerializer
from backend.management.utils.txt_parser import DevParser
from django.db import transaction
from rest_framework.exceptions import ParseError
from django.contrib.auth import get_user_model
from loguru import logger

class TaskCursorPagination(CursorPagination):
    ordering = "-begin_date"

class ImportTasks(APIView):
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
            parser.parse()  # raises ValueError on known parse issues
            tasks = parser.tasks

            # Step 1: Collect distinct project names from parsed tasks
            project_names = {
                t["project_name"] for t in tasks if t.get("project_name")
            }

            # Step 2: Fetch or create all needed projects
            project_map = {}
            for name in project_names:
                project, _ = Project.objects.get_or_create(user=request.user, name=name)
                project_map[name] = project

            # Step 3: Create tasks
            created_count = 0
            with transaction.atomic():
                for t in tasks:
                    # Only assign a project if project_name is present
                    task_project = project_map.get(t["project_name"]) if t.get("project_name") else None

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
                        end_date=t.get("end_date"),
                    )
                    created_count += 1

            return Response(
                {'status': 'Import successful.', 'imported': created_count},
                status=status.HTTP_201_CREATED
            )

        except ValueError as e:
            logger.warning(f"ValueError in task import: {e}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except ParseError as e:
            logger.warning(f"ParseError in task import: {e}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception("Unexpected error during task import")
            return Response({'error': f'Unexpected error: {str(e)}'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ExportTasksCSV(APIView):
    def get(self, request):
        # Optional: filter by date range passed as query params
        # ?start=2026-01-01&end=2026-01-31
        qs = Task.objects.filter(user=request.user).select_related("project").order_by("begin_date", "id")

        start = request.query_params.get("start")
        end = request.query_params.get("end")
        if start:
            qs = qs.filter(begin_date__gte=start)
        if end:
            qs = qs.filter(begin_date__lte=end)

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="tasks.csv"'

        writer = csv.writer(response)

        header = [
            "id",
            "date",
            "project",
            "category",
            "title",
            "status",
            "priority",
            "parent_id",
            "created_at",
            "completed_at",
            "notes",
        ]
        writer.writerow(header)

        for task in qs:
            status = "done" if task.is_done else "todo"
            project_name = task.project.name if task.project_id else ""
            completed_at = task.end_date.isoformat() if task.is_done and task.end_date else ""

            writer.writerow([
                str(task.id),
                task.begin_date.isoformat() if task.begin_date else "",
                project_name,
                task.category,
                task.title or "",
                status,
                task.priority or "",
                "",  # parent_id (not supported yet in your schema)
                task.created_at.isoformat() if task.created_at else "",
                completed_at,
                task.description or "",
            ])

        return response

class TaskViewSet(viewsets.ModelViewSet):
    pagination_class = TaskCursorPagination
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
            except ValueError as e:
                logger.warning(f"Invalid date format in get_queryset: {e}")
                pass

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        
class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        try:
            return Project.objects.filter(user=self.request.user)
        except Exception as e:
            logger.warning(f"Error in ProjectViewSet.get_queryset: {e}")
            raise
    
    
User = get_user_model()

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['id', 'date_joined', 'username', 'email']  # allowed
    ordering = ['-date_joined']  # default if client doesn't pass ?ordering=

    def get_queryset(self):
        try:
            # Clear ANY model/base default ordering that might include 'created'
            qs = User.objects.filter(id=self.request.user.id).order_by()

            # Optionally enforce a safe default here too:
            return qs.order_by('-date_joined')
        except Exception as e:
            logger.warning(f"Error in UserViewSet.get_queryset: {e}")
            raise

class ResumeViewSet(viewsets.ViewSet):
    parser_classes = (MultiPartParser, FormParser)

    def create(self, request):
        try:
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
        except Exception as e:
            logger.warning(f"Error in ResumeViewSet.create: {e}")
            return Response({"error": "An error occurred while processing the resume."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def list(self, request):
        try:
            resumes = Resume.objects.filter(user=request.user)
            serializer = ResumeSerializer(resumes, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.warning(f"Error in ResumeViewSet.list: {e}")
            return Response({"error": "An error occurred while retrieving resumes."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)