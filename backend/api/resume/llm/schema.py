GENERATE_BULLETS_JSON_SCHEMA = {
    "name": "generate_resume_bullets",
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "version": {"type": "string"},
            "language": {"type": "string"},
            "results": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "experience_id": {"type": "string"},
                        "role_title": {"type": "string"},
                        "company": {"type": "string"},
                        "bullets": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "additionalProperties": False,
                                "properties": {
                                    "id": {"type": "string"},
                                    "text": {"type": "string"},
                                    "tags": {"type": "array", "items": {"type": "string"}},
                                    "evidence": {"type": "array", "items": {"type": "string"}},
                                    "rationale": {"type": "array", "items": {"type": "string"}},
                                    "risk_flags": {"type": "array", "items": {"type": "string"}},
                                },
                                "required": ["id", "text", "tags", "evidence", "rationale", "risk_flags"],
                            },
                        },
                        "skills_used": {"type": "array", "items": {"type": "string"}},
                        "keywords_used": {"type": "array", "items": {"type": "string"}},
                        "notes": {
                            "type": "object",
                            "additionalProperties": False,
                            "properties": {
                                "assumptions": {"type": "array", "items": {"type": "string"}},
                                "missing_info_questions": {"type": "array", "items": {"type": "string"}},
                            },
                            "required": ["assumptions", "missing_info_questions"],
                        },
                    },
                    "required": ["experience_id", "role_title", "company", "bullets", "skills_used", "keywords_used", "notes"],
                },
            },
            "global_warnings": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["version", "language", "results", "global_warnings"],
    },
    "strict": True,
}
