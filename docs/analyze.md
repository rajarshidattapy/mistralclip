# MistralClip Usage Analysis and Step-by-Step Guide

This document explains exactly how to operate the current app from zero to exported output, including:
- UI workflow
- Supervised agent workflow
- CLI workflow
- API workflow
- Common failure points and fixes

## 1. Mental Model

Treat the system as a state machine, not a canvas-only editor.

You are editing `ProjectState` through validated operations:
- Manual UI controls
- CLI-style commands
- Agent-planned commands (with approval)

A successful workflow always follows this rhythm:
1. Inspect state
2. Apply one explicit operation
3. Review stdout and diff
4. Repeat

## 2. Fast Start (5-10 minutes)

### Step 1: Install and run

```bash
npm install
npm run dev
```

Open:
- `http://localhost:5173`

### Step 2: Create minimal timeline
1. Add a `video` track.
2. Add a `text` track.
3. Add one video asset with valid path and duration.
4. Add a media clip to the video track.
5. Add a text overlay to the text track.

### Step 3: Inspect and adjust
1. Click clip on timeline.
2. Move clip in Inspector.
3. Trim clip in Inspector.
4. Verify timeline updates.

### Step 4: Render dry-run
1. In Render panel, set output path.
2. Keep execute unchecked.
3. Click Render and inspect returned ffmpeg command.

### Step 5: Render real output
1. Check execute.
2. Render again.
3. Verify exported MP4 path.

## 3. Recommended Operator Sequence (Production-like)

For reliable outputs, use this sequence:
1. Import all assets first (`import_media`).
2. Build rough cut with `add_clip`.
3. Resolve timing with `trim_clip` and `move_clip`.
4. Add overlays (`add_text_overlay`).
5. Re-inspect timeline (`inspect_timeline`).
6. Render dry-run.
7. Render execute.

Why this works:
- Keeps state evolution linear and reviewable.
- Avoids hidden assumptions.
- Makes diffs small and understandable.

## 4. Supervised Agent Flow (What to Click)

In Agent Console:

1. Enter goal and click **Start session**.
2. Click **Plan next step**.
3. Read pending command:
   - command text
   - args
   - rationale
4. Decision point:
   - Approve if valid
   - Reject if unsafe/incorrect
5. Review execution log:
   - stdout
   - diff summary
   - detailed diff payload
6. Continue with next step until complete.

Interrupt controls:
- Pause: temporary stop
- Resume: continue planning
- Cancel: terminate active session

Important:
- Session requires `inspect_timeline` before mutation commands.
- This keeps the agent grounded when it cannot see pixels.

## 5. Manual CLI Command Runner (Inside UI)

In Agent Console Command Runner, use CLI-style text:

```bash
mistralclip list-assets
mistralclip inspect timeline --from 0 --to 12000
```

Practical mutation examples:

```bash
mistralclip import-media --id intro --type video --name "Intro" --path "./assets/intro.mp4" --durationMs 12000
mistralclip add-clip --track-id video_main --clip-id clip_intro --asset-id intro --start 0 --in 0 --out 5000
mistralclip add-text-overlay --track-id text_main --clip-id text_title --text "Gravity Explained" --start 1000 --duration 3000 --x 120 --y 100 --font-size 56 --color white
```

Expected output after each command:
- Human-readable stdout
- Diff summary (and detail in logs)

## 6. Headless CLI Workflow (Terminal)

Use a persistent project JSON file:

```bash
npm run cli -- --state ./project.json mistralclip list-assets
npm run cli -- --state ./project.json mistralclip inspect timeline --from 0 --to 15000
```

Build project state through sequential commands:

```bash
npm run cli -- --state ./project.json mistralclip import-media --id intro --type video --name "Intro" --path "./assets/intro.mp4" --durationMs 12000
npm run cli -- --state ./project.json mistralclip add-clip --track-id video_main --clip-id clip_intro --asset-id intro --start 0 --in 0 --out 5000
npm run cli -- --state ./project.json mistralclip move-clip --track-id video_main --clip-id clip_intro --start 500
npm run cli -- --state ./project.json mistralclip trim-clip --track-id video_main --clip-id clip_intro --in 0 --out 4500
```

Render dry-run:

```bash
npm run cli -- --state ./project.json mistralclip render-project --output "./out/demo.mp4" --execute false
```

Render execute:

```bash
npm run cli -- --state ./project.json mistralclip render-project --output "./out/demo.mp4" --execute true
```

## 7. API Workflow (Automation)

Minimal automation sequence:
1. `POST /api/tracks` (video + text)
2. `POST /api/commands/execute` with `import_media`
3. `POST /api/commands/execute` with `add_clip`
4. `POST /api/commands/execute` with `add_text_overlay`
5. `POST /api/commands/execute` with `render_project`

Session automation sequence:
1. `POST /api/agent/sessions` with goal
2. Loop:
   - `POST /api/agent/sessions/:id/next`
   - inspect pending command
   - `approve` or `reject`
3. Optional `pause`, `resume`, `cancel`

## 8. What "Good" Looks Like During Operation

Healthy run indicators:
- Diff summaries are small and expected.
- Clip IDs remain stable.
- Timeline duration changes only when expected.
- No overlapping clip validation errors on same track.
- Agent steps are approved intentionally, not blindly.

Unhealthy indicators:
- Frequent rejected commands for basic operations.
- Agent attempts mutations before inspection.
- Large unexpected diffs.
- Inconsistent IDs or mismatched track references.

## 9. Common Errors and Exact Fixes

### Error: Unknown track/asset/clip
Fix:
- Verify IDs exactly.
- Use inspect/list commands before mutating.

### Error: Clip overlaps on track
Fix:
- Move or trim clip to remove overlap.
- Re-run inspect after changes.

### Error: outMs exceeds asset duration
Fix:
- Clamp clip out to source asset length.

### Error: render failure
Fix:
- Confirm ffmpeg installation.
- Validate asset paths.
- Use dry-run command output for debugging.

### Error: agent appears "stuck"
Fix:
- Check session status (`paused`, `awaiting_approval`, `cancelled`).
- Approve/reject pending step explicitly.
- Resume if paused.

## 10. Suggested Team Operating Policy

If multiple people use the app:
1. Require dry-run render before execute.
2. Require command diff review for agent steps.
3. Keep stable naming conventions:
   - `asset_*`, `track_*`, `clip_*`
4. Prefer command runner/CLI for reproducible edits.
5. Store final project JSON as artifact for audit and replay.

## 11. Quick Checklist Before Export

- Tracks configured correctly
- Assets imported and valid paths
- No validation errors
- Timeline inspected in target range
- Text overlays checked
- Dry-run render command reviewed
- Final execute render completed
