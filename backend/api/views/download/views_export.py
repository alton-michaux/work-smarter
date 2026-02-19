import csv
from rest_framework import status
from rest_framework.views import APIView
from django.http import HttpResponse
from api.models import Task
from api.serializers import TaskSerializer
from loguru import logger

class ExportTasksCSV(APIView):
  def get(self, request):
    try:
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
          "begin_date",
          "project",
          "category",
          "title",
          "status",
          "is_done",
          "priority",
          "parent_id",
          "recurring_task_id",
          "created_at",
          "completed_at",
          "notes",
      ]
      writer.writerow(header)

      for task in qs:
          status = "done" if task.is_done else "todo"
          project_name = task.project.name if task.project_id else ""
          end_date = task.end_date.isoformat() if task.is_done and task.end_date else ""

          writer.writerow([
              str(task.id),
              task.begin_date.isoformat() if task.begin_date else "",
              project_name,
              task.category or "",
              task.title or "",
              status,
              task.is_done,
              task.priority or "",
              task.parent_id,  
              task.recurring_task_id,
              task.created_at.isoformat() if task.created_at else "",
              end_date,
              task.description or "",
          ])
          
      return response
    
    except Exception as e:          
        logger.warning(f"Error in CSV Export: {e}")
