import type { ToolName, ToolSchema } from "../../shared/types";
import { INSPECTION_TOOLS, MANDATORY_TOOLS } from "../../shared/constants";
import { SYSTEM_PROMPT } from "./systemPrompt";

interface AgentDecisionInput {
  goal: string;
  projectSummary: string;
  toolSchemas: ToolSchema[];
  events: Array<Record<string, unknown>>;
}

export type AgentDecision =
  | { type: "tool_call"; toolName: ToolName; input: Record<string, unknown>; rationale: string }
  | { type: "done"; rationale: string };

export interface ToolCallingAgent {
  decide(input: AgentDecisionInput): Promise<AgentDecision>;
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

function parseToolArguments(raw: string | undefined): Record<string, unknown> {
  if (!raw || raw.trim().length === 0) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    throw new Error("Tool arguments must be an object");
  } catch (error) {
    throw new Error(`Invalid tool arguments JSON: ${(error as Error).message}`);
  }
}

function summarizeRecentEvents(events: Array<Record<string, unknown>>): string {
  if (events.length === 0) {
    return "No prior operations.";
  }
  return events
    .slice(-6)
    .map((event, index) => `${index + 1}. ${JSON.stringify(event)}`)
    .join("\n");
}

class RuleBasedFallbackAgent implements ToolCallingAgent {
  private hasInspected = false;

  async decide(input: AgentDecisionInput): Promise<AgentDecision> {
    const normalized = input.goal.toLowerCase();
    if (!this.hasInspected) {
      this.hasInspected = true;
      return {
        type: "tool_call",
        toolName: "query_timeline",
        input: { fromMs: 0, toMs: 60_000 },
        rationale: "Inspect timeline first to satisfy deterministic editing constraints."
      };
    }

    if (normalized.includes("list tracks")) {
      return {
        type: "tool_call",
        toolName: "list_tracks",
        input: {},
        rationale: "Requested track listing."
      };
    }

    if (normalized.includes("list assets")) {
      return {
        type: "tool_call",
        toolName: "list_assets",
        input: {},
        rationale: "Requested asset listing."
      };
    }

    return {
      type: "done",
      rationale:
        "No Mistral API key is configured. Fallback agent inspected timeline and is stopping safely."
    };
  }
}

export class MistralToolAgent implements ToolCallingAgent {
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fallback = new RuleBasedFallbackAgent();

  constructor() {
    this.apiKey = getEnv("MISTRAL_API_KEY");
    this.model = getEnv("MISTRAL_MODEL") ?? "mistral-large-latest";
    this.baseUrl = getEnv("MISTRAL_BASE_URL") ?? "https://api.mistral.ai/v1";
  }

  private shouldUseFallback(): boolean {
    return !this.apiKey;
  }

  async decide(input: AgentDecisionInput): Promise<AgentDecision> {
    if (this.shouldUseFallback()) {
      return this.fallback.decide(input);
    }

    const mistralTools = input.toolSchemas.map((schema) => ({
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
          { role: "system", content: SYSTEM_PROMPT },
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
              `Mandatory tools: ${MANDATORY_TOOLS.join(", ")}`,
              `Inspection tools: ${INSPECTION_TOOLS.join(", ")}`
            ].join("\n")
          }
        ],
        tools: mistralTools
      })
    });

    if (!response.ok) {
      throw new Error(`Mistral API request failed: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
          tool_calls?: MistralToolCall[];
        };
      }>;
    };

    const message = payload.choices?.[0]?.message;
    const toolCall = message?.tool_calls?.[0];
    const toolName = toolCall?.function?.name;

    const knownFromSchema = toolName
      ? input.toolSchemas.some((schema) => schema.name === toolName)
      : false;

    if (toolName && knownFromSchema) {
      return {
        type: "tool_call",
        toolName: toolName as ToolName,
        input: parseToolArguments(toolCall?.function?.arguments),
        rationale: message?.content ?? "Tool invocation by model."
      };
    }

    return {
      type: "done",
      rationale: message?.content ?? "Model returned no tool call."
    };
  }
}
