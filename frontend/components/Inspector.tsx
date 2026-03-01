import { useMemo, useState } from "react";
import type { Clip, ProjectState } from "../../shared/types";
import { projectStore } from "../state/projectStore";

interface InspectorProps {
  project: ProjectState;
  selectedTrackId: string | null;
  selectedClipId: string | null;
}

function findClip(project: ProjectState, trackId: string | null, clipId: string | null): Clip | null {
  if (!trackId || !clipId) {
    return null;
  }
  const track = project.tracks.find((item) => item.id === trackId);
  if (!track) {
    return null;
  }
  return track.clips.find((clip) => clip.id === clipId) ?? null;
}

export function Inspector({ project, selectedTrackId, selectedClipId }: InspectorProps): JSX.Element {
  const clip = useMemo(() => findClip(project, selectedTrackId, selectedClipId), [project, selectedTrackId, selectedClipId]);
  const [moveStartMs, setMoveStartMs] = useState("0");
  const [trimInMs, setTrimInMs] = useState("0");
  const [trimOutMs, setTrimOutMs] = useState("0");

  async function runMove(): Promise<void> {
    if (!clip || !selectedTrackId) {
      return;
    }
    await projectStore.runTool("move_clip", {
      trackId: selectedTrackId,
      clipId: clip.id,
      startMs: Number(moveStartMs)
    });
  }

  async function runTrim(): Promise<void> {
    if (!clip || !selectedTrackId) {
      return;
    }
    await projectStore.runTool("trim_clip", {
      trackId: selectedTrackId,
      clipId: clip.id,
      inMs: Number(trimInMs),
      outMs: Number(trimOutMs)
    });
  }

  async function runRemove(): Promise<void> {
    if (!clip || !selectedTrackId) {
      return;
    }
    await projectStore.runTool("remove_clip", {
      trackId: selectedTrackId,
      clipId: clip.id
    });
    projectStore.clearSelection();
  }

  if (!clip || !selectedTrackId) {
    return (
      <aside className="inspector">
        <h2>Inspector</h2>
        <p>Select a clip to inspect and edit.</p>
      </aside>
    );
  }

  const duration = clip.outMs - clip.inMs;

  return (
    <aside className="inspector">
      <h2>Inspector</h2>
      <div className="panel">
        <h3>{clip.id}</h3>
        <p>Type: {clip.clipType}</p>
        <p>Track: {selectedTrackId}</p>
        <p>Start: {clip.startMs}ms</p>
        <p>In/Out: {clip.inMs}ms / {clip.outMs}ms</p>
        <p>Duration: {duration}ms</p>
      </div>

      <div className="panel form-panel">
        <h3>Move Clip</h3>
        <label>
          New start (ms)
          <input value={moveStartMs} onChange={(event) => setMoveStartMs(event.target.value)} />
        </label>
        <button onClick={() => void runMove()}>Apply move</button>
      </div>

      <div className="panel form-panel">
        <h3>Trim Clip</h3>
        <label>
          New in (ms)
          <input value={trimInMs} onChange={(event) => setTrimInMs(event.target.value)} />
        </label>
        <label>
          New out (ms)
          <input value={trimOutMs} onChange={(event) => setTrimOutMs(event.target.value)} />
        </label>
        <button onClick={() => void runTrim()}>Apply trim</button>
      </div>

      <button className="danger" onClick={() => void runRemove()}>
        Remove clip
      </button>
    </aside>
  );
}

