import { applyProjectAction } from "../state/reducer";
import { diffProjectState } from "../state/diff";
import { buildTimelineSnapshot } from "../state/snapshot";
import { executeTool } from "../tools";
import { renderProjectWithFfmpeg } from "../render/ffmpeg";
import type {
  Clip,
  CommandExecutionResult,
  CommandName,
  CommandSchema,
  MediaClip,
  ProjectState,
  TextClip
} from "../../shared/types";
import type { CommandDefinition } from "./types";

interface InspectTimelineInput {
  fromMs: number;
  toMs: number;
}

interface ImportMediaInput {
  id: string;
  type: "video" | "audio" | "image";
  name: string;
  path: string;
  durationMs: number;
}

interface AddClipInput {
  trackId: string;
  clipId: string;
  assetId: string;
  startMs: number;
  inMs: number;
  outMs: number;
}

interface TrimClipInput {
  trackId: string;
  clipId: string;
  inMs: number;
  outMs: number;
}

interface MoveClipInput {
  trackId: string;
  clipId: string;
  startMs: number;
}

interface RemoveClipInput {
  trackId: string;
  clipId: string;
}

interface AddTextInput {
  trackId: string;
  clipId: string;
  text: string;
  startMs: number;
  durationMs: number;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

interface RenderProjectInput {
  outputPath: string;
  execute: boolean;
  ffmpegPath?: string;
}

function asNumber(value: unknown, name: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${name} must be a number`);
  }
  return value;
}

function asString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function asBoolean(value: unknown, name: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${name} must be a boolean`);
  }
  return value;
}

function mapFlags(tokens: string[]): { flags: Record<string, string | boolean>; positionals: string[] } {
  const flags: Record<string, string | boolean> = {};
  const positionals: string[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token) {
      continue;
    }
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = tokens[index + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    index += 1;
  }
  return { flags, positionals };
}

function parseNumberFlag(
  flags: Record<string, string | boolean>,
  names: string[],
  outputName: string
): number {
  for (const name of names) {
    const value = flags[name];
    if (typeof value === "string" && value.trim().length > 0) {
      const numeric = Number(value);
      if (!Number.isNaN(numeric)) {
        return numeric;
      }
      throw new Error(`${outputName} must be numeric`);
    }
  }
  throw new Error(`${outputName} is required`);
}

function parseStringFlag(
  flags: Record<string, string | boolean>,
  names: string[],
  outputName: string
): string {
  for (const name of names) {
    const value = flags[name];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  throw new Error(`${outputName} is required`);
}

function parseBooleanFlag(
  flags: Record<string, string | boolean>,
  names: string[],
  outputName: string
): boolean {
  for (const name of names) {
    const value = flags[name];
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      if (value === "true") {
        return true;
      }
      if (value === "false") {
        return false;
      }
    }
  }
  throw new Error(`${outputName} is required`);
}

function maybeBooleanFlag(flags: Record<string, string | boolean>, names: string[]): boolean | undefined {
  for (const name of names) {
    const value = flags[name];
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      if (value === "true") {
        return true;
      }
      if (value === "false") {
        return false;
      }
    }
  }
  return undefined;
}

function tokenizeCommandLine(commandLine: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let escape = false;

  for (const char of commandLine) {
    if (escape) {
      current += char;
      escape = false;
      continue;
    }
    if (char === "\\") {
      escape = true;
      continue;
    }
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }

  if (quote) {
    throw new Error("Unterminated quoted string in command line");
  }
  if (current.length > 0) {
    tokens.push(current);
  }
  return tokens;
}

function maybeFindClip(project: ProjectState, clipId: string): { trackId: string; clip: Clip } | null {
  for (const track of project.tracks) {
    const clip = track.clips.find((item) => item.id === clipId);
    if (clip) {
      return { trackId: track.id, clip };
    }
  }
  return null;
}

function sameMediaClip(clip: MediaClip, input: AddClipInput): boolean {
  return (
    clip.assetId === input.assetId &&
    clip.trackId === input.trackId &&
    clip.startMs === input.startMs &&
    clip.inMs === input.inMs &&
    clip.outMs === input.outMs
  );
}

function sameTextClip(clip: TextClip, input: AddTextInput): boolean {
  return (
    clip.trackId === input.trackId &&
    clip.text === input.text &&
    clip.startMs === input.startMs &&
    clip.inMs === 0 &&
    clip.outMs === input.durationMs &&
    clip.style.x === input.x &&
    clip.style.y === input.y &&
    clip.style.color === input.color &&
    clip.style.fontSize === input.fontSize
  );
}

