import json
from typing import List, Optional

from fastapi import APIRouter, Depends

from auth import current_user
from db import db
from models import Message

router = APIRouter(prefix="/api/messages", tags=["messages"])


@router.get("", response_model=List[Message])
def list_messages(
    type: Optional[str] = None,
    date: Optional[str] = None,        # YYYY-MM-DD，按消息日期过滤
    user=Depends(current_user),
):
    clauses, params = [], []
    if type and type != "all":
        clauses.append("type = ?")
        params.append(type)
    if date:
        clauses.append("date = ?")
        params.append(date)
    where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
    with db() as conn:
        rows = conn.execute(
            f"SELECT * FROM messages{where} ORDER BY id DESC", params
        ).fetchall()

    def imgs(r):
        try:
            return json.loads(r["images_json"]) if "images_json" in r.keys() and r["images_json"] else []
        except Exception:
            return []

    def field(r, name):
        return r[name] if name in r.keys() else None

    return [
        Message(
            id=r["id"], teacher=r["teacher"], avatar=r["avatar"], content=r["content"],
            time=r["time"], date=field(r, "date"), type=r["type"], important=bool(r["important"]),
            images=imgs(r),
        )
        for r in rows
    ]
