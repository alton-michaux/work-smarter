# txt_parser.py
from abc import ABC, abstractmethod

class TxtParser(ABC):
    def __init__(self, content):
        self.lines = content.splitlines()
        self.tasks = []

    @abstractmethod
    def parse(self):
        pass

class DevParser(TxtParser):
    def parse(self):
        current_section = None
        current_priority = "MEDIUM"
        for line in self.lines:
            line = line.strip()

            if not line:
                continue

            if line.endswith(':') and not line.startswith('-'):
                current_section = line.rstrip(':')
                continue

            if line.upper() in ["URGENT", "HIGH PRIRITY:", "MEDIUM PRIORITY:", "LOW PRIORITY:"]:
                current_priority = line.replace(":", "").strip().title()
                continue

            if line.startswith('-'):
                done = line.startswith("-[x]")
                title = line.lstrip("-[x] ").strip()
                self.tasks.append({
                    "title": title,
                    "done": done,
                    "priority": current_priority,
                    "section": current_section,
                })

        return self.tasks
