from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.pagination import CursorPagination
from django.db.models import Q
from datetime import date, datetime
from django.utils import timezone
from api.models import Resume, Project, Task, RecurringTask
from api.serializers import ResumeSerializer, TaskSerializer, ProjectSerializer, UserSerializer, RecurringTaskSerializer
from api.services.recurring_tasks import ensure_recurring_tasks_in_range
from django.contrib.auth import get_user_model
from loguru import logger
from django.db.models import Count, Min, Max

class TaskCursorPagination(CursorPagination):
    ordering = "-begin_date"

class TaskViewSet(viewsets.ModelViewSet):
    pagination_class = TaskCursorPagination
    serializer_class = TaskSerializer
    
    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["user"] = self.request.user
        return ctx

    def get_queryset(self):
        user = self.request.user
        queryset = Task.objects.filter(user=user)

        begin_date_str = self.request.query_params.get("begin_date")
        end_date_str = self.request.query_params.get("end_date")

        if begin_date_str and end_date_str:
            try:
                start_of_week = datetime.strptime(begin_date_str, "%Y-%m-%d").date()
                end_of_week = datetime.strptime(end_date_str, "%Y-%m-%d").date()

                # ✅ Generate occurrences for THIS user and THIS range
                ensure_recurring_tasks_in_range(start_of_week, end_of_week, user=user)

                active_on_str = self.request.query_params.get("active_on")
                
                if active_on_str:
                    try:
                        # Daily
                        day = datetime.strptime(active_on_str, "%Y-%m-%d").date()

                        today = timezone.localdate()
                        logger.warning(
                            f"DAY: {day} "
                            f"TODAY: {today} "
                            f"GREATER?: {day > today} "
                        )
                        if day > today:
                            # For future days: DO NOT pull carry-over backlog.
                            # Only return tasks that actually belong to that day.
                            return queryset.filter(begin_date=day)
                        
                        # generate recurring occurrences for that specific day
                        ensure_recurring_tasks_in_range(day, day, user=user)

                        filtered_queryset = queryset.filter(
                            (
                                # Non-recurring tasks:
                                # - unfinished tasks remain active across days
                                Q(recurring_task__isnull=True, is_done=False, begin_date__lte=day)
                                & (Q(end_date__isnull=True) | Q(end_date__gte=day))
                            )
                            |
                            (
                                # Non-recurring tasks:
                                # - finished tasks appear ONLY on completion day
                                Q(recurring_task__isnull=True, is_done=True, end_date=day)
                            )
                            |
                            (
                                # Recurring occurrences:
                                # - unfinished occurrence shows on its day
                                Q(recurring_task__isnull=False, is_done=False, begin_date=day)
                            )
                            |
                            (
                                # Recurring occurrences:
                                # - finished occurrence appears only on completion day
                                Q(recurring_task__isnull=False, is_done=True, end_date=day)
                            )
                        )

                        agg = filtered_queryset.aggregate(
                            c=Count("id"),
                            min_begin=Min("begin_date"),
                            max_begin=Max("begin_date"),
                        )

                        logger.warning(
                            f"[TaskViewSet] RESULT count={agg['c']} "
                            f"min_begin={agg['min_begin']} max_begin={agg['max_begin']} "
                            f"active_on={active_on_str if 'active_on_str' in locals() else None}"
                        )

                        return filtered_queryset
                    except ValueError as e:
                        logger.warning(f"Invalid active_on format: {e}")
                else:
                    # Weekly (tracker)
                    queryset = queryset.filter(
                        (
                            # Non-recurring tasks:
                            # - show if still active during this week (not done)
                            # - OR show if completed this week (end_date in week)
                            Q(recurring_task__isnull=True) &
                            Q(begin_date__lte=end_of_week) &
                            (
                                # active/ongoing
                                (Q(is_done=False) & (Q(end_date__isnull=True) | Q(end_date__gte=start_of_week)))
                                |
                                # completed within this week
                                Q(end_date__range=(start_of_week, end_of_week))
                            )
                        )
                        |
                        (
                            # Recurring occurrences: only include occurrences whose begin_date is in this week
                            Q(recurring_task__isnull=False) &
                            Q(begin_date__range=(start_of_week, end_of_week))
                        )
                        |
                        (
                            # Preserve your legacy edge-case: begin_date missing but end_date in week
                            Q(begin_date__isnull=True) &
                            Q(end_date__range=(start_of_week, end_of_week))
                        )
                    )
                    return queryset

            except ValueError as e:
                logger.warning(f"Invalid date format in get_queryset: {e}")

        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        
    def perform_update(self, serializer):
        instance = serializer.instance
        was_done = instance.is_done

        obj = serializer.save()

        # if just marked done, stamp end_date as "completion date"
        if (not was_done) and obj.is_done and obj.end_date is None:
            obj.end_date = timezone.localdate()
            obj.save(update_fields=["end_date"])

        # if un-done, clear the completion date
        if was_done and (not obj.is_done):
            obj.end_date = None
            obj.save(update_fields=["end_date"])
        
    def destroy(self, request, *args, **kwargs):
        task = self.get_object()

        delete_series = request.query_params.get("delete_series") in ("1", "true", "True")

        # If it's a recurring occurrence and caller asked to delete the series:
        if delete_series and task.recurring_task_id:
            rt = task.recurring_task

            # delete all occurrences for that template
            Task.objects.filter(user=request.user, recurring_task=rt).delete()

            # delete the template itself (stops regeneration)
            rt.delete()

            return Response(status=status.HTTP_204_NO_CONTENT)
        
        Task.objects.filter(user=request.user, parent=task).update(parent=None, is_subtask=False)

        # default behavior: delete just this task row
        return super().destroy(request, *args, **kwargs)
            
class RecurringTaskViewSet(viewsets.ModelViewSet):
    serializer_class = RecurringTaskSerializer

    def get_queryset(self):
        return RecurringTask.objects.filter(user=self.request.user)

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