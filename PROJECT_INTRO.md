# Random Plus 项目介绍

## 一、项目概述

**Random Plus** 是一款面向 maimai（舞萌）社区的轻量随机选曲与赛事管理工具。它基于 **React 18 + TypeScript + Vite + Tailwind CSS** 构建，前端为单页应用（SPA），并配套 Node.js WebSocket 同步服务与 Cloudflare Worker 签到服务，适用于直播抽歌、本地娱乐及线下赛事场景。

项目核心定位：

- 抽卡式随机选歌（支持 1~N 张同时抽取）
- 多曲库管理（本地 JSON / lxns.net API 导入）
- 难度 / 等级 / 谱面类型 / 流派筛选
- OBS 浏览器源展示（`/obs`、`/obs-tournament`）
- 线下赛事管理（签到、分组、晋级、计时、历史）
- 多标签页 / 多设备实时同步

---

## 二、技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18（StrictMode） |
| 开发语言 | TypeScript ~5.8 |
| 构建工具 | Vite 6 |
| 样式方案 | Tailwind CSS 3.4 + PostCSS + Autoprefixer |
| 状态管理 | Zustand 5 |
| 路由 | 原生 `window.history` + 条件渲染（非 react-router-dom 主导） |
| 图标 | lucide-react |
| 工具库 | clsx、tailwind-merge、html2canvas、qrcode.react |
| 同步服务 | `ws`（WebSocket） |
| 云服务 | Cloudflare Worker + D1（签到） |
| 遗留后端 | `main_program/` 目录下 PHP 程序 |

---

## 三、项目结构

```text
randomPlus/
├── index.html                 # Vite 入口 HTML
├── package.json               # 依赖与脚本
├── vite.config.ts             # Vite 配置（含路径别名、代码分割）
├── tailwind.config.js         # Tailwind 主题扩展
├── eslint.config.js           # ESLint 配置
├── tsconfig.json              # TypeScript 配置
├── sync-server.js             # 通用 WebSocket 同步服务（端口 8081）
├── ws-server.js               # 赛事签到 WebSocket 服务（端口 8765）
├── run.bat                    # Windows 一键启动脚本
├── convert-simple.cjs         # 曲库格式转换脚本
├── wrangler.toml              # Cloudflare Worker 配置
├── cf-worker/
│   ├── worker.ts              # Cloudflare Worker 签到逻辑
│   └── schema.sql             # D1 数据库表结构
├── main_program/              # 历史 PHP 后端程序
│   ├── *.php                  # 用户、内容、视频、评论等模块
│   ├── database.sql           # PHP 版数据库结构
│   └── assets/                # 旧版静态资源
├── public/
│   ├── levbg/Sprite/          # maimai 等级数字与难度贴图
│   └── favicon.svg
└── src/
    ├── main.tsx               # React 应用挂载点
    ├── App.tsx                # 页面路由与全局容器
    ├── index.css              # 全局样式与 Tailwind 指令
    ├── lib/utils.ts           # 工具函数
    ├── assets/                # 静态资源
    ├── api/
    │   └── divingFish.ts      # lxns.net 歌曲数据抓取与转换
    ├── store/
    │   ├── songStore.ts       # 歌曲、曲库、抽卡状态
    │   ├── tournamentStore.ts # 赛事全状态
    │   └── obsThemeStore.ts   # OBS 展示主题
    ├── utils/
    │   ├── tabSync.ts         # 跨标签页 / 跨设备同步
    │   └── checkinSync.ts     # 签到同步逻辑
    ├── pages/
    │   ├── Home.tsx           # 主页（抽卡 / 编辑 / 曲库 / 赛事）
    │   ├── SongSelector.tsx   # 指定选谱页面
    │   ├── OBSDisplay.tsx     # OBS 抽卡展示页
    │   ├── ConvertTool.tsx    # 曲库转换工具页
    │   └── CheckInPage.tsx    # 选手签到页
    └── components/
        ├── GachaHeader.tsx    # 顶部标题与状态栏
        ├── GachaResults.tsx   # 抽卡结果展示
        ├── SongList.tsx       # 歌曲列表与筛选面板
        ├── SongCard.tsx       # 歌曲卡片
        ├── SongCardContent.tsx# 歌曲卡片内容
        ├── JsonImport.tsx     # JSON 曲库导入
        ├── SongListEditor.tsx # 曲库编辑器（懒加载）
        ├── SongPoolBuilder.tsx# 多曲库构建器
        ├── DifficultyFilter.tsx # 难度筛选
        ├── TournamentControl.tsx # 赛事控制台
        ├── OBSTournament.tsx  # OBS 赛事展示
        ├── CheckInPanel.tsx   # 签到面板
        ├── PlayerTerminal.tsx # 选手终端
        ├── MultiPoolImport.tsx# 多曲库导入
        └── Toast.tsx          # 全局 Toast
```

---

## 四、核心功能

### 4.1 抽卡模式

- 支持单次抽取 1~4 张谱面（可扩展）。
- 使用 **Web Crypto API** 生成高质量随机数，避免伪随机偏差。
- 采用 **Fisher-Yates 洗牌算法** 保证均匀随机。
- 内置抽取历史去重机制：歌曲抽完后自动重置历史池，避免短期内重复。

### 4.2 筛选系统

