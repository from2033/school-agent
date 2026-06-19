import { useState } from "react";
import {
  Upload,
  BookOpen,
  MessageSquare,
  Printer,
  Home,
  Camera,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Bell,
  Search,
  Star,
  Clock,
  FileText,
  Trash2,
  Plus,
  X,
  Download,
  Send,
  BarChart2,
  Award,
  Target,
  Zap,
} from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

type Tab = "home" | "mistakes" | "messages" | "print";
type MistakeView = "list" | "upload" | "detail";

interface Mistake {
  id: string;
  subject: string;
  topic: string;
  date: string;
  image?: string;
  analysis: string;
  suggestion: string;
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  selected?: boolean;
}

interface Message {
  id: string;
  teacher: string;
  avatar: string;
  content: string;
  time: string;
  type: "homework" | "notice" | "praise" | "reminder";
  important?: boolean;
}

const SUBJECTS = ["数学", "语文", "英语", "物理", "化学", "历史"];
const SUBJECT_COLORS: Record<string, string> = {
  数学: "#0d6e6e",
  语文: "#f59e0b",
  英语: "#6366f1",
  物理: "#e53e3e",
  化学: "#10b981",
  历史: "#ec4899",
};

const radarData = [
  { subject: "数学", value: 68, fullMark: 100 },
  { subject: "语文", value: 85, fullMark: 100 },
  { subject: "英语", value: 72, fullMark: 100 },
  { subject: "物理", value: 54, fullMark: 100 },
  { subject: "化学", value: 78, fullMark: 100 },
  { subject: "历史", value: 91, fullMark: 100 },
];

const mistakeCountData = [
  { subject: "数学", count: 12 },
  { subject: "语文", count: 4 },
  { subject: "英语", count: 8 },
  { subject: "物理", count: 15 },
  { subject: "化学", count: 6 },
  { subject: "历史", count: 2 },
];

const INITIAL_MISTAKES: Mistake[] = [
  {
    id: "1",
    subject: "数学",
    topic: "二次函数图像平移",
    date: "2024-06-17",
    analysis: "对函数图像的平移方向理解有误，混淆了左移右移与正负号的关系。",
    suggestion: "重点复习函数图像变换规律，建议用坐标纸亲手画出不同参数下的图像，加深直觉理解。",
    difficulty: "hard",
    tags: ["函数", "图像变换", "代数"],
  },
  {
    id: "2",
    subject: "物理",
    topic: "牛顿第三定律应用",
    date: "2024-06-16",
    analysis: "分不清作用力与反作用力的施力体，在受力分析时出现多余力或遗漏力的情况。",
    suggestion: "每次受力分析前先明确研究对象，用不同颜色标注不同物体的受力，反复练习直到形成习惯。",
    difficulty: "medium",
    tags: ["力学", "受力分析"],
  },
  {
    id: "3",
    subject: "英语",
    topic: "定语从句关系词选择",
    date: "2024-06-15",
    analysis: "which 和 that 的使用场景混淆，限制性定语从句与非限制性定语从句区分不清。",
    suggestion: "整理一份关系词选择口诀卡片，每天早读时背诵，配合10道专项练习题巩固。",
    difficulty: "medium",
    tags: ["语法", "从句", "关系词"],
  },
  {
    id: "4",
    subject: "数学",
    topic: "概率计算：排列组合",
    date: "2024-06-14",
    analysis: "在解决有重复元素的排列问题时，未能正确使用除法原理消除重复计数。",
    suggestion: "专项练习「有重复元素的排列」题型，先从简单的3-4个元素开始，逐步增加复杂度。",
    difficulty: "hard",
    tags: ["概率", "组合数学"],
  },
  {
    id: "5",
    subject: "化学",
    topic: "氧化还原反应配平",
    date: "2024-06-13",
    analysis: "电子转移数量计算正确，但在调整系数时破坏了原子守恒，最终结果有误。",
    suggestion: "牢记配平步骤：先配平电子转移，再用观察法补氢氧，最后逐一检验各元素原子数。",
    difficulty: "easy",
    tags: ["化学方程式", "氧化还原"],
  },
];

