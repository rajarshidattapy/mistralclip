from backend.ai.schemas import TrimClipArgs
from backend.timeline import mutator
from backend.timeline.model import Timeline

TOOL_NAME = "trim_clip"


def run(timeline: Timeline, raw_args: dict) -> Timeline:
    args = TrimClipArgs.model_validate(raw_args)
    return mutator.trim_clip(
        timeline,
        clip_id=args.clip_id,
        start=args.start,
        end=args.end,
    )

