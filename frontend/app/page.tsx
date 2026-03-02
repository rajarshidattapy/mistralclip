"use client";

import { useEffect } from "react";

import { AssetsPane } from "@/components/AssetsPane";
import { ChatPanel } from "@/components/Chat/ChatPanel";
import { PreviewCanvas } from "@/components/PreviewCanvas";
import { Timeline } from "@/components/Timeline/Timeline";
import { useAssetStore } from "@/state/assetStore";
import { useTimelineStore } from "@/state/timelineStore";

export default function HomePage() {
  const projectId = useTimelineStore((state) => state.projectId);
  const fetchTimeline = useTimelineStore((state) => state.fetchTimeline);
  const fetchAssets = useAssetStore((state) => state.fetchAssets);

  useEffect(() => {
    void Promise.all([fetchTimeline(projectId), fetchAssets()]);
  }, [fetchAssets, fetchTimeline, projectId]);

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">AI-Orchestrated NLE MVP</p>
          <h1>MistralClip</h1>
        </div>
        <div className="project-pill">Project: {projectId}</div>
      </header>

      <main className="workspace">
        <section className="panel assets-panel">
          <AssetsPane />
        </section>

        <section className="panel preview-panel">
          <PreviewCanvas />
        </section>

        <aside className="panel chat-panel">
          <ChatPanel />
        </aside>

        <section className="panel timeline-panel">
          <Timeline />
        </section>
      </main>
    </div>
  );
}

