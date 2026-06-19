import { useState } from "react";
import {
  BookOpen, MessageSquare, Printer, Home, Camera,
  AlertCircle, CheckCircle, ChevronRight, Star, Clock,
  FileText, Plus, X, Send, Target, Zap, Upload,
} from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from "recharts";

type Tab = "home" | "mistakes" | "messages" | "print";
type SubView = "list" | "upload" | "detail";

interface Mistake {
  id: string; subject: string; topic: string; date: string;
  analysis: string; suggestion: string;
  difficulty: "easy" | "medium" | "hard"; tags: string[];
}
interface Message {
  id: string; teacher: string; avatar: string; content: string;
  time: string; type: "homework" | "notice" | "praise" | "reminder";
  important?: boolean;
}

const SUBJECTS = ["数学", "语文", "英语", "物理", "化学", "历史"];

const SUB: Record<string, { ink: string; wash: string }> = {
  数学: { ink: "#1a56db", wash: "#e8eefb" },
  语文: { ink: "#b45309", wash: "#fef3c7" },
  英语: { ink: "#0369a1", wash: "#e0f2fe" },
  物理: { ink: "#7c3aed", wash: "#ede9fe" },
  化学: { ink: "#047857", wash: "#d1fae5" },
  历史: { ink: "#b91c1c", wash: "#fee2e2" },
};

const radarData = [
  { subject: "数学", value: 68 },
  { subject: "语文", value: 85 },
  { subject: "英语", value: 72 },
  { subject: "物理", value: 54 },
  { subject: "化学", value: 78 },
  { subject: "历史", value: 91 },
];

const MISTAKES: Mistake[] = [
  { id: "1", subject: "数学", topic: "二次函数图像平移", date: "6月17日",
    analysis: "对函数图像的平移方向理解有误，混淆了左移右移与正负号的关系。",
    suggestion: "用坐标纸亲手画出不同参数下的图像，加深对平移规律的直觉理解。",
    difficulty: "hard", tags: ["函数", "图像变换"] },
  { id: "2", subject: "物理", topic: "牛顿第三定律应用", date: "6月16日",
    analysis: "分不清作用力与反作用力的施力体，受力分析时出现遗漏或多余力。",
    suggestion: "每次受力分析前先明确研究对象，用不同颜色标注不同物体的受力。",
    difficulty: "medium", tags: ["力学", "受力分析"] },
  { id: "3", subject: "英语", topic: "定语从句关系词选择", date: "6月15日",
    analysis: "which 和 that 的使用场景混淆，限制性与非限制性定语从句区分不清。",
    suggestion: "整理关系词选择口诀卡片，每天早读，配合10道专项练习题巩固。",
    difficulty: "medium", tags: ["语法", "从句"] },
  { id: "4", subject: "数学", topic: "排列组合重复元素", date: "6月14日",
    analysis: "解决有重复元素的排列问题时，未能正确使用除法原理消除重复计数。",
    suggestion: "从简单3-4个元素开始专项练习，逐步增加复杂度。",
    difficulty: "hard", tags: ["概率", "组合数学"] },
  { id: "5", subject: "化学", topic: "氧化还原反应配平", date: "6月13日",
    analysis: "电子转移数量计算正确，但调整系数时破坏了原子守恒，结果有误。",
    suggestion: "先配平电子转移，再补氢氧，最后逐一检验各元素原子数。",
    difficulty: "easy", tags: ["化学方程式"] },
];

