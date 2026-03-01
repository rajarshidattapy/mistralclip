import { randomUUID } from "node:crypto";
import type {
  AgentConsoleEvent,
  AgentSession,
  AgentSessionStatus,
  CommandExecutionResult,
  CommandSchema,
  ProjectState
} from "../../shared/types";
import { formatCommandLine } from "../commands";
import type { CommandAgent } from "./mistralCommandAgent";
import { summarizeProjectState } from "../state/snapshot";

interface SessionRecord {
  session: AgentSession;
  lastSeenProjectVersion: number;
}

function createEvent(
  step: number,
  type: AgentConsoleEvent["type"],
  message: string,
  payload?: Record<string, unknown>
): AgentConsoleEvent {
  return {
    id: randomUUID(),
    step,
    timestamp: new Date().toISOString(),
    type,
    message,
    ...(payload ? { payload } : {})
  };
}

function cloneSession(session: AgentSession): AgentSession {
  return {
    ...session,
    pendingCommand: session.pendingCommand ? { ...session.pendingCommand } : null,
    events: session.events.map((event) => ({
      ...event,
      ...(event.payload ? { payload: { ...event.payload } } : {})
    }))
  };
}

export class AgentSessionManager {
  private readonly sessions = new Map<string, SessionRecord>();

  create(goal: string, project: ProjectState): AgentSession {
    const now = new Date().toISOString();
    const session: AgentSession = {
      id: randomUUID(),
      goal,
      status: "running",
      step: 0,
      inspected: false,
      createdAt: now,
      updatedAt: now,
      pendingCommand: null,
      events: [],
      lastReason: null
    };
    session.events.push(createEvent(0, "status", "Session created"));
    this.sessions.set(session.id, {
      session,
      lastSeenProjectVersion: project.metadata.version
    });
    return cloneSession(session);
  }

  list(): AgentSession[] {
    return [...this.sessions.values()].map((record) => cloneSession(record.session));
  }

  get(sessionId: string): AgentSession {
    const record = this.sessions.get(sessionId);
    if (!record) {
      throw new Error(`Unknown session: ${sessionId}`);
    }
    return cloneSession(record.session);
  }

  private setStatus(
    record: SessionRecord,
    status: AgentSessionStatus,
    message: string,
    payload?: Record<string, unknown>
  ): void {
    record.session.status = status;
    record.session.updatedAt = new Date().toISOString();
    record.session.events.push(createEvent(record.session.step, "status", message, payload));
  }

  async planNext(
    sessionId: string,
    project: ProjectState,
    commandSchemas: CommandSchema[],
    agent: CommandAgent
  ): Promise<AgentSession> {
    const record = this.sessions.get(sessionId);
    if (!record) {
      throw new Error(`Unknown session: ${sessionId}`);
    }

    const session = record.session;
    if (session.status === "cancelled" || session.status === "completed") {
      throw new Error(`Session ${session.id} is ${session.status}`);
    }
    if (session.status === "paused") {
      throw new Error(`Session ${session.id} is paused`);
    }
    if (session.status === "awaiting_approval") {
      throw new Error(`Session ${session.id} has a pending command`);
    }

    if (project.metadata.version !== record.lastSeenProjectVersion) {
      session.events.push(
        createEvent(
          session.step,
          "status",
          "Project version changed by manual edit while session active",
          {
            beforeVersion: record.lastSeenProjectVersion,
            afterVersion: project.metadata.version
          }
        )
      );
      record.lastSeenProjectVersion = project.metadata.version;
    }

    const decision = await agent.decide({
      goal: session.goal,
      projectSummary: summarizeProjectState(project),
      commandSchemas,
      events: session.events.map((event) => ({
        type: event.type,
        message: event.message,
        ...(event.payload ?? {})
      }))
    });

    if (decision.type === "done") {
      session.status = "completed";
      session.lastReason = decision.rationale;
      session.updatedAt = new Date().toISOString();
      session.events.push(createEvent(session.step, "done", decision.rationale));
      return cloneSession(session);
    }

    if (!session.inspected && decision.commandName !== "inspect_timeline") {
      session.lastReason = "Agent attempted mutation before inspect_timeline. Step rejected.";
      session.updatedAt = new Date().toISOString();
      session.events.push(
        createEvent(session.step, "error", session.lastReason, {
          commandName: decision.commandName
        })
      );
      return cloneSession(session);
    }

    session.step += 1;
    session.pendingCommand = {
      step: session.step,
      commandName: decision.commandName,
      args: decision.args,
      cli: formatCommandLine(decision.commandName, decision.args),
      rationale: decision.rationale
    };
    session.status = "awaiting_approval";
    session.updatedAt = new Date().toISOString();
    session.events.push(
      createEvent(session.step, "command_planned", `Planned: ${session.pendingCommand.cli}`, {
        commandName: decision.commandName,
        args: decision.args,
        rationale: decision.rationale
      })
    );
    return cloneSession(session);
  }

