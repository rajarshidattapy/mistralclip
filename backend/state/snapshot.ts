import { clipEndMs } from "./schema";
import type { ProjectState } from "../../shared/types";

export interface TimelineWindow {
  fromMs: number;
  toMs: number;
}

export function summarizeProjectState(project: ProjectState): string {
  const lines: string[] = [];
  lines.push(`duration=${project.durationMs}ms version=${project.metadata.version}`);
  lines.push(`assets=${project.assets.length} tracks=${project.tracks.length}`);
  for (const track of project.tracks) {
    lines.push(`${track.id} [${track.type}] clips=${track.clips.length}`);
    for (const clip of track.clips) {
      const endMs = clipEndMs(clip);
      if (clip.clipType === "media") {
        lines.push(
          `  clip=${clip.id} media asset=${clip.assetId} start=${clip.startMs} end=${endMs} in=${clip.inMs} out=${clip.outMs}`
        );
      } else {
        lines.push(
          `  clip=${clip.id} text="${clip.text}" start=${clip.startMs} end=${endMs} fontSize=${clip.style.fontSize}`
        );
      }
    }
  }
  return lines.join("\n");
}

export function buildTimelineSnapshot(project: ProjectState, window: TimelineWindow): string {
  const lines: string[] = [];
  lines.push(`timeline-window=${window.fromMs}:${window.toMs} duration=${project.durationMs}`);
  for (const track of project.tracks) {
    lines.push(`${track.id} [${track.type}]`);
    const clips = track.clips
      .filter((clip) => clip.startMs < window.toMs && clipEndMs(clip) > window.fromMs)
      .sort((a, b) => a.startMs - b.startMs);
    if (clips.length === 0) {
      lines.push("  (no clips)");
      continue;
    }
    for (const clip of clips) {
      const endMs = clipEndMs(clip);
      const durationMs = clip.outMs - clip.inMs;
      if (clip.clipType === "media") {
        lines.push(
          `  ${clip.id}: media asset=${clip.assetId} start=${clip.startMs} end=${endMs} duration=${durationMs}`
        );
      } else {
        lines.push(
          `  ${clip.id}: text "${clip.text}" start=${clip.startMs} end=${endMs} duration=${durationMs}`
        );
      }
    }
  }
  return lines.join("\n");
}

