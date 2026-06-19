import json
import time
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

import config
from ai import analyze_mistake
from auth import current_user
from db import db
from models import FocusPoint, Mistake

router = APIRouter(prefix="/api/mistakes", tags=["mistakes"])


def _row_to_mistake(row) -> Mistake:
    focus = [FocusPoint(**fp) for fp in json.loads(row["focus_json"] or "[]")]
    return Mistake(
        id=row["id"],
        subject=row["subject"],
        topic=row["topic"],
        image_path=f"/uploads/{Path(row['image_path']).name}" if row["image_path"] else None,
        analysis=row["analysis"],
        focus_points=focus,
        steps=json.loads(row["steps_json"] or "[]"),
        difficulty=row["difficulty"],
        tags=json.loads(row["tags_json"] or "[]"),
        created_at=row["created_at"],
    )


@router.get("", response_model=List[Mistake])
def list_mistakes(subject: Optional[str] = None, user=Depends(current_user)):
    with db() as conn:
        if subject and subject != "全部":
            rows = conn.execute(
                "SELECT * FROM mistakes WHERE subject = ? ORDER BY id DESC", (subject,)
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM mistakes ORDER BY id DESC").fetchall()
    return [_row_to_mistake(r) for r in rows]


@router.get("/{mistake_id}", response_model=Mistake)
def get_mistake(mistake_id: int, user=Depends(current_user)):
    with db() as conn:
        row = conn.execute("SELECT * FROM mistakes WHERE id = ?", (mistake_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="错题不存在")
    return _row_to_mistake(row)


@router.post("", response_model=Mistake)
async def create_mistake(
    subject: str = Form(...),
    note: str = Form(""),            # 可选补充说明（学生备注），题目名由 AI 生成
    image: Optional[UploadFile] = File(None),
    user=Depends(current_user),
):
    image_path: Optional[str] = None
    if image is not None:
        suffix = Path(image.filename or "").suffix or ".jpg"
        fname = f"{user['user_id']}_{int(time.time() * 1000)}{suffix}"
        dest = config.UPLOAD_DIR / fname
        dest.write_bytes(await image.read())
        image_path = str(dest)

    # AI 看图分析，并自动命名 topic
    result = analyze_mistake(subject, note, image_path)

    with db() as conn:
        cur = conn.execute(
            "INSERT INTO mistakes (user_id, subject, topic, image_path, analysis, focus_json, steps_json, difficulty, tags_json, created_at)"
            " VALUES (?,?,?,?,?,?,?,?,?, date('now'))",
            (
                user["user_id"], result["subject"], result["topic"], image_path,
                result["analysis"],
                json.dumps(result["focus_points"], ensure_ascii=False),
                json.dumps(result["steps"], ensure_ascii=False),
                result["difficulty"], json.dumps(result["tags"], ensure_ascii=False),
            ),
        )
        row = conn.execute("SELECT * FROM mistakes WHERE id = ?", (cur.lastrowid,)).fetchone()
    return _row_to_mistake(row)
