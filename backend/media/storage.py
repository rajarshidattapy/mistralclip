from pathlib import Path
from typing import Literal

from fastapi import UploadFile


def infer_asset_kind(mime_type: str) -> Literal["video", "audio", "image", "unknown"]:
    if mime_type.startswith("video/"):
        return "video"
    if mime_type.startswith("audio/"):
        return "audio"
    if mime_type.startswith("image/"):
        return "image"
    return "unknown"


def save_upload(file: UploadFile, assets_dir: Path, asset_id: str) -> tuple[Path, int, str]:
    assets_dir.mkdir(parents=True, exist_ok=True)
    source_name = file.filename or "asset"
    extension = Path(source_name).suffix
    output_path = assets_dir / f"{asset_id}{extension}"
    content = file.file.read()
    output_path.write_bytes(content)
    mime_type = file.content_type or "application/octet-stream"
    return output_path, len(content), mime_type

