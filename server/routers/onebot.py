"""接收 OneBot 11 群消息事件。

该接口用于 NapCat 等非官方 QQ 桥接器。它不登录 QQ，只接收桥接器主动
POST 过来的事件。请使用群白名单和 access token，并优先使用专门 QQ 小号。
"""
from __future__ import annotations

from datetime import datetime
from secrets import compare_digest
from typing import Any, Optional

from fastapi import APIRouter, Header, HTTPException, Request

import config
from db import db

router = APIRouter(prefix="/api/integrations/onebot", tags=["onebot"])

TYPE_KEYWORDS = {
    "homework": ["作业", "练习", "周记", "打卡", "课本"],
    "notice": ["通知", "家长会", "会议", "放假", "请假"],
    "praise": ["表扬", "优秀", "出色", "值得", "点赞"],
    "reminder": ["提醒", "订正", "检查", "注意", "截止"],
}


def _classify(content: str) -> str:
    for message_type, keywords in TYPE_KEYWORDS.items():
        if any(keyword in content for keyword in keywords):
            return message_type
    return "notice"


def _extract_content(event: dict[str, Any]) -> str:
    message = event.get("message")
    if isinstance(message, str):
        return message.strip()
    if not isinstance(message, list):
        return str(event.get("raw_message") or "").strip()

    parts: list[str] = []
    for segment in message:
        if not isinstance(segment, dict):
            continue
        kind = segment.get("type")
        data = segment.get("data") or {}
        if kind == "text":
            parts.append(str(data.get("text") or ""))
        elif kind == "image":
            parts.append("[图片]")
        elif kind == "file":
            parts.append(f"[文件：{data.get('name') or '未命名'}]")
        elif kind == "reply":
            parts.append("[回复]")
    return "".join(parts).strip()


def _authorized(authorization: Optional[str], x_access_token: Optional[str]) -> bool:
    expected = config.ONEBOT_ACCESS_TOKEN
    if not expected:
        return True
    candidate = x_access_token or ""
    if authorization and authorization.lower().startswith("bearer "):
        candidate = authorization[7:].strip()
    return compare_digest(candidate, expected)


@router.post("/events")
async def receive_event(
    request: Request,
    authorization: Optional[str] = Header(default=None),
    x_access_token: Optional[str] = Header(default=None),
):
    if not _authorized(authorization, x_access_token):
        raise HTTPException(status_code=401, detail="OneBot access token 无效")

    event = await request.json()
    if event.get("post_type") != "message" or event.get("message_type") != "group":
        return {"status": "ignored", "reason": "not_group_message"}

    group_id = str(event.get("group_id") or "")
    sender_id = str(event.get("user_id") or "")
    message_id = str(event.get("message_id") or "")
    if config.QQ_GROUP_IDS and group_id not in config.QQ_GROUP_IDS:
        return {"status": "ignored", "reason": "group_not_allowed"}
    if sender_id and sender_id == str(event.get("self_id") or ""):
        return {"status": "ignored", "reason": "self_message"}

    sender = event.get("sender") or {}
    teacher = str(sender.get("card") or sender.get("nickname") or sender_id or "QQ 群成员").strip()
    is_teacher_id = bool(config.QQ_TEACHER_IDS and sender_id in config.QQ_TEACHER_IDS)
    is_teacher_name = any(keyword in teacher for keyword in config.QQ_TEACHER_NAME_KEYWORDS)
    if not config.QQ_CAPTURE_ALL and not is_teacher_id and not is_teacher_name:
        return {"status": "ignored", "reason": "not_teacher"}

    content = _extract_content(event)
    if not content:
        return {"status": "ignored", "reason": "empty_message"}

    timestamp = event.get("time")
    try:
        display_time = datetime.fromtimestamp(int(timestamp)).strftime("%H:%M")
    except (TypeError, ValueError, OSError):
        display_time = datetime.now().strftime("%H:%M")

    message_type = _classify(content)
    important = int(message_type in {"homework", "notice"})
    external_id = message_id or f"{group_id}:{sender_id}:{timestamp}:{hash(content)}"

    with db() as conn:
        exists = conn.execute(
            "SELECT id FROM messages WHERE source = 'onebot' AND external_id = ?",
            (external_id,),
        ).fetchone()
        if exists:
            return {"status": "duplicate", "id": exists["id"]}

        cursor = conn.execute(
            "INSERT INTO messages "
            "(teacher, avatar, content, time, type, important, source, external_id, group_id, sender_id) "
            "VALUES (?,?,?,?,?,?,?,?,?,?)",
            (
                teacher,
                teacher[:1] or "Q",
                content,
                display_time,
                message_type,
                important,
                "onebot",
                external_id,
                group_id,
                sender_id,
            ),
        )
        row_id = cursor.lastrowid

    return {"status": "ok", "id": row_id, "type": message_type}


@router.get("/status")
def status():
    return {
        "enabled": bool(config.ONEBOT_ACCESS_TOKEN),
        "group_whitelist_count": len(config.QQ_GROUP_IDS),
        "teacher_whitelist_count": len(config.QQ_TEACHER_IDS),
        "capture_all": config.QQ_CAPTURE_ALL,
    }
