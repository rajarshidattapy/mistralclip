import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { createEmptyProject } from "../shared/constants";
import type { ProjectState } from "../shared/types";
import { executeCommandLine } from "./commands";

interface ParsedArgs {
  statePath: string;
  noSave: boolean;
  commandLine: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  let statePath = "";
  let noSave = false;
  const commandTokens: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) {
      continue;
    }
    if (token === "--state") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--state requires a path");
      }
      statePath = value;
      index += 1;
      continue;
    }
    if (token === "--no-save") {
      noSave = true;
      continue;
    }
    commandTokens.push(token);
  }

  if (!statePath) {
    throw new Error("--state is required");
  }
  if (commandTokens.length === 0) {
    throw new Error("Command is required");
  }

  return {
    statePath,
    noSave,
    commandLine: commandTokens.join(" ")
  };
}

async function loadState(statePath: string): Promise<ProjectState> {
  if (!existsSync(statePath)) {
    return createEmptyProject("MistralClip CLI Project");
  }
  const raw = await readFile(statePath, "utf8");
  return JSON.parse(raw) as ProjectState;
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  const project = await loadState(parsed.statePath);
  const execution = await executeCommandLine(parsed.commandLine, project);

  if (!parsed.noSave) {
    await writeFile(parsed.statePath, JSON.stringify(execution.result.updatedProject, null, 2));
  }

  console.log(`command: ${execution.commandName}`);
  console.log(`stdout:\n${execution.result.stdout}`);
  console.log(`diff: ${execution.result.diff.summary}`);
  console.log(`output: ${JSON.stringify(execution.result.output, null, 2)}`);
}

main().catch((error: unknown) => {
  console.error((error as Error).message);
  process.exit(1);
});
