from pathlib import Path

from backend.timeline.model import Asset, Timeline


def build_ffmpeg_command(timeline: Timeline, assets: list[Asset], output_path: Path) -> list[str]:
    """
    Minimal MVP render path:
    - If there are no clips, render a black slate at timeline duration.
    - If clips exist, use timeline duration for black slate placeholder.

    The timeline remains the source of truth and this can be expanded to full
    clip-accurate filter graph logic without changing API shape.
    """
    duration = max(timeline.duration, 1.0)
    return [
        "ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        f"color=c=black:s=1280x720:d={duration}",
        "-pix_fmt",
        "yuv420p",
        str(output_path),
    ]

