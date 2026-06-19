"""QQ 群信息 / 资料同步脚本。

设计边界（重要）：本脚本不做任何未授权抓取，而是**解析用户自己从 QQ 客户端导出的群聊天记录**
（消息管理 → 导出聊天记录，得到 .txt），以及把群文件下载到的本地文件夹同步进下载服务。
这样既能体现「数据同步脚本」这个工程亮点，又不触碰平台 ToS。

用法：
    python -m scripts.qq_sync --chat path/to/群聊天记录.txt --files path/to/群文件目录

无参数运行时，会用内置示例数据演示「解析 → 入库」的完整流程。
"""
from __future__ import annotations

import argparse
import re
import shutil
from pathlib import Path

import config
from db import db, init_db

# QQ 导出 txt 的常见行格式：  昵称(12345) 2024-06-18 08:32:10
HEADER_RE = re.compile(r"^(?P<name>.+?)[(（]\d+[)）]\s+\d{4}-\d{2}-\d{2}\s+(?P<time>\d{2}:\d{2})")

# 关键词 → 通知类型
TYPE_KEYWORDS = {
    "homework": ["作业", "练习", "周记", "打卡", "P", "课本"],
    "notice": ["通知", "家长会", "会议", "放假", "请假"],
    "praise": ["表扬", "优秀", "出色", "值得", "点赞"],
    "reminder": ["提醒", "订正", "检查", "注意", "截止"],
}


def classify(content: str) -> str:
    for typ, kws in TYPE_KEYWORDS.items():
        if any(kw in content for kw in kws):
            return typ
    return "notice"


def parse_chat(path: Path):
    """解析导出的聊天记录，产出 (teacher, time, content) 列表。"""
    msgs = []
    name = time = None
    buf: list[str] = []

    def flush():
        if name and buf:
            text = "\n".join(buf).strip()
            if text:
                msgs.append((name, time, text))

    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        m = HEADER_RE.match(line)
        if m:
            flush()
            name, time = m.group("name").strip(), m.group("time")
            buf = []
        elif name:
            buf.append(line)
    flush()
    # 只保留老师发言（昵称含「老师」）
    return [(n, t, c) for (n, t, c) in msgs if "老师" in n]


def sync_messages(chat_path: Path) -> int:
    msgs = parse_chat(chat_path)
    with db() as conn:
        for teacher, time, content in msgs:
            avatar = teacher[0]
            typ = classify(content)
            important = 1 if typ in ("homework", "notice") else 0
            conn.execute(
                "INSERT INTO messages (teacher, avatar, content, time, type, important) VALUES (?,?,?,?,?,?)",
                (teacher, avatar, content, time, typ, important),
            )
    return len(msgs)


SUBJECT_HINT = {"数学": "数学", "语文": "语文", "英语": "英语", "物理": "物理", "化学": "化学", "历史": "历史"}


def guess_subject(filename: str) -> str | None:
    for k, v in SUBJECT_HINT.items():
        if k in filename:
            return v
    return None


def sync_files(files_dir: Path) -> int:
    n = 0
    with db() as conn:
        for src in files_dir.iterdir():
            if not src.is_file():
                continue
            dest = config.FILES_DIR / src.name
            shutil.copy2(src, dest)
            conn.execute(
                "INSERT INTO downloads (name, subject, size_bytes, file_path) VALUES (?,?,?,?)",
                (src.name, guess_subject(src.name), dest.stat().st_size, str(dest)),
            )
            n += 1
    return n


DEMO_CHAT = """王老师(10001) 2024-06-18 08:32:10
今晚作业：课本P52第1-4题，明天讲评。

李老师(10002) 2024-06-18 09:15:22
通知：周四下午有家长会，请准时参加。

张老师(10003) 2024-06-18 10:48:05
今天小红的作文非常出色，值得表扬！
"""


def main():
    parser = argparse.ArgumentParser(description="同步 QQ 群消息与资料到数据库")
    parser.add_argument("--chat", type=Path, help="导出的聊天记录 .txt")
    parser.add_argument("--files", type=Path, help="群文件本地目录")
    args = parser.parse_args()

    init_db()

    if not args.chat and not args.files:
        demo = config.BASE_DIR / "_demo_chat.txt"
        demo.write_text(DEMO_CHAT, encoding="utf-8")
        n = sync_messages(demo)
        demo.unlink(missing_ok=True)
        print(f"[demo] 解析示例记录，导入 {n} 条老师消息。传 --chat/--files 同步真实数据。")
        return

    if args.chat:
        print(f"消息同步完成：导入 {sync_messages(args.chat)} 条。")
    if args.files:
        print(f"资料同步完成：导入 {sync_files(args.files)} 个文件。")


if __name__ == "__main__":
    main()
