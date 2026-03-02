import { create } from "zustand";

import { exportProject, getTimeline, mutateTimeline, undoTimeline } from "@/lib/api";
import { ExportResponse, Timeline, ToolName } from "@/lib/types";

type TimelineState = {
  projectId: string;
  timeline: Timeline | null;
  loading: boolean;
  error: string | null;
  exportResult: ExportResponse | null;
  setProjectId: (projectId: string) => void;
  setTimeline: (timeline: Timeline) => void;
  fetchTimeline: (projectId?: string) => Promise<void>;
  mutate: (tool: ToolName, args: Record<string, unknown>) => Promise<void>;
  undo: () => Promise<void>;
  runExport: () => Promise<void>;
};

export const useTimelineStore = create<TimelineState>((set, get) => ({
  projectId: "default",
  timeline: null,
  loading: false,
  error: null,
  exportResult: null,

  setProjectId: (projectId) => set({ projectId }),
  setTimeline: (timeline) => set({ timeline, error: null }),

  fetchTimeline: async (projectId) => {
    const activeProjectId = projectId ?? get().projectId;
    set({ loading: true, error: null, projectId: activeProjectId });
    try {
      const timeline = await getTimeline(activeProjectId);
      set({ timeline, loading: false });
    } catch (error) {
      set({ loading: false, error: String(error) });
    }
  },

  mutate: async (tool, args) => {
    const { projectId } = get();
    set({ loading: true, error: null });
    try {
      const timeline = await mutateTimeline(projectId, tool, args);
      set({ timeline, loading: false });
    } catch (error) {
      set({ loading: false, error: String(error) });
    }
  },

  undo: async () => {
    const { projectId } = get();
    set({ loading: true, error: null });
    try {
      const timeline = await undoTimeline(projectId);
      set({ timeline, loading: false });
    } catch (error) {
      set({ loading: false, error: String(error) });
    }
  },

  runExport: async () => {
    const { projectId } = get();
    set({ loading: true, error: null });
    try {
      const result = await exportProject(projectId);
      set({ exportResult: result, loading: false });
    } catch (error) {
      set({ loading: false, error: String(error) });
    }
  }
}));

