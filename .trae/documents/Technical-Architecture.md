# 随机选曲工具 - 技术架构文档

## 1. 项目架构

```
┌─────────────────────────────────────┐
│           前端 (React)              │
├─────────────────────────────────────┤
│  组件层: SongCard / SongList        │
│  状态层: useSongStore (useReducer)  │
│  样式层: Tailwind CSS               │
└─────────────────────────────────────┘
```

## 2. 技术栈

- **前端框架**：React 18.2
- **构建工具**：Vite
- **样式方案**：Tailwind CSS 3
- **语言**：TypeScript

## 3. 组件结构

| 组件 | 职责 |
|------|------|
| App | 根组件，布局容器 |
| Header | 标题、随机选择按钮 |
| DifficultyFilter | 难度筛选器 |
| SongList | 横向滚动歌曲列表 |
| SongCard | 单个歌曲卡片 |

## 4. 数据模型

```typescript
interface Song {
  id: string;
  name: string;           // 歌曲名称
  difficulty: 'EXPERT' | 'MASTER' | 'Re:MASTER';
  cover: string;          // 封面URL
  author: string;         // 作者
  difficultyAuthor: string; // 难度作者
  difficultyBackground: string; // 难度背景占位符
}
```

## 5. 状态管理

```typescript
interface AppState {
  songs: Song[];
  selectedSong: Song | null;
  activeFilters: Set<'EXPERT' | 'MASTER' | 'Re:MASTER'>;
}
```

## 6. 难度配色

| 难度 | 背景色 |
|------|--------|
| EXPERT | 红色渐变 `#ff4444 → #ff6b6b` |
| MASTER | 紫色渐变 `#9b59b6 → #e056fd` |
| Re:MASTER | 浅紫色渐变 `#a855f7 → #c084fc` |
