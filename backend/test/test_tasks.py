import pytest

@pytest.mark.django_db
def test_task_create():
  print("task create")
  
@pytest.mark.django_db
def test_task_update():
  print("task_update")
  
@pytest.mark.django_db
def test_task_delete():
  print("task_delete")
