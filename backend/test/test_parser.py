# import pytest
# import re
# from datetime import date
# from api.models import Task
# from backend.management.utils.txt_parser import DevParser

# def test_parse_week_of_valid_formats():
#     parser = DevParser("")
#     assert parser._parse_week_of("Week of: 3/11/2024") == "2024-03-11"
#     assert parser._parse_week_of("Week of 2024-03-11") == "2024-03-11"
#     assert parser._parse_week_of("Week of: 3/11/24") == "2024-03-11"

# def test_parse_week_of_invalid_format():
#     parser = DevParser("")
#     with pytest.raises(ValueError, match="Unrecognized 'Week of' date format"):
#         parser._parse_week_of("Week of: 11th March 2024")

# def test_parse_week_of_not_week_of_line():
#     parser = DevParser("")
#     assert parser._parse_week_of("Random text line") is None

# def test_parse_valid_task_block():
#     content = """
#     Week of: 2024-03-11
#     Dev:
#     - [ ] Write parser unit tests
#     """
#     parser = DevParser(content)
#     parser.parse()
#     assert len(parser.tasks) == 1
#     task = parser.tasks[0]
#     assert task["category"] == "Dev"
#     assert task["title"] == "Write parser unit tests"
#     assert task["done"] is False
#     assert task["priority"] == "medium"
#     assert task["carry_over"] is True
#     assert task["sub_task"] is False
#     assert task["begin_date"] == "2024-03-11"

# def test_parse_without_week_of_raises():
#     content = """
#     Dev:
#     - [ ] Missing date up top
#     """
#     parser = DevParser(content)
#     expected_message = "Missing 'Week of' date before tasks (line 3). Add a line like 'Week of: 3/11/2024' at the top."
#     with pytest.raises(ValueError, match=re.escape(expected_message)):
#         parser.parse()

# @pytest.mark.django_db
# def test_txt_import_sets_end_date(create_file, get_user, auth_client):
#     file = create_file("""Week of: 2024-03-11\nWork:\n- [x] Finished task""")
#     response = auth_client.post("/api/import/", {"file": file}, format="multipart")

#     assert response.status_code == 201
#     task = Task.objects.filter(title__icontains="Finished task").first()
#     assert task is not None, "Task with title containing 'Finished task' was not found."
#     assert task.is_done is True
#     assert task.end_date == date(2024, 3, 11)
