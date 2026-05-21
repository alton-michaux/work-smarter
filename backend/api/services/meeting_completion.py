from datetime import timedelta, timezone as dt_timezone
from django.utils import timezone
from django.db import transaction
from django.db.models import F
from api.models import Task


@transaction.atomic
def auto_complete_past_meetings(user, tz_offset=0):
    user_tz = dt_timezone(timedelta(minutes=tz_offset))
    now = timezone.now().astimezone(user_tz)
    today = now.date()
    current_time = now.time().replace(tzinfo=None)

    # Meetings from before today - day after they occurred
    Task.objects.filter(
        user=user,
        category="meeting",
        is_done=False,
        begin_date__isnull=False,
        begin_date__lt=today,
    ).update(is_done=True, end_date=F("begin_date"))

    # Today's meetings where end_time has passed
    Task.objects.filter(
        user=user,
        category="meeting",
        is_done=False,
        begin_date=today,
        end_time__isnull=False,
        end_time__lt=current_time,
    ).update(is_done=True, end_date=today)

    # Today's meetings with no end_time but begin_time has passed
    Task.objects.filter(
        user=user,
        category="meeting",
        is_done=False,
        begin_date=today,
        end_time__isnull=True,
        begin_time__isnull=False,
        begin_time__lt=current_time,
    ).update(is_done=True, end_date=today)