const MESSAGES: Message[] = [
  { id: "1", teacher: "王老师（数学）", avatar: "王",
    content: "今晚作业：课本P45第3、5、7题，明天上课讲评。本周五第三单元小测，请复习二次函数和基本不等式。",
    time: "08:32", type: "homework", important: true },
  { id: "2", teacher: "李老师（班主任）", avatar: "李",
    content: "家长们好！本周四（6月20日）下午3:30-4:30 期末家长会，请各位家长准时参加，会议在学校报告厅举行。",
    time: "09:15", type: "notice", important: true },
  { id: "3", teacher: "张老师（英语）", avatar: "张",
    content: "今天课堂上小明同学的口语展示非常出色，发音准确，表达流畅，值得表扬！",
    time: "10:48", type: "praise" },
  { id: "4", teacher: "赵老师（物理）", avatar: "赵",
    content: "本次受力分析专项作业全班平均分78分，部分同学牛三定律仍有欠缺，请认真查看批注并订正，明天交检查。",
    time: "14:20", type: "reminder" },
  { id: "5", teacher: "陈老师（语文）", avatar: "陈",
    content: "本周阅读打卡全班完成率92%，周记请在本周日晚前上交到钉钉作业本，字数不少于500字。",
    time: "16:05", type: "homework" },
];

const MSG_META = {
  homework: { label: "作业", ink: "#1a56db", wash: "#e8eefb" },
  notice:   { label: "通知", ink: "#b45309", wash: "#fef3c7" },
  praise:   { label: "表扬", ink: "#047857", wash: "#d1fae5" },
  reminder: { label: "提醒", ink: "#b91c1c", wash: "#fee2e2" },
};

// ── Primitives ────────────────────────────────────────────────────────────────

function SubjectDot({ s }: { s: string }) {
  const m = SUB[s];
  return (
    <span className="w-9 h-9 rounded-xl inline-flex items-center justify-center text-xs font-bold shrink-0"
      style={{ backgroundColor: m.wash, color: m.ink }}>
      {s.charAt(0)}
    </span>
  );
}

function DiffPill({ d }: { d: Mistake["difficulty"] }) {
  const map = {
    hard:   { label: "难", ink: "#b91c1c", wash: "#fee2e2" },
    medium: { label: "中", ink: "#b45309", wash: "#fef3c7" },
    easy:   { label: "易", ink: "#047857", wash: "#d1fae5" },
  };
  const m = map[d];
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: m.ink, backgroundColor: m.wash }}>
      {m.label}
    </span>
  );
}