function resultFromState(
  before: ProjectState,
  after: ProjectState,
  stdout: string,
  output: Record<string, unknown>
): CommandExecutionResult {
  return {
    updatedProject: after,
    output,
    stdout,
    diff: diffProjectState(before, after)
  };
}

const inspectTimelineCommand: CommandDefinition<InspectTimelineInput> = {
  name: "inspect_timeline",
  schema: {
    name: "inspect_timeline",
    description: "Inspect timeline clips in a specific range and return a textual snapshot.",
    inputSchema: {
      type: "object",
      properties: {
        fromMs: { type: "number", description: "Inclusive range start in ms." },
        toMs: { type: "number", description: "Exclusive range end in ms." }
      },
      required: ["fromMs", "toMs"],
      additionalProperties: false
    }
  },
  toCli: (input) => `mistralclip inspect timeline --from ${input.fromMs} --to ${input.toMs}`,
  execute: async ({ project }, input) => {
    const fromMs = asNumber(input.fromMs, "fromMs");
    const toMs = asNumber(input.toMs, "toMs");
    if (fromMs < 0 || toMs <= fromMs) {
      throw new Error("inspect_timeline requires fromMs >= 0 and toMs > fromMs");
    }
    const result = executeTool("query_timeline", { fromMs, toMs }, project);
    const stdout = buildTimelineSnapshot(project, { fromMs, toMs });
    return resultFromState(project, result.updatedProject, stdout, {
      ...result.output,
      snapshot: stdout
    });
  }
};

const listAssetsCommand: CommandDefinition<Record<string, never>> = {
  name: "list_assets",
  schema: {
    name: "list_assets",
    description: "List all imported assets.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false
    }
  },
  toCli: () => "mistralclip list-assets",
  execute: async ({ project }) => {
    const result = executeTool("list_assets", {}, project);
    const lines = project.assets.map(
      (asset) => `${asset.id} [${asset.type}] ${asset.durationMs}ms ${asset.path}`
    );
    const stdout = lines.length > 0 ? lines.join("\n") : "(no assets)";
    return resultFromState(project, result.updatedProject, stdout, result.output);
  }
};

const importMediaCommand: CommandDefinition<ImportMediaInput> = {
  name: "import_media",
  schema: {
    name: "import_media",
    description: "Import an asset into project state using explicit id and metadata.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Stable asset id." },
        type: { type: "string", description: "Asset type: video/audio/image." },
        name: { type: "string", description: "Display name." },
        path: { type: "string", description: "Filesystem path." },
        durationMs: { type: "number", description: "Asset duration in ms." }
      },
      required: ["id", "type", "name", "path", "durationMs"],
      additionalProperties: false
    }
  },
  toCli: (input) =>
    `mistralclip import-media --id ${input.id} --type ${input.type} --name "${input.name}" --path "${input.path}" --durationMs ${input.durationMs}`,
  execute: async ({ project }, input) => {
    const normalized: ImportMediaInput = {
      id: asString(input.id, "id"),
      type: asString(input.type, "type") as ImportMediaInput["type"],
      name: asString(input.name, "name"),
      path: asString(input.path, "path"),
      durationMs: asNumber(input.durationMs, "durationMs")
    };
    if (!["video", "audio", "image"].includes(normalized.type)) {
      throw new Error("import_media type must be one of: video, audio, image");
    }
    if (normalized.durationMs <= 0) {
      throw new Error("import_media durationMs must be > 0");
    }

    const existing = project.assets.find((asset) => asset.id === normalized.id);
    if (existing) {
      const same =
        existing.type === normalized.type &&
        existing.name === normalized.name &&
        existing.path === normalized.path &&
        existing.durationMs === normalized.durationMs;
      if (same) {
        return resultFromState(project, project, `Asset ${normalized.id} already imported`, {
          assetId: normalized.id,
          idempotent: true
        });
      }
      throw new Error(`Asset ${normalized.id} already exists with different metadata`);
    }

    const updatedProject = applyProjectAction(project, {
      type: "add_asset",
      payload: {
        asset: {
          id: normalized.id,
          type: normalized.type,
          name: normalized.name,
          path: normalized.path,
          durationMs: normalized.durationMs
        }
      }
    });
    const stdout = `Imported media ${normalized.id} (${normalized.type}) ${normalized.durationMs}ms from ${normalized.path}`;
    return resultFromState(project, updatedProject, stdout, {
      assetId: normalized.id
    });
  }
};

