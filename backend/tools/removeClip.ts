import { applyProjectAction } from "../state/reducer";
import type { ToolDefinition } from "./toolTypes";

interface RemoveClipInput {
  trackId: string;
  clipId: string;
}

function validateInput(input: RemoveClipInput): void {
  if (!input.trackId || !input.clipId) {
    throw new Error("remove_clip requires trackId and clipId");
  }
}

export const removeClipTool: ToolDefinition<RemoveClipInput> = {
  name: "remove_clip",
  schema: {
    name: "remove_clip",
    description: "Remove a clip from a track.",
    inputSchema: {
      type: "object",
      properties: {
        trackId: { type: "string", description: "Parent track id." },
        clipId: { type: "string", description: "Target clip id." }
      },
      required: ["trackId", "clipId"],
      additionalProperties: false
    }
  },
  execute: ({ project }, input) => {
    validateInput(input);
    const updatedProject = applyProjectAction(project, {
      type: "remove_clip",
      payload: input
    });
    return {
      updatedProject,
      output: { removedClipId: input.clipId, trackId: input.trackId }
    };
  }
};

