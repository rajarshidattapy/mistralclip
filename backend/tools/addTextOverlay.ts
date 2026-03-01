import { applyProjectAction } from "../state/reducer";
import type { ToolDefinition } from "./toolTypes";

interface AddTextOverlayInput {
  trackId: string;
  clipId: string;
  text: string;
  startMs: number;
  durationMs: number;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

function validateInput(input: AddTextOverlayInput): void {
  if (
    !input.trackId ||
    !input.clipId ||
    !input.text ||
    input.durationMs <= 0 ||
    input.startMs < 0 ||
    input.fontSize <= 0 ||
    !input.color
  ) {
    throw new Error("add_text_overlay input is invalid");
  }
}

export const addTextOverlayTool: ToolDefinition<AddTextOverlayInput> = {
  name: "add_text_overlay",
  schema: {
    name: "add_text_overlay",
    description: "Add a text overlay clip on a text track.",
    inputSchema: {
      type: "object",
      properties: {
        trackId: { type: "string", description: "Target text track id." },
        clipId: { type: "string", description: "Stable clip id." },
        text: { type: "string", description: "Overlay text content." },
        startMs: { type: "number", description: "Timeline start in milliseconds." },
        durationMs: { type: "number", description: "Overlay duration in milliseconds." },
        x: { type: "number", description: "Horizontal position in pixels." },
        y: { type: "number", description: "Vertical position in pixels." },
        fontSize: { type: "number", description: "Font size in pixels." },
        color: { type: "string", description: "Text color in ffmpeg format (e.g. white)." }
      },
      required: [
        "trackId",
        "clipId",
        "text",
        "startMs",
        "durationMs",
        "x",
        "y",
        "fontSize",
        "color"
      ],
      additionalProperties: false
    }
  },
  execute: ({ project }, input) => {
    validateInput(input);

    const updatedProject = applyProjectAction(project, {
      type: "add_text_overlay",
      payload: {
        trackId: input.trackId,
        clip: {
          id: input.clipId,
          trackId: input.trackId,
          clipType: "text",
          text: input.text,
          startMs: input.startMs,
          inMs: 0,
          outMs: input.durationMs,
          style: {
            x: input.x,
            y: input.y,
            color: input.color,
            fontSize: input.fontSize
          }
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

