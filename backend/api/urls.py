from rest_framework.routers import DefaultRouter
from .views import ResumeViewSet, TaskViewSet, ProjectViewSet

router = DefaultRouter()
router.register(r'tasks', TaskViewSet)
router.register(r'projects', ProjectViewSet)
router.register(r'resume', ResumeViewSet, basename='resume')

urlpatterns = router.urls