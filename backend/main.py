from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import assets, chat, export, timeline
from backend.config import settings

app = FastAPI(title=settings.project_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(assets.router)
app.include_router(timeline.router)
app.include_router(chat.router)
app.include_router(export.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

