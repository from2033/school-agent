"""SQLite 连接、建表与迁移。

不注入任何示例数据——所有内容均来自真实接口：通知/文件来自 QQ 群同步，
错题来自家长拍照上传 + AI 分析。
"""
import sqlite3
from contextlib import contextmanager

from config import DB_PATH


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def db():
    conn = get_conn()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    openid    TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS mistakes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER,
    subject    TEXT NOT NULL,
    topic      TEXT NOT NULL,
    image_path TEXT,
    images_json TEXT DEFAULT '[]',
    analysis   TEXT,
    focus_json TEXT DEFAULT '[]',
    steps_json TEXT DEFAULT '[]',
    difficulty TEXT DEFAULT 'medium',
    tags_json  TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher   TEXT NOT NULL,
    avatar    TEXT NOT NULL,
    content   TEXT NOT NULL,
    time      TEXT NOT NULL,
    date      TEXT,
    type      TEXT NOT NULL,
    important INTEGER DEFAULT 0,
    source      TEXT DEFAULT 'seed',
    external_id TEXT,
    group_id    TEXT,
    sender_id   TEXT,
    images_json TEXT DEFAULT '[]',
    created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS downloads (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    subject    TEXT,
    size_bytes INTEGER DEFAULT 0,
    file_path  TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
"""




def _migrate(conn) -> None:
    """给旧库补上新增列，避免删库。"""
    mistake_cols = {row["name"] for row in conn.execute("PRAGMA table_info(mistakes)").fetchall()}
    if "focus_json" not in mistake_cols:
        conn.execute("ALTER TABLE mistakes ADD COLUMN focus_json TEXT DEFAULT '[]'")
    if "steps_json" not in mistake_cols:
        conn.execute("ALTER TABLE mistakes ADD COLUMN steps_json TEXT DEFAULT '[]'")
    if "images_json" not in mistake_cols:
        conn.execute("ALTER TABLE mistakes ADD COLUMN images_json TEXT DEFAULT '[]'")
        # 旧错题把单图迁进多图列，保证详情页统一读 images
        conn.execute(
            "UPDATE mistakes SET images_json = json_array(image_path) "
            "WHERE image_path IS NOT NULL AND (images_json IS NULL OR images_json = '[]')"
        )

    message_cols = {row["name"] for row in conn.execute("PRAGMA table_info(messages)").fetchall()}
    additions = {
        "date": "TEXT",
        "source": "TEXT DEFAULT 'seed'",
        "external_id": "TEXT",
        "group_id": "TEXT",
        "sender_id": "TEXT",
        "images_json": "TEXT DEFAULT '[]'",
        "created_at": "TEXT",
    }
    for name, definition in additions.items():
        if name not in message_cols:
            conn.execute(f"ALTER TABLE messages ADD COLUMN {name} {definition}")
    conn.execute(
        "UPDATE messages SET created_at = datetime('now') WHERE created_at IS NULL"
    )
    conn.execute(
        "UPDATE messages SET date = date(created_at) WHERE date IS NULL"
    )
    conn.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_source_external "
        "ON messages(source, external_id) WHERE external_id IS NOT NULL"
    )


def init_db() -> None:
    # 仅建表 + 迁移；所有数据来自真实接口（QQ 同步 / 家长上传），不注入任何示例数据。
    with db() as conn:
        conn.executescript(SCHEMA)
        _migrate(conn)
