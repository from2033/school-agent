# 小明的学习管家 · 错题本微信小程序

一个面向家长的**错题本 / 学习管家**微信小程序，配 Python（FastAPI）自建后端：
拍照上传错题 → **AI 自动分析薄弱原因并给改进建议** → 看薄弱环节雷达图、各科错题分布；
老师群通知按类型分类展示；群资料一键下载；远程打印。

项目同时提供微信小程序和 Safari Web App。`src/` 是连接真实后端的 React + Vite
移动端页面，可添加到 iPhone 主屏幕使用。

## 技术栈

| 层 | 技术 |
|---|---|
| 小程序 | 微信原生（WXML / WXSS / JS），底部 tabBar 五页 |
| 图表 | **原生 Canvas 2D 手绘**雷达图 + 柱状图（`utils/chart.js`，零第三方依赖） |
| 后端 | **Python + FastAPI**，SQLite 持久化 |
| 鉴权 | `wx.login` → 后端 `jscode2session` 换 openid → 签发 **JWT** |
| AI | 官方 `anthropic` SDK，模型 `claude-opus-4-8`，**结构化输出**返回分析结果 |
| 数据同步 | `scripts/qq_sync.py` 解析导出的 QQ 群记录入库 + 群文件落地下载服务 |

## 目录

```
mini-study/
├─ miniprogram/   # 微信小程序（用微信开发者工具打开这个目录）
├─ server/        # FastAPI 后端 + AI + 同步脚本
└─ src/           # Safari Web App / PWA
```

## 一、启动后端

```bash
cd server
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # 可选：填 ANTHROPIC_API_KEY / WX_APPID 等；全部留空也能跑
uvicorn main:app --reload   # http://localhost:8000
```

- **不填 `ANTHROPIC_API_KEY`**：AI 分析走占位文案，demo 照常可跑。填了即返回真实 Claude 分析。
- **不填 `WX_APPID/WX_SECRET`**：登录用 mock openid，本地联调无需真小程序 appid。
- 首次启动自动建表并写入 seed 数据（错题、群通知、资料）。
- 自测：`curl localhost:8000/` 应返回 `{"ok": true, ...}`。

## Safari Web App（无需域名）

在项目根目录构建，FastAPI 会把产物挂载到 `/app/`：

```bash
npm install
npm run build
```

在 `server/.env` 配置首次登录访问码：

```env
WEB_ACCESS_CODE=换成随机访问码
```

iPhone 使用方式：

1. Safari 打开 `http://服务器IP:8000/app/`
2. 输入家庭访问码
3. 点击分享按钮，选择「添加到主屏幕」

没有 HTTPS 时仍可从主屏幕全屏打开；浏览器离线缓存等高级 PWA 能力会受限。

### 同步 QQ 群数据（可选）

```bash
# 演示（用内置示例数据走一遍解析→入库）
python -m scripts.qq_sync
# 真实数据：导出的聊天记录 + 群文件目录
python -m scripts.qq_sync --chat 群聊天记录.txt --files ./群文件
```
> 脚本只解析**用户自己导出**的 QQ 聊天记录（消息管理→导出）和已下载的群文件，
> 不做任何未授权抓取。

## 二、启动小程序

1. 用**微信开发者工具**打开 `miniprogram/` 目录（AppID 选「测试号」即可）。
2. 「详情 → 本地设置」勾选 **「不校验合法域名、TLS…」**（才能连 `http://localhost`）。
3. 真机预览时，把 `miniprogram/utils/config.js` 里的 `BASE_URL` 改成电脑局域网 IP
   （如 `http://192.168.1.10:8000`）。

## 三、端到端验证清单

- 首页：三张统计卡、快捷功能 4 宫格、**雷达图渲染**、最近错题、今日群消息。
- 错题本：学科筛选、**柱状图**、错题多选、右下 FAB → 上传页。
- 上传：选学科 + 描述 + `wx.chooseMedia` 拍照 → 「上传并分析」→ 跳详情看 AI 结果。
- 通知：作业/通知/表扬/提醒筛选。
- 下载：点资料 `wx.downloadFile` + `wx.openDocument`。
- 打印：选中项 → 发送动画 → 成功态。

## 接口一览（后端）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/login` | code 换 openid，签发 JWT |
| POST | `/api/auth/web-login` | Web 访问码登录，签发 JWT |
| GET | `/api/mistakes?subject=` | 错题列表（可按学科过滤） |
| POST | `/api/mistakes` | multipart 上传错题 + 触发 AI 分析 |
| GET | `/api/mistakes/{id}` | 错题详情 |
| GET | `/api/messages?type=` | 群通知（按类型过滤） |
| GET | `/api/downloads` | 资料列表 |
| GET | `/api/downloads/{id}/file` | 下载文件 |
| GET | `/api/stats/radar` · `/api/stats/mistake-count` | 图表数据 |

## 面试可讲的点

- **微信原生小程序**：生命周期（`onLaunch`/`onShow`）、tabBar、页面间 `navigateTo`/`switchTab`、
  `wx.chooseMedia` / `wx.uploadFile` / `wx.downloadFile` / `wx.openDocument`。
- **鉴权链路**：`wx.login` 取 code → 后端 `jscode2session` 换 openid → 签 JWT →
  `utils/request.js` 统一拦截、自动带 token、401 自动重登。
- **图表**：用 Canvas 2D（`type="2d"` + dpr 适配）**手写雷达图算法**（极坐标多边形）和柱状图，
  无 ECharts 依赖、包体小。（如需换 ECharts，把 `utils/chart.js` 换成 ec-canvas 组件即可。）
- **全栈后端（Python/FastAPI）**：路由分层、Pydantic 模型、SQLite、multipart 上传、
  静态文件服务、`FileResponse` 文件下载、CORS。
- **AI 集成**：Claude `claude-opus-4-8` + `output_config` 结构化输出，约束模型只返回
  `{analysis, suggestion, difficulty, tags}`；支持把题目图片做 vision 输入；带超时/失败回退。
- **数据同步脚本**：正则解析导出的群聊天记录，按关键词分类为作业/通知/表扬/提醒入库，
  群文件同步到下载服务。
# school-agent
