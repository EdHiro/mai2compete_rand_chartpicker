# 裁判页与相关同步实现计划

## Context

当前项目已有赛事管理（`TournamentControl`，在 Home 页标签内）和选手终端（`PlayerTerminal`，通过 `?player=xxx` 访问）。
赛事数据由 `tournamentStore` 管理，选曲数据由 `songStore.playerSelections` 管理，两者都通过 `tabSync`（localStorage + WebSocket）支持跨标签/跨设备同步。

但赛事执行过程中缺少一个**裁判视角**的独立页面：需要同时查看赛事状态、所有选手比分/排名/晋级情况、以及各选手在 `SongSelector` 中的选曲，并能在裁判页直接修改比分、确认选曲回写赛事。

## Goal

新增 `/referee` 独立裁判页，实现：
1. 只读展示当前赛事阶段、分组、选手、比分、排名、晋级状态。
2. 展示各选手/分组已从 `SongSelector` 同步过来的选曲。
3. 裁判可直接修改选手 `score`、`dxScore`、签到状态，并自动广播同步。
4. 裁判可一键将当前 `playerSelections` 的选曲同步到 tournament 的对应分组/阶段歌曲。
5. 从 Home 页提供进入裁判页的入口。

## Implementation Plan

### 1. 路由与导航

修改文件：`src/App.tsx`
- 在 `getPageFromPath` 中识别 `/referee` 路径或 `?referee=1` 参数，返回 `'referee'`。
- 在 `handleSwitchPage` 中添加 `referee` 分支（或仅通过 URL 直接访问）。
- 在渲染区添加 `{page === 'referee' && <RefereePage />}`。

修改文件：`src/pages/Home.tsx`
- 在“额外入口”区域添加「裁判台」按钮，点击跳转 `/referee`。

### 2. 新建裁判页

新建文件：`src/pages/RefereePage.tsx`

#### 2.1 数据订阅
- 使用 `useTournamentStore` 读取 `stages`、`currentStage`、`isTournamentStarted`。
- 使用 `useSongStore` 读取 `playerSelections`。
- 通过 `subscribeSyncEvents` 监听：
  - `tournament` 事件 → 已由 tournamentStore 全局订阅并自动写入状态，页面无需额外处理。
  - `playerSelections` 事件 → 调用 `setPlayerSelections` 更新本地选曲。
  - `syncPlayers` 事件 → 调用 `setPlayerSelections` 保持选手列表一致。

#### 2.2 页面布局
- 顶部 Header：标题「裁判台 / REFEREE」，显示当前阶段标签、连接状态、返回按钮。
- 主体分两大区域：
  1. **赛事概览**：当前阶段所有选手表格（姓名、签到、比分、DX分、排名、晋级/淘汰）。
  2. **分组/选曲**：按分组展示对阵，及每组内选手已选谱面（来自 `playerSelections`）。

#### 2.3 编辑功能
- 比分输入框（`input-glass`）直接绑定到选手 `score`。
- DX 分数输入框绑定到 `dxScore`。
- 签到状态切换按钮。
- 修改时调用 `useTournamentStore.getState().updatePlayer(stage, playerId, data)`。
- `tournamentStore` 的 `subscribe` 会自动 `broadcastTournamentSnapshot`，因此修改会自动同步到其他设备。

#### 2.4 选曲回写
- 提供「将选曲同步到赛事」按钮。
- 逻辑复用 `SongSelector` 中的匹配规则：按 `playerName` 匹配 tournament 阶段/分组中的选手。
- 对每个有分组的阶段，将分组内已选曲的选手谱面写入对应 `MatchGroup.songs`。
- 调用 `setGroupSongs` / `setStageSongs`，并通过 `broadcastSyncEvent('stageSongs', ...)` 广播。

### 3. 共享工具/复用

复用现有函数/组件：
- `STAGE_LABELS`（`src/store/tournamentStore.ts`）显示阶段中文名。
- `input-glass`、`btn-primary`、`glass-panel` 等现有 CSS 工具类保持 UI 一致。
- `SongCardContent` 或已有歌曲展示组件用于显示选曲封面与信息。
- `useToast` 用于操作成功/失败提示。

### 4. 不需要改动的部分

- `tabSync.ts`：已有 `tournament`、`stageSongs`、`playerSelections`、`syncPlayers` 事件类型，足够使用。
- `tournamentStore.ts`：现有 `updatePlayer`、`setGroupSongs`、`setStageSongs`、自动广播机制已满足裁判页写回需求，无需新增方法。
- `songStore.ts`：现有 `setPlayerSelections`、`updatePlayerSelection` 足够。

## Critical Files

- `src/App.tsx` — 添加 referee 路由
- `src/pages/Home.tsx` — 添加裁判台入口
- `src/pages/RefereePage.tsx` — 新建裁判页（主要实现）

## Verification

1. 在 Home 页点击「裁判台」按钮，能进入 `/referee`。
2. 裁判页显示当前 tournament 阶段、选手、分组、比分。
3. 在另一标签页打开 SongSelector 并选择谱面，裁判页能看到对应选手的选曲。
4. 在裁判页修改选手比分，另一标签页的 TournamentControl 和 PlayerTerminal 能同步更新。
5. 在裁判页点击「同步选曲到赛事」，TournamentControl 中对应分组/阶段能看到回写的歌曲。
6. `npx tsc --noEmit` 通过。
