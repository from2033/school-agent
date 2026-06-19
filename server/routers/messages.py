from typing import List, Optional

from fastapi import APIRouter, Depends

from auth import current_user
from db import db
from models import Message

router = APIRouter(prefix="/api/messages", tags=["messages"])


@router.get("", response_model=List[Message])
def list_messages(type: Optional[str] = None, user=Depends(current_user)):
    with db() as conn:
        if type and type != "all":
            rows = conn.execute("SELECT * FROM messages WHERE type = ? ORDER BY id DESC", (type,)).fetchall()
        else:
            rows = conn.execute("SELECT * FROM messages ORDER BY id DESC").fetchall()
    return [
        Message(
            id=r["id"], teacher=r["teacher"], avatar=r["avatar"], content=r["content"],
            time=r["time"], type=r["type"], important=bool(r["important"]),
        )
        for r in rows
    ]
