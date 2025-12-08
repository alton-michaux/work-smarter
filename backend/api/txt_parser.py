import re
from datetime import datetime
from abc import ABC, abstractmethod

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
        """
        Parse 'Week of: <date>' line and return canonical YYYY-MM-DD string.
        Raises ValueError if present but unparseable.
        Returns None if the line is not a 'Week of' line.
        """
        if not line.lower().startswith("week of"):
            return None

        # Allow "Week of: 3/11/2024" or "Week of 3/11/2024"
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

    def parse(self, require_week_of=True):
        """
        Parse the file:
          - Extract 'Week of' date and assign as begin_date for tasks
          - Section headers set the 'category' (e.g., Meetings, Admin, Dev)
          - Priority headers still supported (HIGH PRIORITY, etc.)
        Error handling:
          - If require_week_of=True and no 'Week of' found -> raises ValueError
          - If 'Week of' found but unparseable -> raises ValueError
        """
        current_category = None
        current_priority = "medium"
        parent_stack = []  # list[(indent_level, title)]
        week_of = None

        try:
            # First pass: try to grab Week of date early if it appears near the top
            for raw in self.lines[:5]:
                line = raw.strip()
                w = self._parse_week_of(line)
                if w:
                    week_of = w
                    break

            # If still unknown, we’ll keep scanning during the main loop,
            # but enforce presence by the end if require_week_of=True.
            for line_num, raw_line in enumerate(self.lines, start=1):
                line = raw_line.rstrip()
                if not line.strip():
                    continue

                # Allow 'Week of:' to appear anywhere, but keep the first valid one
                if week_of is None:
                    maybe = self._parse_week_of(line.strip())
                    if maybe:
                        week_of = maybe
                        continue

                indent_level = len(raw_line) - len(raw_line.lstrip())

                # Skip divider lines like ---PRE QA---
                if self.DIVIDER_REGEX.search(line):
                    continue

                stripped = line.strip(':').strip()
                upper_stripped = stripped.upper()

                # Priority header?
                if upper_stripped in self.PRIORITY_MAP:
                    current_priority = self.PRIORITY_MAP[upper_stripped]
                    continue

                # Category/section header? (e.g., "Meetings:", "Admin:", "Dev:")
                if self.HEADER_REGEX.match(line) and not line.lstrip().startswith("-"):
                    current_category = stripped  # preserve original casing for category
                    continue

                # Task line
                match = self.TASK_REGEX.match(line)
                if match:
                    done_symbol, title = match.groups()
                    done = done_symbol.lower() == "x"

                    carry_over = not done

                    # Clean up the parent stack based on indentation BEFORE computing is_subtask
                    while parent_stack and parent_stack[-1][0] >= indent_level:
                        parent_stack.pop()

                    notes = ""  # you can wire multi-line notes later if needed
                    is_subtask = len(parent_stack) > 0

                    if require_week_of and week_of is None:
                        raise ValueError(
                            f"Missing 'Week of' date before tasks (line {line_num}). "
                            "Add a line like 'Week of: 3/11/2024' at the top."
                        )

                    task = {
                        "category": current_category,          # e.g., Meetings, Admin, Dev
                        "title": title,
                        "done": done,
                        "priority": current_priority,
                        "carry_over": carry_over,
                        "description": notes,
                        "sub_task": is_subtask,
                        "begin_date": week_of,                 # canonical YYYY-MM-DD
                    }

                    # Push current task after computing subtask
                    parent_stack.append((indent_level, title))

                    # Append once (no duplicates)
                    self.tasks.append(task)

            if require_week_of and week_of is None:
                raise ValueError(
                    "No 'Week of' line found. Expected something like 'Week of: 3/11/2024'."
                )

        except Exception as e:
            msg = f"Error while parsing at line {line_num}: {e}" if 'line_num' in locals() else f"Error while parsing: {e}"
            print(msg)
            raise