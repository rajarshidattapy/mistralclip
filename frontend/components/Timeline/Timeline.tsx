"use client";

import { FormEvent, useState } from "react";

import { Clip } from "@/components/Timeline/Clip";
import { Track } from "@/components/Timeline/Track";
import { useTimelineStore } from "@/state/timelineStore";

export function Timeline() {
  const { timeline, loading, error, mutate, undo, runExport, exportResult } = useTimelineStore();
  const [clipId, setClipId] = useState("");
  const [trimEnd, setTrimEnd] = useState("3");
  const [moveTo, setMoveTo] = useState("0");
  const [fromClip, setFromClip] = useState("");
  const [toClip, setToClip] = useState("");
  const [fadeDuration, setFadeDuration] = useState("0.5");

  const runTrim = async (event: FormEvent) => {
    event.preventDefault();
    if (!clipId) {
      return;
    }
    await mutate("trim_clip", { clip_id: clipId, end: Number(trimEnd) });
  };

  const runMove = async (event: FormEvent) => {
    event.preventDefault();
    if (!clipId) {
      return;
    }
    await mutate("move_clip", { clip_id: clipId, timeline_start: Number(moveTo) });
  };

  const runFade = async (event: FormEvent) => {
    event.preventDefault();
    if (!fromClip || !toClip) {
      return;
    }
    await mutate("add_transition", {
      type: "fade",
      from_clip_id: fromClip,
      to_clip_id: toClip,
      duration: Number(fadeDuration)
    });
  };

  return (
    <div className="stack">
      <h2>Timeline</h2>

      <Track title="Video">
        {(timeline?.tracks.video ?? []).map((clip) => (
          <Clip
            key={clip.id}
            id={clip.id}
            start={clip.start}
            end={clip.end}
            timelineStart={clip.timeline_start}
          />
        ))}
      </Track>

      <Track title="Audio">
        {(timeline?.tracks.audio ?? []).map((clip) => (
          <Clip
            key={clip.id}
            id={clip.id}
            start={clip.start}
            end={clip.end}
            timelineStart={clip.timeline_start}
          />
        ))}
      </Track>

      <Track title="Overlay">
        {(timeline?.tracks.overlay ?? []).map((clip) => (
          <Clip
            key={clip.id}
            id={clip.id}
            start={clip.start}
            end={clip.end}
            timelineStart={clip.timeline_start}
          />
        ))}
      </Track>

      <div className="row">
        <button onClick={() => void undo()} disabled={loading}>
          Undo
        </button>
        <button onClick={() => void runExport()} disabled={loading}>
          Export MP4
        </button>
        {exportResult ? (
          <span className={exportResult.success ? "ok" : "error"}>{exportResult.message}</span>
        ) : null}
      </div>
      {exportResult?.url ? <p className="mono">{exportResult.url}</p> : null}

      <div className="row">
        <input
          placeholder="clip_id"
          value={clipId}
          onChange={(event) => setClipId(event.target.value)}
        />
      </div>

      <div className="row">
        <form className="row" onSubmit={runTrim}>
          <input
            placeholder="trim end"
            value={trimEnd}
            onChange={(event) => setTrimEnd(event.target.value)}
          />
          <button type="submit" disabled={loading}>
            Trim
          </button>
        </form>

        <form className="row" onSubmit={runMove}>
          <input
            placeholder="move to"
            value={moveTo}
            onChange={(event) => setMoveTo(event.target.value)}
          />
          <button type="submit" disabled={loading}>
            Move
          </button>
        </form>
      </div>

      <form className="row" onSubmit={runFade}>
        <input
          placeholder="from clip id"
          value={fromClip}
          onChange={(event) => setFromClip(event.target.value)}
        />
        <input
          placeholder="to clip id"
          value={toClip}
          onChange={(event) => setToClip(event.target.value)}
        />
        <input
          placeholder="duration"
          value={fadeDuration}
          onChange={(event) => setFadeDuration(event.target.value)}
        />
        <button type="submit" disabled={loading}>
          Add Fade
        </button>
      </form>

      {timeline ? <p className="muted">Transitions: {timeline.transitions.length}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}

