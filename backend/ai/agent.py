import json
import re
from typing import Any

from backend.ai.prompt import SYSTEM_PROMPT
from backend.ai.schemas import ToolCall
from backend.config import settings
from backend.timeline.model import Asset, Timeline

TOOL_NAMES = [
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


class ToolCallingAgent:
    def plan_tool_calls(
        self,
        *,
        message: str,
        timeline: Timeline,
        assets: list[Asset],
    ) -> list[ToolCall]:
        parsed_json = self._parse_json_tool_calls(message)
        if parsed_json:
            return parsed_json

        model_calls = self._plan_with_mistral(message, timeline, assets)
        if model_calls:
            return model_calls

        heuristic_call = self._plan_with_rules(message)
        if heuristic_call:
            return [heuristic_call]

        raise ValueError(
            "could not map message to a tool call. "
            "Use explicit command like: trim clip <id> to <seconds>."
        )

    def _parse_json_tool_calls(self, message: str) -> list[ToolCall] | None:
        stripped = message.strip()
        if not stripped.startswith("{"):
            return None
        try:
            payload = json.loads(stripped)
        except json.JSONDecodeError:
            return None
        if "tool_calls" in payload and isinstance(payload["tool_calls"], list):
            return [ToolCall.model_validate(entry) for entry in payload["tool_calls"]]
        if "tool" in payload:
            return [ToolCall.model_validate(payload)]
        return None

    def _plan_with_mistral(
        self,
        message: str,
        timeline: Timeline,
        assets: list[Asset],
    ) -> list[ToolCall] | None:
        if not settings.mistral_api_key:
            return None
        try:
            from langchain_mistralai import ChatMistralAI
        except Exception:
            return None

        llm = ChatMistralAI(
            api_key=settings.mistral_api_key,
            model=settings.mistral_model,
            temperature=0,
        )
        prompt = self._build_model_prompt(message=message, timeline=timeline, assets=assets)
        try:
            result = llm.invoke(prompt)
        except Exception:
            return None

        content = result.content if isinstance(result.content, str) else str(result.content)
        try:
            payload = json.loads(content)
        except json.JSONDecodeError:
            return None

        calls = payload.get("tool_calls")
        if not isinstance(calls, list):
            return None
        return [ToolCall.model_validate(call) for call in calls]

    def _build_model_prompt(self, *, message: str, timeline: Timeline, assets: list[Asset]) -> str:
        return "\n".join(
            [
                SYSTEM_PROMPT,
                "",
                "Return JSON only in this shape:",
                '{"tool_calls":[{"tool":"trim_clip","args":{"clip_id":"clip_1","end":3.2}}]}',
                "",
                f"Available tools: {TOOL_NAMES}",
                f"Assets: {[asset.model_dump(mode='json') for asset in assets]}",
                f"Timeline: {timeline.model_dump(mode='json')}",
                f"User: {message}",
            ]
        )

    def _plan_with_rules(self, message: str) -> ToolCall | None:
        text = message.strip()
        lower = text.lower()

        match = re.search(r"trim clip (\S+) to (\d+(\.\d+)?)", lower)
        if match:
            return ToolCall(
                tool="trim_clip",
                args={"clip_id": match.group(1), "end": float(match.group(2))},
            )

        match = re.search(r"move clip (\S+) to (\d+(\.\d+)?)", lower)
        if match:
            return ToolCall(
                tool="move_clip",
                args={"clip_id": match.group(1), "timeline_start": float(match.group(2))},
            )

        match = re.search(r"split clip (\S+) at (\d+(\.\d+)?)", lower)
        if match:
            return ToolCall(
                tool="split_clip",
                args={"clip_id": match.group(1), "split_at": float(match.group(2))},
            )

        match = re.search(r"remove clip (\S+)", lower)
        if match:
            return ToolCall(
                tool="remove_clip",
                args={"clip_id": match.group(1)},
            )

        match = re.search(r"set audio (\S+) to (\d+(\.\d+)?)", lower)
        if match:
            return ToolCall(
                tool="set_audio_level",
                args={"clip_id": match.group(1), "level": float(match.group(2))},
            )

        match = re.search(r"(fade|crossfade) (\S+) (\S+)(?: (\d+(\.\d+)?))?", lower)
        if match:
            duration = float(match.group(4)) if match.group(4) else 0.5
            return ToolCall(
                tool="add_transition",
                args={
                    "type": match.group(1),
                    "from_clip_id": match.group(2),
                    "to_clip_id": match.group(3),
                    "duration": duration,
                },
            )

        text_overlay_match = re.search(
            r'add text "(.*?)" at (\d+(\.\d+)?) for (\d+(\.\d+)?)',
            text,
            re.IGNORECASE,
        )
        if text_overlay_match:
            return ToolCall(
                tool="add_overlay",
                args={
                    "text": text_overlay_match.group(1),
                    "timeline_start": float(text_overlay_match.group(2)),
                    "duration": float(text_overlay_match.group(4)),
                },
            )

        if "export" in lower:
            return ToolCall(tool="export_project", args={})

        add_clip_match = re.search(
            r"add clip (\S+) at (\d+(\.\d+)?) for (\d+(\.\d+)?)",
            lower,
        )
        if add_clip_match:
            asset_id = add_clip_match.group(1)
            timeline_start = float(add_clip_match.group(2))
            duration = float(add_clip_match.group(4))
            return ToolCall(
                tool="add_clip",
                args={
                    "asset_id": asset_id,
                    "start": 0,
                    "end": duration,
                    "timeline_start": timeline_start,
                },
            )

        return None

