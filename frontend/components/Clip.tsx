import type { Clip as TimelineClip } from "../../shared/types";

interface ClipProps {
  clip: TimelineClip;
  projectDurationMs: number;
  selected: boolean;
  onSelect: () => void;
}

function clipLabel(clip: TimelineClip): string {
  if (clip.clipType === "media") {
    return `Media: ${clip.assetId}`;
  }
  return `Text: ${clip.text}`;
}

export function Clip({ clip, projectDurationMs, selected, onSelect }: ClipProps): JSX.Element {
  const durationMs = clip.outMs - clip.inMs;
  const left = projectDurationMs <= 0 ? 0 : (clip.startMs / projectDurationMs) * 100;
  const width = projectDurationMs <= 0 ? 100 : Math.max((durationMs / projectDurationMs) * 100, 3);

  return (
    <button
      className={`clip ${selected ? "clip-selected" : ""} ${clip.clipType === "text" ? "clip-text" : "clip-media"}`}
      style={{ left: `${left}%`, width: `${width}%` }}
      onClick={onSelect}
      title={`${clipLabel(clip)} (${durationMs}ms)`}
    >
      <span className="clip-title">{clipLabel(clip)}</span>
      <span className="clip-meta">{durationMs}ms</span>
    </button>
  );
}

