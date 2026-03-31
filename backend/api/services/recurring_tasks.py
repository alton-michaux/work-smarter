from datetime import timedelta
from django.db import transaction
from api.models import RecurringTask, Task
from .skippable_tasks import is_skipped


def _dates_between(start, end):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def _should_generate(rt: RecurringTask, d):
    if d < rt.start_date:
        return False

    if rt.end_date is not None and d >= rt.end_date:
        return False

    if rt.frequency == "daily":
        if rt.skip_weekends and d.weekday() >= 5:  # 5=Sat, 6=Sun
            return False
        return True

    if rt.frequency == "weekly":
        return rt.day_of_week is not None and d.weekday() == rt.day_of_week

    if rt.frequency == "biweekly":
        target_dow = rt.day_of_week if rt.day_of_week is not None else rt.start_date.weekday()
        if d.weekday() != target_dow:
            return False
        weeks_since_start = (d - rt.start_date).days // 7
        return weeks_since_start % 2 == 0

    if rt.frequency == "monthly":
        # MVP: same day-of-month as start_date
        return d.day == rt.start_date.day

    if rt.frequency == "quarterly":
        if d.day != rt.start_date.day:
            return False
        months_since_start = (d.year - rt.start_date.year) * 12 + (d.month - rt.start_date.month)
        return months_since_start % 3 == 0

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

            if is_skipped(user, rt, d):
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
