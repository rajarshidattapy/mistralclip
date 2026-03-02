"use client";

import { FormEvent, useState } from "react";

import { useAssetStore } from "@/state/assetStore";
import { useTimelineStore } from "@/state/timelineStore";

function shortSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AssetsPane() {
  const { assets, loading, error, upload } = useAssetStore();
  const timeline = useTimelineStore((state) => state.timeline);
  const mutate = useTimelineStore((state) => state.mutate);
  const [file, setFile] = useState<File | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      return;
    }
    await upload(file);
    setFile(null);
    event.currentTarget.reset();
  };

  return (
    <div className="stack">
      <h2>Assets Pane</h2>
      <form className="stack" onSubmit={onSubmit}>
        <input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <button type="submit" disabled={!file || loading}>
          Upload Asset
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}
      <div className="stack">
        {assets.length === 0 ? <p className="muted">No assets uploaded.</p> : null}
        {assets.map((asset) => (
          <article className="asset-card" key={asset.id}>
            <p className="asset-name">{asset.name}</p>
            <p className="asset-meta">
              {asset.id} | {asset.kind} | {shortSize(asset.size_bytes)}
            </p>
            <button
              onClick={() => {
                const timelineStart = timeline?.duration ?? 0;
                if (asset.kind === "image") {
                  void mutate("add_overlay", {
                    asset_id: asset.id,
                    timeline_start: timelineStart,
                    duration: 3
                  });
                  return;
                }
                void mutate("add_clip", {
                  asset_id: asset.id,
                  start: 0,
                  end: 3,
                  timeline_start: timelineStart,
                  track: asset.kind === "audio" ? "audio" : "video"
                });
              }}
            >
              Add To Timeline
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

