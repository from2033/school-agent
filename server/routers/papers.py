"""练习卷生成：根据最近一阶段的错题，AI 出同知识点的变式新题，
渲染成「试卷.pdf」「答案.pdf」两个文件并放入「文件」列表，供打印。"""
import json
import time
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

import config
import paper
from ai import AIAnalysisError, generate_practice_paper
from auth import current_user
from db import db

router = APIRouter(prefix="/api/papers", tags=["papers"])


class GenerateRequest(BaseModel):
    days: int = 14


@router.post("/generate")
def generate(req: GenerateRequest, user=Depends(current_user)):
    days = req.days if req.days and req.days > 0 else 14

    with db() as conn:
        rows = conn.execute(
            "SELECT subject, topic, analysis, tags_json FROM mistakes "
            "WHERE date(created_at) >= date('now', ?) ORDER BY id DESC",
            (f"-{days} days",),
        ).fetchall()
    if not rows:
        raise HTTPException(status_code=400, detail=f"最近 {days} 天还没有错题，先上传几道再生成")

    mistakes = [
        {
            "subject": r["subject"],
            "topic": r["topic"],
            "analysis": r["analysis"],
            "tags": json.loads(r["tags_json"] or "[]"),
        }
        for r in rows
    ]

    try:
        data = generate_practice_paper(mistakes)
    except AIAnalysisError as exc:
        raise HTTPException(status_code=502, detail=f"出题失败，请重试（{exc}）")

    ts = int(time.time())
    label = date.today().strftime("%m月%d日")
    title = data["title"]
    subtitle = f"根据最近{days}天错题生成 · {label} · 共{len(data['items'])}题"

    q_path = config.FILES_DIR / f"paper_{ts}_q.pdf"
    a_path = config.FILES_DIR / f"paper_{ts}_a.pdf"
    paper.build_question_pdf(str(q_path), title, subtitle, data["items"])
    paper.build_answer_pdf(str(a_path), title, subtitle, data["items"])

    q_name = f"练习卷_{label}.pdf"
    a_name = f"练习卷_{label}_答案.pdf"
    with db() as conn:
        for name, p in ((q_name, q_path), (a_name, a_path)):
            conn.execute(
                "INSERT INTO downloads (name, subject, size_bytes, file_path, created_at) "
                "VALUES (?,?,?,?, datetime('now'))",
                (name, "练习卷", p.stat().st_size, str(p)),
            )

    return {"ok": True, "count": len(data["items"]), "files": [q_name, a_name]}
