from datetime import timedelta
from django.db import transaction
from api.models import RecurringTask, Task


def _dates_between(start, end):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def _should_generate(rt: RecurringTask, d):
    if d < rt.start_date:
        return False

    if rt.frequency == "daily":
        return True

    if rt.frequency == "weekly":
        return rt.day_of_week is not None and d.weekday() == rt.day_of_week

    if rt.frequency == "monthly":
        # MVP: same day-of-month as start_date
        return d.day == rt.start_date.day

    return False


@transaction.atomic
def ensure_recurring_tasks_in_range(date_from, date_to, *, user, project=None):
    qs = RecurringTask.objects.filter(is_active=True, user=user)
    if project is not None:
        qs = qs.filter(project=project)

    for rt in qs:
        for d in _dates_between(date_from, date_to):
            if not _should_generate(rt, d):
                continue

            Task.objects.get_or_create(
                recurring_task=rt,
                user=user,
                begin_date=d,
                defaults={
                    "title": rt.title,
                    "project": rt.project,
                    "category": rt.category,
                    "parent": None,
                    "is_subtask": False, 
                },
            )
        
    return qs
