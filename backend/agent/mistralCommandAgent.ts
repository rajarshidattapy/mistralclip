import { INSPECTION_COMMANDS, MANDATORY_COMMANDS } from "../../shared/constants";
import type { CommandName, CommandSchema } from "../../shared/types";
import { SYSTEM_PROMPT } from "./systemPrompt";

interface CommandAgentInput {
  goal: string;
  projectSummary: string;
  commandSchemas: CommandSchema[];
  events: Array<Record<string, unknown>>;
}

export type CommandDecision =
  | {
      type: "command";
      commandName: CommandName;
      args: Record<string, unknown>;
      rationale: string;
    }
  | { type: "done"; rationale: string };

export interface CommandAgent {
  decide(input: CommandAgentInput): Promise<CommandDecision>;
}

interface MistralToolCall {
  function?: {
    name?: string;
    arguments?: string;
  };
}

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

function parseArguments(raw: string | undefined): Record<string, unknown> {
  if (!raw || raw.trim().length === 0) {
    return {};
  }
  const parsed = JSON.parse(raw) as unknown;
  if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  throw new Error("Command arguments must be a JSON object");
}

function summarizeRecentEvents(events: Array<Record<string, unknown>>): string {
  if (events.length === 0) {
    return "No prior operations.";
  }
  return events
    .slice(-8)
    .map((event, index) => `${index + 1}. ${JSON.stringify(event)}`)
    .join("\n");
}

class RuleBasedFallbackAgent implements CommandAgent {
  async decide(input: CommandAgentInput): Promise<CommandDecision> {
    const goal = input.goal.toLowerCase();
    const alreadyInspected = input.events.some(
      (event) => event.commandName === "inspect_timeline" && event.type === "command_executed"
    );
    if (!alreadyInspected) {
      return {
        type: "command",
        commandName: "inspect_timeline",
        args: { fromMs: 0, toMs: 60_000 },
        rationale: "Inspect timeline before any edits."
      };
    }

    if (goal.includes("list assets")) {
      return {
        type: "command",
        commandName: "list_assets",
        args: {},
        rationale: "User requested asset inspection."
      };
    }

    return {
      type: "done",
      rationale:
        "No Mistral API key is configured. Fallback agent inspected state and stopped safely."
    };
  }
}

export class MistralCommandAgent implements CommandAgent {
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fallback = new RuleBasedFallbackAgent();

  constructor() {
    this.apiKey = getEnv("MISTRAL_API_KEY");
    this.model = getEnv("MISTRAL_MODEL") ?? "mistral-large-latest";
    this.baseUrl = getEnv("MISTRAL_BASE_URL") ?? "https://api.mistral.ai/v1";
  }

  private useFallback(): boolean {
    return !this.apiKey;
  }

  async decide(input: CommandAgentInput): Promise<CommandDecision> {
    if (this.useFallback()) {
      return this.fallback.decide(input);
    }

    const tools = input.commandSchemas.map((schema) => ({
      type: "function",
      function: {
        name: schema.name,
        description: schema.description,
        parameters: schema.inputSchema
      }
    }));

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0,
        tool_choice: "auto",
        messages: [
          { role: "system", content: `${SYSTEM_PROMPT}\nIssue CLI commands only.` },
          {
            role: "user",
            content: [
              `Goal: ${input.goal}`,
              "Project Summary:",
              input.projectSummary,
              "",
              "Recent Events:",
              summarizeRecentEvents(input.events),
              "",
              `Mandatory commands: ${MANDATORY_COMMANDS.join(", ")}`,
              `Inspection commands: ${INSPECTION_COMMANDS.join(", ")}`
            ].join("\n")
          }
        ],
        tools
      })
    });

    if (!response.ok) {
      throw new Error(`Mistral API request failed: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: { content?: string; tool_calls?: MistralToolCall[] };
      }>;
    };

    const message = payload.choices?.[0]?.message;
    const toolCall = message?.tool_calls?.[0];
    const commandName = toolCall?.function?.name;
    const knownFromSchema = commandName
      ? input.commandSchemas.some((schema) => schema.name === commandName)
      : false;

    if (commandName && knownFromSchema) {
      return {
        type: "command",
        commandName: commandName as CommandName,
        args: parseArguments(toolCall?.function?.arguments),
        rationale: message?.content ?? "Command selected by model."
      };
    }

    return {
      type: "done",
      rationale: message?.content ?? "Model returned no command."
    };
  }
}
