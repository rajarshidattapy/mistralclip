import type { Track as TimelineTrack } from "../../shared/types";
import { Clip } from "./Clip";

interface TrackProps {
  track: TimelineTrack;
  projectDurationMs: number;
  selectedClipId: string | null;
  onSelectClip: (trackId: string, clipId: string) => void;
}

export function Track({
  track,
  projectDurationMs,
  selectedClipId,
  onSelectClip
}: TrackProps): JSX.Element {
  return (
    <div className="track">
      <header className="track-header">
        <h3>{track.id}</h3>
        <span>{track.type}</span>
      </header>
      <div className="track-lane">
        {track.clips.map((clip) => (
          <Clip
            key={clip.id}
            clip={clip}
            projectDurationMs={projectDurationMs}
            selected={selectedClipId === clip.id}
            onSelect={() => onSelectClip(track.id, clip.id)}
          />
        ))}
      </div>
    </div>
  );
}

