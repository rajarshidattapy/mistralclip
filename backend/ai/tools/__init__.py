from collections.abc import Callable

from backend.ai.tools import (
    add_clip,
    add_overlay,
    add_transition,
    move_clip,
    remove_clip,
    set_audio_level,
    split_clip,
    trim_clip,
)
from backend.timeline.model import Timeline

ToolRunner = Callable[[Timeline, dict], Timeline]

TOOL_REGISTRY: dict[str, ToolRunner] = {
    add_clip.TOOL_NAME: add_clip.run,
    remove_clip.TOOL_NAME: remove_clip.run,
    move_clip.TOOL_NAME: move_clip.run,
    trim_clip.TOOL_NAME: trim_clip.run,
    split_clip.TOOL_NAME: split_clip.run,
    add_transition.TOOL_NAME: add_transition.run,
    add_overlay.TOOL_NAME: add_overlay.run,
    set_audio_level.TOOL_NAME: set_audio_level.run,
}

NON_MUTATING_TOOLS = {"export_project"}
