import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { createEmptyProject, DEFAULT_API_PORT, TRACK_TYPES } from "../shared/constants";
import type {
  Asset,
  AssetType,
  CommandName,
  ProjectState,
  ToolName,
  TrackType
} from "../shared/types";
import { applyProjectAction } from "./state/reducer";
import { assertValidProject } from "./state/validator";
import { executeTool, getToolSchemas, isKnownTool } from "./tools";
import { MistralToolAgent } from "./agent/mistralAgent";
import { runAgentLoop } from "./agent/agentLoop";
import {
  executeCommand,
  executeCommandLine,
  getCommandSchemas,
  isKnownCommand
} from "./commands";
import { AgentSessionManager } from "./agent/sessionManager";
import { MistralCommandAgent } from "./agent/mistralCommandAgent";

const app = express();
app.use(cors());
app.use(express.json({ limit: "4mb" }));

let projectStore: ProjectState = createEmptyProject("OpenCut Demo");
const sessionManager = new AgentSessionManager();
const commandAgent = new MistralCommandAgent();

function parseTrackType(value: unknown): TrackType {
  if (typeof value !== "string" || !TRACK_TYPES.includes(value as TrackType)) {
    throw new Error(`track type must be one of: ${TRACK_TYPES.join(", ")}`);
  }
  return value as TrackType;
}

function parseAssetType(value: unknown): AssetType {
  if (value === "video" || value === "audio" || value === "image") {
    return value;
  }
  throw new Error("asset type must be one of: video, audio, image");
}

function fail(res: express.Response, error: unknown): void {
  res.status(400).json({
    ok: false,
    error: error instanceof Error ? error.message : "Unknown error"
  });
}

function ok<T>(res: express.Response, data: T): void {
  res.json({ ok: true, ...data });
}

app.get("/health", (_req, res) => {
  ok(res, { status: "ok" });
});

app.get("/api/project", (_req, res) => {
  ok(res, { project: projectStore });
});

app.post("/api/project/reset", (_req, res) => {
  projectStore = createEmptyProject("OpenCut Demo");
  ok(res, { project: projectStore });
});