- 难度：BASIC / ADVANCED / EXPERT / MASTER / Re:MASTER
- 等级区间：支持 `12+` 形式（即 12.5）的数值比较
- 仅 `+` 难度筛选
- 谱面类型：标准（standard）/ DX（dx）
- 流派（genre）过滤
- 拟合定数（level_value）区间筛选

### 4.3 曲库管理

- **主库模式**：单 JSON 文件导入。
- **多曲库模式**：创建并管理多个 SongPool，支持跨库混合抽取或按库抽取。
- 从 [lxns.net](https://maimai.lxns.net) 自动拉取官方歌曲数据（含封面、定数、谱师等）。
- `convert-simple.cjs` 支持从 maidata、中文结构、常见 JSON 格式转换。
- 所有曲库与设置持久化到 `localStorage`。

### 4.4 OBS 展示

- `/obs`：抽卡结果实时展示，可作为 OBS 浏览器源。
- `/obs-tournament`：赛事进度实时展示。
- 支持自定义主题（文字颜色、强调色、背景、字体大小）。
- OBS 页面通过 WebSocket 与主控制端同步。

### 4.5 赛事管理

内置完整线下赛事流程：

- 阶段：N 进 16 → 16 进 8 → 8 进 4 → 半决赛 → 决赛（支持自定义赛制）
- 选手管理：批量导入、添加、删除、改名、签到
- 分数与排名：完成率、DX 分数双维度排序
- 晋级与淘汰：自动按排名晋级，锁定阶段后不可修改
- 分组与种子：支持 bracket 种子位置映射、自动分组（16→8、8→4、半决赛）
- 阶段歌曲 / 分组歌曲：为不同阶段或对阵指定比赛曲目
- 计时器：比赛倒计时
- 历史记录：赛事结果保存、加载、删除
- 模板：保存并复用赛事配置与选手名单
- 快照与撤销：排名计算可撤销

### 4.6 同步机制

- **同浏览器多标签页**：`localStorage` 事件广播。
- **跨设备局域网**：`sync-server.js` WebSocket 服务（端口 8081）。
- **签到同步**：
  - 本地：`ws-server.js`（端口 8765）
  - 云端：`cf-worker/worker.ts` + D1 数据库
- 自动重连与指数退避策略。

---

## 五、数据格式

### 5.1 曲目数据（Song）

```json
{
  "id": "unique-id",
  "name": "歌曲名称",
  "difficulty": "EXPERT",
  "level": 12,
  "isPlus": true,
  "cover": "https://assets2.lxns.net/maimai/jacket/123.png",
  "author": "作曲家",
  "difficultyAuthor": "谱师",
  "bpm": 180,
  "chartType": "dx",
  "genre": "niconico",
  "levelValue": 12.7
}
```

字段说明：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识 |
| `name` | string | 歌曲名称 |
| `difficulty` | Difficulty | BASIC / ADVANCED / EXPERT / MASTER / Re:MASTER |
| `level` | number | 等级 1-15 |
| `isPlus` | boolean | 是否为 `+` 难度 |
| `cover` | string | 封面 URL 或相对路径 |
| `author` | string | 作曲家 |
| `difficultyAuthor` | string | 谱师 |
| `bpm` | number | BPM |
| `chartType` | ChartType | `standard` / `dx` |
| `genre` | string | 流派 |
| `levelValue` | number | 拟合定数 |

### 5.2 曲库（SongPool）

```json
{
  "id": "pool-xxx",
  "name": "我的曲库",
  "songs": []
}
```

---

## 六、可用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器（默认 5173，局域网可访问） |
| `npm run build` | TypeScript 编译 + Vite 生产构建 |
| `npm run preview` | 预览构建产物 |
| `npm run check` | TypeScript 类型检查（不输出文件） |
| `npm run lint` | ESLint 检查 |
| `npm run sync` | 启动 WebSocket 同步服务（8081） |
| `npm run ws-server` | 启动赛事签到 WebSocket 服务（8765） |

Windows 下可直接双击 `run.bat` 同时启动同步服务、签到服务与开发服务器。

---

## 七、页面路由

项目采用基于 `window.location.pathname` 与查询参数的条件渲染：

| 路径 / 参数 | 页面 |
|------------|------|
| `/` | 主页（Home） |
| `/selector` 或 `?selector=1` | 指定选谱（SongSelector） |
| `/tournament` | 赛事控制台（独立全屏） |
| `/obs` 或 `?obs=1` | OBS 抽卡展示 |
| `/obs-tournament` 或 `?obs-tournament=1` | OBS 赛事展示 |
| `/convert` | 曲库转换工具 |
| `?checkin=1` | 选手签到页 |
| `?player=1` 或 `?player=` | 选手终端 |

---

## 八、配置与主题

- Tailwind 主题扩展了 maimai 风格的难度色板（`difficulty.*`、`card.*`）、霓虹色、发光阴影与动画。
- OBS 主题通过 `obsThemeStore` 持久化到 `localStorage`，支持实时调整。

---

## 九、遗留与扩展

- `main_program/` 目录包含早期 PHP 版本后端，提供用户系统、内容管理、视频处理等功能，与当前 React 前端为独立演进关系。
- `cf-worker/` 提供基于 Cloudflare 的云端签到能力，便于无服务器部署。

---

## 十、许可证

项目使用 MIT 许可证，欢迎提交 Issue 与 Pull Request。
