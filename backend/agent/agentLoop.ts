import { DEFAULT_AGENT_MAX_ITERATIONS, INSPECTION_TOOLS, MUTATION_TOOLS } from "../../shared/constants";
import type { AgentLoopEvent, AgentLoopResult, ProjectState, ToolSchema } from "../../shared/types";
import { executeTool } from "../tools";
import type { AgentDecision, ToolCallingAgent } from "./mistralAgent";

interface AgentLoopInput {
  goal: string;
  project: ProjectState;
  toolSchemas: ToolSchema[];
  agent: ToolCallingAgent;
  maxIterations?: number;
}

function summarizeProject(project: ProjectState): string {
  const lines: string[] = [];
  lines.push(`Duration: ${project.durationMs}ms`);
  lines.push(`Assets: ${project.assets.length}`);
  lines.push(`Tracks: ${project.tracks.length}`);
  for (const track of project.tracks) {
    lines.push(`- ${track.id} (${track.type}) clips=${track.clips.length}`);
    for (const clip of track.clips) {
      const endMs = clip.startMs + (clip.outMs - clip.inMs);
      if (clip.clipType === "media") {
        lines.push(
          `  - clip=${clip.id} asset=${clip.assetId} start=${clip.startMs} end=${endMs} in=${clip.inMs} out=${clip.outMs}`
        );
      } else {
        lines.push(
          `  - clip=${clip.id} text="${clip.text}" start=${clip.startMs} end=${endMs} size=${clip.style.fontSize}`
        );
      }
    }
  }
  return lines.join("\n");
}

function decisionAsEvent(iteration: number, decision: AgentDecision): AgentLoopEvent {
  if (decision.type === "done") {
    return {
      iteration,
      type: "done",
      payload: { rationale: decision.rationale }
    };
  }
  return {
    iteration,
    type: "tool_call",
    payload: {
      toolName: decision.toolName,
      input: decision.input,
      rationale: decision.rationale
    }
  };
}

export async function runAgentLoop(input: AgentLoopInput): Promise<AgentLoopResult> {
  const events: AgentLoopEvent[] = [];
  const maxIterations = input.maxIterations ?? DEFAULT_AGENT_MAX_ITERATIONS;
  let project = input.project;
  let inspected = false;

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const decision = await input.agent.decide({
      goal: input.goal,
      projectSummary: summarizeProject(project),
      toolSchemas: input.toolSchemas,
      events: events.map((event) => ({ ...event.payload, eventType: event.type }))
    });
    events.push(decisionAsEvent(iteration, decision));

    if (decision.type === "done") {
      return { project, events, completed: true, reason: decision.rationale };
    }

    if (INSPECTION_TOOLS.includes(decision.toolName)) {
      inspected = true;
    }

    if (!inspected && MUTATION_TOOLS.includes(decision.toolName)) {
      events.push({
        iteration,
        type: "error",
        payload: {
          message: "Agent attempted mutation before state inspection. Operation rejected."
        }
      });
      continue;
    }

    try {
      const result = executeTool(decision.toolName, decision.input, project);
      project = result.updatedProject;
      events.push({
        iteration,
        type: "tool_result",
        payload: {
          toolName: decision.toolName,
          output: result.output
        }
      });
    } catch (error) {
      events.push({
        iteration,
        type: "error",
        payload: {
          toolName: decision.toolName,
          message: (error as Error).message
        }
      });
    }
  }

  return {
    project,
    events,
    completed: false,
    reason: `Iteration limit reached (${maxIterations})`
  };
}

