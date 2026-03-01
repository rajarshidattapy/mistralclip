import type { Clip, ProjectState, ValidationError } from "../../shared/types";
import { clipDurationMs, clipEndMs, getTrack, isTextClip } from "./schema";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function overlaps(a: Clip, b: Clip): boolean {
  const aStart = a.startMs;
  const aEnd = clipEndMs(a);
  const bStart = b.startMs;
  const bEnd = clipEndMs(b);
  return aStart < bEnd && bStart < aEnd;
}

export function validateProject(project: ProjectState): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!isObject(project)) {
    errors.push({ path: "project", message: "Project must be an object" });
    return errors;
  }

  const assetIds = new Set<string>();
  for (const asset of project.assets) {
    if (!asset.id) {
      errors.push({ path: "assets.id", message: "Asset id is required" });
    }
    if (assetIds.has(asset.id)) {
      errors.push({ path: `assets.${asset.id}`, message: "Duplicate asset id" });
    }
    assetIds.add(asset.id);
    if (asset.durationMs <= 0) {
      errors.push({
        path: `assets.${asset.id}.durationMs`,
        message: "Asset duration must be greater than zero"
      });
    }
    if (!asset.path) {
      errors.push({ path: `assets.${asset.id}.path`, message: "Asset path is required" });
    }
  }

  const trackIds = new Set<string>();
  const clipIds = new Set<string>();
  let computedDuration = 0;

  for (const track of project.tracks) {
    if (trackIds.has(track.id)) {
      errors.push({ path: `tracks.${track.id}`, message: "Duplicate track id" });
    }
    trackIds.add(track.id);

    const sorted = [...track.clips].sort((a, b) => a.startMs - b.startMs);
    let previousClip: Clip | null = null;
    for (const clip of sorted) {
      if (clip.trackId !== track.id) {
        errors.push({
          path: `tracks.${track.id}.clips.${clip.id}.trackId`,
          message: "Clip trackId must match parent track id"
        });
      }
      if (clipIds.has(clip.id)) {
        errors.push({ path: `clips.${clip.id}`, message: "Clip id must be globally unique" });
      }
      clipIds.add(clip.id);

      if (clip.startMs < 0 || clip.inMs < 0 || clip.outMs <= clip.inMs) {
        errors.push({
          path: `tracks.${track.id}.clips.${clip.id}`,
          message: "Clip timings are invalid"
        });
      }

      if (clip.clipType === "media") {
        if (!assetIds.has(clip.assetId)) {
          errors.push({
            path: `tracks.${track.id}.clips.${clip.id}.assetId`,
            message: `Unknown asset: ${clip.assetId}`
          });
        } else {
          const asset = project.assets.find((candidate) => candidate.id === clip.assetId);
          if (asset && clip.outMs > asset.durationMs) {
            errors.push({
              path: `tracks.${track.id}.clips.${clip.id}.outMs`,
              message: "Clip outMs exceeds source asset duration"
            });
          }
        }
      }

      if (isTextClip(clip)) {
        if (track.type !== "text") {
          errors.push({
            path: `tracks.${track.id}.clips.${clip.id}`,
            message: "Text clips can only be added to text tracks"
          });
        }
        if (clip.text.trim().length === 0) {
          errors.push({
            path: `tracks.${track.id}.clips.${clip.id}.text`,
            message: "Text clip content is required"
          });
        }
      }

      if (previousClip && overlaps(previousClip, clip)) {
        errors.push({
          path: `tracks.${track.id}.clips`,
          message: `Clips overlap on track ${track.id}`
        });
      }

      computedDuration = Math.max(computedDuration, clipEndMs(clip));
      previousClip = clip;
    }
  }

  if (project.durationMs !== computedDuration) {
    errors.push({
      path: "durationMs",
      message: `Project duration must equal the max clip end time (${computedDuration})`
    });
  }

  return errors;
}

export function assertValidProject(project: ProjectState): void {
  const errors = validateProject(project);
  if (errors.length > 0) {
    const message = errors.map((error) => `${error.path}: ${error.message}`).join("; ");
    throw new Error(`Project validation failed: ${message}`);
  }
}

export function assertTrackType(project: ProjectState, trackId: string, expected: "text" | "video" | "audio"): void {
  const track = getTrack(project, trackId);
  if (track.type !== expected) {
    throw new Error(`Track ${trackId} must be ${expected}. Received ${track.type}`);
  }
}

export function assertClipWithinBounds(clip: Clip): void {
  if (clipDurationMs(clip) <= 0) {
    throw new Error("Clip duration must be > 0");
  }
  if (clip.startMs < 0 || clip.inMs < 0) {
    throw new Error("Clip start and in values must be >= 0");
  }
}
