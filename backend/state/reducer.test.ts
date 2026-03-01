import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyProject } from "../../shared/constants";
import type { ProjectState } from "../../shared/types";
import { applyProjectAction } from "./reducer";

function createSeedProject(): ProjectState {
  let project = createEmptyProject("Reducer Test");
  project = applyProjectAction(project, {
    type: "add_asset",
    payload: {
      asset: {
        id: "asset_intro",
        name: "Intro",
        type: "video",
        path: "intro.mp4",
        durationMs: 10_000
      }
    }
  });
  project = applyProjectAction(project, {
    type: "add_track",
    payload: { track: { id: "video_main", type: "video", clips: [] } }
  });
  project = applyProjectAction(project, {
    type: "add_track",
    payload: { track: { id: "text_main", type: "text", clips: [] } }
  });
  return project;
}

test("add/move/trim media clip keeps state valid", () => {
  let project = createSeedProject();
  project = applyProjectAction(project, {
    type: "add_clip",
    payload: {
      trackId: "video_main",
      clip: {
        id: "clip_1",
        trackId: "video_main",
        clipType: "media",
        assetId: "asset_intro",
        startMs: 0,
        inMs: 0,
        outMs: 6000
      }
    }
  });
  assert.equal(project.durationMs, 6000);

  project = applyProjectAction(project, {
    type: "move_clip",
    payload: {
      trackId: "video_main",
      clipId: "clip_1",
      startMs: 1000
    }
  });
  assert.equal(project.durationMs, 7000);

  project = applyProjectAction(project, {
    type: "trim_clip",
    payload: {
      trackId: "video_main",
      clipId: "clip_1",
      inMs: 1000,
      outMs: 5000
    }
  });
  assert.equal(project.durationMs, 5000);
});

test("overlapping clips are rejected", () => {
  let project = createSeedProject();
  project = applyProjectAction(project, {
    type: "add_clip",
    payload: {
      trackId: "video_main",
      clip: {
        id: "clip_a",
        trackId: "video_main",
        clipType: "media",
        assetId: "asset_intro",
        startMs: 0,
        inMs: 0,
        outMs: 4000
      }
    }
  });
  assert.throws(() =>
    applyProjectAction(project, {
      type: "add_clip",
      payload: {
        trackId: "video_main",
        clip: {
          id: "clip_b",
          trackId: "video_main",
          clipType: "media",
          assetId: "asset_intro",
          startMs: 3000,
          inMs: 0,
          outMs: 2000
        }
      }
    })
  );
});

test("text overlay only works on text tracks", () => {
  const project = createSeedProject();
  assert.throws(() =>
    applyProjectAction(project, {
      type: "add_text_overlay",
      payload: {
        trackId: "video_main",
        clip: {
          id: "txt_1",
          trackId: "video_main",
          clipType: "text",
          text: "Hello",
          startMs: 0,
          inMs: 0,
          outMs: 1000,
          style: { x: 10, y: 10, color: "white", fontSize: 40 }
        }
      }
    })
  );
});

