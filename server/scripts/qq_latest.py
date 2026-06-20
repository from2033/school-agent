"""同步每个群「最新 N 条」消息（不限日期），用于快速拉取各群近况。

与 qq_backfill 的区别：backfill 按「最近 N 天」翻页；本脚本只取每群最新的 N 条，
便于随时看各群最新动态。仍复用后端 /events 入口（群白名单 + 老师过滤 + 去重）。

用法（服务器上）：
    C:\\Python312\\python.exe C:\\school-agent\\server\\scripts\\qq_latest.py [每群条数]
默认每群 15 条。群号、token 从 server/.env 读取。
"""
from __future__ import annotations

import json
import sys
import time
import urllib.request
from pathlib import Path

NAPCAT = "http://127.0.0.1:3000"
BACKEND = "http://127.0.0.1:8000/api/integrations/onebot/events"
SELF_ID = 2145753049

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


def main() -> None:
    if not GROUPS:
        print("未配置 QQ_GROUP_IDS，退出")
        return
    print(f"同步每群最新 {N} 条；群：{GROUPS}")
    for gid in GROUPS:
        msgs = latest(gid)
        ok = dup = ign = 0
        for m in msgs:
            sender = m.get("sender") or {}
            event = {
                "post_type": "message", "message_type": "group",
                "time": m.get("time"), "self_id": SELF_ID, "group_id": int(gid),
                "user_id": sender.get("user_id") or m.get("user_id"),
                "message_id": m.get("message_id"), "sender": sender,
                "message": m.get("message"), "raw_message": m.get("raw_message", ""),
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
        newest = time.strftime("%m-%d %H:%M", time.localtime(msgs[-1]["time"])) if msgs else "—"
        print(f"群 {gid}：拉取 {len(msgs)} 条（最新 {newest}）→ 入库 {ok}，重复 {dup}，忽略 {ign}")


if __name__ == "__main__":
    main()
