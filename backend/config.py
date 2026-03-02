from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    project_name: str = "MistralClip API"
    allow_origins: str = "http://localhost:3000"

    data_dir: Path = Path("backend/.data")
    assets_dir: Path = Path("backend/.data/assets")
    exports_dir: Path = Path("backend/.data/exports")
    state_file: Path = Path("backend/.data/state.json")

    mistral_api_key: str | None = None
    mistral_model: str = "mistral-large-latest"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allow_origins.split(",") if origin.strip()]


settings = Settings()
settings.assets_dir.mkdir(parents=True, exist_ok=True)
settings.exports_dir.mkdir(parents=True, exist_ok=True)
settings.state_file.parent.mkdir(parents=True, exist_ok=True)
