import { useMemo, useState } from "react";
import type { AgentSession } from "../../shared/types";

interface AgentConsoleProps {
  session: AgentSession | null;
  loading: boolean;
  lastStdout: string | null;
  onStartSession: (goal: string) => Promise<void>;
  onNextStep: () => Promise<void>;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onCancel: () => Promise<void>;
  onRunCommandLine: (commandLine: string) => Promise<void>;
}

function canPlanNext(status: AgentSession["status"]): boolean {
  return status === "running";
}

function canApprove(status: AgentSession["status"], pending: boolean): boolean {
  return status === "awaiting_approval" && pending;
}

export function AgentConsole(props: AgentConsoleProps): JSX.Element {
  const [goal, setGoal] = useState("Inspect timeline and report current structure");
  const [rejectReason, setRejectReason] = useState("Rejected by user");
  const [commandLine, setCommandLine] = useState("mistralclip list-assets");

  const pending = props.session?.pendingCommand ?? null;
  const status = props.session?.status ?? "idle";
  const eventCount = props.session?.events.length ?? 0;

  const sortedEvents = useMemo(
    () => [...(props.session?.events ?? [])].sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    [props.session]
  );

  return (
    <aside className="agent-console">
      <header className="agent-header">
        <div>
          <h2>Agent Console</h2>
          <p>Visible, supervised CLI-style execution with approvals and interrupts</p>
        </div>
        <div className="agent-badges">
          <span>{status}</span>
          <span>{eventCount} events</span>
        </div>
      </header>

      <section className="panel form-panel">
        <h3>Session</h3>
        <label>
          Goal
          <textarea value={goal} rows={3} onChange={(event) => setGoal(event.target.value)} />
        </label>
        <div className="inline-buttons">
          <button onClick={() => void props.onStartSession(goal)} disabled={props.loading}>
            Start session
          </button>
          <button
            onClick={() => void props.onNextStep()}
            disabled={props.loading || !props.session || !canPlanNext(props.session.status)}
          >
            Plan next step
          </button>
          <button
            onClick={() => void props.onApprove()}
            disabled={props.loading || !canApprove(props.session?.status ?? "running", Boolean(pending))}
          >
            Approve step
          </button>
        </div>
        <div className="inline-buttons">
          <button
            onClick={() => void props.onPause()}
            disabled={props.loading || !props.session || props.session.status === "paused"}
          >
            Pause
          </button>
          <button
            onClick={() => void props.onResume()}
            disabled={props.loading || !props.session || props.session.status !== "paused"}
          >
            Resume
          </button>
          <button onClick={() => void props.onCancel()} disabled={props.loading || !props.session}>
            Cancel
          </button>
        </div>
        <label>
          Reject reason
          <input value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} />
        </label>
        <button
          onClick={() => void props.onReject(rejectReason)}
          disabled={props.loading || !canApprove(props.session?.status ?? "running", Boolean(pending))}
        >
          Reject pending step
        </button>
      </section>

      <section className="panel form-panel">
        <h3>Pending Command</h3>
        {pending ? (
          <>
            <p className="mono">{pending.cli}</p>
            <p className="muted">{pending.rationale}</p>
            <pre className="events">{JSON.stringify(pending.args, null, 2)}</pre>
          </>
        ) : (
          <p className="muted">No pending command.</p>
        )}
      </section>

      <section className="panel form-panel">
        <h3>Command Runner</h3>
        <label>
          CLI command
          <input value={commandLine} onChange={(event) => setCommandLine(event.target.value)} />
        </label>
        <button onClick={() => void props.onRunCommandLine(commandLine)} disabled={props.loading}>
          Run command
        </button>
        {props.lastStdout ? <pre className="events">{props.lastStdout}</pre> : null}
      </section>

      <section className="panel form-panel">
        <h3>Execution Log</h3>
        <div className="event-list">
          {sortedEvents.length === 0 ? <p className="muted">No events yet.</p> : null}
          {sortedEvents.map((event) => (
            <article key={event.id} className={`event event-${event.type}`}>
              <p className="event-title">
                <span>{event.type}</span>
                <span className="mono">step {event.step}</span>
                <span className="mono">{new Date(event.timestamp).toLocaleTimeString()}</span>
              </p>
              <p>{event.message}</p>
              {event.payload ? <pre className="events">{JSON.stringify(event.payload, null, 2)}</pre> : null}
            </article>
          ))}
        </div>
      </section>
    </aside>
  );
}

