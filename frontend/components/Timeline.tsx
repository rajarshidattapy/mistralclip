import type { ProjectState } from "../../shared/types";
import { Track } from "./Track";

interface TimelineProps {
  project: ProjectState;
  selectedClipId: string | null;
  onSelectClip: (trackId: string, clipId: string) => void;
}

export function Timeline({ project, selectedClipId, onSelectClip }: TimelineProps): JSX.Element {
  const durationMs = Math.max(project.durationMs, 1);

  return (
    <section className="timeline-shell">
      <header className="timeline-header">
        <div>
          <h2>Timeline</h2>
          <p>Deterministic state-backed editor timeline</p>
        </div>
        <div className="timeline-stats">
          <span>{project.tracks.length} tracks</span>
          <span>{project.assets.length} assets</span>
          <span>{project.durationMs}ms</span>
        </div>
      </header>

      <div className="timeline-grid">
        {project.tracks.map((track) => (
          <Track
            key={track.id}
            track={track}
            projectDurationMs={durationMs}
            selectedClipId={selectedClipId}
            onSelectClip={onSelectClip}
          />
        ))}
        {project.tracks.length === 0 ? <p className="empty">No tracks yet. Add one from the control panel.</p> : null}
      </div>
    </section>
  );
}

