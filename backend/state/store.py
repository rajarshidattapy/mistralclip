from pathlib import Path
from threading import RLock

from backend.config import settings
from backend.state.persistence import load_state, save_state
from backend.timeline.model import Asset, Timeline
from backend.timeline.undo import UndoManager


class StateStore:
    def __init__(self, state_file: Path | None = None) -> None:
        self._state_file = state_file or settings.state_file
        self._lock = RLock()
        self._undo = UndoManager()
        payload = load_state(self._state_file)

        self._projects: dict[str, Timeline] = {
            project_id: Timeline.model_validate(data)
            for project_id, data in payload.get("projects", {}).items()
        }
        self._assets: dict[str, Asset] = {
            asset_id: Asset.model_validate(data)
            for asset_id, data in payload.get("assets", {}).items()
        }

    def _persist(self) -> None:
        save_state(
            self._state_file,
            {
                "projects": {
                    project_id: timeline.model_dump(mode="json")
                    for project_id, timeline in self._projects.items()
                },
                "assets": {
                    asset_id: asset.model_dump(mode="json")
                    for asset_id, asset in self._assets.items()
                },
            },
        )

    def list_assets(self) -> list[Asset]:
        with self._lock:
            return list(self._assets.values())

    def add_asset(self, asset: Asset) -> Asset:
        with self._lock:
            self._assets[asset.id] = asset
            self._persist()
            return asset

    def get_asset(self, asset_id: str) -> Asset | None:
        with self._lock:
            return self._assets.get(asset_id)

    def get_timeline(self, project_id: str) -> Timeline:
        with self._lock:
            timeline = self._projects.get(project_id)
            if timeline is None:
                timeline = Timeline(project_id=project_id)
                self._projects[project_id] = timeline
                self._persist()
            return timeline.model_copy(deep=True)

    def set_timeline(self, project_id: str, timeline: Timeline) -> Timeline:
        with self._lock:
            self._projects[project_id] = timeline.model_copy(deep=True)
            self._persist()
            return self._projects[project_id].model_copy(deep=True)

    def push_undo(self, project_id: str, timeline: Timeline) -> None:
        with self._lock:
            self._undo.push(project_id, timeline)

    def undo(self, project_id: str) -> Timeline | None:
        with self._lock:
            previous = self._undo.pop(project_id)
            if previous is None:
                return None
            self._projects[project_id] = previous
            self._persist()
            return previous.model_copy(deep=True)

