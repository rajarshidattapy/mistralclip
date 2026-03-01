# MistralClip

Agent-operated video editing infrastructure with:
- Deterministic project state
- Reducer-based validated mutations
- CLI-style command execution
- Supervised step-by-step agent sessions
- Split-screen UI (Editor + Agent Console)
- ffmpeg rendering (dry-run or execute)

This repo currently implements the PRD goals from `PRD.md` and `PRD2.md`.

## 1. What This App Is

MistralClip is not a "generate a video from prompt" app.  
It is a real editing system where both humans and agents operate the same authoritative timeline state.

Core behavior:
- Every mutation is explicit and validated.
- Agents do not mutate state directly.
- Agents issue commands and receive stdout + state diffs.
- Agent actions are visible, interruptible, and reversible by user control flow.

## 2. Current Architecture

Top-level directories:
- `frontend/`: split-screen editor UI and Agent Console
- `backend/`: API, command execution, agent session logic, renderer
- `shared/`: shared types/constants for frontend/backend

Key backend modules:
- `backend/state/reducer.ts`: reducer-based project updates
- `backend/state/validator.ts`: strict state validation
- `backend/state/diff.ts`: before/after state diff generation
- `backend/commands/index.ts`: CLI-native command registry + parser + executor
- `backend/agent/sessionManager.ts`: supervised session state machine
- `backend/agent/mistralCommandAgent.ts`: command planner agent (Mistral + fallback)
- `backend/render/ffmpeg.ts`: ffmpeg command creation and execution
- `backend/api.ts`: HTTP API surface

Key frontend modules:
- `frontend/pages/editor.tsx`: main app page
- `frontend/components/Timeline.tsx`: timeline visualization
- `frontend/components/Inspector.tsx`: manual clip controls
- `frontend/components/AgentConsole.tsx`: supervised agent console
- `frontend/state/projectStore.ts`: client state + API actions

## 3. Feature Overview

### 3.1 Tool Layer (legacy/internal)
- `list_tracks`
- `list_assets`
- `query_timeline`
- `query_clip_content`
- `add_clip`
- `trim_clip`
- `move_clip`
- `remove_clip`
- `add_text_overlay`

### 3.2 Command Layer (primary)
- `inspect_timeline`
- `list_assets`
- `import_media`
- `add_clip`
- `trim_clip`
- `move_clip`
- `remove_clip`
- `add_text_overlay`
- `render_project`

Command execution guarantees:
- One operation per call
- Full validation before apply
- Explicit IDs
- Human-readable stdout
- State diff on every step
- No implicit defaults

### 3.3 Supervised Agent Sessions
- Start a session with a goal
- Plan next command (`next`)
- Approve or reject pending command
- Pause, resume, or cancel anytime
- Full event log in Agent Console

## 4. Requirements

Required:
- Node.js 20+ (project tested with Node 22)
- npm

Optional:
- ffmpeg on PATH (or pass custom `ffmpegPath`)
- Mistral API key for live command planning

## 5. Setup

Install dependencies:

```bash
npm install
```

Environment variables (optional):

```bash
PORT=8787
MISTRAL_API_KEY=your_key_here
MISTRAL_MODEL=mistral-large-latest
MISTRAL_BASE_URL=https://api.mistral.ai/v1
```

## 6. Run the App

Run frontend + backend:

```bash
npm run dev
```

Default URLs:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8787`

Run backend only:

```bash
npm run start
```

## 7. How to Use the UI (End-to-End)

### 7.1 Create baseline project
1. Open the app.
2. Add tracks:
   - Add at least one `video` track.
   - Add one `text` track if you want overlays.
3. Add an asset:
   - type: `video`
   - path: local video path
   - durationMs: full source duration

### 7.2 Build a timeline manually
1. Add media clip with explicit:
   - `trackId`
   - `clipId`
   - `assetId`
   - `startMs`, `inMs`, `outMs`
2. Select clip on timeline.
3. Use Inspector to:
   - move clip (`startMs`)
   - trim clip (`inMs`, `outMs`)
   - remove clip

### 7.3 Add text overlays
1. Ensure text track exists.
2. Add text overlay with explicit style and timing.
3. Verify in timeline and Inspector.

### 7.4 Use Agent Console (supervised mode)
1. Enter session goal and click **Start session**.
2. Click **Plan next step**.
3. Review pending CLI command + args.
4. Either:
   - **Approve step** (command executes)
   - **Reject pending step**
5. Repeat step-by-step.
6. Pause/resume/cancel anytime.

### 7.5 Run manual CLI-style commands from UI
Use Command Runner in Agent Console, for example:

```bash
mistralclip list-assets
mistralclip inspect timeline --from 0 --to 12000
```

You get:
- stdout
- state diff
- project state update

### 7.6 Render
1. Choose output path.
2. Dry-run first (unchecked execute) to inspect command.
3. Enable execute for actual ffmpeg render.

## 8. HTTP API

Health and project:
- `GET /health`
- `GET /api/project`
- `POST /api/project/reset`

Manual timeline operations:
- `POST /api/assets`
- `POST /api/tracks`
- `GET /api/tools`
- `POST /api/tools/:toolName`

Command layer:
- `GET /api/commands`
- `POST /api/commands/execute`
- `POST /api/commands/execute-line`

Supervised agent sessions:
- `GET /api/agent/sessions`
- `POST /api/agent/sessions`
- `GET /api/agent/sessions/:sessionId`
- `POST /api/agent/sessions/:sessionId/next`
- `POST /api/agent/sessions/:sessionId/approve`
- `POST /api/agent/sessions/:sessionId/reject`
- `POST /api/agent/sessions/:sessionId/pause`
- `POST /api/agent/sessions/:sessionId/resume`
- `POST /api/agent/sessions/:sessionId/cancel`

Legacy one-shot agent loop:
- `POST /api/agent/run`

Rendering:
- `POST /api/render`

## 9. CLI Usage (Headless / CI)

Use the CLI wrapper to mutate a JSON state file:

```bash
npm run cli -- --state ./project.json mistralclip list-assets
npm run cli -- --state ./project.json mistralclip import-media --id intro --type video --name "Intro" --path "./assets/intro.mp4" --durationMs 12000
npm run cli -- --state ./project.json mistralclip add-clip --track-id video_main --clip-id clip_intro --asset-id intro --start 0 --in 0 --out 5000
```

CLI output includes:
- command name
- stdout
- diff summary
- structured output JSON

## 10. Validation and Testing

Typecheck:

```bash
npm run lint
```

Tests:

```bash
npm run test
```

Note:
- In restricted sandboxes, `tsx` can fail with `spawn EPERM`.  
  In normal local environments, tests should execute.

## 11. Troubleshooting

### Backend does not start
- Confirm Node/npm versions.
- Run `npm install` again.
- Run `npm run lint` to catch TS errors.

### Agent keeps stopping after inspect
- Without `MISTRAL_API_KEY`, fallback agent performs safe minimal behavior.
- Set API key to enable model-driven command planning.

### Render fails
- Ensure ffmpeg is installed and executable.
- Validate asset paths are real and accessible.
- Run dry-run first to inspect generated command.

### Command rejected by validator
- Check explicit IDs and timing ranges.
- Confirm no overlaps on same track.
- Confirm clip source bounds are within asset duration.

## 12. Design Constraints and Guarantees

- State-first architecture
- Deterministic edits
- Human override always
- Model-agnostic integrations
- No off-screen agent behavior

If you need a quick "first successful run" walkthrough, see `analyze.md`.
