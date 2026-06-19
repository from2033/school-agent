"""SQLite 连接、建表与首次启动的 seed 数据。

seed 数据直接取自原 React App（src/app/App.tsx 里的 INITIAL_MISTAKES / MESSAGES），
保证小程序一打开就有内容可看。
"""
import json
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
    type      TEXT NOT NULL,
    important INTEGER DEFAULT 0,
    source      TEXT DEFAULT 'seed',
    external_id TEXT,
    group_id    TEXT,
    sender_id   TEXT,
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

# ── seed：错题（结构化：summary + 重点关注(带等级) + 分步建议） ──────────────
SEED_MISTAKES = [
    {
        "subject": "数学", "topic": "二次函数图像平移", "difficulty": "hard",
        "date": "2024-06-17", "tags": ["函数", "图像变换"],
        "analysis": "对函数图像的平移方向理解有误，混淆了左移右移与正负号的关系。",
        "focus": [
            {"text": "平移方向 ↔ 正负号", "level": "high"},
            {"text": "顶点式 y=a(x-h)²+k", "level": "medium"},
        ],
        "steps": [
            "牢记口诀「左加右减、上加下减」",
            "用坐标纸亲手画出不同参数下的图像",
            "做 5 道平移专项题验证方向判断",
        ],
    },
    {
        "subject": "物理", "topic": "牛顿第三定律应用", "difficulty": "medium",
        "date": "2024-06-16", "tags": ["力学", "受力分析"],
        "analysis": "分不清作用力与反作用力的施力体，受力分析时出现多余力或遗漏力。",
        "focus": [
            {"text": "作用力 vs 平衡力", "level": "high"},
            {"text": "明确研究对象", "level": "medium"},
        ],
        "steps": [
            "分析前先圈定研究对象",
            "用不同颜色标注不同物体的受力",
            "对照「相互作用力作用在两个物体」自检",
        ],
    },
    {
        "subject": "英语", "topic": "定语从句关系词选择", "difficulty": "medium",
        "date": "2024-06-15", "tags": ["语法", "从句"],
        "analysis": "which 和 that 的使用场景混淆，限制性与非限制性从句区分不清。",
        "focus": [
            {"text": "which / that 选择", "level": "high"},
            {"text": "限制性 vs 非限制性", "level": "medium"},
        ],
        "steps": [
            "整理关系词选择口诀卡片，早读背诵",
            "做 10 道专项练习巩固",
        ],
    },
    {
        "subject": "数学", "topic": "概率计算：排列组合", "difficulty": "hard",
        "date": "2024-06-14", "tags": ["概率", "组合数学"],
        "analysis": "有重复元素的排列问题中，未用除法原理消除重复计数。",
        "focus": [
            {"text": "重复元素去重", "level": "high"},
            {"text": "除法原理", "level": "medium"},
        ],
        "steps": [
            "从 3-4 个元素的简单题入手",
            "逐步增加复杂度做专项练习",
        ],
    },
    {
        "subject": "化学", "topic": "氧化还原反应配平", "difficulty": "easy",
        "date": "2024-06-13", "tags": ["化学方程式", "氧化还原"],
        "analysis": "电子转移计算正确，但调整系数时破坏了原子守恒。",
        "focus": [
            {"text": "原子守恒检验", "level": "medium"},
            {"text": "配平步骤顺序", "level": "low"},
        ],
        "steps": [
            "先配平电子转移",
            "再用观察法补氢氧",
            "最后逐一检验各元素原子数",
        ],
    },
]