function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="px-5 pt-14 pb-5">
      <h2 className="text-[22px] font-bold tracking-tight text-foreground">{title}</h2>
      {sub && <p className="text-sm text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function FilterBar({ options, value, onChange }: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (k: string) => void;
}) {
  return (
    <div className="px-5 flex gap-2 overflow-x-auto pb-4" style={{ scrollbarWidth: "none" }}>
      {options.map((o) => (
        <button key={o.key} onClick={() => onChange(o.key)}
          className="shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors"
          style={value === o.key
            ? { backgroundColor: "#1a56db", color: "#fff" }
            : { backgroundColor: "#fff", color: "#6b7280" }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Home ──────────────────────────────────────────────────────────────────────
function HomeTab({ setTab }: { setTab: (t: Tab) => void }) {
  const weakest   = radarData.reduce((a, b) => (a.value < b.value ? a : b));
  const strongest = radarData.reduce((a, b) => (a.value > b.value ? a : b));

  return (
    <div>
      {/* Header */}
      <div className="px-5 pt-14 pb-7 bg-white">
        <p className="text-xs text-muted-foreground mb-1">初三（2）班 · 2024年6月</p>
        <h1 className="text-2xl font-bold text-foreground">你好，家长 👋</h1>
        <p className="text-sm text-muted-foreground mt-0.5">小明今天有 <span className="font-semibold text-foreground">5</span> 条老师消息</p>

        <div className="mt-5 flex gap-3">
          {[
            { n: "47", label: "累计错题", bg: "#e8eefb", ink: "#1a56db" },
            { n: "5",  label: "今日消息", bg: "#fef3c7", ink: "#b45309" },
            { n: "3",  label: "待打印",   bg: "#d1fae5", ink: "#047857" },
          ].map((s) => (
            <div key={s.label} className="flex-1 rounded-2xl py-3 text-center" style={{ backgroundColor: s.bg }}>
              <p className="text-xl font-bold" style={{ color: s.ink }}>{s.n}</p>
              <p className="text-[11px] font-medium mt-0.5" style={{ color: s.ink + "aa" }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 py-5 space-y-4">
        {/* Quick actions */}
        <div className="bg-white rounded-2xl p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-3">快捷功能</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: <Camera size={18} />, label: "拍照上传", tab: "mistakes" as Tab, ...SUB["数学"] },
              { icon: <BookOpen size={18} />, label: "薄弱分析", tab: "mistakes" as Tab, ...SUB["物理"] },
              { icon: <MessageSquare size={18} />, label: "老师通知", tab: "messages" as Tab, ...SUB["语文"] },
              { icon: <Printer size={18} />, label: "远程打印", tab: "print" as Tab, ...SUB["化学"] },
            ].map((a) => (
              <button key={a.label} onClick={() => setTab(a.tab)} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform active:scale-95"
                  style={{ backgroundColor: a.wash, color: a.ink }}>
                  {a.icon}
                </div>
                <span className="text-[11px] font-medium text-foreground">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Radar */}
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="font-semibold text-sm">能力雷达</p>
            <span className="text-xs text-muted-foreground">近30天</span>
          </div>
          <div className="h-44 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 6, right: 20, bottom: 6, left: 20 }}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#9ca3af", fontFamily: "Noto Sans SC" }} />
                <Radar dataKey="value" stroke="#1a56db" fill="#1a56db" fillOpacity={0.12} strokeWidth={2}
                  dot={{ r: 3, fill: "#1a56db", strokeWidth: 0 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-1">
            <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 bg-red-50">
              <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 leading-relaxed">
                <span className="font-bold">{weakest.subject}</span> 掌握度最低（{weakest.value}%），建议本周重点攻克。
              </p>
            </div>
            <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 bg-green-50">
              <CheckCircle size={13} className="text-green-600 shrink-0 mt-0.5" />
              <p className="text-xs text-green-700 leading-relaxed">
                <span className="font-bold">{strongest.subject}</span> 表现最优（{strongest.value}%），可适当减少复习时间。
              </p>
            </div>
          </div>
        </div>

        {/* Recent mistakes */}
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm">最近错题</p>
            <button onClick={() => setTab("mistakes")} className="text-xs font-semibold text-blue-600 flex items-center gap-0.5">
              全部 <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {MISTAKES.slice(0, 3).map((m, i) => (
              <div key={m.id} className={`flex items-center gap-3 ${i < 2 ? "pb-3 border-b border-gray-100" : ""}`}>
                <SubjectDot s={m.subject} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.topic}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.date} · {m.subject}</p>
                </div>
                <DiffPill d={m.difficulty} />
              </div>
            ))}
          </div>
        </div>

        {/* Today messages */}
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm">今日通知</p>
            <button onClick={() => setTab("messages")} className="text-xs font-semibold text-blue-600 flex items-center gap-0.5">
              全部 <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {MESSAGES.filter((m) => m.important).map((m) => {
              const meta = MSG_META[m.type];
              return (
                <div key={m.id} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ backgroundColor: meta.wash, color: meta.ink }}>
                    {m.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="text-sm font-semibold truncate">{m.teacher}</p>
                      <span className="text-[10px] font-bold shrink-0"
                        style={{ color: meta.ink }}>{meta.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{m.content}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mistakes ──────────────────────────────────────────────────────────────────
function MistakesTab() {
  const [view, setView] = useState<SubView>("list");
  const [mistakes, setMistakes] = useState<Mistake[]>(MISTAKES);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<Mistake | null>(null);
  const [filterSub, setFilterSub] = useState("全部");
  const [uploading, setUploading] = useState(false);
  const [uploadSubject, setUploadSubject] = useState("数学");
  const [uploadTopic, setUploadTopic] = useState("");

  const filtered = filterSub === "全部" ? mistakes : mistakes.filter((m) => m.subject === filterSub);

  function toggleSel(id: string) {
    setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function handleUpload() {
    if (!uploadTopic.trim()) return;
    setUploading(true);
    setTimeout(() => {
      setMistakes((p) => [{
        id: Date.now().toString(), subject: uploadSubject, topic: uploadTopic, date: "今天",
        analysis: "AI 已识别出该题的概念理解偏差，建议重点复习相关基础定义。",
        suggestion: "先回顾课本对应章节，再做同类型练习3-5道，巩固解题思路。",
        difficulty: "medium", tags: [uploadSubject],
      }, ...p]);
      setUploading(false); setUploadTopic(""); setView("list");
    }, 1800);
  }

  if (detail) return (
    <div>
      <div className="bg-white px-5 pt-14 pb-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => setDetail(null)}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <X size={14} className="text-gray-600" />
        </button>
        <h2 className="font-bold text-base">错题详情</h2>
      </div>
      <div className="px-5 py-5 space-y-4">
        <div className="bg-white rounded-2xl p-4 flex items-center gap-3">
          <SubjectDot s={detail.subject} />
          <div className="flex-1">
            <p className="font-bold">{detail.topic}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{detail.date}</p>
          </div>
          <DiffPill d={detail.difficulty} />
        </div>

        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="h-44 flex items-center justify-center" style={{ backgroundColor: "#f2f4f7" }}>
            <div className="text-center text-muted-foreground">
              <Camera size={26} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs">题目图片</p>
            </div>
          </div>
          <div className="p-4 flex flex-wrap gap-1.5">
            {detail.tags.map((t) => (
              <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">{t}</span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 space-y-3">
          <div className="rounded-xl bg-red-50 p-3.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Target size={13} className="text-red-500" />
              <p className="text-xs font-bold text-red-700">错误分析</p>
            </div>
            <p className="text-sm text-red-800 leading-relaxed">{detail.analysis}</p>
          </div>
          <div className="rounded-xl bg-blue-50 p-3.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Zap size={13} className="text-blue-500" />
              <p className="text-xs font-bold text-blue-700">改进建议</p>
            </div>
            <p className="text-sm text-blue-800 leading-relaxed">{detail.suggestion}</p>
          </div>
        </div>

        <button className="w-full bg-blue-600 text-white rounded-2xl py-3.5 font-semibold flex items-center justify-center gap-2">
          <Printer size={16} /> 打印此题
        </button>
      </div>
    </div>
  );

  if (view === "upload") return (
    <div>
      <div className="bg-white px-5 pt-14 pb-4 flex items-center gap-3 border-b border-gray-100">
        <button onClick={() => setView("list")}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <X size={14} className="text-gray-600" />
        </button>
        <h2 className="font-bold text-base">上传错题</h2>
      </div>
      <div className="px-5 py-5 space-y-5">
        <div className="bg-white rounded-2xl p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2.5">选择学科</p>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map((s) => {
                const m = SUB[s];
                const active = uploadSubject === s;
                return (
                  <button key={s} onClick={() => setUploadSubject(s)}
                    className="px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors"
                    style={{ backgroundColor: active ? m.ink : m.wash, color: active ? "#fff" : m.ink }}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2.5">题目描述</p>
            <input type="text" placeholder="例：二次函数图像平移方向判断"
              value={uploadTopic} onChange={(e) => setUploadTopic(e.target.value)}
              className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30" />
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2.5">上传图片</p>
            <div className="h-40 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2.5 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                <Camera size={20} className="text-blue-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">点击拍照或选择图片</p>
              <p className="text-xs text-muted-foreground">支持 JPG、PNG</p>
            </div>
          </div>
        </div>

        <button onClick={handleUpload} disabled={uploading || !uploadTopic.trim()}
          className="w-full bg-blue-600 disabled:opacity-40 text-white rounded-2xl py-3.5 font-semibold flex items-center justify-center gap-2 transition-opacity">
          {uploading
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> AI 分析中…</>
            : <><Upload size={16} /> 上传并分析</>}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <PageTitle title="错题本" sub={`共 ${mistakes.length} 道${selected.size > 0 ? ` · 已选 ${selected.size} 道` : ""}`} />

      <FilterBar
        options={["全部", ...SUBJECTS].map((s) => ({ key: s, label: s }))}
        value={filterSub} onChange={setFilterSub} />

      {selected.size > 0 && (
        <div className="mx-5 mb-3 bg-blue-50 rounded-2xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-blue-700">已选 {selected.size} 道</span>
          <button className="bg-blue-600 text-white text-xs px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5">
            <Printer size={12} /> 打印选中
          </button>
        </div>
      )}

      <div className="px-5 space-y-2 pb-28">
        {filtered.map((m) => (
          <div key={m.id}
            className="bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-all"
            style={{ border: `1.5px solid ${selected.has(m.id) ? "#1a56db" : "transparent"}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <button onClick={() => toggleSel(m.id)}
              className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors"
              style={{ borderColor: selected.has(m.id) ? "#1a56db" : "#d1d5db",
                backgroundColor: selected.has(m.id) ? "#1a56db" : "transparent" }}>
              {selected.has(m.id) && <div className="w-2 h-2 rounded-full bg-white" />}
            </button>
            <SubjectDot s={m.subject} />
            <button className="flex-1 min-w-0 text-left" onClick={() => setDetail(m)}>
              <p className="text-sm font-medium truncate">{m.topic}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.date} · {m.subject}</p>
            </button>
            <div className="flex items-center gap-2 shrink-0">
              <DiffPill d={m.difficulty} />
              <ChevronRight size={14} className="text-gray-400" />
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => setView("upload")}
        className="fixed bottom-24 right-5 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all z-20">
        <Plus size={22} />
      </button>
    </div>
  );
}

// ── Messages ──────────────────────────────────────────────────────────────────
function MessagesTab() {
  const [filter, setFilter] = useState("all");
  const filters = [
    { key: "all", label: "全部" },
    { key: "homework", label: "作业" },
    { key: "notice",   label: "通知" },
    { key: "praise",   label: "表扬" },
    { key: "reminder", label: "提醒" },
  ];
  const filtered = filter === "all" ? MESSAGES : MESSAGES.filter((m) => m.type === filter);

  return (
    <div>
      <PageTitle title="老师通知" sub={`今日 · 共 ${MESSAGES.length} 条`} />
      <FilterBar options={filters} value={filter} onChange={setFilter} />

      <div className="px-5 space-y-3 pb-24">
        {filtered.map((m) => {
          const meta = MSG_META[m.type];
          return (
            <div key={m.id} className="bg-white rounded-2xl p-4"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                border: m.important ? `1px solid ${meta.ink}30` : "1px solid transparent" }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ backgroundColor: meta.wash, color: meta.ink }}>
                  {m.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="text-sm font-semibold">{m.teacher}</p>
                    {m.important && <Star size={11} style={{ color: meta.ink, fill: meta.ink }} className="shrink-0" />}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto shrink-0"
                      style={{ color: meta.ink, backgroundColor: meta.wash }}>{meta.label}</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{m.content}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={10} /> {m.time}
                    </span>
                    <div className="flex items-center gap-2">
                      <button className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 flex items-center gap-1">
                        <Printer size={10} /> 打印
                      </button>
                      <button className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 flex items-center gap-1">
                        <FileText size={10} /> 备注
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Print ─────────────────────────────────────────────────────────────────────
function PrintTab() {
  const [items, setItems] = useState([
    { id: "p1", label: "二次函数图像平移", sub: "数学错题", selected: true },
    { id: "p2", label: "牛顿第三定律应用", sub: "物理错题", selected: true },
    { id: "p3", label: "定语从句关系词选择", sub: "英语错题", selected: false },
    { id: "p4", label: "王老师·今日作业通知", sub: "老师消息", selected: true },
    { id: "p5", label: "李老师·期末家长会通知", sub: "老师消息", selected: false },
  ]);
  const [printing, setPrinting] = useState(false);
  const [done, setDone] = useState(false);
  const selectedCount = items.filter((p) => p.selected).length;

  function toggle(id: string) {
    setItems((p) => p.map((x) => x.id === id ? { ...x, selected: !x.selected } : x));
  }
  function handlePrint() {
    setPrinting(true);
    setTimeout(() => { setPrinting(false); setDone(true); }, 2200);
  }

  return (
    <div>
      <PageTitle title="远程打印" sub="选择内容，一键发送到家里的打印机" />

      <div className="px-5 space-y-3 pb-24">
        {/* Printer status */}
        <div className="bg-white rounded-2xl px-4 py-4 flex items-center gap-3"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
            <Printer size={22} className="text-green-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">家里的打印机</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <p className="text-xs text-green-600 font-medium">在线，墨水充足</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-green-100 text-green-700">已连接</span>
        </div>

        {/* List */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-100">
            <p className="font-semibold text-sm">待打印列表</p>
            <button onClick={() => setItems((p) => p.map((x) => ({ ...x, selected: true })))}
              className="text-xs font-semibold text-blue-600">全选</button>
          </div>
          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <button key={item.id} onClick={() => toggle(item.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors">
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                  style={{ borderColor: item.selected ? "#1a56db" : "#d1d5db",
                    backgroundColor: item.selected ? "#1a56db" : "transparent" }}>
                  {item.selected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <p className="font-semibold text-sm">打印设置</p>
          </div>
          <div className="divide-y divide-gray-100">
            {[["纸张大小", "A4"], ["打印方向", "纵向"], ["份数", "1 份"], ["双面打印", "关闭"]].map(([l, v]) => (
              <div key={l} className="px-4 py-3.5 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{l}</span>
                <span className="text-sm font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {done ? (
          <div className="bg-green-50 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle size={26} className="text-green-600" />
            </div>
            <p className="font-bold text-green-800">打印任务已发送！</p>
            <p className="text-sm text-green-700">共 {selectedCount} 个文件已发送到打印机</p>
            <button onClick={() => setDone(false)} className="text-xs font-semibold text-blue-600 underline mt-1">重新发送</button>
          </div>
        ) : (
          <button onClick={handlePrint} disabled={printing || selectedCount === 0}
            className="w-full bg-blue-600 disabled:opacity-40 text-white rounded-2xl py-4 font-semibold flex items-center justify-center gap-2 transition-opacity">
            {printing
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 发送中…</>
              : <><Send size={16} /> 发送到打印机（{selectedCount}）</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState<Tab>("home");

  const tabs: { key: Tab; icon: (a: boolean) => React.ReactNode; label: string }[] = [
    { key: "home",     label: "首页",   icon: (a) => <Home size={21} strokeWidth={a ? 2.5 : 1.8} /> },
    { key: "mistakes", label: "错题本", icon: (a) => <BookOpen size={21} strokeWidth={a ? 2.5 : 1.8} /> },
    { key: "messages", label: "通知",   icon: (a) => <MessageSquare size={21} strokeWidth={a ? 2.5 : 1.8} /> },
    { key: "print",    label: "打印",   icon: (a) => <Printer size={21} strokeWidth={a ? 2.5 : 1.8} /> },
  ];

  return (
    <div className="min-h-screen bg-background"
      style={{ fontFamily: "'Noto Sans SC', system-ui, sans-serif", maxWidth: 430, margin: "0 auto" }}>
      <div style={{ paddingBottom: 72, overflowY: "auto", scrollbarWidth: "none" }}>
        {tab === "home"     && <HomeTab setTab={setTab} />}
        {tab === "mistakes" && <MistakesTab />}
        {tab === "messages" && <MessagesTab />}
        {tab === "print"    && <PrintTab />}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white z-30"
        style={{ borderTop: "1px solid #f0f0f0", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex">
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors"
                style={{ color: active ? "#1a56db" : "#9ca3af" }}>
                {t.icon(active)}
                <span className="text-[10px] font-semibold">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
