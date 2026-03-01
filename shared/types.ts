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
  | "query_clip_content"
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

export type CommandName =
  | "inspect_timeline"
  | "list_assets"
  | "import_media"
  | "add_clip"
  | "trim_clip"
  | "move_clip"
  | "remove_clip"
  | "add_text_overlay"
  | "render_project";

export interface CommandSchema {
  name: CommandName;
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

export interface StateDiff {
  summary: string;
  changed: boolean;
  beforeVersion: number;
  afterVersion: number;
  changes: {
    durationMs?: { before: number; after: number };
    assets: { added: string[]; removed: string[]; updated: string[] };
    tracks: { added: string[]; removed: string[]; updated: string[] };
    clips: {
      added: string[];
      removed: string[];
      updated: string[];
      moved: string[];
    };
  };
}

export interface CommandExecutionResult {
  updatedProject: ProjectState;
  output: Record<string, unknown>;
  stdout: string;
  diff: StateDiff;
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

export type AgentSessionStatus =
  | "running"
  | "paused"
  | "awaiting_approval"
  | "cancelled"
  | "completed"
  | "error";

export type AgentConsoleEventType =
  | "status"
  | "command_planned"
  | "command_executed"
  | "command_rejected"
  | "stdout"
  | "state_diff"
  | "error"
  | "done";

export interface AgentConsoleEvent {
  id: string;
  step: number;
  timestamp: string;
  type: AgentConsoleEventType;
  message: string;
  payload?: Record<string, unknown>;
}

export interface PendingAgentCommand {
  step: number;
  commandName: CommandName;
  args: Record<string, unknown>;
  cli: string;
  rationale: string;
}

export interface AgentSession {
  id: string;
  goal: string;
  status: AgentSessionStatus;
  step: number;
  inspected: boolean;
  createdAt: string;
  updatedAt: string;
  pendingCommand: PendingAgentCommand | null;
  events: AgentConsoleEvent[];
  lastReason: string | null;
}
