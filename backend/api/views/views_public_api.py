"""Read-only v1 API.

A narrow, side-effect-free view of a user's own tasks and projects, intended for
scripts and third-party integrations authenticating with a personal API key.

Unlike the app's own TaskViewSet, nothing here mutates data as a side effect of
reading: no recurring occurrences are generated, no past meetings are
auto-completed. What is stored is what is returned.

Filters fail loudly. A typo in a parameter name or an unrecognised choice value
returns a 400 naming what was accepted, rather than a 200 carrying a silently
unfiltered list — the latter is far more expensive for a client to notice.
"""

from datetime import datetime

from django.db.models import Count, Q
from rest_framework import serializers, viewsets
from rest_framework.pagination import CursorPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from api.authentication import PersonalAPITokenAuthentication
from api.models import Project, Task
from api.serializers import PublicProjectSerializer, PublicTaskSerializer

TRUE_VALUES = {"1", "true", "yes"}
FALSE_VALUES = {"0", "false", "no"}

# Handled by DRF itself rather than by any viewset's get_queryset, so they are
# always legal even though no endpoint declares them.
RESERVED_PARAMS = frozenset({"cursor", "page_size", "format"})


def _parse_date(params, key):
    """Return a date for `key`, or None if absent. Rejects malformed input.

    External clients get a 400 rather than the app's habit of quietly ignoring
    an unparseable date — a silently dropped filter is worse than an error.
    """
    raw = params.get(key)
    if not raw:
        return None
    try:
        return datetime.strptime(raw, "%Y-%m-%d").date()
    except ValueError:
        raise serializers.ValidationError({key: "Expected a date in YYYY-MM-DD format."})


def _parse_bool(params, key):
    raw = params.get(key)
    if raw is None or raw == "":
        return None
    lowered = raw.lower()
    if lowered in TRUE_VALUES:
        return True
    if lowered in FALSE_VALUES:
        return False
    raise serializers.ValidationError({key: "Expected one of: true, false."})


def _parse_int(params, key):
    raw = params.get(key)
    if not raw:
        return None
    try:
        return int(raw)
    except ValueError:
        raise serializers.ValidationError({key: "Expected an integer id."})


def _parse_choice(params, key, choices):
    """Return a validated choice value for `key`, or None if absent.

    `choices` is a Django-style ``[(value, label), ...]``, so the accepted set
    tracks the model definition instead of being restated here. Matching is
    exact: an unrecognised value is a 400, not an empty result set, since the
    two are indistinguishable to a client that legitimately has no matches.
    """
    raw = params.get(key)
    if not raw:
        return None
    valid = [value for value, _label in choices]
    if raw not in valid:
        raise serializers.ValidationError(
            {key: f"Expected one of: {', '.join(valid)}."}
        )
    return raw


class ReadOnlyAPIViewSet(viewsets.ReadOnlyModelViewSet):
    """Shared auth/permission wiring for the v1 endpoints.

    JWT is accepted alongside the API key so the app itself and interactive
    debugging can hit these endpoints without minting a key.
    """

    authentication_classes = [PersonalAPITokenAuthentication, JWTAuthentication]
    permission_classes = [IsAuthenticated]

    #: Query params this endpoint understands, beyond RESERVED_PARAMS.
    filter_params = frozenset()

    def initial(self, request, *args, **kwargs):
        # After super(), so an unauthenticated caller still gets a 401 rather
        # than being told which parameters it may not use.
        super().initial(request, *args, **kwargs)
        self._reject_unknown_params(request.query_params)

    def _reject_unknown_params(self, params):
        allowed = self.filter_params | RESERVED_PARAMS
        unknown = sorted(set(params) - allowed)
        if not unknown:
            return
        detail = {param: "Unrecognized query parameter." for param in unknown}
        detail["supported_parameters"] = sorted(allowed)
        raise serializers.ValidationError(detail)


class TaskCursorPagination(CursorPagination):
    # Cursor pagination needs a non-null, stable ordering; begin_date is
    # nullable, so it cannot be used here even though it reads more naturally.
    ordering = ("-created_at", "-id")
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


class ProjectCursorPagination(CursorPagination):
    ordering = ("-created", "-id")
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


class PublicTaskViewSet(ReadOnlyAPIViewSet):
    """GET /api/v1/tasks/ and /api/v1/tasks/<id>/ — the caller's own tasks.

    Filters: category, priority, project, is_done, search, begin_date, end_date.
    `begin_date`/`end_date` describe a window and select tasks *active* during
    it, matching how the app itself thinks about a date range: a task overlaps
    the window if it starts on or before the window ends and has not finished
    before the window begins.
    """

    serializer_class = PublicTaskSerializer
    pagination_class = TaskCursorPagination
    filter_params = frozenset({
        "category",
        "priority",
        "project",
        "is_done",
        "search",
        "begin_date",
        "end_date",
    })

    def get_queryset(self):
        params = self.request.query_params
        queryset = Task.objects.filter(user=self.request.user).select_related(
            "project", "recurring_task"
        )

        category = _parse_choice(params, "category", Task.CATEGORY_CHOICES)
        if category:
            queryset = queryset.filter(category=category)

        priority = _parse_choice(params, "priority", Task.PRIORITY_CHOICES)
        if priority:
            queryset = queryset.filter(priority=priority)

        project_id = _parse_int(params, "project")
        if project_id is not None:
            queryset = queryset.filter(project_id=project_id)

        is_done = _parse_bool(params, "is_done")
        if is_done is not None:
            queryset = queryset.filter(is_done=is_done)

        search = params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        window_start = _parse_date(params, "begin_date")
        window_end = _parse_date(params, "end_date")

        if window_end is not None:
            queryset = queryset.filter(
                Q(begin_date__lte=window_end) | Q(begin_date__isnull=True)
            )
        if window_start is not None:
            queryset = queryset.filter(
                Q(end_date__gte=window_start) | Q(end_date__isnull=True)
            )

        return queryset


class PublicProjectViewSet(ReadOnlyAPIViewSet):
    """GET /api/v1/projects/ and /api/v1/projects/<id>/ — the caller's projects.

    Filters: status, search. Each row carries `task_count`.
    """

    serializer_class = PublicProjectSerializer
    pagination_class = ProjectCursorPagination
    filter_params = frozenset({"status", "search"})

    def get_queryset(self):
        params = self.request.query_params
        queryset = Project.objects.filter(user=self.request.user).annotate(
            task_count=Count("tasks")
        )

        status_filter = _parse_choice(params, "status", Project.STATUS_CHOICES)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        search = params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )

        return queryset
