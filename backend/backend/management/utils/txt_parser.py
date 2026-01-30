import re
from datetime import datetime
from abc import ABC, abstractmethod
from loguru import logger

class TxtParser(ABC):
    def __init__(self, content):
        if not isinstance(content, str):
            raise ValueError("Content must be a string")
        self.lines = content.splitlines()
        self.tasks = []

    @abstractmethod
    def parse(self):
        pass


class DevParser(TxtParser):
    CATEGORY_LABELS = {"Meetings", "Tasks", "Notes"}
    PROJECT_LABELS = {"Vamos", "Datos"}

    # Accept common date formats for "Week of"
    WEEK_OF_FORMATS = [
        "%m/%d/%Y",  # 3/11/2024
        "%Y-%m-%d",  # 2024-03-11
        "%m/%d/%y",  # 3/11/24
    ]

    PRIORITY_MAP = {
        "URGENT": "urgent",
        "HIGH PRIORITY": "high",
        "HIGH PRIRITY": "high",  # typo allowed
        "MEDIUM PRIORITY": "medium",
        "LOW PRIORITY": "low",
    }

    HEADER_REGEX = re.compile(r'^[A-Za-z0-9 _\-]+:$')  # e.g., "Meetings:", "Admin:", "Dev:"
    TASK_REGEX = re.compile(r'^\s*-\s*\[(x| )\]\s*(.+)$', re.IGNORECASE)
    DONE_REGEX = re.compile(r'^-+\[x\]', re.IGNORECASE)
    DIVIDER_REGEX = re.compile(r'-{3,}')  # lines like ---PRE QA---

    def _parse_week_of(self, line: str):
        try:
            if not line.lower().startswith("week of"):
                return None

            parts = line.split(":", 1) if ":" in line else line.split(None, 2)
            if not parts:
                return None

            date_part = parts[-1].strip()
            if not date_part:
                raise ValueError("Found 'Week of' but no date provided.")

            for fmt in self.WEEK_OF_FORMATS:
                try:
                    dt = datetime.strptime(date_part, fmt)
                    return dt.strftime("%Y-%m-%d")
                except ValueError:
                    continue

            raise ValueError(f"Unrecognized 'Week of' date format: {date_part}")
        except Exception as e:
            raise

    def parse(self, require_week_of=True):
        current_category = None
        current_priority = "medium"
        current_project = None
        parent_stack = []
        current_week_of = None

        try:
            for line_num, raw_line in enumerate(self.lines, start=1):
                line = raw_line.rstrip()
                if not line.strip():
                    continue

                # Check for week change ANYWHERE in the file
                maybe = self._parse_week_of(line.strip())
                if maybe:
                    current_week_of = maybe
                    continue

                indent_level = len(raw_line) - len(raw_line.lstrip())

                if self.DIVIDER_REGEX.search(line):
                    continue

                stripped = line.strip(':').strip()
                upper_stripped = stripped.upper()

                if upper_stripped in self.PRIORITY_MAP:
                    current_priority = self.PRIORITY_MAP[upper_stripped]
                    continue

                if self.HEADER_REGEX.match(line) and not line.lstrip().startswith("-"):
                    current_category = stripped

                    if stripped in self.PROJECT_LABELS:
                        current_project = stripped
                    elif stripped in self.CATEGORY_LABELS:
                        current_project = None  # Meetings, Notes, Tasks: not projects
                    # else: leave current_project unchanged for unknown headers
                    continue

                match = self.TASK_REGEX.match(line)
                if match:
                    done_symbol, title = match.groups()
                    done = done_symbol.lower() == "x"
                    carry_over = not done

                    while parent_stack and parent_stack[-1][0] >= indent_level:
                        parent_stack.pop()

                    notes = ""
                    is_subtask = len(parent_stack) > 0

                    if require_week_of and current_week_of is None:
                        raise ValueError(
                            f"Missing 'Week of' date before tasks (line {line_num}). "
                            "Add a line like 'Week of: 3/11/2024' at the top."
                        )

                    task = {
                        "category": current_category,
                        "title": title,
                        "done": done,
                        "priority": current_priority,
                        "carry_over": carry_over,
                        "description": notes,
                        "sub_task": is_subtask,
                        "begin_date": current_week_of,
                        "end_date": current_week_of if done else None,
                        "project_name": current_project
                    }

                    parent_stack.append((indent_level, title))
                    self.tasks.append(task)

            if require_week_of and current_week_of is None:
                raise ValueError(
                    "No 'Week of' line found. Expected something like 'Week of: 3/11/2024'."
                )

        except Exception as e:
            msg = f"Error while parsing at line {line_num}: {e}" if 'line_num' in locals() else f"Error while parsing: {e}"
            raise
