from rest_framework.pagination import CursorPagination


class IdCursorPagination(CursorPagination):
    # Project-wide default. DRF's CursorPagination orders by "-created", which
    # most models here don't have, so their list endpoints raised FieldError
    # (500). id exists on every model and is unique and monotonic with
    # creation, which also keeps the cursor terminating (see
    # TaskCursorPagination in api/views/views.py).
    ordering = "-id"
