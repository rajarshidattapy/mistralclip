# Product Requirements Document (PRD)

## Product Name (Working)

OpenCut — Agent‑Operated Video Editor (Mistral‑Native)

---

## 1. Problem Statement

Modern video editing tools fall into three broken categories:

1. **Traditional editors** (Premiere, DaVinci)

   * Powerful but slow, manual, and non‑automatable
2. **AI video generators**

   * Non‑deterministic, non‑composable, zero control
3. **AI‑assisted editors**

   * Locked to proprietary models and workflows

There is **no video editor designed as programmable infrastructure** where:

* humans and agents operate the *same* timeline
* edits are deterministic and inspectable
* models are fully swappable

---

## 2. Product Vision

OpenCut is a **model‑agnostic, agent‑native video editor** where:

* Humans edit via a normal timeline UI
* Agents (powered by Mistral or others) operate the editor via strict tools
* Both share a **single authoritative project state**

> Agents do not generate videos. They operate a real editor like a human would.

---

## 3. Goals & Non‑Goals

### Goals

* Allow an LLM to perform real timeline edits
* Maintain deterministic, validated project state
* Enable bring‑your‑own‑model (BYOM)
* Support fast creation of short explainer / demo videos

### Non‑Goals

* Replacing professional editors
* Fully autonomous video generation
* Aesthetic judgment by AI
* Hollywood‑grade editing automation

---

## 4. Target Users

| User             | Primary Need                        |
| ---------------- | ----------------------------------- |
| Engineers / PMs  | Fast demo & explainer creation      |
| Content creators | One‑shot structured editing         |
| Enterprises      | Repeatable internal video workflows |
| Developers       | Reference agent‑native application  |

---

## 5. Core Product Principles

1. **State First** – Project state is the source of truth
2. **Tools, Not Prompts** – Agents act via validated operations
3. **Human Override Always** – Humans can edit anything
4. **Model Agnostic** – No logic tied to Mistral specifically
5. **Deterministic Editing** – No hidden side effects

---

## 6. System Architecture

### High‑Level Components

1. Timeline UI (Frontend)
2. Project State Store
3. Agent Control API (Tool Layer)
4. Mistral Agent Loop
5. Video Rendering Engine

---

## 7. Project Structure

```
opencut/
├── frontend/
│   ├── components/
│   │   ├── Timeline.tsx
│   │   ├── Track.tsx
│   │   ├── Clip.tsx
│   │   └── Inspector.tsx
│   ├── state/
│   │   └── projectStore.ts
│   └── pages/
│       └── editor.tsx
│
├── backend/
│   ├── agent/
│   │   ├── mistralAgent.ts
│   │   ├── systemPrompt.ts
│   │   └── agentLoop.ts
│   ├── tools/
│   │   ├── addClip.ts
│   │   ├── trimClip.ts
│   │   ├── moveClip.ts
│   │   ├── addTextOverlay.ts
│   │   └── queryTimeline.ts
│   ├── state/
│   │   ├── schema.ts
│   │   ├── validator.ts
│   │   └── reducer.ts
│   ├── render/
│   │   └── ffmpeg.ts
│   └── api.ts
│
└── shared/
    ├── types.ts
    └── constants.ts
```

---

## 8. Project State Model (v1)

### Requirements

* Serializable JSON
* Stable IDs
* Diffable
* Validated on every mutation

### Minimal Schema

```
Project
├── assets
├── tracks
│   ├── id
│   ├── type (video/audio/text)
│   └── clips[]
├── duration
└── metadata
```

---

## 9. Agent Control Surface (Tools)

### Mandatory Tools

* `list_tracks`
* `list_assets`
* `query_timeline`
* `add_clip`
* `trim_clip`
* `move_clip`
* `remove_clip`
* `add_text_overlay`

### Tool Design Rules

* One operation per call
* Full validation before apply
* No implicit defaults

---

## 10. Mistral Agent Design

### Role

* Planner + operator
* Never mutates state directly

### System Prompt (Baseline)

```
You are a video editing agent.
You operate a timeline via tools.
The project state is authoritative.
Always inspect state before editing.
Perform one operation at a time.
```

---

## 11. Agent Loop

1. Send summarized project state
2. Expose tool schemas
3. Receive tool call
4. Validate + apply
5. Return updated state
6. Repeat until complete

---

## 12. Timeline Visibility for Agents

Because agents cannot see pixels, the system must provide:

* Timeline summaries
* Clip durations
* Semantic descriptions (optional v2)

This is provided via `query_timeline` and `query_clip_content` tools.

---

## 13. Rendering

### MVP

* Backend rendering using ffmpeg
* Render only after state is finalized

### Non‑Agent Responsibility

* Agents never touch ffmpeg commands

---

## 14. MVP Scope (Phase 1)

* Video track support
* Clip trimming & placement
* Text overlays
* Single‑agent Mistral integration
* Export MP4

---

## 15. Build Phases

### Phase 1 — Core Editor

* Timeline UI
* Manual editing
* Project state store

### Phase 2 — Agent Integration

* Tool layer
* Mistral agent loop
* Query + edit

### Phase 3 — Intelligence

* Semantic clip understanding
* Multi‑step planning
* Error recovery

---

## 16. Risks & Mitigations

| Risk                | Mitigation                   |
| ------------------- | ---------------------------- |
| Agent hallucination | Strict validation + re‑query |
| State corruption    | Reducer‑based updates        |
| Model drift         | Tool‑first design            |
| Over‑automation     | Human‑first UI               |

---

## 17. Success Criteria

* Agent can produce a usable rough cut
* Human edits are never overwritten
* Model swap requires no logic changes
* Timeline state remains valid at all times

---

## 18. Long‑Term Extensions

* Multi‑agent workflows
* Local Mistral models
* Plugin‑based tools
* Collaborative editing

---

## Final Note

This is **not an AI video app**.

It is **agent‑operated creative infrastructure**.

If the state and tools are right, the model is interchangeable.
