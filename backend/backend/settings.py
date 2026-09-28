import environ
from pathlib import Path

# --- Base Directory ---
BASE_DIR = Path(__file__).resolve().parent.parent

# --- Environment Setup ---
env = environ.Env()
env.read_env(BASE_DIR / ".env")  # Reads from .env in /backend

# --- Security ---
SECRET_KEY = env("SECRET_KEY")
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list(
    "ALLOWED_HOSTS",
    default=[
        "localhost",
        "127.0.0.1",
        ".fly.dev",
    ]
)

# Fly.io terminates TLS at the edge and forwards over plain HTTP internally;
# without this, Django can never see the request as "secure" and every
# SECURE_*/cookie-secure check below would be permanently false in prod.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Deliberately NOT derived from DEBUG: CI and other non-DEBUG-but-non-HTTPS
# environments (e.g. `DEBUG=0` with no TLS, like the test suite) would
# otherwise get every request 301-redirected to https by SecurityMiddleware
# instead of the response the test expects. Turn this on explicitly once
# SECURE_PROXY_SSL_HEADER is confirmed to be forwarded correctly in prod.
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=False)
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=0 if DEBUG else 31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = env.str("SESSION_COOKIE_SAMESITE", default="Lax" if DEBUG else "None")

# The frontend (Vercel) and backend (Fly.io) are different registrable
# domains in production, so cookies must be SameSite=None+Secure there to
# survive cross-site requests; locally (same-site http://localhost) browsers
# reject SameSite=None without Secure, so we fall back to Lax under DEBUG.
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_HTTPONLY = False  # frontend JS reads this to send X-CSRFToken
CSRF_COOKIE_SAMESITE = env.str("CSRF_COOKIE_SAMESITE", default="Lax" if DEBUG else "None")
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=["http://localhost:3000"])

# --- Installed Apps ---
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'dj_rest_auth',
    'dj_rest_auth.registration',

    'allauth.socialaccount.providers.google',
    'allauth.socialaccount.providers.linkedin_oauth2',

    # Local apps
    'backend.apps.BackendConfig',
    'api',
]

# --- Middleware ---
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'allauth.account.middleware.AccountMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# --- REST Framework ---
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'dj_rest_auth.jwt_auth.JWTCookieAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.CursorPagination",
    "PAGE_SIZE": 50,
    'DEFAULT_THROTTLE_RATES': {
        'login': '10/min',
        'registration': '5/hour',
        'password_reset': '5/hour',
        'ai_resume': '20/hour',
        'note_decrypt': '10/min',
        'token_refresh': '30/min',
    },
}

# --- REST Auth Customization ---
# JWTCookieAuthentication (above) checks the Authorization header first and
# falls back to the cookie, so existing Bearer-token API clients/tests keep
# working unchanged while the frontend moves to httpOnly cookies.
REST_AUTH = {
    'USE_JWT': True,
    'JWT_AUTH_COOKIE': 'ws-access',
    'JWT_AUTH_REFRESH_COOKIE': 'ws-refresh',
    'JWT_AUTH_HTTPONLY': True,
    'JWT_AUTH_SECURE': not DEBUG,
    'JWT_AUTH_SAMESITE': env.str("JWT_AUTH_SAMESITE", default="Lax" if DEBUG else "None"),
    'USER_DETAILS_SERIALIZER': 'backend.adapters.WritableEmailUserSerializer',
}

REST_AUTH_REGISTER_SERIALIZERS = {
    'REGISTER_SERIALIZER': 'dj_rest_auth.registration.serializers.RegisterSerializer',
}

# --- Authentication Backends ---
AUTHENTICATION_BACKENDS = [
    'allauth.account.auth_backends.AuthenticationBackend',
    'django.contrib.auth.backends.ModelBackend',
]

# --- Django Allauth Config ---
SITE_ID = 1
ACCOUNT_LOGIN_METHODS = {'email'}
ACCOUNT_EMAIL_VERIFICATION = 'optional'
ACCOUNT_EMAIL_CONFIRMATION_AUTHENTICATED_REDIRECT_URL = '/'
ACCOUNT_CONFIRM_EMAIL_ON_GET = True
ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS = 1

# --- URL & Templates ---
ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

# --- Database ---
DATABASES = {
    'default': env.db(),  # expects DATABASE_URL in .env
}

DATABASES["default"]["CONN_MAX_AGE"] = 600

# --- Password Validators ---
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# --- SimpleJWT Settings ---
from datetime import timedelta
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# --- Localization ---
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_L10N = True
USE_TZ = True

# --- Static Files ---
STATIC_URL = '/static/'

# --- Media Files (uploaded resumes etc.) ---
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# --- Upload size limits ---
DATA_UPLOAD_MAX_MEMORY_SIZE = env.int("DATA_UPLOAD_MAX_MEMORY_SIZE", default=12 * 1024 * 1024)
FILE_UPLOAD_MAX_MEMORY_SIZE = env.int("FILE_UPLOAD_MAX_MEMORY_SIZE", default=12 * 1024 * 1024)

# --- OpenAI ---
OPENAI_API_KEY = env("OPENAI_API_KEY", default="")

# --- Groq (AI resume analysis) ---
GROQ_API_KEY = env("GROQ_API_KEY", default="")

# --- CORS ---
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=["http://localhost:3000"])
CORS_ALLOW_CREDENTIALS = True

# --- DEBUG ---
REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = ['rest_framework.renderers.JSONRenderer']

# --- Google OAuth2 (Calendar) ---
GOOGLE_OAUTH2_CLIENT_ID = env("GOOGLE_OAUTH2_CLIENT_ID", default="")
GOOGLE_OAUTH2_CLIENT_SECRET = env("GOOGLE_OAUTH2_CLIENT_SECRET", default="")
GOOGLE_OAUTH2_REDIRECT_URI = env("GOOGLE_OAUTH2_REDIRECT_URI", default="http://localhost:8000/api/calendar/oauth/callback/")
FRONTEND_URL = env("FRONTEND_URL", default="http://localhost:3000")

# --- Social Auth (Login with Google / LinkedIn) ---
SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'APP': {
            'client_id': env('GOOGLE_OAUTH2_CLIENT_ID', default=''),
            'secret': env('GOOGLE_OAUTH2_CLIENT_SECRET', default=''),
            'key': '',
        },
        'SCOPE': ['profile', 'email'],
        'AUTH_PARAMS': {'access_type': 'online'},
    },
    'linkedin_oauth2': {
        'APP': {
            'client_id': env('LINKEDIN_CLIENT_ID', default=''),
            'secret': env('LINKEDIN_CLIENT_SECRET', default=''),
            'key': '',
        },
        'SCOPE': ['openid', 'profile', 'email'],
    },
}
LINKEDIN_CLIENT_ID = env('LINKEDIN_CLIENT_ID', default='')
LINKEDIN_CLIENT_SECRET = env('LINKEDIN_CLIENT_SECRET', default='')
SOCIALACCOUNT_ADAPTER = 'backend.adapters.WorkSmarterSocialAccountAdapter'
SOCIALACCOUNT_AUTO_SIGNUP = True
SOCIALACCOUNT_LOGIN_ON_GET = True
LOGIN_REDIRECT_URL = '/api/auth/social/complete/'

# --- Misc ---
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
