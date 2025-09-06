import pytest
import re
from api.txt_parser import DevParser

def test_parse_week_of_valid_formats():
    parser = DevParser("")
    assert parser._parse_week_of("Week of: 3/11/2024") == "2024-03-11"
    assert parser._parse_week_of("Week of 2024-03-11") == "2024-03-11"
    assert parser._parse_week_of("Week of: 3/11/24") == "2024-03-11"

def test_parse_week_of_invalid_format():
    parser = DevParser("")
    with pytest.raises(ValueError, match="Unrecognized 'Week of' date format"):
        parser._parse_week_of("Week of: 11th March 2024")

def test_parse_week_of_not_week_of_line():
    parser = DevParser("")
    assert parser._parse_week_of("Random text line") is None

def test_parse_valid_task_block():
    content = """
    Week of: 2024-03-11
    Dev:
    - [ ] Write parser unit tests
    """
    parser = DevParser(content)
    parser.parse()
    assert len(parser.tasks) == 1
    task = parser.tasks[0]
    assert task["category"] == "Dev"
    assert task["title"] == "Write parser unit tests"
    assert task["done"] is False
    assert task["priority"] == "medium"
    assert task["carry_over"] is True
    assert task["sub_task"] is False
    assert task["begin_date"] == "2024-03-11"

def test_parse_without_week_of_raises():
    content = """
    Dev:
    - [ ] Missing date up top
    """
    parser = DevParser(content)
    expected_message = "Missing 'Week of' date before tasks (line 3). Add a line like 'Week of: 3/11/2024' at the top."
    with pytest.raises(ValueError, match=re.escape(expected_message)):
        parser.parse()
