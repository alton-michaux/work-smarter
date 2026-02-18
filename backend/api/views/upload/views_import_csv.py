import csv
import io
from datetime import datetime
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from backend.management.utils.txt_parser import DevParser

from api.models import Task, Project

VALID_PRIORITIES = {"urgent", "high", "medium", "low"}


def _parse_date(s: str | None):
    if not s:
        return None
    s = s.strip()
    if not s:
        return None
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except ValueError:
        raise ValueError(f"Invalid date '{s}'. Expected YYYY-MM-DD.")


def _parse_bool(s: str | None, default=False) -> bool:
    if s is None:
        return default
    v = str(s).strip().lower()
    if v in ("1", "true", "t", "yes", "y", "x"):
        return True
    if v in ("0", "false", "f", "no", "n", ""):
        return False
    return default


class ImportTasksCSVView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    @transaction.atomic
    def post(self, request):
      try:
        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "Missing file (field name: 'file')."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            raw = upload.read()
            # handles UTF-8 with BOM too
            text = raw.decode("utf-8-sig")
        except Exception:
            return Response({"detail": "Could not read file as UTF-8."}, status=status.HTTP_400_BAD_REQUEST)

        reader = csv.DictReader(io.StringIO(text))
        if not reader.fieldnames:
            return Response({"detail": "CSV has no headers."}, status=status.HTTP_400_BAD_REQUEST)

        # Normalize header names (optional but helpful)
        headers = [h.strip() for h in reader.fieldnames if h]
        # DictReader already uses original fieldnames; we’ll just access keys defensively.

        rows = list(reader)
        if not rows:
            return Response({"detail": "CSV has no data rows."}, status=status.HTTP_400_BAD_REQUEST)

        errors = []
        cleaned = []
        user = request.user

        # --- pass 1: validate + normalize ---
        for idx, r in enumerate(rows, start=2):  # header is line 1
            def get(key):
                # tolerate whitespace in headers
                for k in r.keys():
                    if k and k.strip() == key:
                        return r.get(k)
                return None

            title = (get("title") or "").strip()
            if not title:
                errors.append({"line": idx, "field": "title", "error": "Title is required."})
                continue

            priority = (get("priority") or "medium").strip().lower() or "medium"
            if priority not in VALID_PRIORITIES:
                errors.append({"line": idx, "field": "priority", "error": f"Invalid priority '{priority}'."})
                continue

            try:
                begin_date = _parse_date(get("begin_date"))
                end_date = _parse_date(get("end_date"))
            except ValueError as e:
                errors.append({"line": idx, "field": "date", "error": str(e)})
                continue

            is_done = _parse_bool(get("is_done"), default=False)
            carry_over = _parse_bool(get("carry_over"), default=True)

            project_name = (get("project") or "").strip()
            category = (get("category") or "").strip() or None
            description = (get("description") or "").strip()

            row_id = (get("row_id") or "").strip() or None
            parent_row_id = (get("parent_row_id") or "").strip() or None

            cleaned.append({
                "line": idx,
                "title": title,
                "begin_date": begin_date,
                "end_date": end_date,
                "is_done": is_done,
                "carry_over": carry_over,
                "priority": priority,
                "project_name": project_name or None,
                "category": category,
                "description": description,
                "row_id": row_id,
                "parent_row_id": parent_row_id,
            })

        if errors:
            # all-or-nothing (best for “primary import”)
            return Response({"created": 0, "errors": errors}, status=status.HTTP_400_BAD_REQUEST)

        # --- pass 2: create tasks (parents first) ---
        # Create/get projects once per name
        project_cache = {}

        def resolve_project(name: str | None):
            if not name:
                return None
            if name in project_cache:
                return project_cache[name]
            obj, _ = Project.objects.get_or_create(user=user, name=name)
            project_cache[name] = obj
            return obj

        # Create all tasks without parents first
        row_id_to_task = {}
        created_tasks = []

        for item in cleaned:
            project = resolve_project(item["project_name"])

            t = Task.objects.create(
                user=user,
                title=item["title"],
                description=item["description"],
                begin_date=item["begin_date"],
                end_date=item["end_date"],
                is_done=item["is_done"],
                project=project,
                category=item["category"],
                priority=item["priority"],
                carry_over=item["carry_over"],
                parent=None,              # set later
                recurring_task=None,      # v1: ignore
            )
            created_tasks.append(t)

            if item["row_id"]:
                # duplicate row_id? treat as error
                if item["row_id"] in row_id_to_task:
                    return Response(
                        {
                            "created": 0,
                            "errors": [{"line": item["line"], "field": "row_id", "error": f"Duplicate row_id '{item['row_id']}'."}],
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                row_id_to_task[item["row_id"]] = t

        # Now set parents
        for item, t in zip(cleaned, created_tasks):
            pr = item["parent_row_id"]
            if pr:
                parent_task = row_id_to_task.get(pr)
                if not parent_task:
                    return Response(
                        {
                            "created": 0,
                            "errors": [{"line": item["line"], "field": "parent_row_id", "error": f"Unknown parent_row_id '{pr}'."}],
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                t.parent = parent_task
                t.save()  # triggers is_subtask sync via task model

        return Response(
            {
                "created": len(created_tasks),
                "errors": [],
            },
            status=status.HTTP_201_CREATED
        )
        
      except Exception as e:
        logger.warning(f"Error in CSV Import: {e}")
        

class ImportTasksTXTView(APIView):
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
