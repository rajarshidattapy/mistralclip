import { applyProjectAction } from "../state/reducer";
import type { ToolDefinition } from "./toolTypes";

interface TrimClipInput {
  trackId: string;
  clipId: string;
  inMs: number;
  outMs: number;
}

function validateInput(input: TrimClipInput): void {
  if (!input.trackId || !input.clipId) {
    throw new Error("trim_clip requires trackId and clipId");
  }
  if (input.inMs < 0 || input.outMs <= input.inMs) {
    throw new Error("trim_clip timing is invalid");
  }
}

export const trimClipTool: ToolDefinition<TrimClipInput> = {
  name: "trim_clip",
  schema: {
    name: "trim_clip",
    description: "Adjust a clip source in/out range.",
    inputSchema: {
      type: "object",
      properties: {
        trackId: { type: "string", description: "Parent track id." },
        clipId: { type: "string", description: "Target clip id." },
        inMs: { type: "number", description: "New source in point." },
        outMs: { type: "number", description: "New source out point." }
      },
      required: ["trackId", "clipId", "inMs", "outMs"],
      additionalProperties: false
    }
  },
  execute: ({ project }, input) => {
    validateInput(input);
    const updatedProject = applyProjectAction(project, {
      type: "trim_clip",
      payload: input
    });
    return {
      updatedProject,
      output: { trimmedClipId: input.clipId, trackId: input.trackId }
    };
  }
};

