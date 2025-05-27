from rest_framework.routers import DefaultRouter
from .views import ResumeViewSet

router = DefaultRouter()
router.register(r'resume', ResumeViewSet, basename='resume')

urlpatterns = router.urls