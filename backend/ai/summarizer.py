import os
from anthropic import AsyncAnthropic

MODEL = "claude-sonnet-4-5"


def _get_client() -> AsyncAnthropic:
    key = os.getenv("ANTHROPIC_KEY")
    if not key:
        raise RuntimeError("ANTHROPIC_KEY is not set in environment")
    return AsyncAnthropic(api_key=key)


def _format_incidents(incidents: list[dict]) -> str:
    if not incidents:
        return "No incidents recorded in this period."
    lines = []
    for i, inc in enumerate(incidents, 1):
        loc = inc.get("location") or "unknown location"
        status = inc.get("status", "unknown")
        priority_label = {1: "High", 2: "Medium", 3: "Low"}.get(inc['priority'], str(inc['priority']))
        lines.append(
            f"{i}. [{inc['created_at']}] {priority_label} priority {inc['type'].upper()} "
            f"at {loc} — Status: {status}"
        )
        if inc.get("pattern_flag"):
            lines.append(f"   Note: {inc['pattern_flag']}")
    return "\n".join(lines)


async def generate_digest(incidents: list[dict], hours: int) -> str:
    """
    Returns a plain-English shift digest string.
    """
    incident_list = _format_incidents(incidents)
    count = len(incidents)

    prompt = f"""You are a campus safety supervisor reviewing the last {hours} hours of incident activity.

Incidents ({count} total):
{incident_list}

Write a concise shift digest for handoff to the next supervisor. Include:
1. **Top concerns** — any High priority incidents or unresolved urgent situations
2. **Patterns** — any clusters by location, type, or time
3. **Current status** — what is still open vs. resolved
4. **Handoff notes** — anything the incoming team should watch

Keep it under 300 words. Use plain paragraphs, no bullet points. Write as if briefing a colleague."""

    message = await _get_client().messages.create(
        model=MODEL,
        max_tokens=600,
        messages=[{"role": "user", "content": prompt}],
    )

    return message.content[0].text.strip()