app.post("/api/assets", (req, res) => {
  try {
    const body = req.body as Partial<Asset>;
    const asset: Asset = {
      id: typeof body.id === "string" && body.id.length > 0 ? body.id : `asset_${randomUUID()}`,
      name: typeof body.name === "string" && body.name.length > 0 ? body.name : "Untitled Asset",
      type: parseAssetType(body.type),
      path: typeof body.path === "string" ? body.path : "",
      durationMs: typeof body.durationMs === "number" ? body.durationMs : 0
    };
    projectStore = applyProjectAction(projectStore, {
      type: "add_asset",
      payload: { asset }
    });
    ok(res, { project: projectStore, asset });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/tracks", (req, res) => {
  try {
    const body = req.body as { id?: string; type?: TrackType };
    const track = {
      id: typeof body.id === "string" && body.id.length > 0 ? body.id : `track_${randomUUID()}`,
      type: parseTrackType(body.type),
      clips: []
    };
    projectStore = applyProjectAction(projectStore, {
      type: "add_track",
      payload: { track }
    });
    ok(res, { project: projectStore, track });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/tools", (_req, res) => {
  ok(res, { tools: getToolSchemas() });
});

app.post("/api/tools/:toolName", (req, res) => {
  try {
    const name = req.params.toolName;
    if (!isKnownTool(name)) {
      throw new Error(`Unknown tool: ${name}`);
    }
    const input = (req.body?.input ?? {}) as Record<string, unknown>;
    const result = executeTool(name as ToolName, input, projectStore);
    projectStore = result.updatedProject;
    ok(res, {
      tool: name,
      output: result.output,
      project: projectStore
    });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/commands", (_req, res) => {
  ok(res, { commands: getCommandSchemas() });
});

app.post("/api/commands/execute", async (req, res) => {
  try {
    const commandName = req.body?.commandName;
    const args = (req.body?.args ?? {}) as Record<string, unknown>;
    if (typeof commandName !== "string" || !isKnownCommand(commandName)) {
      throw new Error(`Unknown command: ${String(commandName)}`);
    }
    const result = await executeCommand(commandName as CommandName, args, projectStore);
    projectStore = result.updatedProject;
    ok(res, {
      commandName,
      args,
      stdout: result.stdout,
      diff: result.diff,
      output: result.output,
      project: projectStore
    });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/commands/execute-line", async (req, res) => {
  try {
    const commandLine = req.body?.commandLine;
    if (typeof commandLine !== "string" || commandLine.trim().length === 0) {
      throw new Error("commandLine is required");
    }
    const execution = await executeCommandLine(commandLine, projectStore);
    projectStore = execution.result.updatedProject;
    ok(res, {
      commandName: execution.commandName,
      args: execution.args,
      stdout: execution.result.stdout,
      diff: execution.result.diff,
      output: execution.result.output,
      project: projectStore
    });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/agent/sessions", (_req, res) => {
  ok(res, { sessions: sessionManager.list() });
});

app.post("/api/agent/sessions", (req, res) => {
  try {
    const goal = req.body?.goal;
    if (typeof goal !== "string" || goal.trim().length === 0) {
      throw new Error("goal is required");
    }
    const session = sessionManager.create(goal, projectStore);
    ok(res, { session, project: projectStore });
  } catch (error) {
    fail(res, error);
  }
});

app.get("/api/agent/sessions/:sessionId", (req, res) => {
  try {
    const session = sessionManager.get(req.params.sessionId);
    ok(res, { session, project: projectStore });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/agent/sessions/:sessionId/next", async (req, res) => {
  try {
    const session = await sessionManager.planNext(
      req.params.sessionId,
      projectStore,
      getCommandSchemas(),
      commandAgent
    );
    ok(res, { session, project: projectStore });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/agent/sessions/:sessionId/approve", async (req, res) => {
  const sessionId = req.params.sessionId;
  try {
    const current = sessionManager.get(sessionId);
    if (!current.pendingCommand) {
      throw new Error(`Session ${sessionId} has no pending command`);
    }

    const pending = current.pendingCommand;
    try {
      const result = await executeCommand(pending.commandName, pending.args, projectStore);
      projectStore = result.updatedProject;
      const updatedSession = sessionManager.approve(sessionId, result, projectStore);
      ok(res, {
        session: updatedSession,
        project: projectStore,
        commandName: pending.commandName,
        stdout: result.stdout,
        diff: result.diff,
        output: result.output
      });
      return;
    } catch (commandError) {
      const message =
        commandError instanceof Error ? commandError.message : "Command approval failed";
      const session = sessionManager.reportError(sessionId, message, {
        commandName: pending.commandName,
        args: pending.args
      });
      res.status(400).json({
        ok: false,
        error: message,
        session,
        project: projectStore
      });
      return;
    }
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/agent/sessions/:sessionId/reject", (req, res) => {
  try {
    const reason =
      typeof req.body?.reason === "string" && req.body.reason.trim().length > 0
        ? req.body.reason
        : "Rejected by user";
    const session = sessionManager.reject(req.params.sessionId, reason);
    ok(res, { session, project: projectStore });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/agent/sessions/:sessionId/pause", (req, res) => {
  try {
    const session = sessionManager.pause(req.params.sessionId);
    ok(res, { session, project: projectStore });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/agent/sessions/:sessionId/resume", (req, res) => {
  try {
    const session = sessionManager.resume(req.params.sessionId);
    ok(res, { session, project: projectStore });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/agent/sessions/:sessionId/cancel", (req, res) => {
  try {
    const session = sessionManager.cancel(req.params.sessionId);
    ok(res, { session, project: projectStore });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/agent/run", async (req, res) => {
  try {
    const goal = req.body?.goal;
    const maxIterations = req.body?.maxIterations;
    if (typeof goal !== "string" || goal.trim().length === 0) {
      throw new Error("goal is required");
    }

    const loopResult = await runAgentLoop({
      goal,
      project: projectStore,
      toolSchemas: getToolSchemas(),
      agent: new MistralToolAgent(),
      maxIterations: typeof maxIterations === "number" ? maxIterations : undefined
    });
    projectStore = loopResult.project;
    ok(res, {
      project: projectStore,
      completed: loopResult.completed,
      reason: loopResult.reason,
      events: loopResult.events
    });
  } catch (error) {
    fail(res, error);
  }
});

app.post("/api/render", async (req, res) => {
  try {
    assertValidProject(projectStore);
    const outputPath = req.body?.outputPath;
    const execute = req.body?.execute;
    const ffmpegPath = typeof req.body?.ffmpegPath === "string" ? req.body.ffmpegPath : undefined;

    if (typeof outputPath !== "string" || outputPath.trim().length === 0) {
      throw new Error("outputPath is required");
    }
    if (typeof execute !== "boolean") {
      throw new Error("execute must be a boolean");
    }

    const result = await executeCommand(
      "render_project",
      { outputPath, execute, ...(ffmpegPath ? { ffmpegPath } : {}) },
      projectStore
    );
    ok(res, {
      render: result.output.render,
      stdout: result.stdout,
      diff: result.diff
    });
  } catch (error) {
    fail(res, error);
  }
});

const port = Number(process.env.PORT ?? DEFAULT_API_PORT);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`OpenCut backend listening on http://localhost:${port}`);
});
