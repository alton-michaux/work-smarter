import csv
import io
from datetime import datetime
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status
from backend.management.utils.txt_parser import DevParser
from loguru import logger
from api.models import Task, Project
from rest_framework.exceptions import ParseError

VALID_PRIORITIES = {"urgent", "high", "medium", "low"}

# VALID_CATEGORIES = {"task", "meeting", "note"}

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
        dry_run = str(request.query_params.get("dry_run", "")).strip().lower() in ("1", "true", "t", "yes", "y")
        try:
            upload = request.FILES.get("file")
            if not upload:
                return Response(
                    {"detail": "Missing file (field name: 'file')."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                raw = upload.read()
                # handles UTF-8 with BOM too
                text = raw.decode("utf-8-sig")
            except Exception:
                return Response(
                    {"detail": "Could not read file as UTF-8."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            reader = csv.DictReader(io.StringIO(text))
            if not reader.fieldnames:
                return Response(
                    {"detail": "CSV has no headers."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Normalize headers once (strip whitespace + remove UTF-8 BOM if present)
            reader.fieldnames = [(h or "").strip().lstrip("\ufeff") for h in reader.fieldnames]

            rows = list(reader)
            if not rows:
                return Response(
                    {"detail": "CSV has no data rows."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            def norm_row(r: dict) -> dict:
                out = {}
                for k, v in r.items():
                    if k is None:
                        continue
                    kk = k.strip()
                    vv = v.strip() if isinstance(v, str) else v
                    out[kk] = vv
                return out

            errors = []
            cleaned = []
            user = request.user

            skipped_duplicate_in_file = 0
            seen = set()

            # Track row_id uniqueness inside the file (so we can fail early)
            seen_row_ids = set()

            for idx, raw_row in enumerate(rows, start=2):  # header is line 1
                r = norm_row(raw_row)

                title = (r.get("title") or "").strip()
                if not title:
                    errors.append({"line": idx, "field": "title", "error": "Title is required."})
                    continue

                priority = (r.get("priority") or "medium").strip().lower() or "medium"
                if priority not in VALID_PRIORITIES:
                    errors.append({"line": idx, "field": "priority", "error": f"Invalid priority '{priority}'."})
                    continue
                
                category = (r.get("category") or "").strip().lower() or None
                # if category and category not in VALID_CATEGORIES:
                #     errors.append({
                #         "line": idx,
                #         "field": "category",
                #         "error": f"Invalid category '{category}'. Allowed: {sorted(VALID_CATEGORIES)}",
                #     })
                #     continue

                try:
                    begin_date = _parse_date(r.get("begin_date"))
                    end_date = _parse_date(r.get("end_date"))
                except ValueError as e:
                    errors.append({"line": idx, "field": "date", "error": str(e)})
                    continue

                is_done = _parse_bool(r.get("is_done"), default=False)
                carry_over = _parse_bool(r.get("carry_over"), default=True)

                project_name = (r.get("project") or "").strip() or None
                category = (r.get("category") or "").strip() or None
                description = (r.get("description") or "").strip()

                row_id = (r.get("row_id") or "").strip() or None
                parent_row_id = (r.get("parent_row_id") or "").strip() or None

                # If row_id repeats in the same file, treat as error (matches earlier intent)
                if row_id:
                    if row_id in seen_row_ids:
                        errors.append({"line": idx, "field": "row_id", "error": f"Duplicate row_id '{row_id}'."})
                        continue
                    seen_row_ids.add(row_id)

                # Dedupe within the file (matches your tests)
                sig = (title, begin_date, category)
                if sig in seen:
                    skipped_duplicate_in_file += 1
                    continue
                seen.add(sig)

                cleaned.append({
                    "line": idx,
                    "title": title,
                    "begin_date": begin_date,
                    "end_date": end_date,
                    "is_done": is_done,
                    "carry_over": carry_over,
                    "priority": priority,
                    "project_name": project_name,
                    "category": category,
                    "description": description,
                    "row_id": row_id,
                    "parent_row_id": parent_row_id,
                })

            if errors:
                # all-or-nothing (best for “primary import”)
                return Response({"created": 0, "errors": errors}, status=status.HTTP_400_BAD_REQUEST)

            # --- DRY RUN: validate + report only, do not create anything ---
            if dry_run:
                # Count duplicates-in-file already tracked: skipped_duplicate_in_file

                # Count "would be skipped as existing" using the same signature you use in real import
                skipped_existing = 0
                for item in cleaned:
                    if Task.objects.filter(
                        user=user,
                        title=item["title"],
                        begin_date=item["begin_date"],
                        category=item["category"],
                    ).exists():
                        skipped_existing += 1

                # created would be the remaining rows (since dry run doesn't actually create)
                created = len(cleaned) - skipped_existing

                payload = {
                    "created": created,
                    "total_rows": len(rows),
                    "processed_rows": len(cleaned),
                    "skipped_existing": skipped_existing,
                    "skipped_duplicate_in_file": skipped_duplicate_in_file,
                    "skipped": skipped_existing + skipped_duplicate_in_file,
                    "errors": [],
                    "dry_run": True,
                }
                return Response(payload, status=status.HTTP_200_OK)

            # --- pass 2: create tasks ---
            project_cache = {}

            def resolve_project(name: str | None):
                if not name:
                    return None
                if name in project_cache:
                    return project_cache[name]
                obj, _ = Project.objects.get_or_create(user=user, name=name)
                project_cache[name] = obj
                return obj

            # First, create tasks (skipping existing)
            row_id_to_task = {}
            created_by_row = []  # list of {"item": cleaned_item, "task": created_task}
            skipped_existing = 0

            # Pre-check: if any row references a parent_row_id that does not exist as a row_id in THIS file,
            # reject the whole import. This matches “unknown_parent_row_id => 400”.
            file_row_ids = {item["row_id"] for item in cleaned if item["row_id"]}
            for item in cleaned:
                pr = item["parent_row_id"]
                if pr and pr not in file_row_ids:
                    return Response(
                        {
                            "created": 0,
                            "errors": [
                                {
                                    "line": item["line"],
                                    "field": "parent_row_id",
                                    "error": f"Unknown parent_row_id '{pr}'.",
                                }
                            ],
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            for item in cleaned:
                # Skip if task already exists (matches your test)
                if Task.objects.filter(
                    user=user,
                    title=item["title"],
                    begin_date=item["begin_date"],
                    category=item["category"],
                ).exists():
                    skipped_existing += 1
                    continue

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
                    parent=None,
                    recurring_task=None,
                )

                created_by_row.append({"item": item, "task": t})

                if item["row_id"]:
                    row_id_to_task[item["row_id"]] = t

            # Now set parents ONLY for tasks that were created (not for skipped-existing rows)
            for pair in created_by_row:
                item = pair["item"]
                t = pair["task"]

                pr = item["parent_row_id"]
                if pr:
                    parent_task = row_id_to_task.get(pr)
                    if not parent_task:
                        # This only happens if parent existed in file but was skipped as "already exists"
                        # In v1 we treat that as an error (because we can’t reliably link to it).
                        return Response(
                            {
                                "created": 0,
                                "errors": [
                                    {
                                        "line": item["line"],
                                        "field": "parent_row_id",
                                        "error": f"Parent row_id '{pr}' was not created in this import (likely skipped as existing).",
                                    }
                                ],
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    t.parent = parent_task
                    t.save()  # triggers is_subtask sync via Task.save()

            payload = {
                "created": len(created_by_row),
                "total_rows": len(rows),
                "processed_rows": len(cleaned),
                "skipped_existing": skipped_existing,
                "skipped_duplicate_in_file": skipped_duplicate_in_file,
                "skipped": skipped_existing + skipped_duplicate_in_file,
                "errors": [],
            }

            status_code = status.HTTP_201_CREATED if (
                payload["created"] > 0
                and payload["skipped_existing"] == 0
                and payload["skipped_duplicate_in_file"] == 0
            ) else status.HTTP_200_OK

            return Response(payload, status=status_code)

        except Exception:
            logger.exception("Error in CSV Import")
            return Response(
                {"detail": "Unexpected error during import."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


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
