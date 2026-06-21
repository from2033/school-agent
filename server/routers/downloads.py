import io
import mimetypes
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse

from auth import current_user
from db import db
from models import Download

router = APIRouter(prefix="/api/downloads", tags=["downloads"])

OFFICE_TYPES = {
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
}


@router.get("", response_model=List[Download])
def list_downloads(date: Optional[str] = None, user=Depends(current_user)):
    with db() as conn:
        if date:
            rows = conn.execute(
                "SELECT * FROM downloads WHERE date(created_at) = ? ORDER BY id DESC",
                (date,),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM downloads ORDER BY id DESC").fetchall()
    return [
        Download(
            id=r["id"], name=r["name"], subject=r["subject"],
            size_bytes=r["size_bytes"], created_at=r["created_at"],
        )
        for r in rows
    ]


@router.get("/{download_id}/file")
def download_file(download_id: int):
    # 注：文件下载接口不要求 JWT —— wx.downloadFile 不便带自定义头，且文件本身非敏感。
    with db() as conn:
        row = conn.execute("SELECT * FROM downloads WHERE id = ?", (download_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="资料不存在")

    if row["file_path"]:
        suffix = Path(row["name"]).suffix.lower()
        media_type = OFFICE_TYPES.get(suffix) or mimetypes.guess_type(row["name"])[0] or "application/octet-stream"
        return FileResponse(row["file_path"], filename=row["name"], media_type=media_type)

    # seed 数据没有真实文件：返回占位文本，保证下载流程可演示
    placeholder = (
        f"这是「{row['name']}」的占位文件。\n\n"
        "真实部署时由 scripts/qq_sync.py 把导出的 QQ 群资料同步到 files/ 目录，"
        "此处即返回真实文件。\n"
    ).encode("utf-8")
    return StreamingResponse(
        io.BytesIO(placeholder),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="placeholder.txt"'},
    )
