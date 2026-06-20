"""接收 OneBot 11 事件（NapCat 等桥接器推送）。

- 群消息(message/group)：老师过滤 → 文本入 messages；图片下载到 /uploads 并在小程序显示。
- 群文件(notice/group_upload)：老师上传的文件下载到服务器 → 进 downloads 表（下载/打印区）。

不登录 QQ，只接收桥接器主动 POST 的事件。请用群白名单 + access token，优先专门小号。
"""
from __future__ import annotations

import json
import time
import mimetypes
from datetime import datetime
from pathlib import Path
from secrets import compare_digest
from typing import Any, Optional

import httpx
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


def _parse_message(event: dict[str, Any]) -> tuple[str, list[dict], list[dict]]:
    """返回 (文本, 图片段列表, 文件段列表)。"""
    message = event.get("message")
    if isinstance(message, str):
        return message.strip(), [], []
    if not isinstance(message, list):
        return str(event.get("raw_message") or "").strip(), [], []

    texts: list[str] = []
    images: list[dict] = []
    files: list[dict] = []
    for seg in message:
        if not isinstance(seg, dict):
            continue
        kind = seg.get("type")
        data = seg.get("data") or {}
        if kind == "text":
            texts.append(str(data.get("text") or ""))
        elif kind == "image":
            images.append(data)
        elif kind == "file":
            files.append(data)
        elif kind == "reply":
            texts.append("")
    return "".join(texts).strip(), images, files


async def _download(url: str, dest_dir: Path, stem: str, default_ext: str) -> Optional[str]:
    """下载 url 到目录，返回保存的文件名；失败返回 None。"""
    try:
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            r = await client.get(url)
            r.raise_for_status()
            ext = Path(url.split("?")[0]).suffix
            if not ext:
                ext = mimetypes.guess_extension(r.headers.get("content-type", "").split(";")[0]) or default_ext
            name = f"{stem}{ext}"
            (dest_dir / name).write_bytes(r.content)
            return name
    except Exception:  # noqa: BLE001
        return None


async def _napcat(action: str, payload: dict) -> dict:
    headers = {"Content-Type": "application/json"}
    if config.ONEBOT_ACCESS_TOKEN:
        headers["Authorization"] = f"Bearer {config.ONEBOT_ACCESS_TOKEN}"
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(f"{config.NAPCAT_API_URL}/{action}", json=payload, headers=headers)
        return r.json()


def _authorized(authorization: Optional[str], x_access_token: Optional[str]) -> bool:
    expected = config.ONEBOT_ACCESS_TOKEN
    if not expected:
        return True
    candidate = x_access_token or ""
    if authorization and authorization.lower().startswith("bearer "):
        candidate = authorization[7:].strip()
    return compare_digest(candidate, expected)


def _is_teacher(sender_id: str, name: str) -> bool:
    if config.QQ_CAPTURE_ALL:
        return True
    if config.QQ_TEACHER_IDS and sender_id in config.QQ_TEACHER_IDS:
        return True
    return any(k in name for k in config.QQ_TEACHER_NAME_KEYWORDS)


