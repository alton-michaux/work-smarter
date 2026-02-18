from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api.views.views import ProjectViewSet, TaskViewSet, UserViewSet, RecurringTaskViewSet
from api.views.upload.views_import_csv import ImportTasksCSVView, ImportTasksTXTView
from api.views.download.views_export_csv import ExportTasksCSV

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
    path('import/', ImportTasksTXTView.as_view(), name='import-tasks'),
    path("api/import/csv/", ImportTasksCSVView.as_view(), name="import-tasks-csv"),
    path('export/csv/', ExportTasksCSV.as_view(), name='export-tasks-csv'),
    # JWT endpoints
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]