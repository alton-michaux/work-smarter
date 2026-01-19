from django.urls import path
from .views import GenerateResumeBulletsView

urlpatterns = [
    path("generate-bullets/", GenerateResumeBulletsView.as_view(), name="generate-resume-bullets"),
]
