import { applyProjectAction } from "../state/reducer";
import type { ToolDefinition } from "./toolTypes";

interface AddClipInput {
  trackId: string;
  clipId: string;
  assetId: string;
  startMs: number;
  inMs: number;
  outMs: number;
}

function validateInput(input: AddClipInput): void {
  if (!input.trackId || !input.clipId || !input.assetId) {
    throw new Error("add_clip requires trackId, clipId, and assetId");
  }
  if (input.startMs < 0 || input.inMs < 0 || input.outMs <= input.inMs) {
    throw new Error("add_clip timing is invalid");
  }
}

export const addClipTool: ToolDefinition<AddClipInput> = {
  name: "add_clip",
  schema: {
    name: "add_clip",
    description: "Add a media clip to a non-text track.",
    inputSchema: {
      type: "object",
      properties: {
        trackId: { type: "string", description: "Target track id." },
        clipId: { type: "string", description: "Stable clip id." },
        assetId: { type: "string", description: "Existing source asset id." },
        startMs: { type: "number", description: "Timeline start in milliseconds." },
        inMs: { type: "number", description: "Source in point in milliseconds." },
        outMs: { type: "number", description: "Source out point in milliseconds." }
      },
      required: ["trackId", "clipId", "assetId", "startMs", "inMs", "outMs"],
      additionalProperties: false
    }
  },
  execute: ({ project }, input) => {
    validateInput(input);
    const updatedProject = applyProjectAction(project, {
      type: "add_clip",
      payload: {
        trackId: input.trackId,
        clip: {
          id: input.clipId,
          trackId: input.trackId,
          clipType: "media",
          assetId: input.assetId,
          startMs: input.startMs,
          inMs: input.inMs,
          outMs: input.outMs
        }
      }
    });
    return {
      updatedProject,
      output: {
        addedClipId: input.clipId,
        trackId: input.trackId
      }
    };
  }
};

