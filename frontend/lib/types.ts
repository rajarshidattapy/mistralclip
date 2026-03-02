export type ToolName =
  | "add_clip"
  | "remove_clip"
  | "move_clip"
  | "trim_clip"
  | "split_clip"
  | "add_transition"
  | "add_overlay"
  | "set_audio_level"
  | "export_project";

export interface VideoClip {
  id: string;
  asset_id: string;
  start: number;
  end: number;
  timeline_start: number;
}

export interface AudioClip extends VideoClip {
  level: number;
}

export interface OverlayClip {
  id: string;
  asset_id?: string | null;
  text?: string | null;
  start: number;
  end: number;
  timeline_start: number;
  x: number;
  y: number;
  font_size: number;
  color: string;
}

export interface Transition {
  id: string;
  type: "fade" | "crossfade";
  from_clip_id: string;
  to_clip_id: string;
  duration: number;
}

export interface Timeline {
  project_id: string;
  duration: number;
  tracks: {
    video: VideoClip[];
    audio: AudioClip[];
    overlay: OverlayClip[];
  };
  transitions: Transition[];
}

export interface Asset {
  id: string;
  name: string;
  path: string;
  kind: "video" | "audio" | "image" | "unknown";
  mime_type: string;
  size_bytes: number;
  duration?: number | null;
}

export interface ToolCall {
  tool: ToolName;
  args: Record<string, unknown>;
}

export interface ToolExecution {
  tool: ToolName;
  status: "ok" | "error";
  message: string;
  data: Record<string, unknown>;
}

export interface ChatResponse {
  tool_calls: ToolCall[];
  results: ToolExecution[];
  timeline: Timeline;
}

export interface ExportResponse {
  project_id: string;
  success: boolean;
  url: string;
  message: string;
}

