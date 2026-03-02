from fastapi import APIRouter, Depends, HTTPException

from backend.ai.schemas import ChatRequest, ChatResponse
from backend.api.deps import execute_tool, get_agent, get_store
from backend.state.store import StateStore

router = APIRouter(tags=["chat"])


@router.post("/chat")
def chat(
    request: ChatRequest,
    store: StateStore = Depends(get_store),
) -> ChatResponse:
    timeline = store.get_timeline(request.project_id)
    agent = get_agent()

    try:
        tool_calls = agent.plan_tool_calls(
            message=request.message,
            timeline=timeline,
            assets=store.list_assets(),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    results = []
    for tool_call in tool_calls:
        result = execute_tool(request.project_id, tool_call.tool, tool_call.args, store)
        results.append(result)
        if result.status == "error":
            break

    return ChatResponse(
        tool_calls=tool_calls,
        results=results,
        timeline=store.get_timeline(request.project_id),
    )

