"""同步每个群「最新 N 条」消息（不限日期），用于快速拉取各群近况。

与 qq_backfill 的区别：backfill 按「最近 N 天」翻页；本脚本只取每群最新的 N 条，
便于随时看各群最新动态。仍复用后端 /events 入口（群白名单 + 老师过滤 + 去重）。

用法（服务器上）：
    C:\\Python312\\python.exe C:\\school-agent\\server\\scripts\\qq_latest.py [每群条数]
默认每群 15 条。群号、token 从 server/.env 读取。
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.request
from pathlib import Path

N = int(sys.argv[1]) if len(sys.argv) > 1 else 15

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
env: dict[str, str] = {}
for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

TOKEN = env.get("ONEBOT_ACCESS_TOKEN", "")
GROUPS = [g.strip() for g in env.get("QQ_GROUP_IDS", "").split(",") if g.strip()]
TEACHERS = {g.strip() for g in env.get("QQ_TEACHER_IDS", "").split(",") if g.strip()}
TEACHER_KW = [k.strip() for k in env.get("QQ_TEACHER_NAME_KEYWORDS", "老师").split(",") if k.strip()]
NAPCAT = env.get("NAPCAT_API_URL", "http://127.0.0.1:3000").rstrip("/")
BACKEND = env.get(
    "QQ_SYNC_BACKEND_URL",
    "http://127.0.0.1:8000/api/integrations/onebot/events",
)
LOCK_PATH = Path(os.getenv("TEMP", str(Path(__file__).parent))) / "mini-study-qq-sync.lock"


def post_json(url: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {TOKEN}"},
    )
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.loads(r.read().decode("utf-8"))


def latest(gid: str) -> list[dict]:
    try:
        r = post_json(f"{NAPCAT}/get_group_msg_history",
                      {"group_id": int(gid), "message_seq": 0, "count": N, "reverseOrder": False})
    except Exception as e:  # noqa: BLE001
        print(f"  history error {gid}: {e}")
        return []
    return (r.get("data") or {}).get("messages") or []


def self_id() -> int:
    try:
        data = post_json(f"{NAPCAT}/get_login_info", {}).get("data") or {}
        return int(data.get("user_id") or 0)
    except Exception as e:  # noqa: BLE001
        print(f"无法读取 NapCat 登录账号：{e}")
        return 0


def sync_group_files(gid: str) -> tuple[int, int, int]:
    """把群文件区最近的老师文件补进下载列表。"""
    try:
        data = post_json(f"{NAPCAT}/get_group_root_files", {"group_id": int(gid)}).get("data") or {}
    except Exception as e:  # noqa: BLE001
        print(f"  群文件列表失败：{e}")
        return 0, 0, 1

    ok = duplicate = ignored = 0
    for f in (data.get("files") or [])[:30]:
        uploader_id = str(f.get("uploader") or "")
        uploader_name = str(f.get("uploader_name") or "")
        is_teacher = uploader_id in TEACHERS or any(k in uploader_name for k in TEACHER_KW)
        size = int(f.get("file_size") or 0)
        if not is_teacher or size > 20 * 1024 * 1024:
            ignored += 1
            continue
        event = {
            "post_type": "notice",
            "notice_type": "group_upload",
            "group_id": int(gid),
            "user_id": int(uploader_id or 0),
            "sender": {"card": uploader_name},
            "file": {
                "id": f.get("file_id"),
                "name": f.get("file_name"),
                "size": size,
                "busid": f.get("busid"),
                "modify_time": f.get("modify_time") or f.get("upload_time"),
            },
        }
        try:
            status = post_json(BACKEND, event).get("status")
        except Exception as e:  # noqa: BLE001
            print(f"  群文件投递失败：{e}")
            ignored += 1
            continue
        if status == "ok":
            ok += 1
        elif status == "duplicate":
            duplicate += 1
        else:
            ignored += 1
    return ok, duplicate, ignored


def acquire_lock():
    """Windows 计划任务可能重叠；锁住本轮，已有实例时直接退出。"""
    handle = LOCK_PATH.open("a+")
    try:
        import msvcrt

        msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
    except (ImportError, OSError):
        handle.close()
        return None
    return handle


def main() -> int:
    lock = acquire_lock()
    if lock is None:
        print("已有同步任务正在运行，本轮跳过")
        return 0
    if not GROUPS:
        print("未配置 QQ_GROUP_IDS，退出")
        return 2
    try:
        account = self_id()
        if not account:
            return 3
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] 同步每群最新 {N} 条；QQ={account}；群={GROUPS}")
        fetch_failures = post_failures = 0
        for gid in GROUPS:
            msgs = latest(gid)
            if not msgs:
                fetch_failures += 1
            ok = dup = ign = 0
            for m in msgs:
                sender = m.get("sender") or {}
                event = {
                    "post_type": "message", "message_type": "group",
                    "time": m.get("time"), "self_id": account, "group_id": int(gid),
                    "user_id": sender.get("user_id") or m.get("user_id"),
                    "message_id": m.get("message_id"), "sender": sender,
                    "message": m.get("message"), "raw_message": m.get("raw_message", ""),
                }
                try:
                    response = post_json(BACKEND, event)
                    st = response.get("status")
                except Exception as e:  # noqa: BLE001
                    post_failures += 1
                    print(f"  后端投递失败：{e}")
                    continue
                if st == "ok":
                    ok += 1
                elif st == "duplicate":
                    dup += 1
                else:
                    ign += 1
            newest = time.strftime("%m-%d %H:%M", time.localtime(msgs[-1]["time"])) if msgs else "—"
            print(f"群 {gid}：拉取 {len(msgs)} 条（最新 {newest}）→ 入库 {ok}，重复 {dup}，忽略 {ign}")
            file_ok, file_dup, file_ign = sync_group_files(gid)
            print(f"群 {gid} 文件：入库 {file_ok}，重复 {file_dup}，忽略 {file_ign}")
        if fetch_failures == len(GROUPS) or post_failures:
            return 4
        return 0
    finally:
        lock.close()


if __name__ == "__main__":
    raise SystemExit(main())
