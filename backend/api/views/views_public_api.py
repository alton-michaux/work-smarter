"""The v1 API.

A narrow view of a user's own tasks and projects, intended for scripts and
third-party integrations authenticating with a personal API key. Tasks are
readable and writable; projects are read-only, since project lifecycle belongs
in the app.

Reads have no side effects. Unlike the app's own TaskViewSet, nothing here
mutates data as a side effect of reading: no recurring occurrences are
generated, no past meetings are auto-completed. What is stored is what is
returned.

Writes require a key scoped ``read_write``. Read is the default scope, so a key
handed to a script is not incidentally a key that can delete a year of work.

Filters fail loudly. A typo in a parameter name or an unrecognised choice value
returns a 400 naming what was accepted, rather than a 200 carrying a silently
unfiltered list — the latter is far more expensive for a client to notice.
"""

from datetime import datetime

from django.db.models import Count, Q
from rest_framework import mixins, serializers, viewsets
from rest_framework.pagination import CursorPagination
from rest_framework.permissions import SAFE_METHODS, BasePermission, IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from api.authentication import PersonalAPITokenAuthentication
from api.models import PersonalAPIToken, Project, RecurringTaskException, Task
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


class HasRequiredScope(BasePermission):
    """Gates unsafe methods on the API key's scope.

    Only applies to API-key callers. A JWT request is the account holder acting
    through the app or a debugging session, and is already as privileged as the
    app's own endpoints — there is nothing for a scope to restrict.
    """

    message = "This API key is read-only. Create a read/write key to make changes."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        if not hasattr(view, request.method.lower()):
            # The endpoint does not offer this method to anyone. Fall through so
            # DRF answers 405; blaming the key's scope would send a caller off to
            # mint a read/write key that changes nothing.
            return True
        token = request.auth
        if isinstance(token, PersonalAPIToken):
            return token.can_write
        return True


class PublicAPIViewSet(viewsets.GenericViewSet):
    """Shared auth/permission wiring for the v1 endpoints.

    JWT is accepted alongside the API key so the app itself and interactive
    debugging can hit these endpoints without minting a key.
    """

    authentication_classes = [PersonalAPITokenAuthentication, JWTAuthentication]
    permission_classes = [IsAuthenticated, HasRequiredScope]

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


class PublicTaskViewSet(mixins.CreateModelMixin,
                        mixins.RetrieveModelMixin,
                        mixins.UpdateModelMixin,
                        mixins.DestroyModelMixin,
                        mixins.ListModelMixin,
                        PublicAPIViewSet):
    """/api/v1/tasks/ — the caller's own tasks, readable and writable.

    Filters (GET): category, priority, project, is_done, search, begin_date,
    end_date. `begin_date`/`end_date` describe a window and select tasks
    *active* during it, matching how the app itself thinks about a date range: a
    task overlaps the window if it starts on or before the window ends and has
    not finished before the window begins.

    POST/PATCH/PUT/DELETE require a read/write key. Recurrence is not settable
    here — a recurring series is defined in the app, and this endpoint edits the
    individual occurrences it produces.
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

    def perform_create(self, serializer):
        # Ownership comes from the credential, never from the payload — `user`
        # is not a writable field, so this is the only way a task gets an owner.
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        was_done = serializer.instance.is_done

        task = serializer.save()

        # Task.save() maintains end_date; the child cascade is the app's rule
        # for completing a parent, and v1 must not leave subtasks stranded open.
        if not was_done and task.is_done:
            Task.objects.filter(user=task.user, parent=task, is_done=False).update(
                is_done=True,
                end_date=task.end_date,
            )

    def perform_destroy(self, instance):
        user = instance.user

        # Children outlive their parent as standalone tasks rather than being
        # silently deleted along with it, matching the app's delete.
        Task.objects.filter(user=user, parent=instance).update(parent=None, is_subtask=False)

        if instance.recurring_task_id:
            # Without a skip exception the next range the app renders would
            # regenerate this occurrence, and the delete would look ignored.
            day = instance.begin_date or instance.end_date
            if day:
                RecurringTaskException.objects.get_or_create(
                    user=user,
                    recurring_task=instance.recurring_task,
                    date=day,
                    type=RecurringTaskException.TYPE_SKIP,
                )

        instance.delete()


class PublicProjectViewSet(mixins.RetrieveModelMixin,
                           mixins.ListModelMixin,
                           PublicAPIViewSet):
    """GET /api/v1/projects/ and /api/v1/projects/<id>/ — the caller's projects.

    Read-only even for a read/write key: creating and retiring projects is a
    deliberate act with consequences for every task filed under them, and stays
    in the app. Filters: status, search. Each row carries `task_count`.
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
