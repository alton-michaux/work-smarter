import json
import logging
from collections import defaultdict

import docx
import openai
import pdfplumber
from django.conf import settings

from api.models import Task

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are a professional resume coach. Given a resume and a work history of completed tasks/projects, \
return ONLY a raw JSON object — no markdown, no explanation, no surrounding text.

The JSON must have exactly this shape:
{
  "score": <float 0.0 to 10.0>,
  "summary": "<2-3 sentence overall assessment>",
  "suggestions": ["<actionable improvement>"],
  "accomplishments": ["<task-history win not reflected in resume>"],
  "bullet_rewrites": {"<original weak bullet>": "<stronger rewritten version>"}
}

Rules:
- score: overall quality across clarity, impact language, completeness, and alignment with task history.
- suggestions: 3-6 specific, prioritized improvements.
- accomplishments: up to 5 concrete wins from their task/project history that are absent or understated in the resume.
- bullet_rewrites: pick 2-4 weak bullets from the resume and rewrite them (start with an action verb, quantify where inferable, be concise).
- If resume text is too short or unreadable: set score=2.0, summary="Resume appears incomplete or could not be fully extracted", all lists empty.
- Return valid JSON only. No commentary outside the JSON object.\
"""


def extract_resume_text(resume) -> str:
    ext = resume.file.name.rsplit('.', 1)[-1].lower()

    if ext == 'doc':
        raise ValueError(
            "Binary .doc format is not supported for analysis. "
            "Please re-upload the file as .docx or PDF."
        )

    with resume.file.open('rb') as f:
        if ext == 'pdf':
            text_parts = []
            with pdfplumber.open(f) as pdf:
                for page in pdf.pages:
                    text_parts.append(page.extract_text() or '')
            text = '\n'.join(text_parts)
        elif ext == 'docx':
            doc = docx.Document(f)
            text = '\n'.join(para.text for para in doc.paragraphs)
        else:
            raise ValueError(f"Unsupported file type: .{ext}")

    return text[:6000]


def _build_task_context(user) -> str:
    from datetime import date, timedelta
    from api.models import Project

    projects = Project.objects.filter(user=user)
    project_overview_lines = []
    for p in projects:
        line = f"- {p.name} (status: {p.status})"
        if p.role:
            line += f", role: {p.role}"
        if p.description:
            line += f" — {p.description[:100]}"
        project_overview_lines.append(line)

    tasks = (
        Task.objects
        .filter(user=user, is_done=True, category='task')
        .select_related('project')
        .order_by('-begin_date')
    )

    groups: dict[str, list] = defaultdict(list)
    for task in tasks:
        key = task.project.name if task.project else 'Standalone Tasks'
        groups[key].append(task)

    today = date.today()
    recent_threshold = today - timedelta(days=30)

    task_lines = []
    for project_name, group_tasks in groups.items():
        project_obj = group_tasks[0].project
        task_dates = [t.end_date or t.begin_date for t in group_tasks if t.end_date or t.begin_date]
        if task_dates:
            earliest = min(task_dates)
            latest = max(task_dates)
            is_current = latest >= recent_threshold or (project_obj and project_obj.status == 'active')
            end_label = 'Present' if is_current else latest.strftime('%b %Y')
            date_range = f"{earliest.strftime('%b %Y')} – {end_label}"
        else:
            date_range = None

        header = f"Project: {project_name}"
        if project_obj and project_obj.role:
            header += f"\nRole: {project_obj.role}"
        if date_range:
            header += f"\nDate Range: {date_range}"
        task_lines.append(header)
        for task in group_tasks:
            date_str = str(task.end_date) if task.end_date else 'unknown date'
            line = f"  - {task.title} (completed {date_str})"
            if task.description:
                desc = task.description[:150]
                line += f": {desc}"
            task_lines.append(line)

    sections = []
    if project_overview_lines:
        sections.append("=== PROJECTS ===\n" + '\n'.join(project_overview_lines))
    if task_lines:
        sections.append("=== COMPLETED TASKS ===\n" + '\n'.join(task_lines))

    context = '\n\n'.join(sections)
    return context[:8000]


def analyze_resume(resume_text: str, task_context: str) -> dict:
    openai.api_key = settings.GROQ_API_KEY
    openai.api_base = "https://api.groq.com/openai/v1"

    user_content = f"=== RESUME TEXT ===\n{resume_text}\n\n=== WORK HISTORY ===\n{task_context}"

    response = openai.ChatCompletion.create(
        model="llama-3.3-70b-versatile",
        max_tokens=1500,
        temperature=0.3,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
    )

    raw = response.choices[0].message.content.strip()

    # Strip markdown fences if the model adds them despite instructions
    if raw.startswith('```'):
        lines = raw.split('\n')
        raw = '\n'.join(lines[1:-1] if lines[-1].strip() == '```' else lines[1:])
        logger.warning("Model returned markdown-fenced JSON — stripped fences")

    try:
        result = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"AI returned non-JSON response: {e}") from e

    required_keys = {'score', 'summary', 'suggestions', 'accomplishments', 'bullet_rewrites'}
    missing = required_keys - result.keys()
    if missing:
        raise ValueError(f"AI response missing keys: {missing}")

    return result
