import type { ProjectState, ToolExecutionResult, ToolName, ToolSchema } from "../../shared/types";

export interface ToolContext {
  project: ProjectState;
}

export interface ToolDefinition<TInput = Record<string, unknown>> {
  name: ToolName;
  schema: ToolSchema;
  execute: (context: ToolContext, input: TInput) => ToolExecutionResult;
}

