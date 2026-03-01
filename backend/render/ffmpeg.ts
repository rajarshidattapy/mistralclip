import { spawn } from "node:child_process";
import type { Clip, MediaClip, ProjectState, TextClip } from "../../shared/types";

interface RenderOptions {
  outputPath: string;
  ffmpegPath?: string;
  execute?: boolean;
}

interface RenderResult {
  command: string;
  args: string[];
  executed: boolean;
  stdout: string;
  stderr: string;
}

function escapeDrawtext(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
}

function mediaClips(project: ProjectState): MediaClip[] {
  return project.tracks
    .flatMap((track) => track.clips)
    .filter((clip): clip is MediaClip => clip.clipType === "media")
    .sort((a, b) => a.startMs - b.startMs);
}

function textClips(project: ProjectState): TextClip[] {
  return project.tracks
    .filter((track) => track.type === "text")
    .flatMap((track) => track.clips)
    .filter((clip): clip is TextClip => clip.clipType === "text")
    .sort((a, b) => a.startMs - b.startMs);
}

function clipDurationSeconds(clip: Clip): string {
  return ((clip.outMs - clip.inMs) / 1000).toFixed(3);
}

function clipStartSeconds(clip: Clip): string {
  return (clip.startMs / 1000).toFixed(3);
}

function buildFilterComplex(project: ProjectState, clips: MediaClip[], overlays: TextClip[]): string {
  const width = project.metadata.width;
  const height = project.metadata.height;
  const duration = (project.durationMs / 1000).toFixed(3);
  const chains: string[] = [`color=c=black:s=${width}x${height}:d=${duration}[base0]`];

  clips.forEach((clip, index) => {
    chains.push(
      `[${index}:v]setpts=PTS-STARTPTS+${clipStartSeconds(clip)}/TB,scale=${width}:${height}[clip${index}]`
    );
  });

  let current = "base0";
  clips.forEach((_clip, index) => {
    const next = `base${index + 1}`;
    chains.push(`[${current}][clip${index}]overlay=shortest=0[${next}]`);
    current = next;
  });

  overlays.forEach((overlay, index) => {
    const next = `text${index + 1}`;
    const start = (overlay.startMs / 1000).toFixed(3);
    const end = ((overlay.startMs + (overlay.outMs - overlay.inMs)) / 1000).toFixed(3);
    chains.push(
      `[${current}]drawtext=text='${escapeDrawtext(overlay.text)}':x=${overlay.style.x}:y=${overlay.style.y}:fontsize=${overlay.style.fontSize}:fontcolor=${overlay.style.color}:enable='between(t,${start},${end})'[${next}]`
    );
    current = next;
  });

  chains.push(`[${current}]format=yuv420p[outv]`);
  return chains.join(";");
}

function buildRenderArgs(project: ProjectState, outputPath: string): string[] {
  const clips = mediaClips(project);
  if (clips.length === 0) {
    throw new Error("No media clips found. Add at least one media clip before rendering.");
  }

  const args: string[] = ["-y"];
  for (const clip of clips) {
    const asset = project.assets.find((candidate) => candidate.id === clip.assetId);
    if (!asset) {
      throw new Error(`Missing asset for clip ${clip.id}: ${clip.assetId}`);
    }
    args.push("-ss", (clip.inMs / 1000).toFixed(3));
    args.push("-t", clipDurationSeconds(clip));
    args.push("-i", asset.path);
  }

  const overlays = textClips(project);
  args.push("-filter_complex", buildFilterComplex(project, clips, overlays));
  args.push("-map", "[outv]");
  args.push("-r", String(project.metadata.fps));
  args.push("-an");
  args.push("-c:v", "libx264");
  args.push("-pix_fmt", "yuv420p");
  args.push(outputPath);

  return args;
}

export async function renderProjectWithFfmpeg(
  project: ProjectState,
  options: RenderOptions
): Promise<RenderResult> {
  const ffmpegPath = options.ffmpegPath ?? "ffmpeg";
  const args = buildRenderArgs(project, options.outputPath);
  const command = `${ffmpegPath} ${args.join(" ")}`;

  if (!options.execute) {
    return {
      command,
      args,
      executed: false,
      stdout: "",
      stderr: ""
    };
  }

  return new Promise<RenderResult>((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg exited with code ${code}\n${stderr}`));
        return;
      }
      resolve({
        command,
        args,
        executed: true,
        stdout,
        stderr
      });
    });
  });
}

