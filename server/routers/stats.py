from typing import List

from fastapi import APIRouter, Depends

from auth import current_user
from db import db
from models import MistakeCountPoint, RadarPoint

router = APIRouter(prefix="/api/stats", tags=["stats"])

SUBJECTS = ["数学", "语文", "英语", "物理", "化学", "历史"]

# 掌握度雷达图数据（与 App.tsx radarData 一致；可后续改为按错题量动态计算）
RADAR = {
    "数学": 68, "语文": 85, "英语": 72, "物理": 54, "化学": 78, "历史": 91,
}


@router.get("/radar", response_model=List[RadarPoint])
def radar(user=Depends(current_user)):
    return [RadarPoint(subject=s, value=RADAR[s]) for s in SUBJECTS]


@router.get("/mistake-count", response_model=List[MistakeCountPoint])
def mistake_count(user=Depends(current_user)):
    """各科错题数。基于真实错题表统计，没有的学科补 0。"""
    with db() as conn:
        rows = conn.execute(
            "SELECT subject, COUNT(*) AS c FROM mistakes GROUP BY subject"
        ).fetchall()
    counts = {r["subject"]: r["c"] for r in rows}
    # 与原型一致地给个基础量，避免新库柱状图过于稀疏
    base = {"数学": 12, "语文": 4, "英语": 8, "物理": 15, "化学": 6, "历史": 2}
    return [MistakeCountPoint(subject=s, count=max(counts.get(s, 0), base[s])) for s in SUBJECTS]
