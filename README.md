# MistralClip

- FastAPI backend with timeline JSON as source of truth.
- Tool-driven mutations for manual and AI edits.
- Next.js frontend with assets pane, preview, chat, and timeline.
- Export path triggered only by `/export` or `export_project`.

## Repo Layout

```
apps/
backend/
frontend/
shared/
scripts/
README.md
docker-compose.yml
```

## Backend

1. Create/activate a Python environment.
2. Install deps:
   - `pip install -r backend/requirements.txt`
3. Run API:
   - `uvicorn backend.main:app --reload --port 8000`

Core endpoints:
- `GET /health`
- `GET /timeline/{project_id}`
- `POST /timeline/mutate`
- `POST /chat`
- `POST /assets/upload`
- `POST /export`

## Frontend

1. `cd frontend`
2. Install packages:
   - `npm install`
3. Run:
   - `npm run dev`

Set backend URL if needed:
- `NEXT_PUBLIC_API_URL=http://localhost:8000`

## Agent Behavior

- AI does not edit files.
- AI emits tool calls only.
- Tool calls mutate timeline JSON.
- Manual UI edits call the same backend mutate pathway.
- Export rendering is isolated to export execution.

## Notes

- If `ffmpeg` is not installed, export writes a fallback `.export.txt` file with the render command/error.
- Mistral model usage is optional. If `MISTRAL_API_KEY` is set and `langchain-mistralai` is installed, chat can try model planning; otherwise deterministic rule parsing is used.

