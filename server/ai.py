"""错题 AI 分析。调用 Claude（claude-opus-4-8）用原生结构化输出返回结果。

错题全部来自图片：AI 直接看图，自动命名题目（topic），并给出结构化的
「一句话总述 + 重点关注（带等级）+ 分步建议」，便于前端美观、分层展示。

未配置 ANTHROPIC_API_KEY 时走 mock 分支，保证 demo 可跑、不报错。
"""
import base64
import json
import mimetypes
from typing import Optional

import config

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


def _mock(subject: str, topic: str) -> dict:
    return {
        "subject": subject,
        "topic": topic or "未命名错题",
        "analysis": f"已识别出{subject}相关的概念理解偏差。（占位结果：配置 ANTHROPIC_API_KEY 后返回真实分析）",
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
        "tags": [subject],
    }


def _normalize(data: dict, subject: str, topic: str) -> dict:
    diff = data.get("difficulty", "medium")
    focus = []
    for fp in (data.get("focus_points") or []):
        if isinstance(fp, dict) and fp.get("text"):
            lvl = fp.get("level", "medium")
            focus.append({"text": str(fp["text"]).strip(),
                          "level": lvl if lvl in ("high", "medium", "low") else "medium"})
    return {
        "subject": (data.get("subject") or subject or "").strip() or subject,
        "topic": (data.get("topic") or topic or "").strip() or "未命名错题",
        "analysis": (data.get("analysis") or "").strip(),
        "focus_points": focus[:4],
        "steps": [str(s).strip() for s in (data.get("steps") or []) if str(s).strip()][:5],
        "difficulty": diff if diff in ("easy", "medium", "hard") else "medium",
        "tags": [str(t).strip() for t in (data.get("tags") or []) if str(t).strip()][:3] or [subject],
    }


def analyze_mistake(subject: str, topic: str = "", image_path: Optional[str] = None) -> dict:
    if not config.ANTHROPIC_API_KEY:
        return _mock(subject, topic)

    try:
        import anthropic

        client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)

        hint = f"\n学生补充：{topic}" if topic else ""
        content = [{
            "type": "text",
            "text": (
                f"你是一名{subject}老师。下面是学生上传的一道错题图片。{hint}\n\n"
                "请完成：\n"
                "1. topic：用一句话（≤15字）概括这道题考查的知识点，作为题目名。\n"
                "2. analysis：一句话总述错误的核心原因（≤40字，不要长篇大论）。\n"
                "3. focus_points：2-4 个最需要重点关注的点，每个 ≤12 字，并标注严重等级"
                "（high=高频/关键易错，medium=需巩固，low=小提醒）。\n"
                "4. steps：2-4 条可立即执行的改进步骤，每条一句话。\n"
                "5. difficulty：easy / medium / hard。\n"
                "6. tags：≤3 个知识点标签。\n"
                f"若图片不是{subject}题目或无法识别，topic 用「图片无法识别」，"
                "analysis 说明原因，focus_points 给出「请重新拍摄清晰题目」(high)。"
            ),
        }]

        if image_path:
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
    except Exception as exc:  # noqa: BLE001 —— 真失败时不伪造内容，直白告知
        return {
            "subject": subject,
            "topic": "分析失败",
            "analysis": f"AI 分析失败：{exc}",
            "focus_points": [{"text": "请稍后重试", "level": "high"}],
            "steps": [],
            "difficulty": "medium",
            "tags": [subject],
        }
