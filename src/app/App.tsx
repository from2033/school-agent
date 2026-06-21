import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent, ReactNode } from "react";
import {
  AlertCircle, BarChart3, Bell, BookOpen, Camera, ChevronLeft, ChevronRight,
  Clock, Download, FileText, Home, LoaderCircle, LogOut, MessageSquare,
  Plus, RefreshCw, Sparkles, Upload, X,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, PolarAngleAxis, PolarGrid, Radar,
  RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api, assetUrl, clearToken, token, webLogin } from "../api";

type Tab = "home" | "mistakes" | "messages" | "files";
type MessageType = "homework" | "notice" | "praise" | "reminder";

type Mistake = {
  id: number;
  subject: string;
  topic: string;
  image_path?: string;
  images: string[];
  analysis?: string;
  focus_points: { text: string; level: string }[];
  steps: string[];
  difficulty: "easy" | "medium" | "hard";
  tags: string[];
  created_at: string;
};

type TeacherMessage = {
  id: number;
  teacher: string;
  avatar: string;
  content: string;
  time: string;
  date?: string;
  type: MessageType;
  important: boolean;
  images: string[];
};

type DownloadItem = {
  id: number;
  name: string;
  subject?: string;
  size_bytes: number;
  created_at?: string;
};

type RadarPoint = { subject: string; value: number; fullMark: number };
type CountPoint = { subject: string; count: number };

const SUBJECT_COLORS: Record<string, string> = {
  语文: "#d97706", 数学: "#0d6e6e", 英语: "#6366f1",
  物理: "#e53e3e", 化学: "#10b981", 历史: "#ec4899",
};

const MESSAGE_META: Record<MessageType, { label: string; ink: string; wash: string }> = {
  homework: { label: "作业", ink: "#2563eb", wash: "#eff6ff" },
  notice: { label: "通知", ink: "#b45309", wash: "#fef3c7" },
  praise: { label: "表扬", ink: "#047857", wash: "#d1fae5" },
  reminder: { label: "提醒", ink: "#b91c1c", wash: "#fee2e2" },
};

