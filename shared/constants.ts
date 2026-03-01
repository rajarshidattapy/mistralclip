import type { ProjectState, ToolName, TrackType } from "./types";

export const TRACK_TYPES: TrackType[] = ["video", "audio", "text"];

export const MANDATORY_TOOLS: ToolName[] = [
  "list_tracks",
  "list_assets",
  "query_timeline",
  "add_clip",
  "trim_clip",
  "move_clip",
  "remove_clip",
  "add_text_overlay"
];

export const INSPECTION_TOOLS: ToolName[] = [
  "list_tracks",
  "list_assets",
  "query_timeline"
];

export const MUTATION_TOOLS: ToolName[] = [
  "add_clip",
  "trim_clip",
  "move_clip",
  "remove_clip",
  "add_text_overlay"
];

export const DEFAULT_AGENT_MAX_ITERATIONS = 12;
export const DEFAULT_API_PORT = 8787;

export function createEmptyProject(title = "OpenCut Project"): ProjectState {
  const now = new Date().toISOString();
  return {
    assets: [],
    tracks: [],
    durationMs: 0,
    metadata: {
      title,
      width: 1920,
      height: 1080,
      fps: 30,
      createdAt: now,
      updatedAt: now,
      version: 1
    }
  };
}

