import type { Asset, Clip, ProjectState, TextClip, Track, TrackType } from "../../shared/types";
import { assertClipWithinBounds, assertTrackType, assertValidProject } from "./validator";
import { clipEndMs, getTrack } from "./schema";

export type ProjectAction =
  | { type: "add_asset"; payload: { asset: Asset } }
  | { type: "add_track"; payload: { track: Track } }
  | { type: "add_clip"; payload: { trackId: string; clip: Clip } }
  | { type: "trim_clip"; payload: { trackId: string; clipId: string; inMs: number; outMs: number } }
  | { type: "move_clip"; payload: { trackId: string; clipId: string; startMs: number } }
  | { type: "remove_clip"; payload: { trackId: string; clipId: string } }
  | { type: "add_text_overlay"; payload: { trackId: string; clip: TextClip } };

function computeDuration(project: ProjectState): number {
  let maxEnd = 0;
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      maxEnd = Math.max(maxEnd, clipEndMs(clip));
    }
  }
  return maxEnd;
}

function touchMetadata(project: ProjectState): ProjectState {
  return {
    ...project,
    durationMs: computeDuration(project),
    metadata: {
      ...project.metadata,
      updatedAt: new Date().toISOString(),
      version: project.metadata.version + 1
    }
  };
}

function cloneProject(project: ProjectState): ProjectState {
  return {
    ...project,
    assets: project.assets.map((asset) => ({ ...asset })),
    tracks: project.tracks.map((track) => ({
      ...track,
      clips: track.clips.map((clip) => ({ ...clip }))
    })),
    metadata: { ...project.metadata }
  };
}

function ensureTrackExists(project: ProjectState, trackId: string): Track {
  return getTrack(project, trackId);
}

function ensureTrackType(trackType: TrackType, clip: Clip): void {
  if (clip.clipType === "media" && trackType === "text") {
    throw new Error("Media clips cannot be placed on text tracks");
  }
  if (clip.clipType === "text" && trackType !== "text") {
    throw new Error("Text clips can only be placed on text tracks");
  }
}

export function applyProjectAction(project: ProjectState, action: ProjectAction): ProjectState {
  const draft = cloneProject(project);

  switch (action.type) {
    case "add_asset": {
      const { asset } = action.payload;
      if (draft.assets.some((candidate) => candidate.id === asset.id)) {
        throw new Error(`Asset already exists: ${asset.id}`);
      }
      draft.assets.push(asset);
      break;
    }
    case "add_track": {
      const { track } = action.payload;
      if (draft.tracks.some((candidate) => candidate.id === track.id)) {
        throw new Error(`Track already exists: ${track.id}`);
      }
      draft.tracks.push({ ...track, clips: [...track.clips] });
      break;
    }
    case "add_clip": {
      const { trackId, clip } = action.payload;
      const track = ensureTrackExists(draft, trackId);
      ensureTrackType(track.type, clip);
      if (draft.tracks.some((candidate) => candidate.clips.some((item) => item.id === clip.id))) {
        throw new Error(`Clip already exists: ${clip.id}`);
      }
      assertClipWithinBounds(clip);
      track.clips.push(clip);
      break;
    }
    case "trim_clip": {
      const { trackId, clipId, inMs, outMs } = action.payload;
      const track = ensureTrackExists(draft, trackId);
      const clip = track.clips.find((candidate) => candidate.id === clipId);
      if (!clip) {
        throw new Error(`Clip not found: ${clipId}`);
      }
      clip.inMs = inMs;
      clip.outMs = outMs;
      assertClipWithinBounds(clip);
      break;
    }
    case "move_clip": {
      const { trackId, clipId, startMs } = action.payload;
      const track = ensureTrackExists(draft, trackId);
      const clip = track.clips.find((candidate) => candidate.id === clipId);
      if (!clip) {
        throw new Error(`Clip not found: ${clipId}`);
      }
      clip.startMs = startMs;
      assertClipWithinBounds(clip);
      break;
    }
    case "remove_clip": {
      const { trackId, clipId } = action.payload;
      const track = ensureTrackExists(draft, trackId);
      const before = track.clips.length;
      track.clips = track.clips.filter((candidate) => candidate.id !== clipId);
      if (track.clips.length === before) {
        throw new Error(`Clip not found: ${clipId}`);
      }
      break;
    }
    case "add_text_overlay": {
      const { trackId, clip } = action.payload;
      assertTrackType(draft, trackId, "text");
      const track = ensureTrackExists(draft, trackId);
      if (draft.tracks.some((candidate) => candidate.clips.some((item) => item.id === clip.id))) {
        throw new Error(`Clip already exists: ${clip.id}`);
      }
      assertClipWithinBounds(clip);
      track.clips.push(clip);
      break;
    }
    default: {
      const exhaustive: never = action;
      throw new Error(`Unsupported action: ${JSON.stringify(exhaustive)}`);
    }
  }

  const touched = touchMetadata(draft);
  assertValidProject(touched);
  return touched;
}

