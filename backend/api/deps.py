from fastapi import HTTPException

from backend.ai.schemas import ToolExecution
from backend.ai.agent import ToolCallingAgent
from backend.ai.tools import NON_MUTATING_TOOLS, TOOL_REGISTRY
from backend.media.ffmpeg.render import render_timeline
from backend.state.store import StateStore

_store: StateStore | None = None
_agent: ToolCallingAgent | None = None


def get_store() -> StateStore:
    global _store
    if _store is None:
        _store = StateStore()
    return _store


def get_agent() -> ToolCallingAgent:
    global _agent
    if _agent is None:
        _agent = ToolCallingAgent()
    return _agent


def execute_tool(project_id: str, tool: str, args: dict, store: StateStore) -> ToolExecution:
    if tool in TOOL_REGISTRY:
        if tool == "add_clip":
            asset_id = args.get("asset_id")
            if not isinstance(asset_id, str) or store.get_asset(asset_id) is None:
                return ToolExecution(
                    tool="add_clip",
                    status="error",
                    message="asset_id must reference an existing uploaded asset",
                    data={},
                )
        if tool == "add_overlay":
            asset_id = args.get("asset_id")
            if asset_id is not None and (
                not isinstance(asset_id, str) or store.get_asset(asset_id) is None
            ):
                return ToolExecution(
                    tool="add_overlay",
                    status="error",
                    message="overlay asset_id must reference an existing uploaded asset",
                    data={},
                )

        timeline = store.get_timeline(project_id)
        store.push_undo(project_id, timeline)
        try:
            updated = TOOL_REGISTRY[tool](timeline, args)
        except ValueError as exc:
            return ToolExecution(tool=tool, status="error", message=str(exc), data={})
        store.set_timeline(project_id, updated)
        return ToolExecution(tool=tool, status="ok", message="applied", data={})

    if tool in NON_MUTATING_TOOLS and tool == "export_project":
        timeline = store.get_timeline(project_id)
        result = render_timeline(timeline, store.list_assets())
        return ToolExecution(
            tool="export_project",
            status="ok" if bool(result["success"]) else "error",
            message=str(result["message"]),
            data={"url": str(result["url"]), "success": bool(result["success"])},
        )

    raise HTTPException(status_code=400, detail=f"unknown tool: {tool}")
