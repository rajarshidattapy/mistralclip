from backend.ai.schemas import AddTransitionArgs
from backend.timeline import mutator
from backend.timeline.model import Timeline
from backend.utils.ids import new_id

TOOL_NAME = "add_transition"


def run(timeline: Timeline, raw_args: dict) -> Timeline:
    args = AddTransitionArgs.model_validate(raw_args)
    transition_id = args.transition_id or new_id("transition")
    return mutator.add_transition(
        timeline,
        transition_id=transition_id,
        transition_type=args.type,
        from_clip_id=args.from_clip_id,
        to_clip_id=args.to_clip_id,
        duration=args.duration,
    )

