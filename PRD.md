# PRD — MistralClip (Ultra-Lean but Powerful MVP)

## 0. Design Philosophy (Non-Negotiable)

1. **AI never edits files directly**
2. **AI only calls tools**
3. **Tools mutate timeline JSON**
4. **Timeline JSON is source of truth**
5. **Manual UI actions = same tools**
6. **FFmpeg runs only at export**

If any part violates this → architecture is wrong.

---

## 1. Product Definition

### Product Name

**MistralClip** (working)

### Product Type

AI-orchestrated non-linear video editor (NLE)

### Core Value

Edit real videos faster by letting an AI **operate the editor**, not invent content.

---

## 2. MVP Feature Scope (Hard-Limited)

### INCLUDED

* Upload video/audio/image
* Single video track
* Single audio track
* Single overlay track
* Trim / split / move
* Fade & crossfade transitions
* Text + image overlays
* AI chat → tool calls
* Export MP4

### EXCLUDED (Explicit)

* Video generation
* Audio generation
* Subtitles
* Animations
* Keyframes
* Multiple tracks
* Collaboration

---

## 3. UI Layout (Locked)

```
┌──────────────┬────────────────────────────┬──────────────┐
│ Assets Pane  │        Preview Canvas       │   AI Chat    │
│              │                              │   (Mistral)  │
├──────────────┴────────────────────────────┴──────────────┤
│                         Timeline                             │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Core Data Model (Authoritative)

### Timeline Schema (MVP)

```json
{
  "project_id": "string",
  "duration": 0,
  "tracks": {
    "video": [
      {
        "id": "clip_id",
        "asset_id": "asset_id",
        "start": 0,
        "end": 5,
        "timeline_start": 0
      }
    ],
    "audio": [],
    "overlay": []
  },
  "transitions": []
}
```

**Rules**

* All timestamps in seconds
* No overlaps on video track
* Adjacent clips only for transitions

---

## 5. AI System (LangChain + Mistral)

### Agent Role

A **state-aware tool caller** that edits the timeline.

### Agent Cannot

* Write FFmpeg
* Generate assets
* Modify files
* Guess IDs

---

### Agent Input

Injected on every run:

* Timeline JSON
* Asset list
* Tool schemas
* Constraints

### Agent Output

* **ONLY tool calls**
* Zero free-form edits

---

## 6. Tooling Layer (Critical)

### Tool Design Rules

* Atomic
* Deterministic
* Idempotent
* Undoable
* Typed arguments

---

### Required Tools (MVP)

| Tool              | Purpose                 |
| ----------------- | ----------------------- |
| `add_clip`        | Place asset on timeline |
| `remove_clip`     | Remove clip             |
| `move_clip`       | Reposition clip         |
| `trim_clip`       | Adjust clip length      |
| `split_clip`      | Split clip              |
| `add_transition`  | Fade / crossfade        |
| `add_overlay`     | Text/image overlay      |
| `set_audio_level` | Volume control          |
| `export_project`  | Trigger render          |

---

## 7. Backend Architecture (FastAPI)

### Responsibilities

* Asset upload
* Timeline mutation
* Tool execution
* Agent orchestration
* Export rendering

---

## 8. Frontend Architecture (Next.js)

### Responsibilities

* Timeline UI
* Preview playback
* Asset management
* AI chat UI
* Sync with backend state

---

## 9. EXPORT PIPELINE (FFmpeg)

Triggered only via:

* Export button
* `export_project` tool

Steps:

1. Parse timeline JSON
2. Generate FFmpeg filter graph
3. Render MP4
4. Return file

No AI involvement.

---

# 10. REPO STRUCTURE (THIS IS THE BIG ONE)

This structure is **Codex-friendly**, clean, and scalable.

---

## 📁 Root

```
mistralclip/
├─ apps/
├─ backend/
├─ frontend/
├─ shared/
├─ scripts/
├─ README.md
└─ docker-compose.yml
```

---

## 📁 backend/

```
backend/
├─ main.py                  # FastAPI entry
├─ config.py
├─ requirements.txt
│
├─ api/
│   ├─ routes/
│   │   ├─ assets.py
│   │   ├─ timeline.py
│   │   ├─ chat.py
│   │   └─ export.py
│   └─ deps.py
│
├─ ai/
│   ├─ agent.py              # LangChain agent
│   ├─ prompt.py             # System prompt
│   ├─ tools/
│   │   ├─ add_clip.py
│   │   ├─ trim_clip.py
│   │   ├─ move_clip.py
│   │   ├─ split_clip.py
│   │   ├─ add_transition.py
│   │   ├─ add_overlay.py
│   │   ├─ set_audio_level.py
│   │   └─ export_project.py
│   └─ schemas.py            # Pydantic tool schemas
│
├─ timeline/
│   ├─ model.py              # Timeline data model
│   ├─ validator.py
│   ├─ mutator.py            # Core mutation logic
│   └─ undo.py
│
├─ media/
│   ├─ ffmpeg/
│   │   ├─ builder.py        # Filter graph builder
│   │   └─ render.py
│   └─ storage.py
│
├─ state/
│   ├─ store.py              # In-memory + disk
│   └─ persistence.py
│
└─ utils/
    └─ ids.py
```

---

## 📁 frontend/

```
frontend/
├─ app/
│   ├─ layout.tsx
│   ├─ page.tsx
│
├─ components/
│   ├─ AssetsPane.tsx
│   ├─ PreviewCanvas.tsx
│   ├─ Timeline/
│   │   ├─ Timeline.tsx
│   │   ├─ Clip.tsx
│   │   └─ Track.tsx
│   └─ Chat/
│       ├─ ChatPanel.tsx
│       └─ Message.tsx
│
├─ state/
│   ├─ timelineStore.ts
│   ├─ assetStore.ts
│   └─ chatStore.ts
│
├─ lib/
│   ├─ api.ts
│   └─ sync.ts
│
└─ styles/
```

---

## 📁 shared/

```
shared/
├─ timeline.schema.json
├─ tool.contracts.json
└─ constants.ts
```

Shared schemas ensure **frontend, backend, and AI never drift**.

---

## 📁 scripts/

```
scripts/
├─ dev.sh
├─ export_test.sh
└─ reset_state.sh
```

---

## 11. LangChain Agent Prompt (Codex-Ready)

**System Prompt (Core)**

```
You are an AI video editing agent.

You do NOT generate media.
You do NOT modify files.
You ONLY call tools provided to you.

Rules:
- Use existing asset IDs and clip IDs only
- Never invent IDs
- One goal at a time
- Stop after tools succeed

You are editing a timeline JSON.
```

---

## 12. API CONTRACTS (Minimal)

### POST `/chat`

* Input: user message
* Output: tool execution result + updated timeline

### POST `/timeline/mutate`

* Input: tool call
* Output: updated timeline

### POST `/export`

* Input: project_id
* Output: MP4 URL

---

## 13. MVP SUCCESS TEST (VERY IMPORTANT)

Your MVP is **done** if:

✅ AI can trim, move, and fade clips
✅ Manual edits and AI edits are identical
✅ Exported video matches preview
✅ No hallucinated timeline edits
✅ Repo can be cloned and run locally

---

## Final Blunt Truth

This repo + PRD is:

* **Codex-friendly**
* **One-shot scaffoldable**
* **Hackathon-grade**
* **Startup-extendable**

You are building **infra for AI-driven editors**, not a toy.


