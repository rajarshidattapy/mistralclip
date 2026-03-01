Below is a **proper PRD** for that transition.

---

# PRD: Mistral Vibe–Powered Agentic Video Editing Engine

## 1. Problem Statement

The current agentic video editor relies on:

* Direct LLM calls (OpenAI / Anthropic / Ollama)
* In-process planning, code generation, and review loops
* Python-based orchestration with retry-heavy execution

This leads to:

* Fragile LLM interactions
* High retry costs
* Poor agent observability
* Tight coupling between orchestration logic and model providers

**Goal:**
Re-architect the agentic video editor to run on **Mistral Vibe CLI as the agent runtime**, using **Mistral APIs for inference**, while preserving:

* Autonomous end-to-end video editing
* Artifact generation
* Multi-agent reasoning (planner, reviewer, coder)

---

## 2. Goals & Non-Goals

### Goals

* Use **Mistral Vibe CLI** as the primary agent execution environment
* Use **Mistral API key** for all LLM inference
* Decouple orchestration logic from Python LLM wrappers
* Preserve existing CSV → plan → execution workflow
* Maintain artifact logging and replayability

### Non-Goals

* No UI redesign
* No live video editing
* No real-time streaming support (future)
* No replacement of FFmpeg/MoviePy execution engine (yet)

---

## 3. High-Level Architecture

### Before

```
CSV
 ↓
Python Orchestrator
 ↓
LLM Calls (OpenAI/Anthropic/Ollama)
 ↓
Generated Python Code
 ↓
Video Execution
```

### After

```
CSV
 ↓
Mistral Vibe Agent Runtime (CLI)
 ↓
Subagents (Planner / Reviewer / Coder)
 ↓
Python Video Execution Engine
 ↓
Artifacts + Final Video
```

---

## 4. Core Design Principles

1. **Agent Runtime Externalization**

   * Vibe manages context, memory, tools, and subagents
   * Python becomes a tool, not the brain

2. **Single LLM Provider**

   * All inference via Mistral API
   * Configurable models per agent role

3. **Deterministic Tooling**

   * Agents plan and validate
   * Execution remains deterministic Python

4. **Auditability First**

   * Every Vibe interaction stored as an artifact
   * Full reproducibility

---

## 5. Agent Roles (Vibe Subagents)

### 5.1 Planner Agent

**Responsibility**

* Parse validated CSV
* Produce a structured video edit plan

**Input**

* CSV content
* Media metadata (duration, orientation, fps)

**Output**

* `plan.json`

```json
{
  "clips": [...],
  "transitions": [...],
  "effects": [...],
  "audio": [...]
}
```

---

### 5.2 Plan Reviewer Agent

**Responsibility**

* Validate feasibility
* Resolve ambiguities
* Normalize effects/transitions to supported ops

**Output**

* `plan_reviewed.json`
* Review comments (artifact)

---

### 5.3 Code Planner Agent (NEW)

**Responsibility**

* Convert reviewed plan into a **strict execution IR**
* No Python code generation

**Output**

* `execution_ir.json`

```json
{
  "operations": [
    { "type": "trim", "clip": 1, "start": 0, "end": 5 },
    { "type": "fade_in", "duration": 0.3 }
  ]
}
```

---

### 5.4 Code Reviewer Agent

**Responsibility**

* Validate IR completeness
* Detect unsupported operations
* Ensure ordering correctness

---

## 6. Execution Engine (Python Tool)

### Role

* Deterministically execute `execution_ir.json`
* No LLM involvement during execution

### Responsibilities

* FFmpeg/MoviePy invocation
* Error surfacing back to Vibe
* Progress logging

### Error Feedback Loop

* Execution errors are sent back to **Code Reviewer Agent**
* Max retries reduced from 15 → 3

---

## 7. Mistral Vibe Integration

### 7.1 Invocation Model

Python invokes Vibe via CLI:

```bash
vibe run agentic_video_edit.vibe \
  --input artifacts/input_context.json \
  --output artifacts/
```

### 7.2 Vibe Tools Exposed

| Tool Name        | Description            |
| ---------------- | ---------------------- |
| `read_csv`       | Load and parse CSV     |
| `probe_media`    | Extract video metadata |
| `write_artifact` | Persist outputs        |
| `run_executor`   | Execute IR             |

---

## 8. Configuration

### Environment Variables

```env
MISTRAL_API_KEY=xxxx
VIBE_MODEL_PLANNER=devstral
VIBE_MODEL_REVIEWER=devstral
VIBE_MODEL_CODE=devstral
```

### CLI Flags

```bash
python main.py \
  --agent-runtime vibe \
  --artifacts-dir artifacts \
  --output artifacts/output.mp4
```

---

## 9. Artifact Structure (Updated)

```
artifacts/
├── input/
│   └── video_editing_config.csv
├── plans/
│   ├── plan.json
│   └── plan_reviewed.json
├── ir/
│   └── execution_ir.json
├── logs/
│   └── vibe_run.log
├── output_video.mp4
```

---

## 10. Success Metrics

### Technical

* < 3 execution retries per run
* Zero Python codegen from LLMs
* Deterministic re-runs

### Product

* Ability to swap models without code changes
* Clear separation of intent vs execution
* Clean audit trail

---

## 11. Risks & Mitigations

| Risk                 | Mitigation                  |
| -------------------- | --------------------------- |
| Vibe CLI instability | Fallback to legacy LLM path |
| Model hallucination  | Strict IR schema            |
| Slow runs            | Cached planning artifacts   |
| Limited Vibe tooling | Thin Python adapter         |

---

## 12. Future Extensions

* Live event → auto highlight editing
* SDK exposure for third-party platforms
* Agent memory for style reuse
* Streaming input support
* Multi-video batch orchestration

---