const addClipCommand: CommandDefinition<AddClipInput> = {
  name: "add_clip",
  schema: {
    name: "add_clip",
    description: "Add a media clip to a track using explicit IDs and timing.",
    inputSchema: {
      type: "object",
      properties: {
        trackId: { type: "string", description: "Target track id." },
        clipId: { type: "string", description: "Stable clip id." },
        assetId: { type: "string", description: "Asset id." },
        startMs: { type: "number", description: "Timeline start in ms." },
        inMs: { type: "number", description: "Source in point in ms." },
        outMs: { type: "number", description: "Source out point in ms." }
      },
      required: ["trackId", "clipId", "assetId", "startMs", "inMs", "outMs"],
      additionalProperties: false
    }
  },
  toCli: (input) =>
    `mistralclip add-clip --track-id ${input.trackId} --clip-id ${input.clipId} --asset-id ${input.assetId} --start ${input.startMs} --in ${input.inMs} --out ${input.outMs}`,
  execute: async ({ project }, input) => {
    const normalized: AddClipInput = {
      trackId: asString(input.trackId, "trackId"),
      clipId: asString(input.clipId, "clipId"),
      assetId: asString(input.assetId, "assetId"),
      startMs: asNumber(input.startMs, "startMs"),
      inMs: asNumber(input.inMs, "inMs"),
      outMs: asNumber(input.outMs, "outMs")
    };
    const existing = maybeFindClip(project, normalized.clipId);
    if (existing) {
      if (existing.clip.clipType !== "media") {
        throw new Error(`Clip ${normalized.clipId} already exists as text clip`);
      }
      if (sameMediaClip(existing.clip, normalized)) {
        return resultFromState(project, project, `Clip ${normalized.clipId} already present`, {
          clipId: normalized.clipId,
          idempotent: true
        });
      }
      throw new Error(`Clip ${normalized.clipId} already exists with different properties`);
    }

    const result = executeTool(
      "add_clip",
      normalized as unknown as Record<string, unknown>,
      project
    );
    return resultFromState(
      project,
      result.updatedProject,
      `Added clip ${normalized.clipId} on ${normalized.trackId}`,
      { ...result.output, clipId: normalized.clipId }
    );
  }
};

const trimClipCommand: CommandDefinition<TrimClipInput> = {
  name: "trim_clip",
  schema: {
    name: "trim_clip",
    description: "Trim an existing clip's source in and out points.",
    inputSchema: {
      type: "object",
      properties: {
        trackId: { type: "string", description: "Parent track id." },
        clipId: { type: "string", description: "Target clip id." },
        inMs: { type: "number", description: "New in point in ms." },
        outMs: { type: "number", description: "New out point in ms." }
      },
      required: ["trackId", "clipId", "inMs", "outMs"],
      additionalProperties: false
    }
  },
  toCli: (input) =>
    `mistralclip trim-clip --track-id ${input.trackId} --clip-id ${input.clipId} --in ${input.inMs} --out ${input.outMs}`,
  execute: async ({ project }, input) => {
    const normalized: TrimClipInput = {
      trackId: asString(input.trackId, "trackId"),
      clipId: asString(input.clipId, "clipId"),
      inMs: asNumber(input.inMs, "inMs"),
      outMs: asNumber(input.outMs, "outMs")
    };

    const clipRef = maybeFindClip(project, normalized.clipId);
    if (!clipRef || clipRef.trackId !== normalized.trackId) {
      throw new Error(`Clip ${normalized.clipId} not found on track ${normalized.trackId}`);
    }
    if (clipRef.clip.inMs === normalized.inMs && clipRef.clip.outMs === normalized.outMs) {
      return resultFromState(project, project, `Clip ${normalized.clipId} already trimmed`, {
        clipId: normalized.clipId,
        idempotent: true
      });
    }

    const result = executeTool(
      "trim_clip",
      normalized as unknown as Record<string, unknown>,
      project
    );
    return resultFromState(
      project,
      result.updatedProject,
      `Trimmed clip ${normalized.clipId} to in=${normalized.inMs} out=${normalized.outMs}`,
      result.output
    );
  }
};

