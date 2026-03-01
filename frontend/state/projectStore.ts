import { useSyncExternalStore } from "react";
import { createEmptyProject } from "../../shared/constants";
import type { AgentSession, CommandName, ProjectState, ToolName } from "../../shared/types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8787/api";

export interface UIState {
  project: ProjectState;
  selectedTrackId: string | null;
  selectedClipId: string | null;
  loading: boolean;
  error: string | null;
  renderCommand: string | null;
  lastCommandStdout: string | null;
  agentSession: AgentSession | null;
}

type Listener = () => void;

interface SessionResponsePayload {
  ok: boolean;
  project?: ProjectState;
  session?: AgentSession;
  error?: string;
  stdout?: string;
}

class ProjectStore {
  private state: UIState = {
    project: createEmptyProject("OpenCut Editor"),
    selectedTrackId: null,
    selectedClipId: null,
    loading: false,
    error: null,
    renderCommand: null,
    lastCommandStdout: null,
    agentSession: null
  };
  private listeners = new Set<Listener>();

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): UIState => this.state;

  private setState(partial: Partial<UIState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((listener) => listener());
  }

  private async parseJson<T>(response: Response): Promise<T> {
    return (await response.json()) as T;
  }

  private applySessionPayload(payload: SessionResponsePayload): void {
    if (!payload.project || !payload.session) {
      throw new Error("Session payload is missing project or session data");
    }
    this.setState({
      project: payload.project,
      agentSession: payload.session,
      loading: false,
      lastCommandStdout: payload.stdout ?? this.state.lastCommandStdout
    });
  }

  selectClip(trackId: string, clipId: string): void {
    this.setState({ selectedTrackId: trackId, selectedClipId: clipId });
  }

  clearSelection(): void {
    this.setState({ selectedTrackId: null, selectedClipId: null });
  }

  async fetchProject(): Promise<void> {
    this.setState({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/project`);
      const payload = await this.parseJson<{ ok: boolean; project: ProjectState; error?: string }>(
        response
      );
      if (!payload.ok) {
        throw new Error(payload.error ?? "Failed to fetch project");
      }
      this.setState({ project: payload.project, loading: false });
    } catch (error) {
      this.setState({ loading: false, error: (error as Error).message });
    }
  }

  async addTrack(type: "video" | "audio" | "text"): Promise<void> {
    this.setState({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/tracks`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type })
      });
      const payload = await this.parseJson<{ ok: boolean; project: ProjectState; error?: string }>(
        response
      );
      if (!payload.ok) {
        throw new Error(payload.error ?? "Failed to add track");
      }
      this.setState({ project: payload.project, loading: false });
    } catch (error) {
      this.setState({ loading: false, error: (error as Error).message });
    }
  }

  async addAsset(input: {
    id?: string;
    type: "video" | "audio" | "image";
    name: string;
    path: string;
    durationMs: number;
  }): Promise<void> {
    this.setState({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/assets`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input)
      });
      const payload = await this.parseJson<{ ok: boolean; project: ProjectState; error?: string }>(
        response
      );
      if (!payload.ok) {
        throw new Error(payload.error ?? "Failed to add asset");
      }
      this.setState({ project: payload.project, loading: false });
    } catch (error) {
      this.setState({ loading: false, error: (error as Error).message });
    }
  }

  async runTool(name: ToolName, input: Record<string, unknown>): Promise<void> {
    this.setState({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/tools/${name}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input })
      });
      const payload = await this.parseJson<{ ok: boolean; project: ProjectState; error?: string }>(
        response
      );
      if (!payload.ok) {
        throw new Error(payload.error ?? `Failed to run tool ${name}`);
      }
      this.setState({ project: payload.project, loading: false });
    } catch (error) {
      this.setState({ loading: false, error: (error as Error).message });
    }
  }

  async executeCommandLine(commandLine: string): Promise<void> {
    this.setState({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/commands/execute-line`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ commandLine })
      });
      const payload = await this.parseJson<{
        ok: boolean;
        project: ProjectState;
        stdout: string;
        output?: { render?: { command?: string } };
        error?: string;
      }>(response);
      if (!payload.ok) {
        throw new Error(payload.error ?? "Command failed");
      }
      this.setState({
        project: payload.project,
        loading: false,
        lastCommandStdout: payload.stdout ?? null,
        renderCommand: payload.output?.render?.command ?? this.state.renderCommand
      });
    } catch (error) {
      this.setState({ loading: false, error: (error as Error).message });
    }
  }

  async executeCommand(commandName: CommandName, args: Record<string, unknown>): Promise<void> {
    this.setState({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/commands/execute`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ commandName, args })
      });
      const payload = await this.parseJson<{
        ok: boolean;
        project: ProjectState;
        stdout: string;
        output?: { render?: { command?: string } };
        error?: string;
      }>(response);
      if (!payload.ok) {
        throw new Error(payload.error ?? "Command failed");
      }
      this.setState({
        project: payload.project,
        loading: false,
        lastCommandStdout: payload.stdout ?? null,
        renderCommand: payload.output?.render?.command ?? this.state.renderCommand
      });
    } catch (error) {
      this.setState({ loading: false, error: (error as Error).message });
    }
  }

  async startAgentSession(goal: string): Promise<void> {
    this.setState({ loading: true, error: null, lastCommandStdout: null });
    try {
      const response = await fetch(`${API_BASE}/agent/sessions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ goal })
      });
      const payload = await this.parseJson<SessionResponsePayload>(response);
      if (!payload.ok) {
        throw new Error(payload.error ?? "Failed to create session");
      }
      this.applySessionPayload(payload);
    } catch (error) {
      this.setState({ loading: false, error: (error as Error).message });
    }
  }

  async refreshAgentSession(): Promise<void> {
    if (!this.state.agentSession) {
      return;
    }
    this.setState({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/agent/sessions/${this.state.agentSession.id}`);
      const payload = await this.parseJson<SessionResponsePayload>(response);
      if (!payload.ok) {
        throw new Error(payload.error ?? "Failed to fetch session");
      }
      this.applySessionPayload(payload);
    } catch (error) {
      this.setState({ loading: false, error: (error as Error).message });
    }
  }

  private async postSessionAction(action: string, body?: Record<string, unknown>): Promise<void> {
    if (!this.state.agentSession) {
      throw new Error("No active session");
    }
    this.setState({ loading: true, error: null });
    try {
      const response = await fetch(
        `${API_BASE}/agent/sessions/${this.state.agentSession.id}/${action}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: body ? JSON.stringify(body) : JSON.stringify({})
        }
      );
      const payload = await this.parseJson<SessionResponsePayload>(response);
      if (!payload.ok) {
        this.setState({
          loading: false,
          error: payload.error ?? `Failed to ${action}`,
          ...(payload.project ? { project: payload.project } : {}),
          ...(payload.session ? { agentSession: payload.session } : {})
        });
        return;
      }
      this.applySessionPayload(payload);
    } catch (error) {
      this.setState({ loading: false, error: (error as Error).message });
    }
  }

  async agentNextStep(): Promise<void> {
    await this.postSessionAction("next");
  }

  async agentApproveStep(): Promise<void> {
    await this.postSessionAction("approve");
  }

  async agentRejectStep(reason: string): Promise<void> {
    await this.postSessionAction("reject", { reason });
  }

  async agentPause(): Promise<void> {
    await this.postSessionAction("pause");
  }

  async agentResume(): Promise<void> {
    await this.postSessionAction("resume");
  }

  async agentCancel(): Promise<void> {
    await this.postSessionAction("cancel");
  }

  async render(outputPath: string, execute: boolean): Promise<void> {
    this.setState({ loading: true, error: null });
    try {
      const response = await fetch(`${API_BASE}/render`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ outputPath, execute })
      });
      const payload = await this.parseJson<{
        ok: boolean;
        render?: { command?: string };
        stdout?: string;
        error?: string;
      }>(response);
      if (!payload.ok) {
        throw new Error(payload.error ?? "Render failed");
      }
      this.setState({
        loading: false,
        renderCommand: payload.render?.command ?? null,
        lastCommandStdout: payload.stdout ?? this.state.lastCommandStdout
      });
    } catch (error) {
      this.setState({ loading: false, error: (error as Error).message });
    }
  }
}

export const projectStore = new ProjectStore();

export function useProjectStore(): UIState {
  return useSyncExternalStore(
    projectStore.subscribe,
    projectStore.getSnapshot,
    projectStore.getSnapshot
  );
}
