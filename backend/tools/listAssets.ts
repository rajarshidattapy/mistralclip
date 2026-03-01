import type { ToolDefinition } from "./toolTypes";

interface ListAssetsInput {}

export const listAssetsTool: ToolDefinition<ListAssetsInput> = {
  name: "list_assets",
  schema: {
    name: "list_assets",
    description: "List all project assets and core metadata.",
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
      assets: project.assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        type: asset.type,
        durationMs: asset.durationMs,
        path: asset.path
      }))
    }
  })
};

