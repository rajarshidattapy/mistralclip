from backend.ai.schemas import RemoveClipArgs
from backend.timeline import mutator
from backend.timeline.model import Timeline

TOOL_NAME = "remove_clip"


def run(timeline: Timeline, raw_args: dict) -> Timeline:
    args = RemoveClipArgs.model_validate(raw_args)
    return mutator.remove_clip(timeline, clip_id=args.clip_id)

