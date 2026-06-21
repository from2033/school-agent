"""QQ 群消息回填：把最近 N 天的群历史消息补进后端。

机制：调用 NapCat（OneBot httpServer）的 get_group_msg_history 翻历史，
把每条消息按 OneBot 事件格式 POST 到后端 /api/integrations/onebot/events，
复用后端的「群白名单 + 老师过滤 + 分类 + 去重」逻辑（与实时推送同一入口）。

在服务器上运行：
    C:\\Python312\\python.exe C:\\school-agent\\server\\scripts\\qq_backfill.py [天数]
默认回填 3 天。群号、token 从 server/.env 读取（QQ_GROUP_IDS / ONEBOT_ACCESS_TOKEN）。
"""
from __future__ import annotations

import json
import sys
import time
import urllib.request
from pathlib import Path

NAPCAT = "http://127.0.0.1:3000"
BACKEND = "http://127.0.0.1:8000/api/integrations/onebot/events"
SELF_ID = 2145753049  # 登录的 QQ 账号，用于跳过自己发的消息

DAYS = int(sys.argv[1]) if len(sys.argv) > 1 else 3

# 读取 server/.env（脚本位于 server/scripts/ 下）
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
env: dict[str, str] = {}
for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

TOKEN = env.get("ONEBOT_ACCESS_TOKEN", "")
GROUPS = [g.strip() for g in env.get("QQ_GROUP_IDS", "").split(",") if g.strip()]
cutoff = time.time() - DAYS * 86400


def post_json(url: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {TOKEN}"},
    )
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.loads(r.read().decode("utf-8"))


def fetch_group(gid: str) -> list[dict]:
    """从最新往回翻页，直到超出时间窗。"""
    collected: list[dict] = []
    seq = 0
    seen_seq: set = set()
    for _ in range(60):  # 安全上限，避免死循环
        try:
            r = post_json(f"{NAPCAT}/get_group_msg_history",
                          {"group_id": int(gid), "message_seq": seq, "count": 50, "reverseOrder": False})
        except Exception as e:  # noqa: BLE001
            print(f"  history error {gid}: {e}")
            break
        msgs = (r.get("data") or {}).get("messages") or []
        if not msgs:
            break
        collected = msgs + collected  # NapCat 返回按时间升序，最旧在前
        oldest = msgs[0]
        oseq = oldest.get("message_seq")
        if oldest.get("time", 0) < cutoff:
            break
        if not oseq or oseq in seen_seq:
            break
        seen_seq.add(oseq)
        seq = oseq
    # 截到时间窗内 + 按 message_id 去重
    out, ids = [], set()
    for m in collected:
        if m.get("time", 0) < cutoff:
            continue
        mid = m.get("message_id")
        if mid in ids:
            continue
        ids.add(mid)
        out.append(m)
    return out


MAX_FILE_MB = 20           # 跳过超过此大小的文件（避免家长上传的大视频等）
MAX_FILES_PER_GROUP = 25   # 每群最多回填的老师文件数
TEACHER_KW = [k.strip() for k in env.get("QQ_TEACHER_NAME_KEYWORDS", "老师").split(",") if k.strip()]
TEACHER_IDS = {k.strip() for k in env.get("QQ_TEACHER_IDS", "").split(",") if k.strip()}


def backfill_files(gid: str) -> tuple[int, int, int]:
    """回填群文件区里老师上传的文件 → 走 group_upload 入口入 downloads。"""
    try:
        data = call("get_group_root_files", {"group_id": int(gid)}).get("data") or {}
    except Exception as e:  # noqa: BLE001
        print(f"  群文件列表错误 {gid}: {e}")
        return 0, 0, 0
    files = data.get("files") or []
    ok = dup = skip = 0
    done = 0
    for f in files:
        if done >= MAX_FILES_PER_GROUP:
            break
        uploader = str(f.get("uploader_name") or "")
        uploader_id = str(f.get("uploader") or "")
        if uploader_id not in TEACHER_IDS and not any(k in uploader for k in TEACHER_KW):
            skip += 1
            continue
        size = int(f.get("file_size") or 0)
        if size > MAX_FILE_MB * 1024 * 1024:
            skip += 1
            continue
        event = {
            "post_type": "notice", "notice_type": "group_upload",
            "group_id": int(gid), "user_id": f.get("uploader") or 0,
            "sender": {"card": uploader},
            "file": {"id": f.get("file_id"), "name": f.get("file_name"),
                     "size": size, "busid": f.get("busid"),
                     "modify_time": f.get("modify_time") or f.get("upload_time")},
        }
        try:
            st = post_json(BACKEND, event).get("status")
        except Exception as e:  # noqa: BLE001
            print(f"  文件投递错误: {e}")
            continue
        if st == "ok":
            ok += 1; done += 1
        elif st == "duplicate":
            dup += 1; done += 1
        else:
            skip += 1
    return ok, dup, skip


def call(action, payload):  # NapCat httpServer 调用（供文件列表用）
    req = urllib.request.Request(f"http://127.0.0.1:3000/{action}", data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json", "Authorization": f"Bearer {TOKEN}"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.loads(r.read().decode())


def main() -> None:
    if not GROUPS:
        print("未配置 QQ_GROUP_IDS，退出")
        return
    print(f"回填最近 {DAYS} 天；群：{GROUPS}")
    ok = dup = ign = 0
    for gid in GROUPS:
        msgs = fetch_group(gid)
        print(f"群 {gid}：窗口内 {len(msgs)} 条，逐条投递…")
        for m in msgs:
            sender = m.get("sender") or {}
            event = {
                "post_type": "message", "message_type": "group",
                "time": m.get("time"), "self_id": SELF_ID,
                "group_id": int(gid),
                "user_id": sender.get("user_id") or m.get("user_id"),
                "message_id": m.get("message_id"),
                "sender": sender,
                "message": m.get("message"),
                "raw_message": m.get("raw_message", ""),
            }
            try:
                st = post_json(BACKEND, event).get("status")
            except Exception as e:  # noqa: BLE001
                print(f"  post error: {e}")
                continue
            if st == "ok":
                ok += 1
            elif st == "duplicate":
                dup += 1
            else:
                ign += 1
    print(f"消息完成：入库 {ok}，重复 {dup}，忽略(非老师/空) {ign}")

    fok = fdup = fskip = 0
    for gid in GROUPS:
        a, b, c = backfill_files(gid)
        print(f"群 {gid} 文件：入库 {a}，重复 {b}，跳过 {c}")
        fok += a; fdup += b; fskip += c
    print(f"文件完成：入库 {fok}，重复 {fdup}，跳过(非老师/超大) {fskip}")


if __name__ == "__main__":
    main()