const moveClipCommand: CommandDefinition<MoveClipInput> = {
  name: "move_clip",
  schema: {
    name: "move_clip",
    description: "Move an existing clip on the timeline.",
    inputSchema: {
      type: "object",
      properties: {
        trackId: { type: "string", description: "Parent track id." },
        clipId: { type: "string", description: "Target clip id." },
        startMs: { type: "number", description: "New start in ms." }
      },
      required: ["trackId", "clipId", "startMs"],
      additionalProperties: false
    }
  },
  toCli: (input) =>
    `mistralclip move-clip --track-id ${input.trackId} --clip-id ${input.clipId} --start ${input.startMs}`,
  execute: async ({ project }, input) => {
    const normalized: MoveClipInput = {
      trackId: asString(input.trackId, "trackId"),
      clipId: asString(input.clipId, "clipId"),
      startMs: asNumber(input.startMs, "startMs")
    };
    const clipRef = maybeFindClip(project, normalized.clipId);
    if (!clipRef || clipRef.trackId !== normalized.trackId) {
      throw new Error(`Clip ${normalized.clipId} not found on track ${normalized.trackId}`);
    }
    if (clipRef.clip.startMs === normalized.startMs) {
      return resultFromState(project, project, `Clip ${normalized.clipId} already at ${normalized.startMs}ms`, {
        clipId: normalized.clipId,
        idempotent: true
      });
    }

    const result = executeTool(
      "move_clip",
      normalized as unknown as Record<string, unknown>,
      project
    );
    return resultFromState(
      project,
      result.updatedProject,
      `Moved clip ${normalized.clipId} to ${normalized.startMs}ms`,
      result.output
    );
  }
};

const removeClipCommand: CommandDefinition<RemoveClipInput> = {
  name: "remove_clip",
  schema: {
    name: "remove_clip",
    description: "Remove a clip by id from a track.",
    inputSchema: {
      type: "object",
      properties: {
        trackId: { type: "string", description: "Parent track id." },
        clipId: { type: "string", description: "Target clip id." }
      },
      required: ["trackId", "clipId"],
      additionalProperties: false
    }
  },
  toCli: (input) =>
    `mistralclip remove-clip --track-id ${input.trackId} --clip-id ${input.clipId}`,
  execute: async ({ project }, input) => {
    const normalized: RemoveClipInput = {
      trackId: asString(input.trackId, "trackId"),
      clipId: asString(input.clipId, "clipId")
    };
    const clipRef = maybeFindClip(project, normalized.clipId);
    if (!clipRef) {
      return resultFromState(project, project, `Clip ${normalized.clipId} already absent`, {
        clipId: normalized.clipId,
        idempotent: true
      });
    }
    if (clipRef.trackId !== normalized.trackId) {
      throw new Error(`Clip ${normalized.clipId} exists on ${clipRef.trackId}, not ${normalized.trackId}`);
    }

    const result = executeTool(
      "remove_clip",
      normalized as unknown as Record<string, unknown>,
      project
    );
    return resultFromState(project, result.updatedProject, `Removed clip ${normalized.clipId}`, result.output);
  }
};

const addTextOverlayCommand: CommandDefinition<AddTextInput> = {
  name: "add_text_overlay",
  schema: {
    name: "add_text_overlay",
    description: "Add a text overlay clip with explicit style and timing.",
    inputSchema: {
      type: "object",
      properties: {
        trackId: { type: "string", description: "Text track id." },
        clipId: { type: "string", description: "Stable clip id." },
        text: { type: "string", description: "Overlay text." },
        startMs: { type: "number", description: "Timeline start in ms." },
        durationMs: { type: "number", description: "Duration in ms." },
        x: { type: "number", description: "X position in px." },
        y: { type: "number", description: "Y position in px." },
        fontSize: { type: "number", description: "Font size in px." },
        color: { type: "string", description: "Text color." }
      },
      required: ["trackId", "clipId", "text", "startMs", "durationMs", "x", "y", "fontSize", "color"],
      additionalProperties: false
    }
  },
  toCli: (input) =>
    `mistralclip add-text-overlay --track-id ${input.trackId} --clip-id ${input.clipId} --text "${input.text}" --start ${input.startMs} --duration ${input.durationMs} --x ${input.x} --y ${input.y} --font-size ${input.fontSize} --color ${input.color}`,
  execute: async ({ project }, input) => {
    const normalized: AddTextInput = {
      trackId: asString(input.trackId, "trackId"),
      clipId: asString(input.clipId, "clipId"),
      text: asString(input.text, "text"),
      startMs: asNumber(input.startMs, "startMs"),
      durationMs: asNumber(input.durationMs, "durationMs"),
      x: asNumber(input.x, "x"),
      y: asNumber(input.y, "y"),
      fontSize: asNumber(input.fontSize, "fontSize"),
      color: asString(input.color, "color")
    };

    const clipRef = maybeFindClip(project, normalized.clipId);
    if (clipRef) {
      if (clipRef.clip.clipType !== "text") {
        throw new Error(`Clip ${normalized.clipId} already exists as media clip`);
      }
      if (sameTextClip(clipRef.clip, normalized)) {
        return resultFromState(project, project, `Text clip ${normalized.clipId} already present`, {
          clipId: normalized.clipId,
          idempotent: true
        });
      }
      throw new Error(`Clip ${normalized.clipId} already exists with different properties`);
    }

    const result = executeTool(
      "add_text_overlay",
      normalized as unknown as Record<string, unknown>,
      project
    );
    return resultFromState(
      project,
      result.updatedProject,
      `Added text clip ${normalized.clipId} on ${normalized.trackId}`,
      { ...result.output, clipId: normalized.clipId }
    );
  }
};

