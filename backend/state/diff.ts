import type { Clip, ProjectState, StateDiff } from "../../shared/types";

interface ClipRecord {
  trackId: string;
  clip: Clip;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

function mapById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function mapClips(project: ProjectState): Map<string, ClipRecord> {
  const records = new Map<string, ClipRecord>();
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      records.set(clip.id, { trackId: track.id, clip });
    }
  }
  return records;
}

export function diffProjectState(before: ProjectState, after: ProjectState): StateDiff {
  const beforeAssets = mapById(before.assets);
  const afterAssets = mapById(after.assets);
  const beforeTracks = mapById(before.tracks);
  const afterTracks = mapById(after.tracks);
  const beforeClips = mapClips(before);
  const afterClips = mapClips(after);

  const assetAdded = [...afterAssets.keys()].filter((id) => !beforeAssets.has(id));
  const assetRemoved = [...beforeAssets.keys()].filter((id) => !afterAssets.has(id));
  const assetUpdated = [...afterAssets.keys()].filter((id) => {
    if (!beforeAssets.has(id)) {
      return false;
    }
    return stableStringify(afterAssets.get(id)) !== stableStringify(beforeAssets.get(id));
  });

  const trackAdded = [...afterTracks.keys()].filter((id) => !beforeTracks.has(id));
  const trackRemoved = [...beforeTracks.keys()].filter((id) => !afterTracks.has(id));
  const trackUpdated = [...afterTracks.keys()].filter((id) => {
    const beforeTrack = beforeTracks.get(id);
    const afterTrack = afterTracks.get(id);
    if (!beforeTrack || !afterTrack) {
      return false;
    }
    if (beforeTrack.type !== afterTrack.type) {
      return true;
    }
    return beforeTrack.clips.length !== afterTrack.clips.length;
  });

  const clipAdded = [...afterClips.keys()].filter((id) => !beforeClips.has(id));
  const clipRemoved = [...beforeClips.keys()].filter((id) => !afterClips.has(id));
  const clipUpdated: string[] = [];
  const clipMoved: string[] = [];
  for (const [clipId, afterRecord] of afterClips.entries()) {
    const beforeRecord = beforeClips.get(clipId);
    if (!beforeRecord) {
      continue;
    }
    if (beforeRecord.trackId !== afterRecord.trackId || beforeRecord.clip.startMs !== afterRecord.clip.startMs) {
      clipMoved.push(clipId);
    }
    if (stableStringify(beforeRecord.clip) !== stableStringify(afterRecord.clip)) {
      clipUpdated.push(clipId);
    }
  }

  const durationChanged =
    before.durationMs !== after.durationMs
      ? { before: before.durationMs, after: after.durationMs }
      : undefined;

  const changed =
    Boolean(durationChanged) ||
    assetAdded.length > 0 ||
    assetRemoved.length > 0 ||
    assetUpdated.length > 0 ||
    trackAdded.length > 0 ||
    trackRemoved.length > 0 ||
    trackUpdated.length > 0 ||
    clipAdded.length > 0 ||
    clipRemoved.length > 0 ||
    clipUpdated.length > 0 ||
    clipMoved.length > 0;

  const summaryParts: string[] = [];
  if (durationChanged) {
    summaryParts.push(`duration ${durationChanged.before}ms -> ${durationChanged.after}ms`);
  }
  if (assetAdded.length > 0 || assetRemoved.length > 0 || assetUpdated.length > 0) {
    summaryParts.push(
      `assets +${assetAdded.length} -${assetRemoved.length} ~${assetUpdated.length}`
    );
  }
  if (trackAdded.length > 0 || trackRemoved.length > 0 || trackUpdated.length > 0) {
    summaryParts.push(
      `tracks +${trackAdded.length} -${trackRemoved.length} ~${trackUpdated.length}`
    );
  }
  if (clipAdded.length > 0 || clipRemoved.length > 0 || clipUpdated.length > 0 || clipMoved.length > 0) {
    summaryParts.push(
      `clips +${clipAdded.length} -${clipRemoved.length} ~${clipUpdated.length} moved=${clipMoved.length}`
    );
  }

  return {
    summary: summaryParts.length > 0 ? summaryParts.join(" | ") : "No state change",
    changed,
    beforeVersion: before.metadata.version,
    afterVersion: after.metadata.version,
    changes: {
      durationMs: durationChanged,
      assets: {
        added: assetAdded,
        removed: assetRemoved,
        updated: assetUpdated
      },
      tracks: {
        added: trackAdded,
        removed: trackRemoved,
        updated: trackUpdated
      },
      clips: {
        added: clipAdded,
        removed: clipRemoved,
        updated: clipUpdated,
        moved: clipMoved
      }
    }
  };
}

