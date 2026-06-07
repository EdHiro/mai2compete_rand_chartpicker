# RandomPlus 谱面抽取工具

轻量的 maimai 随机选曲器，基于 React + TypeScript，适用于直播或本地娱乐。功能包括：抽卡式随机选歌、多曲库管理、等级/难度筛选、曲库编辑与 OBS 展示。

---

## 主要特性

- 抽卡模式：支持1至4张谱面抽取，带动画展示
- 真随机：使用 Web Crypto API 获取高质量随机数
- 难度筛选：按难度类型（BASIC / ADVANCED / EXPERT / MASTER / Re:MASTER）、等级区间及 `+` 难度筛选
- 多曲库：导入并管理多个 JSON 曲库，支持跨库抽卡
- OBS 展示：独立 `/obs` 页面，可在 OBS 中作为浏览器源使用
- 同步服务：内置 WebSocket 服务（`sync-server.js`）支持局域网/多标签页同步

---

## 快速开始

先决条件：Node.js v18+、npm

安装依赖：

```bash
npm install
```

开发：

```bash
npm run dev
```

构建生产版本：

```bash
npm run build
```

预览构建产物：

```bash
npm run preview
```

启动局域网同步服务（可选）：

```bash
npm run sync
```

默认 WebSocket 地址： `ws://localhost:8081`（由 [sync-server.js](sync-server.js) 提供）

在 Windows 下也可以双击 `run.bat` 运行预设命令。

---

## 项目结构（要点）

- `src/` — 源代码
   - `components/` — UI 组件
   - `pages/` — 页面（含 `OBSDisplay`）
   - `store/` — Zustand 状态管理
   - `api/` — 同步/工具相关
- `public/` — 静态资源（封面等）
- `sync-server.js` — WebSocket 同步服务（端口 8081）
- `convert-simple.cjs` — 简单数据转换脚本

---

## 曲目数据格式

示例：

```json
[
   {
      "id": "unique-id-1",
      "name": "歌曲名称",
      "difficulty": "EXPERT",
      "level": 12,
      "isPlus": false,
      "cover": "./public/covers/cover/cover-001.png",
      "author": "作曲家",
      "difficultyAuthor": "",
      "bpm": 180,
      "chartType": "standard"
   }
]
```

字段说明：

- `id` (string): 唯一标识
- `name` (string): 歌曲名称
- `difficulty` (string): `EXPERT` | `MASTER` | `Re:MASTER`
- `level` (number): 等级（1-15）
- `isPlus` (boolean): 是否为 + 难度
- `cover` (string): 封面路径（相对或绝对）
- 其他：`author`, `difficultyAuthor`, `bpm`, `chartType`

---

## 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（vite） |
| `npm run build` | 构建生产版本（先 tsc -b） |
| `npm run preview` | 预览构建产物 |
| `npm run sync` | 启动 WebSocket 同步服务（sync-server.js） |
| `npm run check` | TypeScript 类型检查（`tsc -b --noEmit`） |
| `npm run lint` | 运行 ESLint |

---

## 数据转换

将旧格式转换为项目使用格式：

访问localhost:5173/convert

转换输出示例：`converted-songlist.json`

---

## 贡献与许可证

欢迎提交 issue 与 pull request。项目使用 MIT 许可证。

---

