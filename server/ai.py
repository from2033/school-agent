"""错题 AI 分析。调用 Claude（claude-opus-4-8）用原生结构化输出返回结果。

错题全部来自图片：AI 直接看图，自动命名题目（topic），并给出结构化的
「一句话总述 + 重点关注（带等级）+ 分步建议」，便于前端美观、分层展示。

未配置 ANTHROPIC_API_KEY 时走 mock 分支，保证 demo 可跑、不报错。
"""
import base64
import json
import mimetypes
import time
from typing import Optional

import config

# 这些状态码（含区域/出口 IP 偶发 403、限流、5xx、网络）值得重试；其余（如 401 鉴权）直接失败
RETRYABLE_STATUS = {403, 408, 409, 429, 500, 502, 503, 504}
MAX_ATTEMPTS = 3

# 结构化输出 schema：强约束返回字段
ANALYSIS_SCHEMA = {
    "type": "object",
    "properties": {
        "subject": {"type": "string"},
        "topic": {"type": "string"},
        "analysis": {"type": "string"},
        "focus_points": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "level": {"type": "string", "enum": ["high", "medium", "low"]},
                },
                "required": ["text", "level"],
                "additionalProperties": False,
            },
        },
        "steps": {"type": "array", "items": {"type": "string"}},
        "difficulty": {"type": "string", "enum": ["easy", "medium", "hard"]},
        "tags": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["subject", "topic", "analysis", "focus_points", "steps", "difficulty", "tags"],
    "additionalProperties": False,
}


def _mock(subject: Optional[str], topic: str) -> dict:
    subj = subject or "数学"
    return {
        "subject": subj,
        "topic": topic or "未命名错题",
        "analysis": f"已识别出{subj}相关的概念理解偏差。（占位结果：配置 ANTHROPIC_API_KEY 后返回真实分析）",
        "focus_points": [
            {"text": "核心概念理解", "level": "high"},
            {"text": "基础定义", "level": "medium"},
        ],
        "steps": [
            "回顾课本对应章节",
            "做同类型练习 3-5 道",
            "整理一张知识点卡片",
        ],
        "difficulty": "medium",
        "tags": [subj],
    }


def _normalize(data: dict, subject: Optional[str], topic: str) -> dict:
    diff = data.get("difficulty", "medium")
    focus = []
    for fp in (data.get("focus_points") or []):
        if isinstance(fp, dict) and fp.get("text"):
            lvl = fp.get("level", "medium")
            focus.append({"text": str(fp["text"]).strip(),
                          "level": lvl if lvl in ("high", "medium", "low") else "medium"})
    # 学科以 AI 判断为准（前端不再选学科）；都没有时退回「未分类」
    subj = (data.get("subject") or subject or "").strip() or "未分类"
    return {
        "subject": subj,
        "topic": (data.get("topic") or topic or "").strip() or "未命名错题",
        "analysis": (data.get("analysis") or "").strip(),
        "focus_points": focus[:4],
        "steps": [str(s).strip() for s in (data.get("steps") or []) if str(s).strip()][:5],
        "difficulty": diff if diff in ("easy", "medium", "hard") else "medium",
        "tags": [str(t).strip() for t in (data.get("tags") or []) if str(t).strip()][:3] or [subj],
    }


class AIAnalysisError(Exception):
    """AI 分析失败（已重试仍不可用）。由路由转成给前端的错误，不落库假数据。"""


def _resolve_proxy() -> Optional[str]:
    """出海代理地址：优先 config.ANTHROPIC_PROXY，否则读系统代理（Windows 注册表/env）。
    httpx 不读 Windows 系统代理，必须显式传入，否则会从国内 IP 直连被偶发 403。"""
    proxy = config.ANTHROPIC_PROXY
    if not proxy:
        from urllib.request import getproxies
        pr = getproxies()
        proxy = pr.get("https") or pr.get("http") or ""
    if not proxy:
        return None
    if proxy.startswith("https://"):
        proxy = "http://" + proxy[len("https://"):]
    elif not proxy.startswith(("http://", "socks")):
        proxy = "http://" + proxy
    return proxy


def _make_client():
    import anthropic
    import httpx
    proxy = _resolve_proxy()
    http_client = httpx.Client(proxy=proxy, timeout=httpx.Timeout(60.0)) if proxy else None
    return anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY, http_client=http_client)


def analyze_mistake(subject: Optional[str] = None, topic: str = "",
                    image_paths: Optional[list] = None) -> dict:
    # 兼容单图调用：传进来的若是字符串，包成列表
    if isinstance(image_paths, str):
        image_paths = [image_paths]
    image_paths = [p for p in (image_paths or []) if p]

    if not config.ANTHROPIC_API_KEY:
        return _mock(subject, topic)

    client = _make_client()
    last_exc: Optional[Exception] = None

    for attempt in range(MAX_ATTEMPTS):
        try:
            return _call_claude(client, subject, topic, image_paths)
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            status = getattr(exc, "status_code", None)
            # 非可重试错误（如 401 鉴权、400 参数）立即放弃
            if status is not None and status not in RETRYABLE_STATUS:
                break
            if attempt < MAX_ATTEMPTS - 1:
                time.sleep(1.5 * (attempt + 1))

    raise AIAnalysisError(str(last_exc))


