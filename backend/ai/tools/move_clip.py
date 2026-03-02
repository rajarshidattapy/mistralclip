from backend.ai.schemas import MoveClipArgs
from backend.timeline import mutator
from backend.timeline.model import Timeline

TOOL_NAME = "move_clip"


def run(timeline: Timeline, raw_args: dict) -> Timeline:
    args = MoveClipArgs.model_validate(raw_args)
    return mutator.move_clip(
        timeline,
        clip_id=args.clip_id,
        timeline_start=args.timeline_start,
    )

