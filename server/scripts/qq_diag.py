"""诊断：列出群的群主/管理员，以及最近 N 天的发言人分布。输出 UTF-8 JSON 文件。"""
from __future__ import annotations
import json, time, urllib.request
from pathlib import Path

NAPCAT = "http://127.0.0.1:3000"
DAYS = 3
ENV = {}
for line in (Path(__file__).resolve().parent.parent / ".env").read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1); ENV[k.strip()] = v.strip()
TOKEN = ENV.get("ONEBOT_ACCESS_TOKEN", "")
GROUPS = [g.strip() for g in ENV.get("QQ_GROUP_IDS", "").split(",") if g.strip()]
cutoff = time.time() - DAYS * 86400


def call(action, payload):
    req = urllib.request.Request(f"{NAPCAT}/{action}", data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json", "Authorization": f"Bearer {TOKEN}"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.loads(r.read().decode())


def history(gid):
    out, seq, seen = [], 0, set()
    for _ in range(60):
        msgs = (call("get_group_msg_history", {"group_id": int(gid), "message_seq": seq, "count": 50, "reverseOrder": False}).get("data") or {}).get("messages") or []
        if not msgs:
            break
        out = msgs + out
        o = msgs[0]; s = o.get("message_seq")
        if o.get("time", 0) < cutoff or not s or s in seen:
            break
        seen.add(s); seq = s
    return [m for m in out if m.get("time", 0) >= cutoff]


result = {}
for gid in GROUPS:
    members = (call("get_group_member_list", {"group_id": int(gid)}).get("data") or [])
    admins = [{"user_id": m.get("user_id"), "card": m.get("card"), "nickname": m.get("nickname"), "role": m.get("role")}
              for m in members if m.get("role") in ("owner", "admin")]
    senders = {}
    for m in history(gid):
        s = m.get("sender") or {}
        uid = s.get("user_id") or m.get("user_id")
        if uid not in senders:
            senders[uid] = {"user_id": uid, "card": s.get("card"), "nickname": s.get("nickname"), "role": s.get("role"), "count": 0}
        senders[uid]["count"] += 1
    result[str(gid)] = {"admins": admins, "senders_3d": sorted(senders.values(), key=lambda x: -x["count"])}

Path(r"C:\school-agent\diag.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
print("saved C:\\school-agent\\diag.json")