def _call_claude(client, subject: Optional[str], topic: str, image_paths: list) -> dict:
    hint = f"\n学生补充：{topic}" if topic else ""
    subj_hint = f"\n（学生标注可能是「{subject}」，仅供参考，以你的判断为准）" if subject else ""
    multi = "（可能多张，属于同一道题/同一份卷子，请综合所有图片一起分析）" if len(image_paths) > 1 else ""
    content = [{
        "type": "text",
        "text": (
            f"你是一名中小学老师。下面是学生上传的错题/试卷图片{multi}。{hint}{subj_hint}\n\n"
            "请先判断它属于哪一科，再分析，输出：\n"
            "1. subject：判断这张图属于哪一科，用最贴切的学科名（如 语文 / 数学 / 英语 等）。"
            "若一张卷子含多科或为综合卷，选最主要的一科。\n"
            "2. topic：用一句话（≤15字）概括考查的核心知识点，作为题目名。\n"
            "3. analysis：一句话总述错误的核心原因（≤40字，不要长篇大论）。\n"
            "4. focus_points：2-4 个最需要重点关注的点，每个 ≤12 字，并标注严重等级"
            "（high=高频/关键易错，medium=需巩固，low=小提醒）。\n"
            "5. steps：2-4 条可立即执行的改进步骤，每条一句话。\n"
            "6. difficulty：easy / medium / hard。\n"
            "7. tags：≤3 个知识点标签。\n"
            "只有当图片完全无法识别（太模糊或非学习内容）时，subject 填「未知」、"
            "topic 填「图片无法识别」、analysis 说明原因、focus_points 给「请重新拍摄清晰题目」(high)。"
        ),
    }]

    for image_path in image_paths:
        media_type = mimetypes.guess_type(image_path)[0] or "image/jpeg"
        with open(image_path, "rb") as f:
            data = base64.b64encode(f.read()).decode()
        content.append({
            "type": "image",
            "source": {"type": "base64", "media_type": media_type, "data": data},
        })

    resp = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=1024,
        thinking={"type": "adaptive"},
        output_config={"format": {"type": "json_schema", "schema": ANALYSIS_SCHEMA}},
        messages=[{"role": "user", "content": content}],
    )

    text = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text").strip()
    return _normalize(json.loads(text), subject, topic)


# ---------------------------------------------------------------------------
# 练习卷生成：根据最近错题的知识点，出一份「同知识点的变式新题」（题 + 答案）
# ---------------------------------------------------------------------------

PAPER_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "subject": {"type": "string"},
                    "question": {"type": "string"},
                    "answer": {"type": "string"},
                },
                "required": ["subject", "question", "answer"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["title", "items"],
    "additionalProperties": False,
}


def _summarize_mistakes(mistakes: list) -> str:
    lines = []
    for m in mistakes:
        tags = "、".join(m.get("tags") or [])
        extra = f"；考点：{tags}" if tags else ""
        lines.append(
            f"【{m.get('subject', '')}】{m.get('topic', '')}"
            f"（错因：{m.get('analysis') or '—'}{extra}）"
        )
    return "\n".join(lines)


def _mock_paper(mistakes: list) -> dict:
    items = [
        {
            "subject": m.get("subject", "数学"),
            "question": f"（占位）请完成与「{m.get('topic', '')}」同类的练习题。",
            "answer": "（占位答案：配置 ANTHROPIC_API_KEY 后生成真实题目）",
        }
        for m in mistakes[:8]
    ]
    return {"title": "练习卷（占位）", "items": items}


def _call_paper(client, mistakes: list) -> dict:
    summary = _summarize_mistakes(mistakes)
    prompt = (
        "你是一名经验丰富的小学老师。下面是某学生最近一段时间的错题（知识点 + 错误原因）：\n\n"
        f"{summary}\n\n"
        "请针对这些薄弱知识点，出一份『练习卷』帮他查漏补缺。要求：\n"
        "1. 题目是『同知识点的新题/变式题』：考点与错题一致，但换数字、换情境，"
        "不要照抄原题，难度与对应年级相当。\n"
        "2. 题量 8-15 道，按学科分组（同一学科的题排在一起）。\n"
        "3. 每题给出 question（完整、可直接作答的题干）和 answer（答案，必要时附一句话解析）。\n"
        "4. title 用一句话概括这份卷子，如『数学·语文 综合练习』。"
    )
    resp = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=8192,
        thinking={"type": "adaptive"},
        output_config={"format": {"type": "json_schema", "schema": PAPER_SCHEMA}},
        messages=[{"role": "user", "content": [{"type": "text", "text": prompt}]}],
    )
    text = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text").strip()
    data = json.loads(text)
    items = [
        {
            "subject": str(it.get("subject", "")).strip(),
            "question": str(it.get("question", "")).strip(),
            "answer": str(it.get("answer", "")).strip(),
        }
        for it in (data.get("items") or [])
        if str(it.get("question", "")).strip()
    ]
    if not items:
        raise AIAnalysisError("AI 未生成题目")
    return {"title": (data.get("title") or "练习卷").strip(), "items": items}


def generate_practice_paper(mistakes: list) -> dict:
    """根据最近错题的知识点出一份变式练习卷。失败抛 AIAnalysisError。"""
    if not mistakes:
        raise AIAnalysisError("没有可用于出题的错题")
    if not config.ANTHROPIC_API_KEY:
        return _mock_paper(mistakes)

    client = _make_client()
    last_exc: Optional[Exception] = None
    for attempt in range(MAX_ATTEMPTS):
        try:
            return _call_paper(client, mistakes)
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            status = getattr(exc, "status_code", None)
            if status is not None and status not in RETRYABLE_STATUS:
                break
            if attempt < MAX_ATTEMPTS - 1:
                time.sleep(1.5 * (attempt + 1))
    raise AIAnalysisError(str(last_exc))