const MESSAGES: Message[] = [
  {
    id: "1",
    teacher: "王老师（数学）",
    avatar: "王",
    content: "同学们，今晚作业：课本P45第3、5、7题，明天上课讲评。另外，本周五将进行第三单元小测，请同学们提前复习二次函数和基本不等式部分。",
    time: "08:32",
    type: "homework",
    important: true,
  },
  {
    id: "2",
    teacher: "李老师（班主任）",
    avatar: "李",
    content: "家长们好！提醒一下，本周四（6月20日）下午3:30-4:30 有期末家长会，请各位家长准时参加。会议将在学校报告厅举行，请提前安排好时间。",
    time: "09:15",
    type: "notice",
    important: true,
  },
  {
    id: "3",
    teacher: "张老师（英语）",
    avatar: "张",
    content: "今天课堂上小明同学的口语展示非常出色，发音准确，表达流畅，值得表扬！希望其他同学也积极开口练习，语言学习重在实践。",
    time: "10:48",
    type: "praise",
  },
  {
    id: "4",
    teacher: "赵老师（物理）",
    avatar: "赵",
    content: "作业收批结果：本次受力分析专项作业全班平均分78分，部分同学在牛三定律应用上仍有欠缺，请认真阅读我批注的错误并订正，明天交来检查。",
    time: "14:20",
    type: "reminder",
  },
  {
    id: "5",
    teacher: "陈老师（语文）",
    avatar: "陈",
    content: "本周阅读打卡情况：全班完成率92%，表现优秀！周记请在本周日晚前上交到钉钉作业本，题目自拟，字数不少于500字。",
    time: "16:05",
    type: "homework",
  },
];

const msgTypeStyle: Record<Message["type"], { bg: string; label: string; color: string }> = {
  homework: { bg: "bg-blue-50", label: "作业", color: "text-blue-600" },
  notice: { bg: "bg-amber-50", label: "通知", color: "text-amber-600" },
  praise: { bg: "bg-green-50", label: "表扬", color: "text-green-600" },
  reminder: { bg: "bg-red-50", label: "提醒", color: "text-red-600" },
};

function difficultyBadge(d: Mistake["difficulty"]) {
  if (d === "hard") return <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">难</span>;
  if (d === "medium") return <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">中</span>;
  return <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-600 font-medium">易</span>;
}

