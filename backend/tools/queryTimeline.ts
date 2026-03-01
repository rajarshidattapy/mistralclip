import { clipEndMs } from "../state/schema";
import type { ToolDefinition } from "./toolTypes";

interface QueryTimelineInput {
  fromMs: number;
  toMs: number;
}

function assertValidRange(input: QueryTimelineInput): void {
  if (input.fromMs < 0 || input.toMs < 0 || input.toMs <= input.fromMs) {
    throw new Error("query_timeline requires fromMs >= 0 and toMs > fromMs");
  }
}

export const queryTimelineTool: ToolDefinition<QueryTimelineInput> = {
  name: "query_timeline",
  schema: {
    name: "query_timeline",
    description: "Return clips that intersect a specific timeline range.",
    inputSchema: {
      type: "object",
      properties: {
        fromMs: { type: "number", description: "Inclusive timeline start in milliseconds." },
        toMs: { type: "number", description: "Exclusive timeline end in milliseconds." }
      },
      required: ["fromMs", "toMs"],
      additionalProperties: false
    }
  },
  execute: ({ project }, input) => {
    assertValidRange(input);
    const { fromMs, toMs } = input;

    return {
      updatedProject: project,
      output: {
        fromMs,
        toMs,
        durationMs: project.durationMs,
        tracks: project.tracks.map((track) => ({
          id: track.id,
          type: track.type,
          clips: track.clips
            .filter((clip) => clip.startMs < toMs && clipEndMs(clip) > fromMs)
            .map((clip) => ({
              id: clip.id,
              clipType: clip.clipType,
              startMs: clip.startMs,
              endMs: clipEndMs(clip),
              inMs: clip.inMs,
              outMs: clip.outMs,
              ...(clip.clipType === "media"
                ? { assetId: clip.assetId }
                : { text: clip.text, style: clip.style })
            }))
        }))
      }
    };
  }
};

