import json
import time
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

import config
from ai import AIAnalysisError, analyze_mistake
from auth import current_user
from db import db
from models import FocusPoint, Mistake

router = APIRouter(prefix="/api/mistakes", tags=["mistakes"])


def _row_keys(row) -> set:
    return set(row.keys())


def _raw_images(row) -> list:
    """该题的全部图片绝对路径：优先 images_json，旧库回退到单列 image_path。"""
    raw = []
    if "images_json" in _row_keys(row):
        raw = json.loads(row["images_json"] or "[]")
    if not raw and row["image_path"]:
        raw = [row["image_path"]]
    return [p for p in raw if p]


def _row_to_mistake(row) -> Mistake:
    focus = [FocusPoint(**fp) for fp in json.loads(row["focus_json"] or "[]")]
    images = [f"/uploads/{Path(p).name}" for p in _raw_images(row)]
    return Mistake(
        id=row["id"],
        subject=row["subject"],
        topic=row["topic"],
        image_path=images[0] if images else None,
        images=images,
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
    subject: Optional[str] = Form(None),  # 不再要求前端选学科，由 AI 看图判断
    note: str = Form(""),                 # 可选补充说明（学生备注），题目名由 AI 生成
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

    # AI 看图分析，并自动命名 topic。失败时不落库假数据，删除已存图片并报错让前端重试。
    try:
        result = analyze_mistake(subject, note, [image_path] if image_path else [])
    except AIAnalysisError as exc:
        if image_path and Path(image_path).exists():
            Path(image_path).unlink(missing_ok=True)
        raise HTTPException(status_code=502, detail=f"AI 分析失败，请重试（{exc}）")

    images_json = json.dumps([image_path] if image_path else [], ensure_ascii=False)
    with db() as conn:
        cur = conn.execute(
            "INSERT INTO mistakes (user_id, subject, topic, image_path, images_json, analysis, focus_json, steps_json, difficulty, tags_json, created_at)"
            " VALUES (?,?,?,?,?,?,?,?,?,?, date('now'))",
            (
                user["user_id"], result["subject"], result["topic"], image_path, images_json,
                result["analysis"],
                json.dumps(result["focus_points"], ensure_ascii=False),
                json.dumps(result["steps"], ensure_ascii=False),
                result["difficulty"], json.dumps(result["tags"], ensure_ascii=False),
            ),
        )
        row = conn.execute("SELECT * FROM mistakes WHERE id = ?", (cur.lastrowid,)).fetchone()
    return _row_to_mistake(row)


@router.post("/{mistake_id}/images", response_model=Mistake)
async def add_image(
    mistake_id: int,
    image: UploadFile = File(...),
    analyze: str = Form("true"),  # 多图追加时，前端只在最后一张传 true，避免重复分析
    user=Depends(current_user),
):
    """给已有错题追加一张图片。analyze=true 时用该题全部图片重新分析。"""
    with db() as conn:
        row = conn.execute("SELECT * FROM mistakes WHERE id = ?", (mistake_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="错题不存在")

    suffix = Path(image.filename or "").suffix or ".jpg"
    fname = f"{user['user_id']}_{int(time.time() * 1000)}{suffix}"
    dest = config.UPLOAD_DIR / fname
    dest.write_bytes(await image.read())
    new_path = str(dest)

    all_paths = _raw_images(row) + [new_path]
    images_json = json.dumps(all_paths, ensure_ascii=False)
    do_analyze = str(analyze).lower() not in ("false", "0", "no")

    if not do_analyze:
        # 仅追加图片，不分析（多图上传的中间几张）
        with db() as conn:
            conn.execute(
                "UPDATE mistakes SET image_path=?, images_json=? WHERE id=?",
                (all_paths[0], images_json, mistake_id),
            )
            row = conn.execute("SELECT * FROM mistakes WHERE id = ?", (mistake_id,)).fetchone()
        return _row_to_mistake(row)

    # 综合该题所有图片重新分析；沿用原学科作为提示。失败则回滚新图、保留原记录。
    try:
        result = analyze_mistake(row["subject"], "", all_paths)
    except AIAnalysisError as exc:
        Path(new_path).unlink(missing_ok=True)
        raise HTTPException(status_code=502, detail=f"AI 分析失败，请重试（{exc}）")

    with db() as conn:
        conn.execute(
            "UPDATE mistakes SET subject=?, topic=?, image_path=?, images_json=?, analysis=?,"
            " focus_json=?, steps_json=?, difficulty=?, tags_json=? WHERE id=?",
            (
                result["subject"], result["topic"], all_paths[0], images_json,
                result["analysis"],
                json.dumps(result["focus_points"], ensure_ascii=False),
                json.dumps(result["steps"], ensure_ascii=False),
                result["difficulty"], json.dumps(result["tags"], ensure_ascii=False),
                mistake_id,
            ),
        )
        row = conn.execute("SELECT * FROM mistakes WHERE id = ?", (mistake_id,)).fetchone()
    return _row_to_mistake(row)
