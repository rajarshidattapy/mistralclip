import type { ProjectState } from "../../shared/types";
import type { ToolDefinition } from "./toolTypes";

interface ListTracksInput {}

function summarizeTracks(project: ProjectState): Record<string, unknown>[] {
  return project.tracks.map((track) => ({
    id: track.id,
    type: track.type,
    clipCount: track.clips.length
  }));
}

export const listTracksTool: ToolDefinition<ListTracksInput> = {
  name: "list_tracks",
  schema: {
    name: "list_tracks",
    description: "List all timeline tracks and clip counts.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  execute: ({ project }) => ({
    updatedProject: project,
    output: {
      tracks: summarizeTracks(project)
    }
  })
};