# ── seed：来自 App.tsx 的 MESSAGES ───────────────────────────────────────────
SEED_MESSAGES = [
    ("王老师（数学）", "王",
     "同学们，今晚作业：课本P45第3、5、7题，明天上课讲评。另外，本周五将进行第三单元小测，请同学们提前复习二次函数和基本不等式部分。",
     "08:32", "homework", 1),
    ("李老师（班主任）", "李",
     "家长们好！提醒一下，本周四（6月20日）下午3:30-4:30 有期末家长会，请各位家长准时参加。会议将在学校报告厅举行，请提前安排好时间。",
     "09:15", "notice", 1),
    ("张老师（英语）", "张",
     "今天课堂上小明同学的口语展示非常出色，发音准确，表达流畅，值得表扬！希望其他同学也积极开口练习，语言学习重在实践。",
     "10:48", "praise", 0),
    ("赵老师（物理）", "赵",
     "作业收批结果：本次受力分析专项作业全班平均分78分，部分同学在牛三定律应用上仍有欠缺，请认真阅读我批注的错误并订正，明天交来检查。",
     "14:20", "reminder", 0),
    ("陈老师（语文）", "陈",
     "本周阅读打卡情况：全班完成率92%，表现优秀！周记请在本周日晚前上交到钉钉作业本，题目自拟，字数不少于500字。",
     "16:05", "homework", 0),
]

# ── seed：下载区示例资料（无真实文件，file_path 为空时下载接口返回占位文本） ──
SEED_DOWNLOADS = [
    ("第三单元二次函数复习提纲.pdf", "数学", 245_760, None),
    ("英语定语从句专项练习50题.docx", "英语", 102_400, None),
    ("期末家长会通知.pdf", "通知", 51_200, None),
    ("受力分析错题订正模板.pdf", "物理", 81_920, None),
]


def _migrate(conn) -> None:
    """给旧库补上新增列，避免删库。"""
    mistake_cols = {row["name"] for row in conn.execute("PRAGMA table_info(mistakes)").fetchall()}
    if "focus_json" not in mistake_cols:
        conn.execute("ALTER TABLE mistakes ADD COLUMN focus_json TEXT DEFAULT '[]'")
    if "steps_json" not in mistake_cols:
        conn.execute("ALTER TABLE mistakes ADD COLUMN steps_json TEXT DEFAULT '[]'")

    message_cols = {row["name"] for row in conn.execute("PRAGMA table_info(messages)").fetchall()}
    additions = {
        "source": "TEXT DEFAULT 'seed'",
        "external_id": "TEXT",
        "group_id": "TEXT",
        "sender_id": "TEXT",
        "created_at": "TEXT",
    }
    for name, definition in additions.items():
        if name not in message_cols:
            conn.execute(f"ALTER TABLE messages ADD COLUMN {name} {definition}")
    conn.execute(
        "UPDATE messages SET created_at = datetime('now') WHERE created_at IS NULL"
    )
    conn.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_source_external "
        "ON messages(source, external_id) WHERE external_id IS NOT NULL"
    )


def init_db() -> None:
    with db() as conn:
        conn.executescript(SCHEMA)
        _migrate(conn)

        if conn.execute("SELECT COUNT(*) AS c FROM mistakes").fetchone()["c"] == 0:
            for s in SEED_MISTAKES:
                conn.execute(
                    "INSERT INTO mistakes (subject, topic, analysis, focus_json, steps_json, difficulty, tags_json, created_at)"
                    " VALUES (?,?,?,?,?,?,?,?)",
                    (
                        s["subject"], s["topic"], s["analysis"],
                        json.dumps(s["focus"], ensure_ascii=False),
                        json.dumps(s["steps"], ensure_ascii=False),
                        s["difficulty"], json.dumps(s["tags"], ensure_ascii=False), s["date"],
                    ),
                )

        if conn.execute("SELECT COUNT(*) AS c FROM messages").fetchone()["c"] == 0:
            for m in SEED_MESSAGES:
                conn.execute(
                    "INSERT INTO messages (teacher, avatar, content, time, type, important)"
                    " VALUES (?,?,?,?,?,?)", m,
                )

        if conn.execute("SELECT COUNT(*) AS c FROM downloads").fetchone()["c"] == 0:
            for d in SEED_DOWNLOADS:
                conn.execute(
                    "INSERT INTO downloads (name, subject, size_bytes, file_path) VALUES (?,?,?,?)", d,
                )