const renderProjectCommand: CommandDefinition<RenderProjectInput> = {
  name: "render_project",
  schema: {
    name: "render_project",
    description: "Render the current project to MP4 using ffmpeg.",
    inputSchema: {
      type: "object",
      properties: {
        outputPath: { type: "string", description: "Destination MP4 path." },
        execute: { type: "boolean", description: "Whether to run ffmpeg immediately." },
        ffmpegPath: { type: "string", description: "Optional ffmpeg executable path." }
      },
      required: ["outputPath", "execute"],
      additionalProperties: false
    }
  },
  toCli: (input) =>
    `mistralclip render-project --output "${input.outputPath}" --execute ${String(input.execute)}${
      input.ffmpegPath ? ` --ffmpeg-path "${input.ffmpegPath}"` : ""
    }`,
  execute: async ({ project }, input) => {
    const normalized: RenderProjectInput = {
      outputPath: asString(input.outputPath, "outputPath"),
      execute: asBoolean(input.execute, "execute"),
      ffmpegPath: typeof input.ffmpegPath === "string" ? input.ffmpegPath : undefined
    };
    const render = await renderProjectWithFfmpeg(project, normalized);
    const stdout = normalized.execute
      ? `Render completed: ${normalized.outputPath}`
      : `Render command prepared (dry-run): ${render.command}`;
    return resultFromState(project, project, stdout, { render });
  }
};

const commandRegistry: Record<CommandName, CommandDefinition<any>> = {
  inspect_timeline: inspectTimelineCommand,
  list_assets: listAssetsCommand,
  import_media: importMediaCommand,
  add_clip: addClipCommand,
  trim_clip: trimClipCommand,
  move_clip: moveClipCommand,
  remove_clip: removeClipCommand,
  add_text_overlay: addTextOverlayCommand,
  render_project: renderProjectCommand
};

export function getCommandSchemas(): CommandSchema[] {
  return Object.values(commandRegistry).map((command) => command.schema);
}

export function isKnownCommand(name: string): name is CommandName {
  return name in commandRegistry;
}

export function formatCommandLine(name: CommandName, args: Record<string, unknown>): string {
  return commandRegistry[name].toCli(args);
}

export async function executeCommand(
  name: CommandName,
  args: Record<string, unknown>,
  project: ProjectState
): Promise<CommandExecutionResult> {
  const command = commandRegistry[name];
  if (!command) {
    throw new Error(`Unknown command: ${name}`);
  }
  return command.execute({ project }, args);
}