// ── Home Tab ────────────────────────────────────────────────────────────────
function HomeTab({ setTab }: { setTab: (t: Tab) => void }) {
  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-primary px-5 pt-12 pb-8 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-40 h-40 rounded-full bg-white/5 -translate-y-12 translate-x-12" />
        <div className="absolute right-12 bottom-0 w-24 h-24 rounded-full bg-white/5 translate-y-8" />
        <p className="text-white/70 text-sm mb-1">你好，家长 👋</p>
        <h1 className="text-2xl font-extrabold tracking-tight">小明的学习管家</h1>
        <p className="text-white/60 text-xs mt-1">初三 · 班主任：李老师</p>
        <div className="mt-5 flex gap-4">
          <div className="flex-1 bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
            <p className="text-2xl font-bold">47</p>
            <p className="text-white/70 text-xs mt-0.5">累计错题</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
            <p className="text-2xl font-bold">5</p>
            <p className="text-white/70 text-xs mt-0.5">今日消息</p>
          </div>
          <div className="flex-1 bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
            <p className="text-2xl font-bold">3</p>
            <p className="text-white/70 text-xs mt-0.5">待打印</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-2 space-y-4">
        {/* Quick actions */}
        <div className="bg-card rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">快捷功能</p>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: <Camera size={22} />, label: "拍照上传", tab: "mistakes" as Tab, color: "bg-teal-50 text-primary" },
              { icon: <BarChart2 size={22} />, label: "薄弱分析", tab: "mistakes" as Tab, color: "bg-purple-50 text-purple-600" },
              { icon: <MessageSquare size={22} />, label: "老师通知", tab: "messages" as Tab, color: "bg-amber-50 text-amber-600" },
              { icon: <Printer size={22} />, label: "批量打印", tab: "print" as Tab, color: "bg-blue-50 text-blue-600" },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => setTab(a.tab)}
                className="flex flex-col items-center gap-1.5 hover:scale-105 transition-transform"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${a.color}`}>{a.icon}</div>
                <span className="text-xs font-medium text-foreground">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Weak area radar */}
        <div className="bg-card rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm">薄弱环节分析</p>
            <span className="text-xs text-muted-foreground">近30天</span>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#6b7a8d", fontFamily: "Nunito" }} />
                <Radar name="掌握度" dataKey="value" stroke="#0d6e6e" fill="#0d6e6e" fillOpacity={0.18} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-2">
            <div className="flex items-start gap-2 bg-red-50 rounded-xl p-3">
              <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700">物理掌握度最低 (54%)，主要集中在力学受力分析，建议本周重点攻克。</p>
            </div>
            <div className="flex items-start gap-2 bg-green-50 rounded-xl p-3">
              <CheckCircle size={15} className="text-green-600 mt-0.5 shrink-0" />
              <p className="text-xs text-green-700">历史表现优秀 (91%)，可适当减少历史复习时间，将精力转移至薄弱学科。</p>
            </div>
          </div>
        </div>

        {/* Recent mistakes */}
        <div className="bg-card rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm">最近错题</p>
            <button onClick={() => setTab("mistakes")} className="text-xs text-primary font-medium flex items-center gap-0.5">
              查看全部 <ChevronRight size={13} />
            </button>
          </div>
          <div className="space-y-2">
            {INITIAL_MISTAKES.slice(0, 3).map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: SUBJECT_COLORS[m.subject] }}
                >
                  {m.subject}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.topic}</p>
                  <p className="text-xs text-muted-foreground">{m.date}</p>
                </div>
                {difficultyBadge(m.difficulty)}
              </div>
            ))}
          </div>
        </div>

        {/* Today message preview */}
        <div className="bg-card rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm">今日群消息</p>
            <button onClick={() => setTab("messages")} className="text-xs text-primary font-medium flex items-center gap-0.5">
              查看全部 <ChevronRight size={13} />
            </button>
          </div>
          {MESSAGES.filter((m) => m.important).map((m) => {
            const style = msgTypeStyle[m.type];
            return (
              <div key={m.id} className={`rounded-xl p-3 mb-2 last:mb-0 ${style.bg}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold shrink-0">{m.avatar}</div>
                  <span className="text-xs font-semibold text-foreground">{m.teacher}</span>
                  <span className={`text-xs ${style.color} font-medium ml-auto`}>[{style.label}]</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{m.content}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Mistakes Tab ─────────────────────────────────────────────────────────────