async def _handle_group_upload(event: dict) -> dict:
    """老师在群里上传的文件 → 下载到服务器 → 进 downloads 表（打印区）。"""
    group_id = str(event.get("group_id") or "")
    sender_id = str(event.get("user_id") or "")
    uploader = event.get("sender") or {}
    uploader_name = str(uploader.get("card") or uploader.get("nickname") or "")
    if config.QQ_GROUP_IDS and group_id not in config.QQ_GROUP_IDS:
        return {"status": "ignored", "reason": "group_not_allowed"}
    if not _is_teacher(sender_id, uploader_name):
        return {"status": "ignored", "reason": "not_teacher"}

    finfo = event.get("file") or {}
    fid = str(finfo.get("id") or finfo.get("file_id") or "")
    fname = str(finfo.get("name") or "群文件")
    size = int(finfo.get("size") or 0)
    busid = finfo.get("busid")
    # 文件的真实上传/修改时间（回填时由群文件列表带入），用作 created_at
    upload_ts = finfo.get("modify_time") or finfo.get("upload_time") or event.get("time")
    try:
        created_at = datetime.fromtimestamp(int(upload_ts)).strftime("%Y-%m-%d %H:%M:%S")
    except (TypeError, ValueError, OSError):
        created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with db() as conn:
        if conn.execute("SELECT id FROM downloads WHERE name = ? AND size_bytes = ?",
                        (fname, int(size))).fetchone():
            return {"status": "duplicate"}

    # 取下载直链
    url = finfo.get("url")
    if not url and fid:
        payload = {"group_id": int(group_id), "file_id": fid}
        if busid is not None:
            payload["busid"] = busid
        try:
            url = ((await _napcat("get_group_file_url", payload)).get("data") or {}).get("url")
        except Exception:  # noqa: BLE001
            url = None
    if not url:
        return {"status": "ignored", "reason": "no_file_url"}

    saved = await _download(url, config.FILES_DIR, f"g{group_id}_{fid}", ".bin")
    if not saved:
        return {"status": "ignored", "reason": "download_failed"}
    full = str(config.FILES_DIR / saved)
    with db() as conn:
        cur = conn.execute(
            "INSERT INTO downloads (name, subject, size_bytes, file_path, created_at) VALUES (?,?,?,?,?)",
            (fname, None, size or (config.FILES_DIR / saved).stat().st_size, full, created_at),
        )
        row_id = cur.lastrowid
    return {"status": "ok", "id": row_id, "kind": "file", "name": fname}


@router.post("/events")
async def receive_event(
    request: Request,
    authorization: Optional[str] = Header(default=None),
    x_access_token: Optional[str] = Header(default=None),
):
    if not _authorized(authorization, x_access_token):
        raise HTTPException(status_code=401, detail="OneBot access token 无效")

    event = await request.json()
    post_type = event.get("post_type")

    # 群文件上传
    if post_type == "notice" and event.get("notice_type") == "group_upload":
        return await _handle_group_upload(event)

    if post_type != "message" or event.get("message_type") != "group":
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
    if not _is_teacher(sender_id, teacher):
        return {"status": "ignored", "reason": "not_teacher"}

    text, image_segs, file_segs = _parse_message(event)
    # 文本：纯文本 + 文件占位
    parts = [text] if text else []
    for f in file_segs:
        parts.append(f"[文件：{f.get('file') or f.get('name') or '未命名'}]")
    content = " ".join(p for p in parts if p).strip()
    if not content and not image_segs and not file_segs:
        return {"status": "ignored", "reason": "empty_message"}

    timestamp = event.get("time")
    try:
        _dt = datetime.fromtimestamp(int(timestamp))
    except (TypeError, ValueError, OSError):
        _dt = datetime.now()
    display_time = _dt.strftime("%H:%M")
    msg_date = _dt.strftime("%Y-%m-%d")

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

    # 下载图片到 /uploads
    image_urls: list[str] = []
    for i, seg in enumerate(image_segs):
        url = seg.get("url") or seg.get("file")
        if not url or not str(url).startswith("http"):
            continue
        saved = await _download(url, config.UPLOAD_DIR, f"msg_{external_id}_{i}", ".jpg")
        if saved:
            image_urls.append(f"/uploads/{saved}")

    if not content and not image_urls:
        return {"status": "ignored", "reason": "empty_after_download"}

    with db() as conn:
        cur = conn.execute(
            "INSERT INTO messages "
            "(teacher, avatar, content, time, date, type, important, source, external_id, group_id, sender_id, images_json) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                teacher, teacher[:1] or "Q", content or "[图片]", display_time, msg_date,
                message_type, important, "onebot", external_id, group_id, sender_id,
                json.dumps(image_urls, ensure_ascii=False),
            ),
        )
        row_id = cur.lastrowid

    return {"status": "ok", "id": row_id, "type": message_type, "images": len(image_urls)}


@router.get("/status")
def status():
    return {
        "enabled": bool(config.ONEBOT_ACCESS_TOKEN),
        "group_whitelist_count": len(config.QQ_GROUP_IDS),
        "teacher_whitelist_count": len(config.QQ_TEACHER_IDS),
        "capture_all": config.QQ_CAPTURE_ALL,
    }
