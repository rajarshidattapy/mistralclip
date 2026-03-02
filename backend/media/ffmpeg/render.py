import subprocess
from datetime import UTC, datetime
from pathlib import Path

from backend.config import settings
from backend.media.ffmpeg.builder import build_ffmpeg_command
from backend.timeline.model import Asset, Timeline


def render_timeline(timeline: Timeline, assets: list[Asset]) -> dict[str, str | bool]:
    settings.exports_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
    output_path = settings.exports_dir / f"{timeline.project_id}-{stamp}.mp4"
    command = build_ffmpeg_command(timeline, assets, output_path)

    try:
        subprocess.run(command, check=True, capture_output=True, text=True)
        return {
            "success": True,
            "url": str(output_path),
            "message": "export completed",
        }
    except FileNotFoundError:
        fallback = _write_fallback(output_path, command, "ffmpeg binary not found")
        return {
            "success": False,
            "url": str(fallback),
            "message": "ffmpeg not installed; wrote fallback command file",
        }
    except subprocess.CalledProcessError as exc:
        fallback = _write_fallback(output_path, command, exc.stderr or exc.stdout)
        return {
            "success": False,
            "url": str(fallback),
            "message": "ffmpeg failed; wrote fallback command file",
        }


def _write_fallback(output_path: Path, command: list[str], error_text: str) -> Path:
    fallback_path = output_path.with_suffix(".export.txt")
    fallback_path.write_text(
        "\n".join(
            [
                "FFmpeg render failed.",
                "",
                "Command:",
                " ".join(command),
                "",
                "Error:",
                error_text or "<empty>",
            ]
        ),
        encoding="utf-8",
    )
    return fallback_path

