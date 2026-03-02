from backend.timeline.model import AudioClip, OverlayClip, Timeline, Transition, VideoClip
from backend.timeline.validator import EPSILON, validate_timeline


def _clone(timeline: Timeline) -> Timeline:
    return timeline.model_copy(deep=True)


def _find_clip(timeline: Timeline, clip_id: str) -> tuple[str, int]:
    for index, clip in enumerate(timeline.tracks.video):
        if clip.id == clip_id:
            return ("video", index)
    for index, clip in enumerate(timeline.tracks.audio):
        if clip.id == clip_id:
            return ("audio", index)
    for index, clip in enumerate(timeline.tracks.overlay):
        if clip.id == clip_id:
            return ("overlay", index)
    raise ValueError(f"clip not found: {clip_id}")


def _has_clip_id(timeline: Timeline, clip_id: str) -> bool:
    try:
        _find_clip(timeline, clip_id)
        return True
    except ValueError:
        return False


def add_clip(
    timeline: Timeline,
    *,
    clip_id: str,
    asset_id: str,
    start: float,
    end: float,
    timeline_start: float,
    track: str = "video",
    level: float = 1.0,
) -> Timeline:
    updated = _clone(timeline)
    if _has_clip_id(updated, clip_id):
        return updated

    if track == "video":
        updated.tracks.video.append(
            VideoClip(
                id=clip_id,
                asset_id=asset_id,
                start=start,
                end=end,
                timeline_start=timeline_start,
            )
        )
        updated.tracks.video.sort(key=lambda clip: clip.timeline_start)
    elif track == "audio":
        updated.tracks.audio.append(
            AudioClip(
                id=clip_id,
                asset_id=asset_id,
                start=start,
                end=end,
                timeline_start=timeline_start,
                level=level,
            )
        )
        updated.tracks.audio.sort(key=lambda clip: clip.timeline_start)
    else:
        raise ValueError("track must be video or audio")

    return validate_timeline(updated)


def remove_clip(timeline: Timeline, *, clip_id: str) -> Timeline:
    updated = _clone(timeline)

    before = (
        len(updated.tracks.video),
        len(updated.tracks.audio),
        len(updated.tracks.overlay),
    )
    updated.tracks.video = [clip for clip in updated.tracks.video if clip.id != clip_id]
    updated.tracks.audio = [clip for clip in updated.tracks.audio if clip.id != clip_id]
    updated.tracks.overlay = [clip for clip in updated.tracks.overlay if clip.id != clip_id]
    updated.transitions = [
        transition
        for transition in updated.transitions
        if transition.from_clip_id != clip_id and transition.to_clip_id != clip_id
    ]
    after = (
        len(updated.tracks.video),
        len(updated.tracks.audio),
        len(updated.tracks.overlay),
    )
    if before == after:
        return updated
    return validate_timeline(updated)


def move_clip(timeline: Timeline, *, clip_id: str, timeline_start: float) -> Timeline:
    updated = _clone(timeline)
    track_name, index = _find_clip(updated, clip_id)
    if track_name == "video":
        updated.tracks.video[index].timeline_start = timeline_start
        updated.tracks.video.sort(key=lambda clip: clip.timeline_start)
    elif track_name == "audio":
        updated.tracks.audio[index].timeline_start = timeline_start
        updated.tracks.audio.sort(key=lambda clip: clip.timeline_start)
    else:
        updated.tracks.overlay[index].timeline_start = timeline_start
    return validate_timeline(updated)


def trim_clip(
    timeline: Timeline,
    *,
    clip_id: str,
    start: float | None = None,
    end: float | None = None,
) -> Timeline:
    updated = _clone(timeline)
    track_name, index = _find_clip(updated, clip_id)

    if track_name == "video":
        clip = updated.tracks.video[index]
    elif track_name == "audio":
        clip = updated.tracks.audio[index]
    else:
        clip = updated.tracks.overlay[index]

    if start is not None:
        clip.start = start
    if end is not None:
        clip.end = end
    if clip.end <= clip.start:
        raise ValueError("trim range is invalid")

    return validate_timeline(updated)


def split_clip(
    timeline: Timeline,
    *,
    clip_id: str,
    split_at: float,
    new_clip_id: str,
) -> Timeline:
    updated = _clone(timeline)
    track_name, index = _find_clip(updated, clip_id)
    if track_name not in {"video", "audio"}:
        raise ValueError("split_clip only supports video/audio clips")

    if track_name == "video":
        source = updated.tracks.video[index]
        track = updated.tracks.video
        clip_cls = VideoClip
    else:
        source = updated.tracks.audio[index]
        track = updated.tracks.audio
        clip_cls = AudioClip

    clip_timeline_end = source.timeline_start + (source.end - source.start)
    if split_at <= source.timeline_start + EPSILON or split_at >= clip_timeline_end - EPSILON:
        raise ValueError("split point must be inside clip")

    source_offset = split_at - source.timeline_start
    split_source_time = source.start + source_offset
    old_end = source.end

    source.end = split_source_time

    payload = {
        "id": new_clip_id,
        "asset_id": source.asset_id,
        "start": split_source_time,
        "end": old_end,
        "timeline_start": split_at,
    }
    if track_name == "audio":
        payload["level"] = source.level
    track.append(clip_cls(**payload))
    track.sort(key=lambda clip: clip.timeline_start)
    return validate_timeline(updated)


def add_transition(
    timeline: Timeline,
    *,
    transition_id: str,
    transition_type: str,
    from_clip_id: str,
    to_clip_id: str,
    duration: float,
) -> Timeline:
    updated = _clone(timeline)
    if any(existing.id == transition_id for existing in updated.transitions):
        return updated

    updated.transitions.append(
        Transition(
            id=transition_id,
            type=transition_type,  # type: ignore[arg-type]
            from_clip_id=from_clip_id,
            to_clip_id=to_clip_id,
            duration=duration,
        )
    )
    return validate_timeline(updated)


def add_overlay(
    timeline: Timeline,
    *,
    overlay_id: str,
    asset_id: str | None,
    text: str | None,
    timeline_start: float,
    duration: float,
    x: float = 0.1,
    y: float = 0.1,
    font_size: int = 36,
    color: str = "white",
) -> Timeline:
    updated = _clone(timeline)
    if _has_clip_id(updated, overlay_id):
        return updated

    updated.tracks.overlay.append(
        OverlayClip(
            id=overlay_id,
            asset_id=asset_id,
            text=text,
            start=0,
            end=duration,
            timeline_start=timeline_start,
            x=x,
            y=y,
            font_size=font_size,
            color=color,
        )
    )
    return validate_timeline(updated)


def set_audio_level(timeline: Timeline, *, clip_id: str, level: float) -> Timeline:
    updated = _clone(timeline)
    if level < 0 or level > 2:
        raise ValueError("audio level must be between 0 and 2")
    for clip in updated.tracks.audio:
        if clip.id == clip_id:
            clip.level = level
            return validate_timeline(updated)
    raise ValueError(f"audio clip not found: {clip_id}")

