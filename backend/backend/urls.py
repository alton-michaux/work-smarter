from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from api.views.views_social_auth import SocialAuthCompleteView
from api.views.views_auth import ThrottledRegisterView, ThrottledPasswordResetView

urlpatterns = [
    path('api/', include('api.urls')),
    # Throttled overrides — must come before the dj-rest-auth includes below,
    # since Django resolves urlpatterns top-to-bottom and these exact paths
    # would otherwise be matched by the stock (unthrottled) views first.
    path('api/auth/password/reset/', ThrottledPasswordResetView.as_view(), name='rest_password_reset'),
    path('api/auth/registration/', ThrottledRegisterView.as_view(), name='rest_register'),
    # dj-rest-auth endpoints
    path('api/auth/', include('dj_rest_auth.urls')),  # login, logout, password reset, etc.
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),  # signup
    path('api/auth/social/complete/', SocialAuthCompleteView.as_view(), name='social-auth-complete'),

    # allauth (social login OAuth handshake)
    path('accounts/', include('allauth.urls')),

    path('admin/', admin.site.urls),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)