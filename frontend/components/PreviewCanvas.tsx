"use client";

import { API_BASE } from "@/lib/api";
import { useAssetStore } from "@/state/assetStore";
import { useTimelineStore } from "@/state/timelineStore";

export function PreviewCanvas() {
  const timeline = useTimelineStore((state) => state.timeline);
  const assets = useAssetStore((state) => state.assets);

  const activeClip = timeline?.tracks.video[0];
  const activeAsset = activeClip
    ? assets.find((asset) => asset.id === activeClip.asset_id) ?? null
    : null;

  return (
    <div className="stack">
      <h2>Preview Canvas</h2>
      <div className="preview-box">
        {!activeAsset ? <p className="muted">Add a video/image clip to preview.</p> : null}

        {activeAsset?.kind === "video" ? (
          <video controls src={`${API_BASE}/assets/${activeAsset.id}/file`} />
        ) : null}

        {activeAsset?.kind === "image" ? (
          <img alt={activeAsset.name} src={`${API_BASE}/assets/${activeAsset.id}/file`} />
        ) : null}

        {activeAsset && activeAsset.kind === "audio" ? (
          <p className="mono">Audio clip selected: {activeAsset.name}</p>
        ) : null}
      </div>
      <p className="muted">Timeline duration: {timeline?.duration.toFixed(2) ?? "0.00"}s</p>
    </div>
  );
}

