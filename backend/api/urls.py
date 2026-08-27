from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api.views.views import ProjectViewSet, TaskViewSet, UserViewSet, RecurringTaskViewSet, ResumeViewSet, DeleteAccountView
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
    BlacklistEventView,
    BlacklistListView,
    PushDeadlineView,
)
from api.views.views_resume_profile import ResumeProfileViewSet, WorkExperienceViewSet, EducationViewSet, SkillViewSet
from api.views.views_api_tokens import PersonalAPITokenViewSet

# JWT views
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from backend.adapters import EmailTokenObtainPairSerializer

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r"recurring-tasks", RecurringTaskViewSet, basename="recurring-task")
router.register(r'user', UserViewSet, basename='user')
router.register(r'resumes', ResumeViewSet, basename='resume')
router.register(r'resume-profile', ResumeProfileViewSet, basename='resume-profile')
router.register(r'work-experiences', WorkExperienceViewSet, basename='work-experience')
router.register(r'educations', EducationViewSet, basename='education')
router.register(r'skills', SkillViewSet, basename='skill')
router.register(r'keys', PersonalAPITokenViewSet, basename='api-key')

urlpatterns = [
    path('', include(router.urls)),
    path('import/txt/', ImportTasksTXTView.as_view(), name='import-tasks-txt'),
    path("import/csv/spec/", ImportTasksCSVSpecView.as_view(), name="import-tasks-csv-spec"),
    path('import/csv/', ImportTasksCSVView.as_view(), name="import-tasks-csv"),
    path('export/csv/', ExportTasksCSV.as_view(), name='export-tasks-csv'),
    # JWT endpoints
    path('auth/login/', TokenObtainPairView.as_view(serializer_class=EmailTokenObtainPairSerializer), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Google Calendar
    path('calendar/oauth/init/', GoogleOAuthInitView.as_view(), name='calendar-oauth-init'),
    path('calendar/oauth/callback/', GoogleOAuthCallbackView.as_view(), name='calendar-oauth-callback'),
    path('calendar/status/', GoogleCalendarStatusView.as_view(), name='calendar-status'),
    path('calendar/calendars/', GoogleCalendarListView.as_view(), name='calendar-list'),
    path('calendar/select/', GoogleCalendarSelectView.as_view(), name='calendar-select'),
    path('calendar/pull/', GoogleCalendarPullView.as_view(), name='calendar-pull'),
    path('calendar/blacklist/', BlacklistEventView.as_view(), name='calendar-blacklist-add'),
    path('calendar/blacklist/list/', BlacklistListView.as_view(), name='calendar-blacklist-list'),
    path('calendar/blacklist/<int:pk>/', BlacklistListView.as_view(), name='calendar-blacklist-delete'),
    path('calendar/push-deadline/<int:task_id>/', PushDeadlineView.as_view(), name='calendar-push-deadline'),
    path('auth/account/delete/', DeleteAccountView.as_view(), name='account-delete'),
]