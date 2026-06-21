"""FastAPI 入口：API + 上传目录 + Web App。"""
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import config
from db import init_db
from routers import auth, downloads, messages, mistakes, onebot, papers, stats

app = FastAPI(title="小明的学习管家 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def web_app_cache_control(request, call_next):
    response = await call_next(request)
    if request.url.path in {"/app", "/app/", "/app/manifest.webmanifest"}:
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


@app.on_event("startup")
def _startup() -> None:
    init_db()


# 上传的错题图片可通过 /uploads/<file> 直接访问
app.mount("/uploads", StaticFiles(directory=config.UPLOAD_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(mistakes.router)
app.include_router(messages.router)
app.include_router(downloads.router)
app.include_router(papers.router)
app.include_router(stats.router)
app.include_router(onebot.router)

# Vite 构建后的 Safari Web App。路由放在所有 API 后面，避免吞掉 /api。
WEB_DIST = Path(__file__).resolve().parent.parent / "dist"
if WEB_DIST.exists():
    app.mount("/app", StaticFiles(directory=WEB_DIST, html=True), name="web-app")


@app.get("/")
def health():
    return {"ok": True, "service": "学习管家 API", "ai": bool(config.ANTHROPIC_API_KEY)}
