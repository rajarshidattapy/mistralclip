from backend.ai.schemas import SetAudioLevelArgs
from backend.timeline import mutator
from backend.timeline.model import Timeline

TOOL_NAME = "set_audio_level"


def run(timeline: Timeline, raw_args: dict) -> Timeline:
    args = SetAudioLevelArgs.model_validate(raw_args)
    return mutator.set_audio_level(
        timeline,
        clip_id=args.clip_id,
        level=args.level,
    )

