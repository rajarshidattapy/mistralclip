import type { Clip, ProjectState, TextClip, Track } from "../../shared/types";

export function clipDurationMs(clip: Clip): number {
  return clip.outMs - clip.inMs;
}

export function clipEndMs(clip: Clip): number {
  return clip.startMs + clipDurationMs(clip);
}

export function isTextClip(clip: Clip): clip is TextClip {
  return clip.clipType === "text";
}

export function getTrack(project: ProjectState, trackId: string): Track {
  const track = project.tracks.find((item) => item.id === trackId);
  if (!track) {
    throw new Error(`Track not found: ${trackId}`);
  }
  return track;
}

export function getClip(project: ProjectState, trackId: string, clipId: string): Clip {
  const track = getTrack(project, trackId);
  const clip = track.clips.find((item) => item.id === clipId);
  if (!clip) {
    throw new Error(`Clip not found: ${clipId} on track ${trackId}`);
  }
  return clip;
}

