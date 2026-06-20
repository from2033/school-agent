"""FastAPI 入口：建表 + seed、挂载静态目录与路由、放开 CORS（小程序联调用）。"""
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


@app.get("/")
def health():
    return {"ok": True, "service": "学习管家 API", "ai": bool(config.ANTHROPIC_API_KEY)}
