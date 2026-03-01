import type {
  CommandExecutionResult,
  CommandName,
  CommandSchema,
  ProjectState
} from "../../shared/types";

export interface CommandContext {
  project: ProjectState;
}

export interface CommandDefinition<TInput = Record<string, unknown>> {
  name: CommandName;
  schema: CommandSchema;
  toCli: (input: TInput) => string;
  execute: (context: CommandContext, input: TInput) => Promise<CommandExecutionResult>;
}

