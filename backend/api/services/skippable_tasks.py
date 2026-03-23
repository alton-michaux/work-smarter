from api.models import RecurringTaskException

def is_skipped(user, recurring_task, day):
    return RecurringTaskException.objects.filter(
        user=user,
        recurring_task=recurring_task,
        date=day,
        type=RecurringTaskException.TYPE_SKIP,
    ).exists()