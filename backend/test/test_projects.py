import pytest

@pytest.mark.django_db
def test_project_create():
  print("project create")
  
@pytest.mark.django_db
def test_project_update():
  print("project update")
  
@pytest.mark.django_db
def test_project_delete():
  print("project delete")