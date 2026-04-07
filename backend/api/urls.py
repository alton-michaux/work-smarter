from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api.views.views import ProjectViewSet, TaskViewSet, UserViewSet, RecurringTaskViewSet
from api.views.upload.views_import import ImportTasksCSVView, ImportTasksTXTView
from api.views.upload.views_import_csv_spec import ImportTasksCSVSpecView
from api.views.download.views_export import ExportTasksCSV
from api.views.views_calendar import (
    GoogleOAuthInitView,
    GoogleOAuthCallbackView,
    GoogleCalendarStatusView,
    GoogleCalendarListView,
    GoogleCalendarSelectView,
    GoogleCalendarPullView,
)

# JWT views
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r"recurring-tasks", RecurringTaskViewSet, basename="recurring-task")
router.register(r'user', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path('import/txt/', ImportTasksTXTView.as_view(), name='import-tasks-txt'),
    path("import/csv/spec/", ImportTasksCSVSpecView.as_view(), name="import-tasks-csv-spec"),
    path('import/csv/', ImportTasksCSVView.as_view(), name="import-tasks-csv"),
    path('export/csv/', ExportTasksCSV.as_view(), name='export-tasks-csv'),
    # JWT endpoints
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Google Calendar
    path('calendar/oauth/init/', GoogleOAuthInitView.as_view(), name='calendar-oauth-init'),
    path('calendar/oauth/callback/', GoogleOAuthCallbackView.as_view(), name='calendar-oauth-callback'),
    path('calendar/status/', GoogleCalendarStatusView.as_view(), name='calendar-status'),
    path('calendar/calendars/', GoogleCalendarListView.as_view(), name='calendar-list'),
    path('calendar/select/', GoogleCalendarSelectView.as_view(), name='calendar-select'),
    path('calendar/pull/', GoogleCalendarPullView.as_view(), name='calendar-pull'),
]