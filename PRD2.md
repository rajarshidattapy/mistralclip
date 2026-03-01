
## 🔹 Add to **Core Product Principles**

### New Principle

> **Nothing Happens Off-Screen**
> Every agent action must be visible, inspectable, interruptible, and reversible by the user.

**Rationale:**
This principle ensures trust. The agent is not a black box; it is an operator whose actions are fully observable, similar to how a developer watches a CLI or CI pipeline run.

---

## 🔹 New Section: **Agent Console / AI Studio**

### 6.x Agent Console (First-Class UI Surface)

MistralClip includes a **dedicated Agent Console (AI Studio)** as a first-class UI surface.

**Responsibilities:**

* Display all agent-issued commands
* Show command arguments and execution results
* Print validation messages, errors, and confirmations
* Display state diffs after every operation

**User Capabilities:**

* Pause agent execution
* Approve or reject the next step
* Cancel the agent at any time
* Manually intervene in the timeline while the agent is running

**Design Requirement:**
The Agent Console must run **side-by-side with the editor UI**, forming a split-screen experience (Editor + Agent), mirroring the ClaudeClip paradigm.

---

## 🔹 New Section: **CLI / Command Execution Layer**

### Agent Command Interface (CLI-Native)

All agent actions in MistralClip are executed via a **CLI-style command layer**, inspired by Mistral’s CLI-coder (“Vibe”).

**Key Properties:**

* Commands are deterministic and idempotent
* Each command maps 1:1 to a timeline operation
* Commands mutate project state through validated reducers
* Commands print human-readable stdout

**Example Commands:**

```bash
mistralclip inspect timeline
mistralclip import-media assets/intro.mp4
mistralclip add-clip --asset intro.mp4 --start 0 --end 6
mistralclip add-text "Gravity Explained" --from 1 --to 4
```

**Important:**
The same commands are used by:

* the Mistral agent
* power users
* automation / CI pipelines

---

## 🔹 Replace **Agent Control Surface** With This

### Agent Control Surface (Tools + Commands)

Agents do not mutate state directly.

Instead, they:

* issue CLI-style commands
* read stdout and state diffs
* decide the next command

**Mandatory Commands:**

* `inspect_timeline`
* `list_assets`
* `import_media`
* `add_clip`
* `trim_clip`
* `move_clip`
* `remove_clip`
* `add_text_overlay`
* `render_project`

**Command Rules:**

* One command per step
* Full validation before apply
* Explicit clip IDs returned
* State diff printed after execution
* No implicit defaults

---

## 🔹 Replace **Agent Loop** With This (Very Important)

### Agent Execution Loop (Visible & Supervised)

1. Agent inspects the project (`inspect_timeline`)
2. Agent plans the next operation
3. Agent issues a CLI command
4. System validates and applies the change
5. Agent Console prints:

   * command
   * stdout
   * state diff
6. User may approve, pause, or cancel
7. Updated state is returned to the agent
8. Loop continues

This loop continues until:

* the agent declares completion
* or the user interrupts

---

## 🔹 Strengthen **Timeline Visibility for Agents**

### Timeline Visibility Guarantees

After every command, the system must provide:

* Textual timeline snapshot
* Explicit clip IDs and durations
* Clear description of what changed
* State diff (before → after)

This ensures the agent remains grounded without visual access to the canvas.

---

## 🔹 Update **MVP Scope (Phase 1)**

### MVP Must Include

* Split-screen UI (Editor + Agent Console)
* Live agent execution log
* Step-by-step agent execution (no one-shot edits)
* Manual interrupt / cancel controls
* Video track support
* Clip trimming & placement
* Text overlays
* Single-agent Mistral integration
* Export MP4

Without these, MistralClip will not deliver the ClaudeClip-style experience.

---

## 🔹 Add to **Long-Term Extensions**

* Headless CLI-only workflows (CI/CD video builds)
* Multi-agent parallel editing
* Recorded agent edit transcripts (replayable like git history)
* Local Mistral model support
* Plugin-based command extensions

---

# 🧠 Final Reality Check

If someone reads your PRD **after these additions**, they will understand:

> “This is Claude Code — but for video — powered by Mistral.”

Without these sections, they’ll think:

> “AI-assisted video editor.”

This is the difference between a **tool** and **infrastructure**.

---
