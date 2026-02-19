import csv
from rest_framework.views import APIView
from django.http import HttpResponse
from rest_framework import status
from loguru import logger

from api.models import Task


class ExportTasksCSV(APIView):
    """
    Exports tasks to a CSV that is *immediately re-importable* by ImportTasksCSVView.

    Output headers match the import endpoint:
      row_id,title,begin_date,end_date,is_done,project,category,priority,description,carry_over,parent_row_id
    """

    def get(self, request):
        try:
            qs = (
                Task.objects
                .filter(user=request.user)
                .select_related("project")
                .order_by("begin_date", "id")
            )

            # Optional date range filter: ?start=YYYY-MM-DD&end=YYYY-MM-DD
            start = request.query_params.get("start")
            end = request.query_params.get("end")
            if start:
                qs = qs.filter(begin_date__gte=start)
            if end:
                qs = qs.filter(begin_date__lte=end)

            response = HttpResponse(content_type="text/csv")
            response["Content-Disposition"] = 'attachment; filename="tasks.csv"'

            writer = csv.writer(response)

            # ✅ Import-compatible header
            header = [
                "row_id",
                "title",
                "begin_date",
                "end_date",
                "is_done",
                "project",
                "category",
                "priority",
                "description",
                "carry_over",
                "parent_row_id",
            ]
            writer.writerow(header)

            # Always returns a downloadable CSV, even if qs is empty (headers only)
            for task in qs:
                project_name = task.project.name if task.project_id else ""
                begin_date = task.begin_date.isoformat() if task.begin_date else ""
                end_date = task.end_date.isoformat() if task.end_date else ""

                writer.writerow([
                    str(task.id),                          # row_id
                    task.title or "",
                    begin_date,
                    end_date,
                    "true" if task.is_done else "false",   # import parser accepts true/false
                    project_name,
                    task.category or "",
                    task.priority or "",
                    task.description or "",
                    "true" if task.carry_over else "false",
                    str(task.parent_id) if task.parent_id else "",  # parent_row_id
                ])

            return response

        except Exception as e:
            logger.exception(f"Error in CSV Export: {e}")
            # Still return JSON error (not CSV) if something truly breaks
            from rest_framework.response import Response
            return Response(
                {"detail": "Unexpected error during export."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
