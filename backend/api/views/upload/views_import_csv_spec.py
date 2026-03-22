from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

# Import the same sources of truth your app uses
from api.models import Task

class ImportTasksCSVSpecView(APIView):
    """
    Lightweight metadata endpoint for the frontend:
    - which CSV headers we support
    - required vs optional columns
    - valid choices (priority/category)
    - example row
    """

    def get(self, request):
        headers = [
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

        required = ["title"]
        optional = [h for h in headers if h not in required]

        # Priority choices come from Task model
        valid_priorities = [k for (k, _label) in getattr(Task, "PRIORITY_CHOICES", [])]

        # Category choices: depends how you “locked them in”
        # If you made Task.category a choices field, this will work:
        valid_categories = []
        category_field = Task._meta.get_field("category")
        if getattr(category_field, "choices", None):
            valid_categories = [k for (k, _label) in category_field.choices if k]

        example_row = {
            "row_id": "1",
            "title": "Example task",
            "begin_date": "2026-02-03",
            "end_date": "",
            "is_done": "false",
            "project": "Vamos",
            "category": valid_categories[0] if valid_categories else "",
            "priority": valid_priorities[0] if valid_priorities else "medium",
            "description": "Optional notes",
            "carry_over": "true",
            "parent_row_id": "",
        }

        return Response(
            {
                "headers": headers,
                "required": required,
                "optional": optional,
                "valid_priorities": valid_priorities,
                "valid_categories": valid_categories,
                "upload_field": "file",
                "format": "multipart/form-data",
                "supports_dry_run": True,
                "dry_run_query_param": "dry_run=true",
                "example_row": example_row,
            },
            status=status.HTTP_200_OK,
        )
