"""把练习卷渲染成可打印的中文 PDF（试卷 / 答案分开）。

用 reportlab 内置 CJK 字体 STSong-Light，无需外部字体文件即可显示中文。
"""
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

_FONT = "STSong-Light"
_registered = False


def _ensure_font() -> None:
    global _registered
    if not _registered:
        pdfmetrics.registerFont(UnicodeCIDFont(_FONT))
        _registered = True


def _styles():
    return {
        "title": ParagraphStyle("title", fontName=_FONT, fontSize=18, leading=26,
                                alignment=1, spaceAfter=4),
        "meta": ParagraphStyle("meta", fontName=_FONT, fontSize=10, leading=16,
                               alignment=1, textColor=colors.HexColor("#666666"), spaceAfter=14),
        "head": ParagraphStyle("head", fontName=_FONT, fontSize=13, leading=20,
                               spaceBefore=12, spaceAfter=6, textColor=colors.HexColor("#0d6e6e")),
        "q": ParagraphStyle("q", fontName=_FONT, fontSize=12, leading=20, spaceAfter=4),
        "a": ParagraphStyle("a", fontName=_FONT, fontSize=12, leading=20, spaceAfter=8,
                            textColor=colors.HexColor("#333333")),
    }


def _esc(s: str) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _build(path: str, title: str, subtitle: str, items: list,
           with_answers: bool, answer_gap: bool) -> None:
    _ensure_font()
    st = _styles()
    doc = SimpleDocTemplate(
        path, pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm, bottomMargin=16 * mm,
    )
    flow = [Paragraph(_esc(title), st["title"]), Paragraph(_esc(subtitle), st["meta"])]
    last_subject = None
    for i, it in enumerate(items, 1):
        subj = it.get("subject", "")
        if subj and subj != last_subject:
            flow.append(Paragraph(f"【{_esc(subj)}】", st["head"]))
            last_subject = subj
        flow.append(Paragraph(f"{i}. {_esc(it.get('question', ''))}", st["q"]))
        if with_answers:
            flow.append(Paragraph(f"答案：{_esc(it.get('answer', ''))}", st["a"]))
        elif answer_gap:
            flow.append(Spacer(1, 16 * mm))  # 留作答空间
    doc.build(flow)


def build_question_pdf(path: str, title: str, subtitle: str, items: list) -> None:
    """试卷：只有题目，每题下方留空白作答。"""
    _build(path, title, subtitle, items, with_answers=False, answer_gap=True)


def build_answer_pdf(path: str, title: str, subtitle: str, items: list) -> None:
    """答案：题目 + 答案，紧凑排版。"""
    _build(path, f"{title}（答案）", subtitle, items, with_answers=True, answer_gap=False)
