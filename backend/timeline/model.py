from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ClipBase(BaseModel):
    id: str
    asset_id: str
    start: float = Field(ge=0)
    end: float = Field(gt=0)
    timeline_start: float = Field(ge=0)
    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="after")
    def check_range(self) -> "ClipBase":
        if self.end <= self.start:
            raise ValueError("clip.end must be greater than clip.start")
        return self


class VideoClip(ClipBase):
    pass


class AudioClip(ClipBase):
    level: float = Field(default=1.0, ge=0.0, le=2.0)


class OverlayClip(BaseModel):
    id: str
    asset_id: str | None = None
    text: str | None = None
    start: float = Field(default=0, ge=0)
    end: float = Field(gt=0)
    timeline_start: float = Field(ge=0)
    x: float = 0.1
    y: float = 0.1
    font_size: int = Field(default=36, ge=8, le=192)
    color: str = "white"
    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="after")
    def check_overlay(self) -> "OverlayClip":
        if self.asset_id is None and self.text is None:
            raise ValueError("overlay requires asset_id or text")
        if self.end <= self.start:
            raise ValueError("overlay.end must be greater than overlay.start")
        return self


class Transition(BaseModel):
    id: str
    type: Literal["fade", "crossfade"] = "fade"
    from_clip_id: str
    to_clip_id: str
    duration: float = Field(default=0.5, gt=0)
    model_config = ConfigDict(extra="forbid")


class Tracks(BaseModel):
    video: list[VideoClip] = Field(default_factory=list)
    audio: list[AudioClip] = Field(default_factory=list)
    overlay: list[OverlayClip] = Field(default_factory=list)


class Timeline(BaseModel):
    project_id: str
    duration: float = Field(default=0, ge=0)
    tracks: Tracks = Field(default_factory=Tracks)
    transitions: list[Transition] = Field(default_factory=list)


class Asset(BaseModel):
    id: str
    name: str
    path: str
    kind: Literal["video", "audio", "image", "unknown"] = "unknown"
    mime_type: str = "application/octet-stream"
    size_bytes: int = Field(ge=0)
    duration: float | None = None