export function parseCommandLine(commandLine: string): {
  commandName: CommandName;
  args: Record<string, unknown>;
} {
  const tokens = tokenizeCommandLine(commandLine.trim());
  if (tokens.length === 0) {
    throw new Error("Command line is empty");
  }

  let index = 0;
  if (tokens[0] === "mistralclip") {
    index = 1;
  }
  if (index >= tokens.length) {
    throw new Error("Missing command after mistralclip");
  }

  const commandToken = tokens[index];
  if (!commandToken) {
    throw new Error("Missing command token");
  }
  const rest = tokens.slice(index + 1);
  const { flags, positionals } = mapFlags(rest);

  if (commandToken === "inspect" && positionals[0] === "timeline") {
    return {
      commandName: "inspect_timeline",
      args: {
        fromMs: parseNumberFlag(flags, ["from", "fromMs"], "fromMs"),
        toMs: parseNumberFlag(flags, ["to", "toMs"], "toMs")
      }
    };
  }

  switch (commandToken) {
    case "inspect-timeline":
      return {
        commandName: "inspect_timeline",
        args: {
          fromMs: parseNumberFlag(flags, ["from", "fromMs"], "fromMs"),
          toMs: parseNumberFlag(flags, ["to", "toMs"], "toMs")
        }
      };
    case "list-assets":
      return { commandName: "list_assets", args: {} };
    case "import-media":
      return {
        commandName: "import_media",
        args: {
          id: parseStringFlag(flags, ["id"], "id"),
          type: parseStringFlag(flags, ["type"], "type"),
          name: parseStringFlag(flags, ["name"], "name"),
          path: parseStringFlag(flags, ["path"], "path"),
          durationMs: parseNumberFlag(flags, ["duration", "durationMs"], "durationMs")
        }
      };
    case "add-clip":
      return {
        commandName: "add_clip",
        args: {
          trackId: parseStringFlag(flags, ["track-id", "trackId"], "trackId"),
          clipId: parseStringFlag(flags, ["clip-id", "clipId"], "clipId"),
          assetId: parseStringFlag(flags, ["asset-id", "assetId", "asset"], "assetId"),
          startMs: parseNumberFlag(flags, ["start", "startMs"], "startMs"),
          inMs: parseNumberFlag(flags, ["in", "inMs"], "inMs"),
          outMs: parseNumberFlag(flags, ["out", "outMs", "end"], "outMs")
        }
      };
    case "trim-clip":
      return {
        commandName: "trim_clip",
        args: {
          trackId: parseStringFlag(flags, ["track-id", "trackId"], "trackId"),
          clipId: parseStringFlag(flags, ["clip-id", "clipId"], "clipId"),
          inMs: parseNumberFlag(flags, ["in", "inMs"], "inMs"),
          outMs: parseNumberFlag(flags, ["out", "outMs"], "outMs")
        }
      };
    case "move-clip":
      return {
        commandName: "move_clip",
        args: {
          trackId: parseStringFlag(flags, ["track-id", "trackId"], "trackId"),
          clipId: parseStringFlag(flags, ["clip-id", "clipId"], "clipId"),
          startMs: parseNumberFlag(flags, ["start", "startMs"], "startMs")
        }
      };
    case "remove-clip":
      return {
        commandName: "remove_clip",
        args: {
          trackId: parseStringFlag(flags, ["track-id", "trackId"], "trackId"),
          clipId: parseStringFlag(flags, ["clip-id", "clipId"], "clipId")
        }
      };
    case "add-text":
    case "add-text-overlay":
      return {
        commandName: "add_text_overlay",
        args: {
          trackId: parseStringFlag(flags, ["track-id", "trackId"], "trackId"),
          clipId: parseStringFlag(flags, ["clip-id", "clipId"], "clipId"),
          text: positionals.length > 0 ? positionals.join(" ") : parseStringFlag(flags, ["text"], "text"),
          startMs: parseNumberFlag(flags, ["start", "startMs", "from"], "startMs"),
          durationMs: parseNumberFlag(flags, ["duration", "durationMs"], "durationMs"),
          x: parseNumberFlag(flags, ["x"], "x"),
          y: parseNumberFlag(flags, ["y"], "y"),
          fontSize: parseNumberFlag(flags, ["font-size", "fontSize"], "fontSize"),
          color: parseStringFlag(flags, ["color"], "color")
        }
      };
    case "render":
    case "render-project": {
      const execute = maybeBooleanFlag(flags, ["execute"]);
      return {
        commandName: "render_project",
        args: {
          outputPath: parseStringFlag(flags, ["output", "outputPath"], "outputPath"),
          execute: execute ?? false,
          ...(typeof flags["ffmpeg-path"] === "string" ? { ffmpegPath: flags["ffmpeg-path"] } : {})
        }
      };
    }
    default:
      throw new Error(`Unsupported command: ${commandToken}`);
  }
}

export async function executeCommandLine(
  commandLine: string,
  project: ProjectState
): Promise<{ commandName: CommandName; args: Record<string, unknown>; result: CommandExecutionResult }> {
  const parsed = parseCommandLine(commandLine);
  const result = await executeCommand(parsed.commandName, parsed.args, project);
  return { ...parsed, result };
}
