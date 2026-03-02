from backend.timeline.model import ClipBase, Timeline


EPSILON = 1e-6


def clip_duration(clip: ClipBase) -> float:
    return clip.end - clip.start


def clip_timeline_end(clip: ClipBase) -> float:
    return clip.timeline_start + clip_duration(clip)


def sort_clips_by_start(clips: list[ClipBase]) -> list[ClipBase]:
    return sorted(clips, key=lambda clip: clip.timeline_start)


def ensure_no_overlap(clips: list[ClipBase], track_name: str) -> None:
    ordered = sort_clips_by_start(clips)
    for index in range(len(ordered) - 1):
        current_clip = ordered[index]
        next_clip = ordered[index + 1]
        if clip_timeline_end(current_clip) > next_clip.timeline_start + EPSILON:
            raise ValueError(f"overlap detected on {track_name} track")


def find_clip_by_id(timeline: Timeline, clip_id: str) -> ClipBase | None:
    for clip in timeline.tracks.video:
        if clip.id == clip_id:
            return clip
    for clip in timeline.tracks.audio:
        if clip.id == clip_id:
            return clip
    return None


def validate_transitions(timeline: Timeline) -> None:
    video_map = {clip.id: clip for clip in timeline.tracks.video}
    for transition in timeline.transitions:
        source = video_map.get(transition.from_clip_id)
        target = video_map.get(transition.to_clip_id)
        if source is None or target is None:
            raise ValueError("transition must reference existing video clips")
        source_end = clip_timeline_end(source)
        if abs(source_end - target.timeline_start) > EPSILON:
            raise ValueError("transitions can only connect adjacent clips")


def recompute_duration(timeline: Timeline) -> float:
    ends: list[float] = []
    ends.extend(clip_timeline_end(clip) for clip in timeline.tracks.video)
    ends.extend(clip_timeline_end(clip) for clip in timeline.tracks.audio)
    ends.extend(clip_timeline_end(clip) for clip in timeline.tracks.overlay)
    return max(ends, default=0.0)


def validate_timeline(timeline: Timeline) -> Timeline:
    ensure_no_overlap(timeline.tracks.video, "video")
    ensure_no_overlap(timeline.tracks.audio, "audio")
    validate_transitions(timeline)
    timeline.duration = recompute_duration(timeline)
    return timeline

