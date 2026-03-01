export type AssetType = "video" | "audio" | "image";
export type TrackType = "video" | "audio" | "text";
export type ClipType = "media" | "text";

export interface Asset {
  id: string;
  type: AssetType;
  name: string;
  path: string;
  durationMs: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface ClipBase {
  id: string;
  trackId: string;
  clipType: ClipType;
  startMs: number;
  inMs: number;
  outMs: number;
}

export interface MediaClip extends ClipBase {
  clipType: "media";
  assetId: string;
}

export interface TextStyle {
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

export interface TextClip extends ClipBase {
  clipType: "text";
  text: string;
  style: TextStyle;
}

export type Clip = MediaClip | TextClip;

export interface Track {
  id: string;
  type: TrackType;
  clips: Clip[];
}

export interface ProjectMetadata {
  title: string;
  width: number;
  height: number;
  fps: number;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface ProjectState {
  assets: Asset[];
  tracks: Track[];
  durationMs: number;
  metadata: ProjectMetadata;
}

export type ToolName =
  | "list_tracks"
  | "list_assets"
  | "query_timeline"
  | "add_clip"
  | "trim_clip"
  | "move_clip"
  | "remove_clip"
  | "add_text_overlay";

export interface ToolSchema {
  name: ToolName;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<
      string,
      { type: "string" | "number" | "boolean"; description: string }
    >;
    required: string[];
    additionalProperties: boolean;
  };
}

export interface ValidationError {
  path: string;
  message: string;
}

export interface ToolExecutionResult {
  updatedProject: ProjectState;
  output: Record<string, unknown>;
}

export interface AgentLoopEvent {
  iteration: number;
  type: "tool_call" | "tool_result" | "error" | "done";
  payload: Record<string, unknown>;
}

export interface AgentLoopResult {
  project: ProjectState;
  events: AgentLoopEvent[];
  completed: boolean;
  reason: string;
}

