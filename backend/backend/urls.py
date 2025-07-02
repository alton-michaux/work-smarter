from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('api/', include('api.urls')),
    # dj-rest-auth endpoints
    path('api/auth/', include('dj_rest_auth.urls')),  # login, logout, password reset, etc.
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),  # signup
    
    path('admin/', admin.site.urls),
]