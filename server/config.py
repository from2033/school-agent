"""集中读取环境变量。所有项都允许为空，空值时相关模块走 mock 分支，保证本地可跑。"""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
# 出海代理：留空则自动读取系统代理（Windows WinINET），用于让 httpx/anthropic 走代理出网。
# 服务器在国内、出口需经代理时必须有值，否则 api.anthropic.com 会偶发 403 "Request not allowed"。
ANTHROPIC_PROXY = os.getenv("ANTHROPIC_PROXY", "").strip()
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me").strip()
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 30
WEB_ACCESS_CODE = os.getenv("WEB_ACCESS_CODE", "").strip()

WX_APPID = os.getenv("WX_APPID", "").strip()
WX_SECRET = os.getenv("WX_SECRET", "").strip()

# 非官方 QQ/OneBot 11 桥接（如 NapCat）。建议使用专门 QQ 小号。
ONEBOT_ACCESS_TOKEN = os.getenv("ONEBOT_ACCESS_TOKEN", "").strip()
QQ_GROUP_IDS = {
    value.strip()
    for value in os.getenv("QQ_GROUP_IDS", "").split(",")
    if value.strip()
}
QQ_TEACHER_IDS = {
    value.strip()
    for value in os.getenv("QQ_TEACHER_IDS", "").split(",")
    if value.strip()
}
QQ_TEACHER_NAME_KEYWORDS = tuple(
    value.strip()
    for value in os.getenv("QQ_TEACHER_NAME_KEYWORDS", "老师").split(",")
    if value.strip()
)
QQ_CAPTURE_ALL = os.getenv("QQ_CAPTURE_ALL", "false").strip().lower() in {
    "1", "true", "yes", "on",
}
# NapCat 的 OneBot httpServer 地址（用于下载群文件等主动调用）
NAPCAT_API_URL = os.getenv("NAPCAT_API_URL", "http://127.0.0.1:3000").strip()

DB_PATH = BASE_DIR / "app.db"
UPLOAD_DIR = BASE_DIR / "uploads"
FILES_DIR = BASE_DIR / "files"

UPLOAD_DIR.mkdir(exist_ok=True)
FILES_DIR.mkdir(exist_ok=True)
