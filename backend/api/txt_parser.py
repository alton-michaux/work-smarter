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
            #print(f"\n[Line {line_num}] Raw: {repr(raw_line)}")
            line = raw_line.rstrip()
            if not line.strip():
                #print("  Skipped: empty/whitespace line")
                continue

            indent_level = len(raw_line) - len(raw_line.lstrip())
            #print(f"  Indent level: {indent_level}")

            # Skip divider lines like ---PRE QA---
            if '---' in line:
                #print("  Skipped: divider line")
                continue

            # ✅ First: Priority check (before checking section header)
            stripped = line.strip(':').upper()
            if stripped in self.PRIORITY_MAP:
                current_priority = self.PRIORITY_MAP[stripped]
                #print(f"  Priority set to: {current_priority}")
                continue

            # ✅ Then: Section/project check
            if re.match(r'^[A-Za-z0-9 _\-]+:$', line) and not line.startswith("-"):
                current_project = line.replace(":", "").strip()
                #print(f"  Section set to: {current_project}")
                continue

            # Task line
            match = re.match(r'^-+\[?x?\]?\s*(.+)$', line.strip(), re.IGNORECASE)
            if match:
                title = match.group(1).strip()
                done = bool(re.match(r'^-+\[x\]', line.strip(), re.IGNORECASE))
                carry_over = not done
                #print(f"  Matched task: '{title}', done: {done}, carry_over: {carry_over}")

                # Clean up the parent stack based on indentation
                while parent_stack and parent_stack[-1][0] >= indent_level:
                    popped = parent_stack.pop()
                    #print(f"    Popped from parent_stack: {popped}")

                notes = ""
                if parent_stack:
                    notes = f"Subtask of: {parent_stack[-1][1]}"
                    #print(f"    Notes set: {notes}")
                else:
                    print("    No parent in stack")

                # Push current task to stack
                parent_stack.append((indent_level, title))
                #print(f"    Pushed to parent_stack: {(indent_level, title)}")

                task = {
                    "title": title,
                    "done": done,
                    "carry_over": carry_over,
                    "priority": current_priority,
                    "section": current_project,
                    "notes": notes,
                }
                
                #print(f"    Appending task: {task}")
                self.tasks.append(task)
