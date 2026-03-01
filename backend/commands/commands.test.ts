import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyProject } from "../../shared/constants";
import { applyProjectAction } from "../state/reducer";
import { executeCommand, executeCommandLine } from "./index";

test("import_media and add_clip produce state diffs", async () => {
  let project = createEmptyProject("Commands Test");
  project = applyProjectAction(project, {
    type: "add_track",
    payload: { track: { id: "video_main", type: "video", clips: [] } }
  });

  const importResult = await executeCommand(
    "import_media",
    {
      id: "asset_1",
      type: "video",
      name: "Intro",
      path: "intro.mp4",
      durationMs: 12_000
    },
    project
  );
  assert.equal(importResult.diff.changed, true);
  assert.equal(importResult.updatedProject.assets.length, 1);

  const addClip = await executeCommand(
    "add_clip",
    {
      trackId: "video_main",
      clipId: "clip_1",
      assetId: "asset_1",
      startMs: 0,
      inMs: 0,
      outMs: 5000
    },
    importResult.updatedProject
  );
  assert.equal(addClip.updatedProject.durationMs, 5000);
  assert.equal(addClip.diff.changes.clips.added.includes("clip_1"), true);
});

test("add_clip is idempotent with same explicit payload", async () => {
  let project = createEmptyProject("Idempotent");
  project = applyProjectAction(project, {
    type: "add_track",
    payload: { track: { id: "video_main", type: "video", clips: [] } }
  });
  project = applyProjectAction(project, {
    type: "add_asset",
    payload: {
      asset: {
        id: "asset_1",
        type: "video",
        name: "Intro",
        path: "intro.mp4",
        durationMs: 10_000
      }
    }
  });

  const first = await executeCommand(
    "add_clip",
    {
      trackId: "video_main",
      clipId: "clip_1",
      assetId: "asset_1",
      startMs: 0,
      inMs: 0,
      outMs: 3000
    },
    project
  );
  const second = await executeCommand(
    "add_clip",
    {
      trackId: "video_main",
      clipId: "clip_1",
      assetId: "asset_1",
      startMs: 0,
      inMs: 0,
      outMs: 3000
    },
    first.updatedProject
  );
  assert.equal(second.diff.changed, false);
});

test("CLI command line parsing executes list-assets", async () => {
  const project = createEmptyProject("CLI Parse");
  const result = await executeCommandLine("mistralclip list-assets", project);
  assert.equal(result.commandName, "list_assets");
  assert.match(result.result.stdout, /no assets/i);
});

