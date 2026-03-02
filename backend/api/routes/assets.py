from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from backend.api.deps import get_store
from backend.config import settings
from backend.media.storage import infer_asset_kind, save_upload
from backend.state.store import StateStore
from backend.timeline.model import Asset
from backend.utils.ids import new_id

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("")
def list_assets(store: StateStore = Depends(get_store)) -> list[Asset]:
    return store.list_assets()


@router.post("/upload")
def upload_asset(
    file: UploadFile = File(...),
    store: StateStore = Depends(get_store),
) -> Asset:
    asset_id = new_id("asset")
    output_path, size_bytes, mime_type = save_upload(file, settings.assets_dir, asset_id)
    name = file.filename or Path(output_path).name
    asset = Asset(
        id=asset_id,
        name=name,
        path=str(output_path),
        kind=infer_asset_kind(mime_type),
        mime_type=mime_type,
        size_bytes=size_bytes,
    )
    return store.add_asset(asset)


@router.get("/{asset_id}/file")
def get_asset_file(asset_id: str, store: StateStore = Depends(get_store)) -> FileResponse:
    asset = store.get_asset(asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="asset not found")
    if not Path(asset.path).exists():
        raise HTTPException(status_code=404, detail="asset file missing on disk")
    return FileResponse(path=asset.path, media_type=asset.mime_type, filename=asset.name)
