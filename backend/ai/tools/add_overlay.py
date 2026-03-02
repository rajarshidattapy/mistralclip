from backend.ai.schemas import AddOverlayArgs
from backend.timeline import mutator
from backend.timeline.model import Timeline
from backend.utils.ids import new_id

TOOL_NAME = "add_overlay"


def run(timeline: Timeline, raw_args: dict) -> Timeline:
    args = AddOverlayArgs.model_validate(raw_args)
    overlay_id = args.overlay_id or new_id("overlay")
    return mutator.add_overlay(
        timeline,
        overlay_id=overlay_id,
        asset_id=args.asset_id,
        text=args.text,
        timeline_start=args.timeline_start,
        duration=args.duration,
        x=args.x,
        y=args.y,
        font_size=args.font_size,
        color=args.color,
    )

