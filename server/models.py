"""API 出入参的 Pydantic 模型。"""
from typing import List, Optional

from pydantic import BaseModel


class LoginRequest(BaseModel):
    code: str


class LoginResponse(BaseModel):
    token: str
    openid: str


class FocusPoint(BaseModel):
    text: str
    level: str = "medium"  # high | medium | low


class Mistake(BaseModel):
    id: int
    subject: str
    topic: str
    image_path: Optional[str] = None
    analysis: Optional[str] = None        # 一句话总述
    focus_points: List[FocusPoint] = []   # 重点关注（带等级，前端上色）
    steps: List[str] = []                 # 分步改进建议
    difficulty: str = "medium"
    tags: List[str] = []
    created_at: str


class Message(BaseModel):
    id: int
    teacher: str
    avatar: str
    content: str
    time: str
    type: str
    important: bool = False


class Download(BaseModel):
    id: int
    name: str
    subject: Optional[str] = None
    size_bytes: int = 0
    created_at: Optional[str] = None


class RadarPoint(BaseModel):
    subject: str
    value: int
    fullMark: int = 100


class MistakeCountPoint(BaseModel):
    subject: str
    count: int
