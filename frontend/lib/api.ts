import {
  Asset,
  ChatResponse,
  ExportResponse,
  Timeline,
  ToolName
} from "@/lib/types";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function jsonRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export function getTimeline(projectId: string): Promise<Timeline> {
  return jsonRequest<Timeline>(`/timeline/${projectId}`);
}

export function mutateTimeline(
  projectId: string,
  tool: ToolName,
  args: Record<string, unknown>
): Promise<Timeline> {
  return jsonRequest<Timeline>("/timeline/mutate", {
    method: "POST",
    body: JSON.stringify({ project_id: projectId, tool, args })
  });
}

export function undoTimeline(projectId: string): Promise<Timeline> {
  return jsonRequest<Timeline>("/timeline/undo", {
    method: "POST",
    body: JSON.stringify({ project_id: projectId })
  });
}

export function listAssets(): Promise<Asset[]> {
  return jsonRequest<Asset[]>("/assets");
}

export async function uploadAsset(file: File): Promise<Asset> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE}/assets/upload`, {
    method: "POST",
    body: formData
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }
  return (await response.json()) as Asset;
}

export function chat(projectId: string, message: string): Promise<ChatResponse> {
  return jsonRequest<ChatResponse>("/chat", {
    method: "POST",
    body: JSON.stringify({ project_id: projectId, message })
  });
}

export function exportProject(projectId: string): Promise<ExportResponse> {
  return jsonRequest<ExportResponse>("/export", {
    method: "POST",
    body: JSON.stringify({ project_id: projectId })
  });
}

