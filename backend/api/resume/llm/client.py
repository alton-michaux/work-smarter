import os
from openai import OpenAI
from .schema import GENERATE_BULLETS_JSON_SCHEMA

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

def generate_bullets_llm(*, model: str, messages: list[dict]) -> dict:
    # Using Chat Completions with response_format json_schema is supported. :contentReference[oaicite:3]{index=3}
    resp = client.chat.completions.create(
        model=model,
        messages=messages,
        response_format={"type": "json_schema", "json_schema": GENERATE_BULLETS_JSON_SCHEMA},
        temperature=0.3,
    )

    # The model output is JSON text; parse it:
    content = resp.choices[0].message.content
    # content should be a JSON string; parse safely:
    import json
    return json.loads(content)
