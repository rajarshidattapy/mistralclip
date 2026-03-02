from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

from backend.timeline.model import Timeline


ToolName = Literal[
    "add_clip",
    "remove_clip",
    "move_clip",
    "trim_clip",
    "split_clip",
    "add_transition",
    "add_overlay",
    "set_audio_level",
    "export_project",
]


class ToolCall(BaseModel):
    tool: ToolName
    args: dict[str, Any] = Field(default_factory=dict)


class ToolExecution(BaseModel):
    tool: ToolName
    status: Literal["ok", "error"]
    message: str
    data: dict[str, Any] = Field(default_factory=dict)


class MutateRequest(BaseModel):
    project_id: str = "default"
    tool: ToolName
    args: dict[str, Any] = Field(default_factory=dict)


class UndoRequest(BaseModel):
    project_id: str = "default"


class ChatRequest(BaseModel):
    project_id: str = "default"
    message: str


class ChatResponse(BaseModel):
    tool_calls: list[ToolCall]
    results: list[ToolExecution]
    timeline: Timeline


class ExportRequest(BaseModel):
    project_id: str = "default"


class ExportResponse(BaseModel):
    project_id: str
    success: bool
    url: str
    message: str


class AddClipArgs(BaseModel):
    asset_id: str
    start: float = Field(default=0, ge=0)
    end: float = Field(gt=0)
    timeline_start: float = Field(ge=0)
    clip_id: str | None = None
    track: Literal["video", "audio"] = "video"
    level: float = Field(default=1.0, ge=0, le=2)

    @model_validator(mode="after")
    def check_range(self) -> "AddClipArgs":
        if self.end <= self.start:
            raise ValueError("end must be greater than start")
        return self


class RemoveClipArgs(BaseModel):
    clip_id: str


class MoveClipArgs(BaseModel):
    clip_id: str
    timeline_start: float = Field(ge=0)


class TrimClipArgs(BaseModel):
    clip_id: str
    start: float | None = Field(default=None, ge=0)
    end: float | None = Field(default=None, gt=0)


class SplitClipArgs(BaseModel):
    clip_id: str
    split_at: float = Field(gt=0)
    new_clip_id: str | None = None


class AddTransitionArgs(BaseModel):
    from_clip_id: str
    to_clip_id: str
    duration: float = Field(default=0.5, gt=0)
    type: Literal["fade", "crossfade"] = "fade"
    transition_id: str | None = None


class AddOverlayArgs(BaseModel):
    timeline_start: float = Field(ge=0)
    duration: float = Field(gt=0)
    overlay_id: str | None = None
    asset_id: str | None = None
    text: str | None = None
    x: float = 0.1
    y: float = 0.1
    font_size: int = Field(default=36, ge=8, le=192)
    color: str = "white"

    @model_validator(mode="after")
    def validate_source(self) -> "AddOverlayArgs":
        if self.asset_id is None and self.text is None:
            raise ValueError("overlay requires asset_id or text")
        return self


class SetAudioLevelArgs(BaseModel):
    clip_id: str
    level: float = Field(ge=0, le=2)