  approve(
    sessionId: string,
    result: CommandExecutionResult,
    project: ProjectState
  ): AgentSession {
    const record = this.sessions.get(sessionId);
    if (!record) {
      throw new Error(`Unknown session: ${sessionId}`);
    }
    const session = record.session;
    if (session.status !== "awaiting_approval" || !session.pendingCommand) {
      throw new Error(`Session ${session.id} has no pending command to approve`);
    }

    const pending = session.pendingCommand;
    session.status = "running";
    session.pendingCommand = null;
    session.updatedAt = new Date().toISOString();
    session.lastReason = null;
    if (pending.commandName === "inspect_timeline") {
      session.inspected = true;
    }
    session.events.push(
      createEvent(session.step, "command_executed", `Executed: ${pending.cli}`, {
        commandName: pending.commandName
      })
    );
    session.events.push(createEvent(session.step, "stdout", result.stdout));
    session.events.push(createEvent(session.step, "state_diff", result.diff.summary, result.diff as unknown as Record<string, unknown>));
    record.lastSeenProjectVersion = project.metadata.version;
    return cloneSession(session);
  }

  reject(sessionId: string, reason: string): AgentSession {
    const record = this.sessions.get(sessionId);
    if (!record) {
      throw new Error(`Unknown session: ${sessionId}`);
    }
    const session = record.session;
    if (session.status !== "awaiting_approval" || !session.pendingCommand) {
      throw new Error(`Session ${session.id} has no pending command to reject`);
    }
    const pending = session.pendingCommand;
    session.pendingCommand = null;
    session.status = "running";
    session.updatedAt = new Date().toISOString();
    session.lastReason = reason;
    session.events.push(
      createEvent(session.step, "command_rejected", `Rejected: ${pending.cli}`, {
        reason
      })
    );
    return cloneSession(session);
  }

  pause(sessionId: string): AgentSession {
    const record = this.sessions.get(sessionId);
    if (!record) {
      throw new Error(`Unknown session: ${sessionId}`);
    }
    this.setStatus(record, "paused", "Session paused by user");
    return cloneSession(record.session);
  }

  resume(sessionId: string): AgentSession {
    const record = this.sessions.get(sessionId);
    if (!record) {
      throw new Error(`Unknown session: ${sessionId}`);
    }
    this.setStatus(record, "running", "Session resumed by user");
    return cloneSession(record.session);
  }

  cancel(sessionId: string): AgentSession {
    const record = this.sessions.get(sessionId);
    if (!record) {
      throw new Error(`Unknown session: ${sessionId}`);
    }
    record.session.pendingCommand = null;
    this.setStatus(record, "cancelled", "Session cancelled by user");
    return cloneSession(record.session);
  }

  reportError(
    sessionId: string,
    message: string,
    payload?: Record<string, unknown>
  ): AgentSession {
    const record = this.sessions.get(sessionId);
    if (!record) {
      throw new Error(`Unknown session: ${sessionId}`);
    }
    const session = record.session;
    session.updatedAt = new Date().toISOString();
    session.lastReason = message;
    session.events.push(createEvent(session.step, "error", message, payload));
    return cloneSession(session);
  }
}
