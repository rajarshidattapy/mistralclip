from backend.ai.schemas import AddClipArgs
from backend.timeline import mutator
from backend.timeline.model import Timeline
from backend.utils.ids import new_id

TOOL_NAME = "add_clip"


def run(timeline: Timeline, raw_args: dict) -> Timeline:
    args = AddClipArgs.model_validate(raw_args)
    clip_id = args.clip_id or new_id("clip")
    return mutator.add_clip(
        timeline,
        clip_id=clip_id,
        asset_id=args.asset_id,
        start=args.start,
        end=args.end,
        timeline_start=args.timeline_start,
        track=args.track,
        level=args.level,
    )