function MistakesTab() {
  const [view, setView] = useState<MistakeView>("list");
  const [mistakes, setMistakes] = useState<Mistake[]>(INITIAL_MISTAKES);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<Mistake | null>(null);
  const [filterSubject, setFilterSubject] = useState<string>("全部");
  const [uploading, setUploading] = useState(false);
  const [uploadSubject, setUploadSubject] = useState("数学");
  const [uploadTopic, setUploadTopic] = useState("");

  const filtered = filterSubject === "全部" ? mistakes : mistakes.filter((m) => m.subject === filterSubject);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleUpload() {
    if (!uploadTopic.trim()) return;
    setUploading(true);
    setTimeout(() => {
      const newM: Mistake = {
        id: Date.now().toString(),
        subject: uploadSubject,
        topic: uploadTopic,
        date: new Date().toISOString().split("T")[0],
        analysis: "AI正在分析该题目的知识点薄弱原因，已识别出概念理解偏差，建议重点复习相关基础定义。",
        suggestion: "针对该题目，建议先回顾课本对应章节，再做同类型练习3-5道，巩固解题思路。",
        difficulty: "medium",
        tags: [uploadSubject, "新增"],
      };
      setMistakes((prev) => [newM, ...prev]);
      setUploading(false);
      setUploadTopic("");
      setView("list");
    }, 1800);
  }

  if (detail) {
    return (
      <div className="pb-6">
        <div className="bg-primary px-5 pt-12 pb-5 text-white flex items-center gap-3">
          <button onClick={() => setDetail(null)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <X size={16} />
          </button>
          <h2 className="font-bold text-lg">错题详情</h2>
        </div>
        <div className="px-4 mt-4 space-y-4">
          <div className="bg-card rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: SUBJECT_COLORS[detail.subject] }}
              >
                {detail.subject}
              </div>
              <div>
                <p className="font-semibold">{detail.topic}</p>
                <p className="text-xs text-muted-foreground">{detail.date}</p>
              </div>
              <div className="ml-auto">{difficultyBadge(detail.difficulty)}</div>
            </div>
            <div className="h-40 bg-muted rounded-xl flex items-center justify-center text-muted-foreground text-sm">
              <Camera size={24} className="mr-2 opacity-40" /> 题目图片区域
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {detail.tags.map((t) => (
                <span key={t} className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
          </div>
          <div className="bg-card rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Target size={16} className="text-red-500" />
              <p className="font-semibold text-sm">错误分析</p>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{detail.analysis}</p>
          </div>
          <div className="bg-card rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-amber-500" />
              <p className="font-semibold text-sm">改进建议</p>
            </div>
            <p className="text-sm text-foreground leading-relaxed">{detail.suggestion}</p>
          </div>
          <button className="w-full bg-primary text-primary-foreground rounded-2xl py-3.5 font-semibold flex items-center justify-center gap-2">
            <Printer size={18} /> 打印此题
          </button>
        </div>
      </div>
    );
  }

  if (view === "upload") {
    return (
      <div className="pb-6">
        <div className="bg-primary px-5 pt-12 pb-5 text-white flex items-center gap-3">
          <button onClick={() => setView("list")} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <X size={16} />
          </button>
          <h2 className="font-bold text-lg">上传错题</h2>
        </div>
        <div className="px-4 mt-4 space-y-4">
          <div className="bg-card rounded-2xl p-4 shadow-sm space-y-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">选择学科</label>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setUploadSubject(s)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                      uploadSubject === s ? "text-white" : "bg-muted text-muted-foreground"
                    }`}
                    style={uploadSubject === s ? { backgroundColor: SUBJECT_COLORS[s] } : {}}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">题目描述</label>
              <input
                type="text"
                placeholder="例：二次函数图像平移方向判断"
                value={uploadTopic}
                onChange={(e) => setUploadTopic(e.target.value)}
                className="w-full bg-input-background rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 ring-primary/30"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">上传题目图片</label>
              <div className="h-44 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-3 text-muted-foreground cursor-pointer hover:border-primary/40 hover:bg-secondary/30 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
                  <Camera size={24} className="text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">点击拍照或选择图片</p>
                  <p className="text-xs mt-0.5">支持 JPG、PNG 格式</p>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading || !uploadTopic.trim()}
            className="w-full bg-primary disabled:opacity-50 text-primary-foreground rounded-2xl py-3.5 font-semibold flex items-center justify-center gap-2 transition-opacity"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                AI 分析中…
              </>
            ) : (
              <>
                <Upload size={18} /> 上传并分析
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <div className="bg-primary px-5 pt-12 pb-5 text-white">
        <h2 className="font-extrabold text-xl">错题本</h2>
        <p className="text-white/60 text-xs mt-0.5">共 {mistakes.length} 道错题</p>
      </div>

      {/* Subject filter */}
      <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-none">
        {["全部", ...SUBJECTS].map((s) => (
          <button
            key={s}
            onClick={() => setFilterSubject(s)}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterSubject === s ? "bg-primary text-white" : "bg-card text-muted-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      <div className="px-4 mb-3">
        <div className="bg-card rounded-2xl p-3 shadow-sm">
          <p className="text-xs text-muted-foreground mb-2 font-medium">各科错题分布</p>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mistakeCountData} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                <XAxis dataKey="subject" tick={{ fontSize: 10, fill: "#6b7a8d" }} />
                <YAxis tick={{ fontSize: 10, fill: "#6b7a8d" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {mistakeCountData.map((entry) => (
                    <Cell key={entry.subject} fill={SUBJECT_COLORS[entry.subject] || "#0d6e6e"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="px-4 space-y-2">
        {selected.size > 0 && (
          <div className="bg-primary/10 rounded-2xl p-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-primary">已选 {selected.size} 道</span>
            <button className="bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1">
              <Printer size={13} /> 打印选中
            </button>
          </div>
        )}
        {filtered.map((m) => (
          <div
            key={m.id}
            className={`bg-card rounded-2xl p-3 shadow-sm flex items-center gap-3 transition-all ${
              selected.has(m.id) ? "ring-2 ring-primary" : ""
            }`}
          >
            <button
              onClick={() => toggleSelect(m.id)}
              className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                selected.has(m.id) ? "bg-primary border-primary" : "border-border"
              }`}
            >
              {selected.has(m.id) && <div className="w-2 h-2 rounded-full bg-white" />}
            </button>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: SUBJECT_COLORS[m.subject] }}
            >
              {m.subject}
            </div>
            <button className="flex-1 min-w-0 text-left" onClick={() => setDetail(m)}>
              <p className="text-sm font-semibold truncate">{m.topic}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.date}</p>
            </button>
            <div className="flex items-center gap-2 shrink-0">
              {difficultyBadge(m.difficulty)}
              <ChevronRight size={16} className="text-muted-foreground" />
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => setView("upload")}
        className="fixed bottom-24 right-5 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-20"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}

