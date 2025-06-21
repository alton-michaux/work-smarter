import re
from abc import ABC, abstractmethod

class TxtParser(ABC):
    def __init__(self, content):
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
                    popped = parent_stack.pop()

                notes = ""
                if parent_stack:
                    notes = f"Subtask of: {parent_stack[-1][1]}"
                else:
                    continue

                # Push current task to stack
                parent_stack.append((indent_level, title))

                task = {
                    "title": title,
                    "done": done,
                    "carry_over": carry_over,
                    "priority": current_priority,
                    "section": current_project,
                    "notes": notes,
                }
                self.tasks.append(task)

        return self.tasks
