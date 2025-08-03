import pytest

# --- NON-CRITICAL tests added to achieve 100% test coverage

@pytest.mark.django_db
def test_import_asgi():
    import backend.asgi

@pytest.mark.django_db
def test_import_wsgi():
    import backend.wsgi