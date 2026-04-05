import json
import os
from fastapi import HTTPException
from anthropic import AsyncAnthropic

MODEL = "claude-sonnet-4-5"


def _get_client() -> AsyncAnthropic:
    key = os.getenv("ANTHROPIC_KEY")
    if not key:
        raise RuntimeError("ANTHROPIC_KEY is not set in environment")
    return AsyncAnthropic(api_key=key)


def _format_recent(recent_incidents: list[dict]) -> str:
    if not recent_incidents:
        return "None"
    lines = []
    for inc in recent_incidents:
        loc = inc.get("location") or "unknown location"
        priority_label = {1: "High", 2: "Medium", 3: "Low"}.get(inc['priority'], str(inc['priority']))
        lines.append(
            f"- [{inc['created_at']}] {inc['type']} | {loc} | {priority_label}"
        )
    return "\n".join(lines)


async def classify_incident(
    description: str,
    campus_id: int,
    recent_incidents: list[dict],
) -> tuple[dict, str]:
    """
    Returns (classification_dict, raw_response_text).
    Raises HTTPException(422) if Claude returns unparseable JSON.
    """
    recent_str = _format_recent(recent_incidents)

    prompt = f"""You are a campus safety dispatcher assistant. Classify the following incident report.

Recent incidents from the last 48 hours on this campus:
{recent_str}

New incident description: "{description}"

Respond with ONLY a JSON object (no markdown, no explanation) with these exact keys:
{{
  "type": "<one of: medical, noise, security, fire, other>",
  "priority": <integer 1, 2, or 3>,
  "priority_reason": "<one sentence explaining the priority level>",
  "location": "<extracted location string, or null if not mentioned>",
  "people_involved": "<description of people involved, or null if not mentioned>",
  "pattern_flag": "<one sentence if this resembles a cluster in recent incidents, otherwise null>"
}}

Priority scale: 1=High/critical (immediate risk to life/safety), 2=Medium/moderate (requires prompt attention), 3=Low (informational/minor)."""

    message = await _get_client().messages.create(
        model=MODEL,
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )

    raw_text = message.content[0].text.strip()

    try:
        result = json.loads(raw_text)
    except json.JSONDecodeError:
        # Try to extract JSON if Claude wrapped it in anything
        import re
        match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if match:
            try:
                result = json.loads(match.group())
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=422,
                    detail=f"Claude returned unparseable JSON: {raw_text[:200]}"
                )
        else:
            raise HTTPException(
                status_code=422,
                detail=f"Claude returned unparseable JSON: {raw_text[:200]}"
            )

    # Coerce and validate
    valid_types = {"medical", "noise", "security", "fire", "other"}
    if result.get("type") not in valid_types:
        result["type"] = "other"

    priority = result.get("priority")
    if priority not in (1, 2, 3):
        try:
            priority = int(priority)
            result["priority"] = max(1, min(3, priority))
        except (TypeError, ValueError):
            result["priority"] = 2

    if not result.get("priority_reason"):
        result["priority_reason"] = "Classified by AI"

    return result, raw_text