const today = () => {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};
const dateLabel = (date?: string) => {
  if (!date) return "";
  const d = new Date(`${date.slice(0, 10)}T00:00:00`);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
};
const formatSize = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 ** 2).toFixed(1)} MB`;
const tabHref = (tab: Tab) => `/app/?tab=${tab}`;

function TabLink({
  tab, go, className, children, style,
}: {
  tab: Tab;
  go: (tab: Tab) => void;
  className?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <a
      href={tabHref(tab)}
      className={className}
      style={style}
      onClick={(e) => {
        e.preventDefault();
        window.history.pushState({}, "", tabHref(tab));
        go(tab);
      }}
    >
      {children}
    </a>
  );
}

function useAsync<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reload = useCallback(() => {
    setLoading(true);
    setError("");
    loader().then(setData).catch((e) => setError(e.message)).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(reload, [reload]);
  return { data, loading, error, reload, setData };
}

function Loading({ text = "加载中…" }: { text?: string }) {
  return <div className="empty-state"><LoaderCircle className="animate-spin" size={24} /><span>{text}</span></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="empty-state"><BookOpen size={28} /><span>{text}</span></div>;
}

function ErrorBox({ text, retry }: { text: string; retry: () => void }) {
  return (
    <div className="error-box">
      <AlertCircle size={18} /><span>{text}</span>
      <button onClick={retry}><RefreshCw size={14} />重试</button>
    </div>
  );
}

function PageHeader({ title, subtitle, back }: { title: string; subtitle?: string; back?: () => void }) {
  return (
    <header className="page-header">
      {back && <button className="back-button" onClick={back}><ChevronLeft size={22} /></button>}
      <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    </header>
  );
}

function Difficulty({ value }: { value: Mistake["difficulty"] }) {
  const map = { easy: ["易", "easy"], medium: ["中", "medium"], hard: ["难", "hard"] };
  return <span className={`difficulty ${map[value][1]}`}>{map[value][0]}</span>;
}

function Login({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true); setError("");
    try { await webLogin(code); onDone(); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <main className="login-screen">
      <div className="login-brand">
        <div className="brand-icon"><BookOpen size={38} /></div>
        <h1>学习管家</h1>
        <p>错题分析 · 老师通知 · 学习资料</p>
      </div>
      <form className="login-card" onSubmit={submit}>
        <label htmlFor="access-code">家庭访问码</label>
        <input id="access-code" type="password" inputMode="numeric" value={code}
          onChange={(e) => setCode(e.target.value)} placeholder="请输入访问码" autoFocus />
        {error && <p className="form-error">{error}</p>}
        <button className="primary-button" disabled={busy || !code.trim()}>
          {busy ? <LoaderCircle className="animate-spin" size={18} /> : <Sparkles size={18} />}
          进入学习管家
        </button>
        <p className="login-hint">首次登录后，本设备会自动保持登录。</p>
      </form>
    </main>
  );
}

function HomePage({ go }: { go: (tab: Tab) => void }) {
  const mistakes = useAsync(() => api<Mistake[]>("/api/mistakes"), []);
  const messages = useAsync(() => api<TeacherMessage[]>(`/api/messages?date=${today()}`), []);
  const files = useAsync(() => api<DownloadItem[]>(`/api/downloads?date=${today()}`), []);
  const radar = useAsync(() => api<RadarPoint[]>("/api/stats/radar"), []);

  return (
    <div>
      <section className="hero">
        <div className="hero-orb one" /><div className="hero-orb two" />
        <p>你好，家长</p><h1>今天也一起稳稳进步</h1>
        <div className="stat-row">
          <TabLink tab="mistakes" go={go}><strong>{mistakes.data?.length ?? "–"}</strong><span>累计错题</span></TabLink>
          <TabLink tab="messages" go={go}><strong>{messages.data?.length ?? "–"}</strong><span>今日消息</span></TabLink>
          <TabLink tab="files" go={go}><strong>{files.data?.length ?? "–"}</strong><span>今日文件</span></TabLink>
        </div>
      </section>
      <div className="content-stack home-stack">
        <section className="card">
          <div className="section-label">快捷功能</div>
          <div className="quick-grid">
            <button onClick={() => go("mistakes")}><span className="quick-icon teal"><Camera /></span><b>上传错题</b></button>
            <button onClick={() => go("mistakes")}><span className="quick-icon purple"><BarChart3 /></span><b>薄弱分析</b></button>
            <button onClick={() => go("messages")}><span className="quick-icon amber"><MessageSquare /></span><b>老师通知</b></button>
            <button onClick={() => go("files")}><span className="quick-icon blue"><FileText /></span><b>学习文件</b></button>
          </div>
        </section>

        <section className="card">
          <div className="card-title"><h2>薄弱环节</h2><span>按真实错题计算</span></div>
          {radar.loading ? <Loading /> : radar.error ? <ErrorBox text={radar.error} retry={radar.reload} /> :
            mistakes.data?.length === 0 ? <Empty text="上传错题后会生成掌握度分析" /> :
            <div className="radar-wrap"><ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar.data || []}>
                <PolarGrid stroke="#dbe4ea" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "#637083" }} />
                <Radar dataKey="value" stroke="#0d6e6e" fill="#0d6e6e" fillOpacity={0.22} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer></div>}
        </section>

        <section className="card">
          <div className="card-title"><h2>最近错题</h2><button onClick={() => go("mistakes")}>查看全部<ChevronRight size={15} /></button></div>
          {mistakes.loading ? <Loading /> : (mistakes.data || []).length === 0 ? <Empty text="还没有错题" /> :
            <div className="compact-list">{mistakes.data?.slice(0, 3).map((m) =>
              <div key={m.id}><span className="subject-dot" style={{ background: SUBJECT_COLORS[m.subject] || "#0d6e6e" }}>{m.subject.slice(0, 1)}</span>
                <div><b>{m.topic}</b><small>{dateLabel(m.created_at)}</small></div><Difficulty value={m.difficulty} /></div>)}</div>}
        </section>

        <section className="card">
          <TabLink tab="messages" go={go} className="card-title card-title-link"><h2>今日老师消息</h2><span>查看全部<ChevronRight size={15} /></span></TabLink>
          {messages.loading ? <Loading /> : (messages.data || []).length === 0 ? <Empty text="今天暂无老师消息" /> :
            <div className="message-preview">{messages.data?.slice(0, 3).map((m) => {
              const meta = MESSAGE_META[m.type];
              return <TabLink key={m.id} tab="messages" go={go} style={{ background: meta.wash }}>
                <b>{m.teacher}</b><span style={{ color: meta.ink }}>{meta.label}</span><p>{m.content}</p>
              </TabLink>;
            })}</div>}
        </section>
      </div>
    </div>
  );
}

function UploadPanel({ close, completed }: { close: () => void; completed: (m: Mistake) => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  async function submit() {
    if (!files.length) return;
    setBusy(true); setError("");
    try {
      let result: Mistake | null = null;
      for (const file of files) {
        const form = new FormData();
        form.append("image", file);
        form.append("note", note);
        result = await api<Mistake>("/api/mistakes", { method: "POST", body: form });
      }
      if (result) completed(result);
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="overlay-page">
      <PageHeader title="上传错题" subtitle="AI 自动识别学科并分析" back={close} />
      <div className="content-stack">
        <section className="card">
          <label className="field-label">题目图片（最多 9 张）</label>
          <input ref={input} hidden type="file" accept="image/*" capture="environment" multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 9))} />
          {!files.length ? <button className="upload-zone" onClick={() => input.current?.click()}>
            <span><Camera size={28} /></span><b>拍照或选择图片</b><small>支持 JPG、PNG、HEIC</small>
          </button> :
          <div className="image-grid">{previews.map((src, i) =>
            <div key={src}><img src={src} /><button onClick={() => setFiles(files.filter((_, x) => x !== i))}><X size={14} /></button></div>)}
            {files.length < 9 && <button className="add-image" onClick={() => input.current?.click()}><Plus /></button>}
          </div>}
          <label className="field-label note-label">补充说明（可选）</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：这道题总在最后一步出错" />
        </section>
        {error && <div className="form-error block">{error}</div>}
        <button className="primary-button" disabled={!files.length || busy} onClick={submit}>
          {busy ? <LoaderCircle className="animate-spin" /> : <Upload />} {busy ? "AI 分析中，请稍候…" : "上传并分析"}
        </button>
      </div>
    </div>
  );
}

function MistakeDetail({ id, close, changed }: { id: number; close: () => void; changed: () => void }) {
  const item = useAsync(() => api<Mistake>(`/api/mistakes/${id}`), [id]);
  const [adding, setAdding] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function addImages(files: FileList | null) {
    if (!files?.length) return;
    setAdding(true);
    try {
      const list = Array.from(files);
      for (let i = 0; i < list.length; i++) {
        const form = new FormData();
        form.append("image", list[i]);
        form.append("analyze", i === list.length - 1 ? "true" : "false");
        await api(`/api/mistakes/${id}/images`, { method: "POST", body: form });
      }
      item.reload(); changed();
    } catch (e) { alert((e as Error).message); }
    finally { setAdding(false); }
  }

  return (
    <div className="overlay-page">
      <PageHeader title="错题详情" back={close} />
      {item.loading ? <Loading text="读取分析结果…" /> : item.error ? <ErrorBox text={item.error} retry={item.reload} /> : item.data &&
      <div className="content-stack">
        <section className="card detail-head">
          <div className="detail-title"><span className="subject-block" style={{ background: SUBJECT_COLORS[item.data.subject] || "#0d6e6e" }}>{item.data.subject}</span>
            <div><h2>{item.data.topic}</h2><small>{dateLabel(item.data.created_at)}</small></div><Difficulty value={item.data.difficulty} /></div>
          <div className="detail-images">{item.data.images.map((src) => <a href={assetUrl(src)} target="_blank" key={src}><img src={assetUrl(src)} /></a>)}</div>
          <div className="tag-row">{item.data.tags.map((t) => <span key={t}>{t}</span>)}</div>
        </section>
        <section className="card"><div className="section-heading"><AlertCircle size={18} />错误分析</div><p className="analysis">{item.data.analysis}</p></section>
        {!!item.data.focus_points.length && <section className="card"><div className="section-heading"><BarChart3 size={18} />重点关注</div>
          <ul className="focus-list">{item.data.focus_points.map((p, i) => <li key={i}><span className={p.level} />{p.text}</li>)}</ul></section>}
        {!!item.data.steps.length && <section className="card"><div className="section-heading"><Sparkles size={18} />改进步骤</div>
          <ol className="step-list">{item.data.steps.map((s, i) => <li key={i}><span>{i + 1}</span>{s}</li>)}</ol></section>}
        <input ref={input} hidden type="file" accept="image/*" capture="environment" multiple onChange={(e) => addImages(e.target.files)} />
        <button className="secondary-button" disabled={adding} onClick={() => input.current?.click()}>
          {adding ? <LoaderCircle className="animate-spin" /> : <Camera />} {adding ? "重新分析中…" : "给这道题再传图片"}
        </button>
      </div>}
    </div>
  );
}

function MistakesPage({ goFiles }: { goFiles: () => void }) {
  const [subject, setSubject] = useState("全部");
  const [upload, setUpload] = useState(false);
  const [detail, setDetail] = useState<number | null>(null);
  const [paperBusy, setPaperBusy] = useState(false);
  const subjects = useAsync(() => api<string[]>("/api/stats/subjects"), []);
  const list = useAsync(() => api<Mistake[]>(`/api/mistakes${subject === "全部" ? "" : `?subject=${encodeURIComponent(subject)}`}`), [subject]);
  const counts = useAsync(() => api<CountPoint[]>("/api/stats/mistake-count"), []);

  async function makePaper() {
    setPaperBusy(true);
    try {
      const result = await api<{ count: number }>("/api/papers/generate", { method: "POST", body: JSON.stringify({ days: 14 }) });
      if (confirm(`练习卷已生成，共 ${result.count} 道题。现在去文件页查看吗？`)) goFiles();
    } catch (e) { alert((e as Error).message); }
    finally { setPaperBusy(false); }
  }

  if (upload) return <UploadPanel close={() => setUpload(false)} completed={(m) => { setUpload(false); list.reload(); counts.reload(); setDetail(m.id); }} />;
  if (detail != null) return <MistakeDetail id={detail} close={() => setDetail(null)} changed={() => { list.reload(); counts.reload(); }} />;

  return (
    <div>
      <PageHeader title="错题本" subtitle={`共 ${list.data?.length ?? "–"} 道`} />
      <div className="filter-strip">{["全部", ...(subjects.data || [])].map((s) =>
        <button className={subject === s ? "active" : ""} onClick={() => setSubject(s)} key={s}>{s}</button>)}</div>
      <div className="content-stack">
        <section className="card chart-card">
          <div className="card-title"><h2>各科错题分布</h2><button onClick={makePaper} disabled={paperBusy}>
            {paperBusy ? <LoaderCircle className="animate-spin" size={14} /> : <Sparkles size={14} />}生成练习卷</button></div>
          {(counts.data || []).every((x) => x.count === 0) ? <Empty text="暂无错题统计" /> :
          <div className="bar-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={counts.data || []} margin={{ left: -20 }}>
            <CartesianGrid vertical={false} stroke="#edf1f4" /><XAxis dataKey="subject" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="count" radius={[5, 5, 0, 0]}>
              {(counts.data || []).map((x) => <Cell fill={SUBJECT_COLORS[x.subject] || "#0d6e6e"} key={x.subject} />)}
            </Bar></BarChart></ResponsiveContainer></div>}
        </section>
        {list.loading ? <Loading /> : list.error ? <ErrorBox text={list.error} retry={list.reload} /> :
          !list.data?.length ? <Empty text="这个分类还没有错题" /> :
          <div className="mistake-list">{list.data.map((m) =>
            <button key={m.id} onClick={() => setDetail(m.id)}>
              <span className="subject-block" style={{ background: SUBJECT_COLORS[m.subject] || "#0d6e6e" }}>{m.subject}</span>
              <div><b>{m.topic}</b><small>{dateLabel(m.created_at)}</small></div>
              <Difficulty value={m.difficulty} /><ChevronRight size={17} />
            </button>)}</div>}
      </div>
      <button className="fab" onClick={() => setUpload(true)}><Plus /></button>
    </div>
  );
}

function MessagesPage() {
  const [type, setType] = useState<"all" | MessageType>("all");
  const [date, setDate] = useState(today());
  const query = `?date=${date}${type === "all" ? "" : `&type=${type}`}`;
  const list = useAsync(() => api<TeacherMessage[]>(`/api/messages${query}`), [type, date]);
  return (
    <div>
      <PageHeader title="老师通知" subtitle={`${dateLabel(date)} · ${list.data?.length ?? "–"} 条`} />
      <div className="date-filter"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      <div className="filter-strip">{([["all", "全部"], ["homework", "作业"], ["notice", "通知"], ["praise", "表扬"], ["reminder", "提醒"]] as const).map(([key, label]) =>
        <button className={type === key ? "active" : ""} onClick={() => setType(key)} key={key}>{label}</button>)}</div>
      <div className="content-stack">
        {list.loading ? <Loading /> : list.error ? <ErrorBox text={list.error} retry={list.reload} /> :
          !list.data?.length ? <Empty text={`${dateLabel(date)}暂无消息`} /> :
          <div className="messages-list">{list.data.map((m) => {
            const meta = MESSAGE_META[m.type];
            return <article className="card" key={m.id}>
              <div className="message-head"><span className="avatar">{m.avatar}</span><div><b>{m.teacher}</b><small><Clock size={12} />{m.time}</small></div>
                <span className="message-type" style={{ color: meta.ink, background: meta.wash }}>{meta.label}</span></div>
              <p>{m.content}</p>
              {!!m.images.length && <div className="message-images">{m.images.map((src) => <a href={assetUrl(src)} target="_blank" key={src}><img src={assetUrl(src)} /></a>)}</div>}
            </article>;
          })}</div>}
      </div>
    </div>
  );
}

function FilesPage() {
  const [date, setDate] = useState(today());
  const [fallbackDone, setFallbackDone] = useState(false);
  const list = useAsync(() => api<DownloadItem[]>(`/api/downloads?date=${date}`), [date]);
  const latest = useCallback(async () => {
    try {
      const all = await api<DownloadItem[]>("/api/downloads");
      const newest = all.map((x) => x.created_at?.slice(0, 10) || "").sort().at(-1);
      if (newest) setDate(newest);
    } catch (e) { alert((e as Error).message); }
  }, []);
  useEffect(() => {
    if (!list.loading && !list.error && list.data?.length === 0 && !fallbackDone) {
      setFallbackDone(true);
      latest();
    }
  }, [fallbackDone, latest, list.data, list.error, list.loading]);
  return (
    <div>
      <PageHeader title="学习文件" subtitle={`${dateLabel(date)} · ${list.data?.length ?? "–"} 个文件`} />
      <div className="date-filter"><input type="date" value={date} onChange={(e) => { setFallbackDone(true); setDate(e.target.value); }} /><button onClick={latest}>最近有文件</button></div>
      <div className="content-stack">
        {list.loading ? <Loading /> : list.error ? <ErrorBox text={list.error} retry={list.reload} /> :
          !list.data?.length ? <Empty text={`${dateLabel(date)}暂无文件`} /> :
          <div className="files-list">{list.data.map((f) =>
            <a href={`/api/downloads/${f.id}/file`} target="_blank" className="card" key={f.id}>
              <span className="file-icon"><FileText /></span><div><b>{f.name}</b><small>{f.subject || "群文件"} · {formatSize(f.size_bytes)}</small></div><Download size={19} />
            </a>)}</div>}
      </div>
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(Boolean(token()));
  const initial = new URLSearchParams(window.location.search).get("tab");
  const [tab, setTab] = useState<Tab>(
    initial === "mistakes" || initial === "messages" || initial === "files" ? initial : "home",
  );
  useEffect(() => {
    const onPopState = () => {
      const value = new URLSearchParams(window.location.search).get("tab");
      setTab(value === "mistakes" || value === "messages" || value === "files" ? value : "home");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  if (!loggedIn) return <Login onDone={() => setLoggedIn(true)} />;
  const tabs = [
    ["home", "首页", Home], ["mistakes", "错题本", BookOpen],
    ["messages", "通知", Bell], ["files", "文件", FileText],
  ] as const;
  return (
    <div className="app-shell">
      <main className="app-content">
        {tab === "home" && <HomePage go={setTab} />}
        {tab === "mistakes" && <MistakesPage goFiles={() => setTab("files")} />}
        {tab === "messages" && <MessagesPage />}
        {tab === "files" && <FilesPage />}
      </main>
      <button className="logout" title="退出登录" onClick={() => { clearToken(); setLoggedIn(false); }}><LogOut size={16} /></button>
      <nav className="bottom-nav">
        {tabs.map(([key, label, Icon]) => <TabLink key={key} tab={key} go={setTab} className={tab === key ? "active" : ""}>
          <Icon size={21} /><span>{label}</span>
        </TabLink>)}
      </nav>
    </div>
  );
}
