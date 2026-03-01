import type { ToolDefinition } from "./toolTypes";

interface QueryClipContentInput {
  trackId: string;
  clipId: string;
}

function validateInput(input: QueryClipContentInput): void {
  if (!input.trackId || !input.clipId) {
    throw new Error("query_clip_content requires trackId and clipId");
  }
}

export const queryClipContentTool: ToolDefinition<QueryClipContentInput> = {
  name: "query_clip_content",
  schema: {
    name: "query_clip_content",
    description:
      "Return semantic clip details available to agents without pixel access (asset metadata or text content).",
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
    const track = project.tracks.find((item) => item.id === input.trackId);
    if (!track) {
      throw new Error(`Track not found: ${input.trackId}`);
    }
    const clip = track.clips.find((item) => item.id === input.clipId);
    if (!clip) {
      throw new Error(`Clip not found: ${input.clipId}`);
    }

    if (clip.clipType === "text") {
      return {
        updatedProject: project,
        output: {
          clip: {
            id: clip.id,
            clipType: clip.clipType,
            text: clip.text,
            style: clip.style,
            startMs: clip.startMs,
            inMs: clip.inMs,
            outMs: clip.outMs
          }
        }
      };
    }

    const asset = project.assets.find((item) => item.id === clip.assetId);
    return {
      updatedProject: project,
      output: {
        clip: {
          id: clip.id,
          clipType: clip.clipType,
          assetId: clip.assetId,
          startMs: clip.startMs,
          inMs: clip.inMs,
          outMs: clip.outMs
        },
        asset: asset
          ? {
              id: asset.id,
              name: asset.name,
              type: asset.type,
              durationMs: asset.durationMs,
              metadata: asset.metadata ?? {}
            }
          : null
      }
    };
  }
};