// ── Messages Tab ─────────────────────────────────────────────────────────────
function MessagesTab() {
  const [filter, setFilter] = useState<"all" | Message["type"]>("all");

  const filters: { key: "all" | Message["type"]; label: string }[] = [
    { key: "all", label: "全部" },
    { key: "homework", label: "作业" },
    { key: "notice", label: "通知" },
    { key: "praise", label: "表扬" },
    { key: "reminder", label: "提醒" },
  ];

  const filtered = filter === "all" ? MESSAGES : MESSAGES.filter((m) => m.type === filter);

  return (
    <div className="pb-6">
      <div className="bg-primary px-5 pt-12 pb-5 text-white">
        <h2 className="font-extrabold text-xl">老师通知</h2>
        <p className="text-white/60 text-xs mt-0.5">今日 · 共 {MESSAGES.length} 条消息</p>
      </div>

      <div className="px-4 py-3 flex gap-2 overflow-x-auto scrollbar-none">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filter === f.key ? "bg-primary text-white" : "bg-card text-muted-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-3">
        {filtered.map((m) => {
          const style = msgTypeStyle[m.type];
          return (
            <div key={m.id} className={`bg-card rounded-2xl p-4 shadow-sm ${m.important ? "ring-1 ring-amber-200" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {m.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-sm">{m.teacher}</p>
                    {m.important && <Star size={12} className="text-amber-400 fill-amber-400" />}
                    <span className={`text-xs font-medium ml-auto ${style.color}`}>[{style.label}]</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{m.content}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={11} /> {m.time}
                    </span>
                    <div className="flex items-center gap-2">
                      <button className="text-xs text-primary font-medium flex items-center gap-1 bg-secondary px-2.5 py-1 rounded-lg">
                        <Printer size={11} /> 打印
                      </button>
                      <button className="text-xs text-muted-foreground font-medium flex items-center gap-1 bg-muted px-2.5 py-1 rounded-lg">
                        <FileText size={11} /> 备注
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

// ── Print Tab ────────────────────────────────────────────────────────────────
function PrintTab() {
  const [printItems, setPrintItems] = useState<{ id: string; label: string; type: string; selected: boolean }[]>([
    { id: "p1", label: "二次函数图像平移（数学）", type: "mistake", selected: true },
    { id: "p2", label: "牛顿第三定律应用（物理）", type: "mistake", selected: true },
    { id: "p3", label: "定语从句关系词选择（英语）", type: "mistake", selected: false },
    { id: "p4", label: "今日王老师作业通知", type: "message", selected: true },
    { id: "p5", label: "今日李老师家长会通知", type: "message", selected: false },
  ]);
  const [printing, setPrinting] = useState(false);
  const [printed, setPrinted] = useState(false);

  const selectedCount = printItems.filter((p) => p.selected).length;

  function toggleItem(id: string) {
    setPrintItems((prev) => prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)));
  }

  function handlePrint() {
    setPrinting(true);
    setTimeout(() => {
      setPrinting(false);
      setPrinted(true);
    }, 2500);
  }

  return (
    <div className="pb-6">
      <div className="bg-primary px-5 pt-12 pb-5 text-white">
        <h2 className="font-extrabold text-xl">远程打印</h2>
        <p className="text-white/60 text-xs mt-0.5">选择内容，一键发送到打印机</p>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Printer status */}
        <div className="bg-card rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center">
            <Printer size={22} className="text-green-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">家里的打印机</p>
            <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> 在线，墨水充足
            </p>
          </div>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg font-medium">已连接</span>
        </div>

        {/* Print queue */}
        <div className="bg-card rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm">待打印列表</p>
            <button
              onClick={() => setPrintItems((prev) => prev.map((p) => ({ ...p, selected: true })))}
              className="text-xs text-primary font-medium"
            >
              全选
            </button>
          </div>
          <div className="space-y-2">
            {printItems.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                  item.selected ? "bg-secondary" : "bg-muted/40"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    item.selected ? "bg-primary border-primary" : "border-border"
                  }`}
                >
                  {item.selected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                </div>
                <span
                  className={`text-xs shrink-0 px-2 py-0.5 rounded-full font-medium ${
                    item.type === "mistake" ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {item.type === "mistake" ? "错题" : "通知"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Print settings */}
        <div className="bg-card rounded-2xl p-4 shadow-sm">
          <p className="font-semibold text-sm mb-3">打印设置</p>
          <div className="space-y-3">
            {[
              { label: "纸张大小", value: "A4" },
              { label: "打印方向", value: "纵向" },
              { label: "份数", value: "1" },
              { label: "双面打印", value: "关闭" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <span className="text-sm font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {printed ? (
          <div className="bg-green-50 rounded-2xl p-5 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle size={28} className="text-green-600" />
            </div>
            <p className="font-bold text-green-700">打印任务已发送！</p>
            <p className="text-xs text-green-600">共 {selectedCount} 个文件已发送到打印机，请稍候取件。</p>
            <button onClick={() => setPrinted(false)} className="text-xs text-primary font-medium underline">
              再次打印
            </button>
          </div>
        ) : (
          <button
            onClick={handlePrint}
            disabled={printing || selectedCount === 0}
            className="w-full bg-primary disabled:opacity-50 text-primary-foreground rounded-2xl py-3.5 font-semibold flex items-center justify-center gap-2 transition-opacity"
          >
            {printing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                发送中…
              </>
            ) : (
              <>
                <Send size={18} /> 发送到打印机（{selectedCount}）
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState<Tab>("home");

  const tabs: { key: Tab; icon: React.ReactNode; label: string }[] = [
    { key: "home", icon: <Home size={22} />, label: "首页" },
    { key: "mistakes", icon: <BookOpen size={22} />, label: "错题本" },
    { key: "messages", icon: <MessageSquare size={22} />, label: "通知" },
    { key: "print", icon: <Printer size={22} />, label: "打印" },
  ];

  return (
    <div
      className="min-h-screen bg-background"
      style={{ fontFamily: "'Noto Sans SC', 'Nunito', sans-serif", maxWidth: 430, margin: "0 auto", position: "relative" }}
    >
      {/* Status bar sim */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-30 pointer-events-none">
        <div className="h-0" />
      </div>

      {/* Scrollable content */}
      <div className="overflow-y-auto" style={{ paddingBottom: 80, scrollbarWidth: "none" }}>
        {tab === "home" && <HomeTab setTab={setTab} />}
        {tab === "mistakes" && <MistakesTab />}
        {tab === "messages" && <MessagesTab />}
        {tab === "print" && <PrintTab />}
      </div>

      {/* Bottom nav */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card border-t border-border z-20"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                tab === t.key ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <span className={`transition-transform ${tab === t.key ? "scale-110" : ""}`}>{t.icon}</span>
              <span className="text-[10px] font-semibold">{t.label}</span>
              {tab === t.key && <span className="w-1 h-1 rounded-full bg-primary" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
