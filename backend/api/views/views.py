from rest_framework import viewsets, status, filters
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.http import FileResponse
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.pagination import CursorPagination
from django.db.models import Q
from datetime import datetime
from django.utils import timezone
from api.models import Resume, Project, Task, RecurringTask, RecurringTaskException
from api.serializers import ResumeSerializer, TaskSerializer, ProjectSerializer, UserSerializer, RecurringTaskSerializer
from api.services.recurring_tasks import ensure_recurring_tasks_in_range
from django.utils.timezone import localdate
from django.contrib.auth import get_user_model
from loguru import logger
from django.db.models import Count, Min, Max


class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def _detach_children(task, user):
    Task.objects.filter(user=user, parent=task).update(parent=None, is_subtask=False)

class TaskCursorPagination(CursorPagination):
    ordering = "-begin_date"
    page_size_query_param = 'page_size'
    max_page_size = 1000

class TaskViewSet(viewsets.ModelViewSet):
    pagination_class = TaskCursorPagination
    serializer_class = TaskSerializer
    
    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["user"] = self.request.user
        try:
            ctx["tz_offset"] = int(self.request.query_params.get("tz_offset", 0))
        except (TypeError, ValueError):
            ctx["tz_offset"] = 0
        return ctx

    def get_queryset(self):
        user = self.request.user
        queryset = Task.objects.filter(user=user)

        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category=category)

        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

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
        if (not was_done) and obj.is_done:
            if obj.end_date is None:
                obj.end_date = timezone.localdate()
                obj.save(update_fields=["end_date"])

            # cascade: mark all children done on the same date
            Task.objects.filter(user=obj.user, parent=obj, is_done=False).update(
                is_done=True,
                end_date=obj.end_date,
            )

        # if un-done, clear the completion date
        if was_done and (not obj.is_done):
            obj.end_date = None
            obj.save(update_fields=["end_date"])
        
    def destroy(self, request, *args, **kwargs):
        from datetime import timedelta
        task = self.get_object()
        delete_series = request.query_params.get("delete_series") in ("1", "true")
        delete_future = request.query_params.get("delete_future") in ("1", "true")

        # Always detach children if this task is a parent
        _detach_children(task, request.user)

        # ----- Delete entire series -----
        if delete_series and task.recurring_task_id:
            rt = task.recurring_task
            Task.objects.filter(user=request.user, recurring_task=rt).delete()
            rt.delete()
            return Response(status=204)

        # ----- Delete this and all future occurrences -----
        if delete_future and task.recurring_task_id:
            day = task.begin_date or task.end_date
            rt = task.recurring_task
            if day:
                Task.objects.filter(user=request.user, recurring_task=rt, begin_date__gte=day).delete()
                rt.end_date = day
                rt.save(update_fields=["end_date"])
            return Response(status=204)

        # ----- Delete single occurrence (recurring) -----
        if task.recurring_task_id:
            day = task.begin_date or task.end_date
            if day:
                RecurringTaskException.objects.get_or_create(
                    user=request.user,
                    recurring_task=task.recurring_task,
                    date=day,
                    type=RecurringTaskException.TYPE_SKIP,
                )
            task.delete()
            return Response(status=204)

        # ----- Non-recurring tasks -----
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="push-to-calendar")
    def push_to_calendar(self, request, pk=None):
        from api.services.google_calendar import push_meeting
        from googleapiclient.errors import HttpError

        task = self.get_object()

        if task.category != "meeting":
            return Response(
                {"error": "Only meetings can be pushed to Google Calendar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if task.begin_date is None:
            return Response(
                {"error": "Meeting must have a begin_date to push to Google Calendar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            event_id = push_meeting(task, request.user)
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except HttpError as e:
            logger.error(f"Google Calendar API error: {e}")
            return Response(
                {"error": "Google Calendar API error. Please reconnect your account."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as e:
            logger.error(f"Unexpected error pushing to calendar: {e}")
            return Response({"error": "Unexpected error."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        task.google_event_id = event_id
        task.save(update_fields=["google_event_id"])

        serializer = self.get_serializer(task)
        return Response(serializer.data)

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

    ALLOWED_CONTENT_TYPES = {
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword',
    }

    def _get_resume_or_404(self, request, pk):
        try:
            return Resume.objects.get(pk=pk, user=request.user)
        except Resume.DoesNotExist:
            return None

    def list(self, request):
        try:
            resumes = Resume.objects.filter(user=request.user).order_by('-uploaded_at')
            serializer = ResumeSerializer(resumes, many=True, context={'request': request})
            return Response(serializer.data)
        except Exception as e:
            logger.warning(f"Error in ResumeViewSet.list: {e}")
            return Response({"error": "An error occurred while retrieving resumes."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def create(self, request):
        try:
            file = request.FILES.get('file')
            if not file:
                return Response({"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

            content_type = file.content_type
            if content_type not in self.ALLOWED_CONTENT_TYPES:
                return Response(
                    {"error": "Invalid file type. Only PDF and Word documents are accepted."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            title = request.data.get('title', '').strip() or file.name
            resume = Resume(file=file, user=request.user, title=title)
            resume.save()

            serializer = ResumeSerializer(resume, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.warning(f"Error in ResumeViewSet.create: {e}")
            return Response({"error": "An error occurred while uploading the resume."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def retrieve(self, request, pk=None):
        resume = self._get_resume_or_404(request, pk)
        if resume is None:
            return Response({"error": "Resume not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ResumeSerializer(resume, context={'request': request})
        return Response(serializer.data)

    def destroy(self, request, pk=None):
        resume = self._get_resume_or_404(request, pk)
        if resume is None:
            return Response({"error": "Resume not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            resume.file.delete(save=False)
            resume.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.warning(f"Error in ResumeViewSet.destroy: {e}")
            return Response({"error": "An error occurred while deleting the resume."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        resume = self._get_resume_or_404(request, pk)
        if resume is None:
            return Response({"error": "Resume not found."}, status=status.HTTP_404_NOT_FOUND)
        try:
            file_handle = resume.file.open('rb')
            filename = resume.file.name.split('/')[-1]
            response = FileResponse(file_handle, as_attachment=True, filename=filename)
            return response
        except Exception as e:
            logger.warning(f"Error in ResumeViewSet.download: {e}")
            return Response({"error": "An error occurred while downloading the resume."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)