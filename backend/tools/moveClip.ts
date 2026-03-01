import { applyProjectAction } from "../state/reducer";
import type { ToolDefinition } from "./toolTypes";

interface MoveClipInput {
  trackId: string;
  clipId: string;
  startMs: number;
}

function validateInput(input: MoveClipInput): void {
  if (!input.trackId || !input.clipId) {
    throw new Error("move_clip requires trackId and clipId");
  }
  if (input.startMs < 0) {
    throw new Error("move_clip requires startMs >= 0");
  }
}

export const moveClipTool: ToolDefinition<MoveClipInput> = {
  name: "move_clip",
  schema: {
    name: "move_clip",
    description: "Move a clip to a new timeline start.",
    inputSchema: {
      type: "object",
      properties: {
        trackId: { type: "string", description: "Parent track id." },
        clipId: { type: "string", description: "Target clip id." },
        startMs: { type: "number", description: "New timeline start in milliseconds." }
      },
      required: ["trackId", "clipId", "startMs"],
      additionalProperties: false
    }
  },
  execute: ({ project }, input) => {
    validateInput(input);
    const updatedProject = applyProjectAction(project, {
      type: "move_clip",
      payload: input
    });
    return {
      updatedProject,
      output: { movedClipId: input.clipId, startMs: input.startMs, trackId: input.trackId }
    };
  }
};

