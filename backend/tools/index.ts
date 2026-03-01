import type { ToolExecutionResult, ToolName, ToolSchema } from "../../shared/types";
import { addClipTool } from "./addClip";
import { addTextOverlayTool } from "./addTextOverlay";
import { listAssetsTool } from "./listAssets";
import { listTracksTool } from "./listTracks";
import { moveClipTool } from "./moveClip";
import { queryTimelineTool } from "./queryTimeline";
import { queryClipContentTool } from "./queryClipContent";
import { removeClipTool } from "./removeClip";
import { trimClipTool } from "./trimClip";
import type { ToolDefinition } from "./toolTypes";

const toolRegistry: Record<ToolName, ToolDefinition<any>> = {
  list_tracks: listTracksTool,
  list_assets: listAssetsTool,
  query_timeline: queryTimelineTool,
  query_clip_content: queryClipContentTool,
  add_clip: addClipTool,
  trim_clip: trimClipTool,
  move_clip: moveClipTool,
  remove_clip: removeClipTool,
  add_text_overlay: addTextOverlayTool
};

export function getToolSchemas(): ToolSchema[] {
  return Object.values(toolRegistry).map((tool) => tool.schema);
}

export function executeTool(
  name: ToolName,
  input: Record<string, unknown>,
  project: import("../../shared/types").ProjectState
): ToolExecutionResult {
  const tool = toolRegistry[name];
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return tool.execute({ project }, input);
}

export function isKnownTool(name: string): name is ToolName {
  return name in toolRegistry;
}
