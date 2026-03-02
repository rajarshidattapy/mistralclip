from fastapi import APIRouter, Depends

from backend.ai.schemas import ExportRequest, ExportResponse
from backend.api.deps import execute_tool, get_store
from backend.state.store import StateStore

router = APIRouter(tags=["export"])


@router.post("/export")
def export_project(
    request: ExportRequest,
    store: StateStore = Depends(get_store),
) -> ExportResponse:
    result = execute_tool(request.project_id, "export_project", {}, store)
    return ExportResponse(
        project_id=request.project_id,
        success=result.status == "ok",
        url=str(result.data.get("url", "")),
        message=result.message,
    )

