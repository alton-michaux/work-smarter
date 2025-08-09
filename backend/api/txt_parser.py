import re
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
    PRIORITY_MAP = {
        "URGENT": "urgent",
        "HIGH PRIORITY": "high",
        "HIGH PRIRITY": "high",  # typo allowed
        "MEDIUM PRIORITY": "medium",
        "LOW PRIORITY": "low"
    }

    def parse(self):
        try:
            current_project = None
            current_priority = "medium"
            parent_stack = []  # (indent_level, title)

            for line_num, raw_line in enumerate(self.lines, start=1):
                line = raw_line.rstrip()
                if not line.strip():
                    continue

                indent_level = len(raw_line) - len(raw_line.lstrip())

                # Skip divider lines like ---PRE QA---
                if '---' in line:
                    continue

                # ✅ First: Priority check (before checking section header)
                stripped = line.strip(':').upper()
                if stripped in self.PRIORITY_MAP:
                    current_priority = self.PRIORITY_MAP[stripped]
                    continue

                # ✅ Then: Section/project check
                if re.match(r'^[A-Za-z0-9 _\-]+:$', line) and not line.startswith("-"):
                    current_project = line.replace(":", "").strip()
                    continue

                # Task line
                match = re.match(r'^-+\[?x?\]?\s*(.+)$', line.strip(), re.IGNORECASE)
                if match:
                    title = match.group(1).strip()
                    done = bool(re.match(r'^-+\[x\]', line.strip(), re.IGNORECASE))
                    carry_over = not done

                    # Clean up the parent stack based on indentation
                    while parent_stack and parent_stack[-1][0] >= indent_level:
                        parent_stack.pop()

                    notes = ""
                    # compute before pushing the current task
                    is_subtask = len(parent_stack) > 0

                    task = {
                        "category": current_project,
                        "title": title,
                        "done": done,
                        "priority": current_priority,
                        "carry_over": carry_over,
                        "description": notes,
                        "sub_task": is_subtask,
                    }

                    # push AFTER computing is_subtask
                    parent_stack.append((indent_level, title))

                    # append once
                    self.tasks.append(task)
        except Exception as e:
            print(f"Error while parsing at line {line_num}: {e}")
            raise