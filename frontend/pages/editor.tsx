import { useEffect, useMemo, useState } from "react";
import { AgentConsole } from "../components/AgentConsole";
import { Inspector } from "../components/Inspector";
import { Timeline } from "../components/Timeline";
import { projectStore, useProjectStore } from "../state/projectStore";

function useTextTrackId(): string {
  const { project } = useProjectStore();
  return useMemo(() => project.tracks.find((track) => track.type === "text")?.id ?? "", [project]);
}

export function EditorPage(): JSX.Element {
  const state = useProjectStore();
  const textTrackId = useTextTrackId();

  const [assetType, setAssetType] = useState<"video" | "audio" | "image">("video");
  const [assetName, setAssetName] = useState("Demo Asset");
  const [assetPath, setAssetPath] = useState("C:/media/demo.mp4");
  const [assetDurationMs, setAssetDurationMs] = useState("10000");

  const [mediaTrackId, setMediaTrackId] = useState("");
  const [mediaClipId, setMediaClipId] = useState("clip_demo");
  const [mediaAssetId, setMediaAssetId] = useState("");
  const [mediaStartMs, setMediaStartMs] = useState("0");
  const [mediaInMs, setMediaInMs] = useState("0");
  const [mediaOutMs, setMediaOutMs] = useState("5000");

  const [textClipId, setTextClipId] = useState("text_demo");
  const [textValue, setTextValue] = useState("OpenCut");
  const [textStartMs, setTextStartMs] = useState("0");
  const [textDurationMs, setTextDurationMs] = useState("3000");
  const [textX, setTextX] = useState("120");
  const [textY, setTextY] = useState("120");
  const [textSize, setTextSize] = useState("56");
  const [textColor, setTextColor] = useState("white");

  const [renderOutput, setRenderOutput] = useState("C:/media/opencut-export.mp4");
  const [renderExecute, setRenderExecute] = useState(false);

  useEffect(() => {
    void projectStore.fetchProject();
  }, []);

  useEffect(() => {
    if (!mediaTrackId) {
      const firstVideo = state.project.tracks.find((track) => track.type === "video");
      if (firstVideo) {
        setMediaTrackId(firstVideo.id);
      }
    }
  }, [state.project.tracks, mediaTrackId]);

  useEffect(() => {
    if (!mediaAssetId) {
      const firstVideoAsset = state.project.assets.find((asset) => asset.type === "video");
      if (firstVideoAsset) {
        setMediaAssetId(firstVideoAsset.id);
      }
    }
  }, [state.project.assets, mediaAssetId]);

  return (
    <main className="editor-layout">
      <header className="hero">
        <div>
          <h1>OpenCut</h1>
          <p>Agent-operated video editor with deterministic state and swappable models</p>
        </div>
        <div className="hero-meta">
          <span>v{state.project.metadata.version}</span>
          <span>{state.loading ? "Busy" : "Ready"}</span>
        </div>
      </header>

      <section className="split-screen">
        <section className="editor-pane">
          <Timeline
            project={state.project}
            selectedClipId={state.selectedClipId}
            onSelectClip={(trackId, clipId) => projectStore.selectClip(trackId, clipId)}
          />
          <Inspector
            project={state.project}
            selectedTrackId={state.selectedTrackId}
            selectedClipId={state.selectedClipId}
          />
        </section>

        <AgentConsole
          session={state.agentSession}
          loading={state.loading}
          lastStdout={state.lastCommandStdout}
          onStartSession={async (goal) => projectStore.startAgentSession(goal)}
          onNextStep={async () => projectStore.agentNextStep()}
          onApprove={async () => projectStore.agentApproveStep()}
          onReject={async (reason) => projectStore.agentRejectStep(reason)}
          onPause={async () => projectStore.agentPause()}
          onResume={async () => projectStore.agentResume()}
          onCancel={async () => projectStore.agentCancel()}
          onRunCommandLine={async (commandLine) => projectStore.executeCommandLine(commandLine)}
        />
      </section>

      <section className="controls">
        <article className="panel form-panel">
          <h2>Tracks</h2>
          <div className="inline-buttons">
            <button onClick={() => void projectStore.addTrack("video")}>Add video track</button>
            <button onClick={() => void projectStore.addTrack("audio")}>Add audio track</button>
            <button onClick={() => void projectStore.addTrack("text")}>Add text track</button>
          </div>
        </article>

        <article className="panel form-panel">
          <h2>Add Asset</h2>
          <label>
            Type
            <select value={assetType} onChange={(event) => setAssetType(event.target.value as "video" | "audio" | "image")}>
              <option value="video">video</option>
              <option value="audio">audio</option>
              <option value="image">image</option>
            </select>
          </label>
          <label>
            Name
            <input value={assetName} onChange={(event) => setAssetName(event.target.value)} />
          </label>
          <label>
            File path
            <input value={assetPath} onChange={(event) => setAssetPath(event.target.value)} />
          </label>
          <label>
            Duration (ms)
            <input value={assetDurationMs} onChange={(event) => setAssetDurationMs(event.target.value)} />
          </label>
          <button
            onClick={() =>
              void projectStore.addAsset({
                type: assetType,
                name: assetName,
                path: assetPath,
                durationMs: Number(assetDurationMs)
              })
            }
          >
            Add asset
          </button>
        </article>

        <article className="panel form-panel">
          <h2>Add Media Clip</h2>
          <label>
            Track id
            <input value={mediaTrackId} onChange={(event) => setMediaTrackId(event.target.value)} />
          </label>
          <label>
            Clip id
            <input value={mediaClipId} onChange={(event) => setMediaClipId(event.target.value)} />
          </label>
          <label>
            Asset id
            <input value={mediaAssetId} onChange={(event) => setMediaAssetId(event.target.value)} />
          </label>
          <label>
            Start (ms)
            <input value={mediaStartMs} onChange={(event) => setMediaStartMs(event.target.value)} />
          </label>
          <label>
            In (ms)
            <input value={mediaInMs} onChange={(event) => setMediaInMs(event.target.value)} />
          </label>
          <label>
            Out (ms)
            <input value={mediaOutMs} onChange={(event) => setMediaOutMs(event.target.value)} />
          </label>
          <button
            onClick={() =>
              void projectStore.runTool("add_clip", {
                trackId: mediaTrackId,
                clipId: mediaClipId,
                assetId: mediaAssetId,
                startMs: Number(mediaStartMs),
                inMs: Number(mediaInMs),
                outMs: Number(mediaOutMs)
              })
            }
          >
            Add clip
          </button>
        </article>

        <article className="panel form-panel">
          <h2>Add Text Overlay</h2>
          <label>
            Track id
            <input value={textTrackId} readOnly />
          </label>
          <label>
            Clip id
            <input value={textClipId} onChange={(event) => setTextClipId(event.target.value)} />
          </label>
          <label>
            Text
            <input value={textValue} onChange={(event) => setTextValue(event.target.value)} />
          </label>
          <label>
            Start (ms)
            <input value={textStartMs} onChange={(event) => setTextStartMs(event.target.value)} />
          </label>
          <label>
            Duration (ms)
            <input value={textDurationMs} onChange={(event) => setTextDurationMs(event.target.value)} />
          </label>
          <label>
            X
            <input value={textX} onChange={(event) => setTextX(event.target.value)} />
          </label>
          <label>
            Y
            <input value={textY} onChange={(event) => setTextY(event.target.value)} />
          </label>
          <label>
            Font size
            <input value={textSize} onChange={(event) => setTextSize(event.target.value)} />
          </label>
          <label>
            Color
            <input value={textColor} onChange={(event) => setTextColor(event.target.value)} />
          </label>
          <button
            disabled={!textTrackId}
            onClick={() =>
              void projectStore.runTool("add_text_overlay", {
                trackId: textTrackId,
                clipId: textClipId,
                text: textValue,
                startMs: Number(textStartMs),
                durationMs: Number(textDurationMs),
                x: Number(textX),
                y: Number(textY),
                fontSize: Number(textSize),
                color: textColor
              })
            }
          >
            Add text overlay
          </button>
        </article>

        <article className="panel form-panel">
          <h2>Render MP4</h2>
          <label>
            Output path
            <input value={renderOutput} onChange={(event) => setRenderOutput(event.target.value)} />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={renderExecute}
              onChange={(event) => setRenderExecute(event.target.checked)}
            />
            Execute ffmpeg now
          </label>
          <button onClick={() => void projectStore.render(renderOutput, renderExecute)}>Render</button>
          <p className="muted">
            {state.renderCommand
              ? "Render command prepared:"
              : "If unchecked, the backend returns the generated ffmpeg command without running it."}
          </p>
          {state.renderCommand ? <pre className="events">{state.renderCommand}</pre> : null}
        </article>
      </section>

      {state.error ? <p className="error-banner">{state.error}</p> : null}
    </main>
  );
}
