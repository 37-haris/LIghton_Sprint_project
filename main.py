import json
import re
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from model import SprintRequest
from lighton_api import chat_completion, list_models, LIGHTON_BASE_URL, LIGHTON_MODEL

app = FastAPI(title="Sprint Generator – LightOn Paradigm")

# ── Serve the single-page frontend ──────────────────────────────────────────
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root():
    return FileResponse("static/index.html")


# ── Prompt builders ──────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert Agile project manager and software architect.
Your job is to generate realistic, detailed sprint plans with smart task distribution
across a development team, taking into account each member's role and seniority level.
Always respond with pure JSON only — no markdown fences, no extra text."""


def build_sprint_prompt(req: SprintRequest) -> str:
    team_lines = "\n".join(
        f"  - {m.name} ({m.seniority} {m.role})" for m in req.team
    )
    return f"""
You must generate a full agile sprint plan for the following project.

PROJECT NAME: {req.project_name}
DESCRIPTION: {req.project_description}
TECH STACK: {req.tech_stack or "Not specified"}
SPRINT DURATION: {req.sprint_duration_weeks} week(s) each
NUMBER OF SPRINTS: {req.sprint_count}

TEAM ({len(req.team)} members):
{team_lines}

Return a JSON object with this exact structure:
{{
  "project_name": "string",
  "summary": "2–3 sentence project overview",
  "total_weeks": number,
  "sprints": [
    {{
      "sprint_number": 1,
      "goal": "Sprint goal in one sentence",
      "start_week": 1,
      "end_week": 2,
      "tasks": [
        {{
          "id": "T-001",
          "title": "Task title",
          "description": "Brief description",
          "assignee": "Team member name",
          "role_required": "role",
          "story_points": number (1-13 fibonacci),
          "priority": "High|Medium|Low",
          "type": "Feature|Bug|Infra|Research|Testing|Design"
        }}
      ],
      "team_workload": {{
        "<member name>": {{
          "tasks_count": number,
          "story_points": number,
          "focus": "main focus area for this sprint"
        }}
      }}
    }}
  ],
  "recommendations": ["tip 1", "tip 2", "tip 3"]
}}

Rules:
- Distribute tasks fairly based on seniority (seniors get complex tasks, juniors get scoped tasks).
- Each sprint must have at least {len(req.team) + 2} tasks.
- Story points must be fibonacci: 1, 2, 3, 5, 8, or 13.
- No member should exceed ~40 story points per 2-week sprint.
- Make tasks specific and actionable, not generic.
"""


# ── API endpoints ────────────────────────────────────────────────────────────

@app.post("/api/generate-sprints")
async def generate_sprints(req: SprintRequest):
    try:
        raw = await chat_completion(
            prompt=build_sprint_prompt(req),
            system=SYSTEM_PROMPT,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LightOn API error: {str(e)}")

    # Strip potential accidental markdown fences
    cleaned = re.sub(r"^```json\s*|```$", "", raw.strip(), flags=re.MULTILINE).strip()

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Model returned invalid JSON: {str(e)}\n\nRaw output:\n{raw[:500]}",
        )

    return data


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "base_url": LIGHTON_BASE_URL,
        "model": LIGHTON_MODEL,
    }

@app.get("/api/models")
async def get_models():
    """List all models available on your Paradigm instance."""
    try:
        models = await list_models()
        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))