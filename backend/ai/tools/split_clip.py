from backend.ai.schemas import SplitClipArgs
from backend.timeline import mutator
from backend.timeline.model import Timeline
from backend.utils.ids import new_id

TOOL_NAME = "split_clip"


def run(timeline: Timeline, raw_args: dict) -> Timeline:
    args = SplitClipArgs.model_validate(raw_args)
    new_clip_id = args.new_clip_id or new_id("clip")
    return mutator.split_clip(
        timeline,
        clip_id=args.clip_id,
        split_at=args.split_at,
        new_clip_id=new_clip_id,
    )

