from collections import defaultdict
from typing import List

from fastapi import APIRouter, Depends

from auth import current_user
from db import db
from models import MistakeCountPoint, RadarPoint

router = APIRouter(prefix="/api/stats", tags=["stats"])

# 小学三年级核心科目，作为薄弱分析/学科范围的基础轴
CORE = ["语文", "数学", "英语"]

# 错题难度对掌握度的扣分权重（越难扣得越多）
DIFFICULTY_PENALTY = {"hard": 14, "medium": 9, "easy": 5}


def studied_subjects(conn) -> List[str]:
    """所学科目 = 核心科目 + 错题表里出现过的其它科目（去重、核心在前）。"""
    rows = conn.execute("SELECT DISTINCT subject FROM mistakes").fetchall()
    extra = [r["subject"] for r in rows if r["subject"] and r["subject"] not in CORE]
    return CORE + extra


@router.get("/subjects", response_model=List[str])
def subjects(user=Depends(current_user)):
    with db() as conn:
        return studied_subjects(conn)


@router.get("/radar", response_model=List[RadarPoint])
def radar(user=Depends(current_user)):
    """薄弱环节：按真实错题计算各科掌握度（无错题=100，错题越多/越难=越低，下限 40）。"""
    with db() as conn:
        subs = studied_subjects(conn)
        rows = conn.execute("SELECT subject, difficulty FROM mistakes").fetchall()
    penalty = defaultdict(int)
    for r in rows:
        penalty[r["subject"]] += DIFFICULTY_PENALTY.get(r["difficulty"], 9)
    return [RadarPoint(subject=s, value=max(40, 100 - penalty[s])) for s in subs]


@router.get("/mistake-count", response_model=List[MistakeCountPoint])
def mistake_count(user=Depends(current_user)):
    """各科错题数：真实统计，按所学科目返回（可为 0）。"""
    with db() as conn:
        subs = studied_subjects(conn)
        rows = conn.execute(
            "SELECT subject, COUNT(*) AS c FROM mistakes GROUP BY subject"
        ).fetchall()
    counts = {r["subject"]: r["c"] for r in rows}
    return [MistakeCountPoint(subject=s, count=counts.get(s, 0)) for s in subs]
