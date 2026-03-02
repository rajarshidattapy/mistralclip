from fastapi import APIRouter, Depends, HTTPException

from backend.ai.schemas import MutateRequest, UndoRequest
from backend.api.deps import execute_tool, get_store
from backend.state.store import StateStore
from backend.timeline.model import Timeline

router = APIRouter(prefix="/timeline", tags=["timeline"])


@router.get("/{project_id}")
def get_timeline(project_id: str, store: StateStore = Depends(get_store)) -> Timeline:
    return store.get_timeline(project_id)


@router.post("/mutate")
def mutate_timeline(
    request: MutateRequest,
    store: StateStore = Depends(get_store),
) -> Timeline:
    result = execute_tool(request.project_id, request.tool, request.args, store)
    if result.status == "error":
        raise HTTPException(status_code=400, detail=result.message)
    return store.get_timeline(request.project_id)


@router.post("/undo")
def undo_timeline(
    request: UndoRequest,
    store: StateStore = Depends(get_store),
) -> Timeline:
    timeline = store.undo(request.project_id)
    if timeline is None:
        raise HTTPException(status_code=400, detail="no undo history")
    return timeline

