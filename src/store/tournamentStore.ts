import { create } from 'zustand'
import { broadcastSyncEvent, subscribeSyncEvents } from '@/utils/tabSync'
import type { Song } from '@/store/songStore'

// 赛事阶段
export type TournamentStage = 'n216' | '16to8' | '8to4' | 'semi' | 'final'

// 阶段显示名称
export const STAGE_LABELS: Record<TournamentStage, string> = {
  n216: 'N进16',
  '16to8': '16进8',
  '8to4': '8进4',
  semi: '半决赛',
  final: '决赛',
}

// 阶段排序（用于晋级逻辑）
export const STAGE_ORDER: TournamentStage[] = ['n216', '16to8', '8to4', 'semi', 'final']

// 每个阶段晋级人数
export const STAGE_ADVANCE_COUNT: Record<TournamentStage, number> = {
  n216: 16,
  '16to8': 8,
  '8to4': 4,
  semi: 2,
  final: 1,
}

// 自定义阶段配置
export interface CustomStageConfig {
  id: string
  name: string
  playerCount: number
  advanceCount: number
}

// 赛事模板
export interface TournamentTemplate {
  id: string
  name: string
  createdAt: string
  customStages: CustomStageConfig[]
  isCustomMode: boolean
  n216PlayerNames: string[]
}

// 选手信息
export interface TournamentPlayer {
  id: string
  name: string
  score: number | null // 完成率（满分202.0000至404.0000）
  dxScore: string // DX分数（自由填写）
  rank: number | null // 当前排名
  advanced: boolean // 是否已晋级
  eliminated: boolean // 是否已淘汰
  seed?: number // 种子排名（1=头号种子）
  checkedIn: boolean // 是否已签到
}

// 阶段分配的歌曲
export interface StageSong {
  id: string
  song: Song | null
  label: string // 如"课题曲1"、"自选1"
}

// 分组/对阵
export interface MatchGroup {
  id: string
  name: string // 如"第1组"、"上半区"、"1v3"
  playerIds: string[]
  songs: StageSong[] // 该组比赛用曲（覆盖阶段级别）
}

// 赛事阶段数据
export interface TournamentStageData {
  stage: TournamentStage
  players: TournamentPlayer[]
  locked: boolean // 是否已锁定（锁定后不能再修改分数）
  songs: StageSong[] // 阶段通用歌曲（所有人共享）
  groups: MatchGroup[] // 分组信息
}

// 排名快照（用于撤销）
export interface RankingSnapshot {
  current: TournamentStageData
  next: TournamentStageData | null
}

// 赛事历史记录
export interface TournamentHistoryRecord {
  id: string
  date: string
  stages: Record<TournamentStage, TournamentStageData>
  currentStage: TournamentStage
  champion: TournamentPlayer | null
  createdAt: string
}

// 历史记录列表项（精简版）
export interface TournamentHistoryListItem {
  id: string
  date: string
  champion: string
  createdAt: string
}

export interface TournamentState {
  stages: Record<TournamentStage, TournamentStageData>
  currentStage: TournamentStage
  isTournamentStarted: boolean

  // 自定义赛制
  isCustomMode: boolean
  customStages: CustomStageConfig[]

  // 排名预览与快照
  previewRankings: Record<TournamentStage, TournamentPlayer[] | null>
  rankingSnapshots: Record<TournamentStage, RankingSnapshot | null>

  // Timer state
  timerRunning: boolean
  timerSeconds: number
  timerLabel: string

  // 设置选手名称（批量初始化）
  setPlayerNames: (stage: TournamentStage, names: string[]) => void

  // 更新单个选手信息
  updatePlayer: (stage: TournamentStage, playerId: string, data: Partial<Omit<TournamentPlayer, 'id'>>) => void

  // 删除单个选手
  removePlayer: (stage: TournamentStage, playerId: string) => void

  // 添加单个选手
  addPlayer: (stage: TournamentStage, name: string) => TournamentPlayer | null

  // 批量添加选手
  addPlayers: (stage: TournamentStage, names: string[]) => void

  // 批量删除所有选手
  clearPlayers: (stage: TournamentStage) => void

  // 锁定/解锁阶段
  toggleStageLock: (stage: TournamentStage) => void

  // 计算排名并晋级
  calculateRankings: (stage: TournamentStage) => void

  // 预览排名（不修改阶段状态）
  calculateRankingsPreview: (stage: TournamentStage) => void

  // 清除排名预览
  clearPreviewRankings: (stage: TournamentStage) => void

  // 确认应用预览排名并锁定阶段
  commitRankings: (stage: TournamentStage) => void

  // 撤销最近一次排名计算
  undoRankings: (stage: TournamentStage) => void

  // 重置赛事
  resetTournament: () => void

  // 开始赛事
  startTournament: (stages: TournamentStage[]) => void

  // 设置当前阶段
  setCurrentStage: (stage: TournamentStage) => void

  // 广播数据到OBS
  broadcastTournamentData: () => void

  // 获取指定阶段的选手列表
  getStagePlayers: (stage: TournamentStage) => TournamentPlayer[]

  // 获取当前阶段晋级的选手
  getCurrentStageActivePlayers: () => TournamentPlayer[]

  // Export/Import
  exportTournamentData: () => string
  importTournamentData: (json: string) => void

  // History
  saveToHistory: () => void
  loadHistory: () => TournamentHistoryListItem[]
  deleteHistoryRecord: (id: string) => void
  getHistory: () => TournamentHistoryRecord[]
  clearHistory: () => void

  // Timer
  startTimer: (label: string, seconds: number) => void
  stopTimer: () => void
  resetTimer: () => void
  tickTimer: () => void

  // 自定义赛制
  setCustomMode: (enabled: boolean) => void
  setCustomStages: (configs: CustomStageConfig[]) => void

  // 种子排名
  setPlayerSeed: (stage: TournamentStage | string, playerId: string, seed: number | null) => void
  applySeeding: (stage: TournamentStage | string) => void
  autoUpdateSeedsFromRankings: (stage: TournamentStage | string) => void
  getStoredSeeds: () => Record<string, number>
  clearStoredSeeds: () => void

  // 模板管理
  saveTemplate: (name: string) => void
  loadTemplate: (id: string) => void
  deleteTemplate: (id: string) => void
  getTemplates: () => TournamentTemplate[]

  // 阶段歌曲管理
  setStageSongs: (stage: TournamentStage, songs: StageSong[]) => void
  addStageSong: (stage: TournamentStage, song: Song | null, label: string) => void
  removeStageSong: (stage: TournamentStage, songId: string) => void

  // 分组管理
  createGroups16to8: () => void
  shuffleGroups8to4: () => void
  createGroupsSemi: () => void
  setGroupSongs: (stage: TournamentStage, groupId: string, songs: StageSong[]) => void
  addGroupSong: (stage: TournamentStage, groupId: string, song: Song | null, label: string) => void
  removeGroupSong: (stage: TournamentStage, groupId: string, songId: string) => void
}

function generateId(): string {
  return `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function createEmptyStageData(stage: TournamentStage): TournamentStageData {
  return {
    stage,
    players: [],
    locked: false,
    songs: [],
    groups: [],
  }
}

/**
 * 生成标准 bracket 种子位置映射
 *
 * 对于 N 人（取最近的 2 的幂次），返回 bracket 各位置应放置的种子排名：
 *   16 人 → [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]
 *
 * 位置 i 应放置的种子排名 = result[i]，确保 1 vs N 在决赛相遇。
 */
export function generateBracketSeeding(playerCount: number): number[] {
  if (playerCount <= 1) return [1]

  // 找到最近的 >= playerCount 的 2 的幂
  let size = 1
  while (size < playerCount) size *= 2

  // 递归生成 bracket：从 [1] 开始，每轮翻倍
  function bracket(n: number): number[] {
    if (n === 1) return [1]
    const prev = bracket(n / 2)
    const result: number[] = []
    const pairSum = n + 1
    for (const s of prev) {
      result.push(s)
      result.push(pairSum - s)
    }
    return result
  }

  // 取前 playerCount 个位置
  return bracket(size).slice(0, playerCount)
}

const STORAGE_KEY = 'tournament-data'
const HISTORY_STORAGE_KEY = 'tournament-history'
const TEMPLATE_STORAGE_KEY = 'tournament-templates'

function migrateStageData(stageData: unknown): TournamentStageData {
  const sd = stageData as TournamentStageData
  return {
    stage: sd.stage,
    players: sd.players || [],
    locked: sd.locked || false,
    songs: sd.songs || [],
    groups: sd.groups || [],
  }
}

function loadFromLocalStorage(): Partial<TournamentState> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    // Validate basic structure
    if (data && data.stages && data.currentStage) {
      // Migrate old stage data to new structure (songs/groups fields)
      const migratedStages: Record<TournamentStage, TournamentStageData> = {
        n216: migrateStageData(data.stages.n216),
        '16to8': migrateStageData(data.stages['16to8']),
        '8to4': migrateStageData(data.stages['8to4']),
        semi: migrateStageData(data.stages.semi),
        final: migrateStageData(data.stages.final),
      }
      return { ...data, stages: migratedStages }
    }
  } catch (e) {
    console.warn('Failed to load tournament data from localStorage:', e)
  }
  return null
}

function saveToLocalStorage(state: TournamentState) {
  if (typeof window === 'undefined') return
  try {
    const { stages, currentStage, isTournamentStarted, timerRunning, timerSeconds, timerLabel, isCustomMode, customStages } = state
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ stages, currentStage, isTournamentStarted, timerRunning, timerSeconds, timerLabel, isCustomMode, customStages })
    )
  } catch (e) {
    console.warn('Failed to save tournament data to localStorage:', e)
  }
}

const defaultStages = {
  n216: createEmptyStageData('n216'),
  '16to8': createEmptyStageData('16to8'),
  '8to4': createEmptyStageData('8to4'),
  semi: createEmptyStageData('semi'),
  final: createEmptyStageData('final'),
}

function getAdvanceCountForStage(stage: TournamentStage, customStages: CustomStageConfig[]): number {
  const custom = customStages.find((c) => c.id === stage)
  if (custom) return custom.advanceCount
  return STAGE_ADVANCE_COUNT[stage] ?? 0
}

function computeStageRankings(
  stageData: TournamentStageData,
  advanceCount: number
): { players: TournamentPlayer[]; advancedPlayers: TournamentPlayer[] } {
  const parseDxScore = (dx: string): number => {
    const num = parseFloat(dx)
    return isNaN(num) ? 0 : num
  }

  const sortByScore = (a: TournamentPlayer, b: TournamentPlayer) => {
    const scoreDiff = (b.score ?? -1) - (a.score ?? -1)
    if (scoreDiff !== 0) return scoreDiff
    return parseDxScore(b.dxScore) - parseDxScore(a.dxScore)
  }

  let players: TournamentPlayer[] = []
  let advancedPlayers: TournamentPlayer[] = []

  if (stageData.groups.length > 0) {
    // 按组计算晋级（保留分组晋级逻辑）
    const groupAdvanceMap: Record<string, number> = {
      '16to8': 1,
      '8to4': 2,
      semi: 1,
      final: 1,
    }
    const perGroupAdvance = groupAdvanceMap[stageData.stage] ?? 1

    players = stageData.players.map((p) => ({ ...p, rank: null, advanced: false, eliminated: false }))

    // 第一步：按组内分数决定晋级/淘汰
    for (const group of stageData.groups) {
      const groupPlayers = players
        .filter((p) => group.playerIds.includes(p.id))
        .filter((p) => p.score !== null && p.score !== undefined)
        .sort(sortByScore)

      groupPlayers.forEach((gp, idx) => {
        const target = players.find((p) => p.id === gp.id)
        if (target) {
          target.advanced = idx < perGroupAdvance
          target.eliminated = idx >= perGroupAdvance
        }
      })
    }

    // 第二步：如果晋级人数不足 advanceCount，从剩余选手中按全局成绩补足
    const advancedPlayersCount = players.filter((p) => p.advanced).length
    if (advancedPlayersCount < advanceCount) {
      const remainingNeeded = advanceCount - advancedPlayersCount
      const nonAdvancedScored = players
        .filter((p) => !p.advanced && p.score !== null && p.score !== undefined)
        .sort(sortByScore)

      nonAdvancedScored.slice(0, remainingNeeded).forEach((p) => {
        const target = players.find((pl) => pl.id === p.id)
        if (target) {
          target.advanced = true
          target.eliminated = false
        }
      })
    }

    // 第三步：所有晋级人员按全阶段分数高低进行全局排名
    advancedPlayers = players.filter((p) => p.advanced)
    const advancedSorted = [...advancedPlayers].sort(sortByScore)
    advancedSorted.forEach((ap, idx) => {
      const target = players.find((p) => p.id === ap.id)
      if (target) {
        target.rank = idx + 1
        target.seed = idx + 1
      }
    })

    // 未晋级选手也按分数进行排名（便于显示）
    const eliminatedPlayers = players.filter((p) => !p.advanced && p.score !== null)
    const eliminatedSorted = [...eliminatedPlayers].sort(sortByScore)
    eliminatedSorted.forEach((ep, idx) => {
      const target = players.find((p) => p.id === ep.id)
      if (target) {
        target.rank = advancedSorted.length + idx + 1
      }
    })
  } else {
    // 全局排名（如 N进16）
    const scoredPlayers = stageData.players
      .filter((p) => p.score !== null && p.score !== undefined)
      .sort(sortByScore)

    players = stageData.players.map((p) => {
      const rankIndex = scoredPlayers.findIndex((sp) => sp.id === p.id)
      const rank = rankIndex >= 0 ? rankIndex + 1 : null
      const advanced = rank !== null && rank <= advanceCount
      const eliminated = rank !== null && rank > advanceCount
      const seed = rank !== null ? rank : undefined
      return { ...p, rank, advanced, eliminated, seed }
    })

    advancedPlayers = players.filter((p) => p.advanced)
  }

  return { players, advancedPlayers }
}

function buildRankingStateUpdate(
  state: TournamentState,
  stage: TournamentStage,
  players: TournamentPlayer[],
  advancedPlayers: TournamentPlayer[]
): Pick<TournamentState, 'stages'> {
  // 持久化种子
  const storedSeeds = state.getStoredSeeds()
  const rankedPlayers = players
    .filter((p) => p.rank !== null)
    .sort((a, b) => (a.rank as number) - (b.rank as number))
  rankedPlayers.forEach((player, index) => {
    storedSeeds[player.name] = index + 1
  })
  if (typeof window !== 'undefined') {
    localStorage.setItem('tournament-seeds', JSON.stringify(storedSeeds))
  }

  // 自动将晋级选手复制到下一阶段
  const stageIdx = STAGE_ORDER.indexOf(stage)
  const nextStage = STAGE_ORDER[stageIdx + 1]
  const stagesUpdate: Record<TournamentStage, TournamentStageData> = { ...state.stages }

  stagesUpdate[stage] = { ...stagesUpdate[stage], players, locked: true }

  if (nextStage && advancedPlayers.length > 0) {
    const nextPlayers = advancedPlayers.map((p) => ({
      ...p,
      score: null,
      dxScore: '',
      rank: null,
      advanced: false,
      eliminated: false,
    }))
    stagesUpdate[nextStage] = { ...stagesUpdate[nextStage], players: nextPlayers }
  }

  return { stages: stagesUpdate }
}

const persisted = loadFromLocalStorage()

export const useTournamentStore = create<TournamentState>((set, get) => ({
  stages: persisted?.stages as any || defaultStages,
  currentStage: (persisted?.currentStage as TournamentStage) || 'n216',
  isTournamentStarted: persisted?.isTournamentStarted || false,

  isCustomMode: persisted?.isCustomMode || false,
  customStages: persisted?.customStages || [],

  previewRankings: {
    n216: null,
    '16to8': null,
    '8to4': null,
    semi: null,
    final: null,
  },
  rankingSnapshots: {
    n216: null,
    '16to8': null,
    '8to4': null,
    semi: null,
    final: null,
  },

  timerRunning: persisted?.timerRunning || false,
  timerSeconds: persisted?.timerSeconds || 0,
  timerLabel: persisted?.timerLabel || '',

  setPlayerNames: (stage, names) => {
    set((state) => {
      const stageData = state.stages[stage as TournamentStage]
      if (stageData.locked) return state

      // Load stored seeds
      const storedSeeds = state.getStoredSeeds()

      const players: TournamentPlayer[] = names.map((name, index) => {
        const existing = stageData.players[index]
        const storedSeed = storedSeeds[name]
        return existing
          ? { ...existing, name, seed: storedSeed || existing.seed }
          : {
              id: generateId(),
              name,
              score: null,
              dxScore: '',
              rank: null,
              advanced: false,
              eliminated: false,
              checkedIn: false,
              ...(storedSeed ? { seed: storedSeed } : {}),
            }
      })

      return {
        stages: {
          ...state.stages,
          [stage]: { ...stageData, players },
        },
      }
    })
  },

  updatePlayer: (stage, playerId, data) => {
    set((state) => {
      const stageData = state.stages[stage as TournamentStage]
      if (stageData.locked) return state

      const players = stageData.players.map((p) => {
        if (p.id === playerId) {
          return { ...p, ...data }
        }
        return p
      })

      return {
        stages: {
          ...state.stages,
          [stage]: { ...stageData, players },
        },
      }
    })
  },

  removePlayer: (stage, playerId) => {
    set((state) => {
      const stageData = state.stages[stage as TournamentStage]
      if (stageData.locked) return state

      const players = stageData.players.filter((p) => p.id !== playerId)

      return {
        stages: {
          ...state.stages,
          [stage]: { ...stageData, players },
        },
      }
    })
  },

  addPlayer: (stage, name) => {
    if (!name.trim()) return null
    const newPlayer: TournamentPlayer = {
      id: generateId(),
      name: name.trim(),
      score: null,
      dxScore: '',
      rank: null,
      advanced: false,
      eliminated: false,
      checkedIn: false,
    }
    set((state) => {
      const stageData = state.stages[stage as TournamentStage]
      if (stageData.locked) return state
      if (stageData.players.some((p) => p.name === name.trim())) return state

      return {
        stages: {
          ...state.stages,
          [stage]: { ...stageData, players: [...stageData.players, newPlayer] },
        },
      }
    })
    return newPlayer
  },

  addPlayers: (stage, names) => {
    set((state) => {
      const stageData = state.stages[stage as TournamentStage]
      if (stageData.locked) return state

      const storedSeeds = state.getStoredSeeds()
      const existingNames = new Set(stageData.players.map((p) => p.name))
      const newPlayers: TournamentPlayer[] = []

      for (const name of names) {
        const trimmed = name.trim()
        if (!trimmed || existingNames.has(trimmed)) continue
        const storedSeed = storedSeeds[trimmed]
        newPlayers.push({
          id: generateId(),
          name: trimmed,
          score: null,
          dxScore: '',
          rank: null,
          advanced: false,
          eliminated: false,
          checkedIn: false,
          ...(storedSeed ? { seed: storedSeed } : {}),
        })
        existingNames.add(trimmed)
      }

      return {
        stages: {
          ...state.stages,
          [stage]: { ...stageData, players: [...stageData.players, ...newPlayers] },
        },
      }
    })
  },

  clearPlayers: (stage) => {
    set((state) => {
      const stageData = state.stages[stage as TournamentStage]
      if (stageData.locked) return state
      return {
        stages: {
          ...state.stages,
          [stage]: { ...stageData, players: [] },
        },
      }
    })
  },

  toggleStageLock: (stage) => {
    set((state) => ({
      stages: {
        ...state.stages,
        [stage]: { ...state.stages[stage], locked: !state.stages[stage].locked },
      },
    }))
  },

  calculateRankingsPreview: (stage) => {
    set((state) => {
      const stageData = state.stages[stage]
      if (stageData.locked) return state

      const advanceCount = getAdvanceCountForStage(stage, state.customStages)
      const { players } = computeStageRankings(stageData, advanceCount)
      return {
        previewRankings: { ...state.previewRankings, [stage]: players },
      }
    })
  },

  clearPreviewRankings: (stage) => {
    set((state) => ({
      previewRankings: { ...state.previewRankings, [stage]: null },
    }))
  },

  commitRankings: (stage) => {
    set((state) => {
      const stageData = state.stages[stage]
      if (stageData.locked) return state

      const advanceCount = getAdvanceCountForStage(stage, state.customStages)
      const preview = state.previewRankings[stage]

      let players: TournamentPlayer[]
      let advancedPlayers: TournamentPlayer[]

      if (preview) {
        players = preview
        advancedPlayers = preview.filter((p) => p.advanced)
      } else {
        const result = computeStageRankings(stageData, advanceCount)
        players = result.players
        advancedPlayers = result.advancedPlayers
      }

      // 保存快照（用于撤销）
      const stageIdx = STAGE_ORDER.indexOf(stage)
      const nextStage = STAGE_ORDER[stageIdx + 1]
      const snapshot: RankingSnapshot = {
        current: { ...stageData },
        next: nextStage ? { ...state.stages[nextStage] } : null,
      }

      return {
        rankingSnapshots: { ...state.rankingSnapshots, [stage]: snapshot },
        previewRankings: { ...state.previewRankings, [stage]: null },
        ...buildRankingStateUpdate(state, stage, players, advancedPlayers),
      }
    })
    // 自动广播
    setTimeout(() => get().broadcastTournamentData(), 100)
  },

  undoRankings: (stage) => {
    set((state) => {
      const snapshot = state.rankingSnapshots[stage]
      if (!snapshot) return state

      const newStages = { ...state.stages, [stage]: snapshot.current }
      const stageIdx = STAGE_ORDER.indexOf(stage)
      const nextStage = STAGE_ORDER[stageIdx + 1]
      if (snapshot.next && nextStage) {
        newStages[nextStage] = snapshot.next
      }

      return {
        stages: newStages,
        rankingSnapshots: { ...state.rankingSnapshots, [stage]: null },
        previewRankings: { ...state.previewRankings, [stage]: null },
      }
    })
    // 自动广播
    setTimeout(() => get().broadcastTournamentData(), 100)
  },

  calculateRankings: (stage) => {
    set((state) => {
      const stageData = state.stages[stage]
      if (stageData.locked) return state

      const advanceCount = getAdvanceCountForStage(stage, state.customStages)
      const { players, advancedPlayers } = computeStageRankings(stageData, advanceCount)

      // 保存快照（用于撤销）
      const stageIdx = STAGE_ORDER.indexOf(stage)
      const nextStage = STAGE_ORDER[stageIdx + 1]
      const snapshot: RankingSnapshot = {
        current: { ...stageData },
        next: nextStage ? { ...state.stages[nextStage] } : null,
      }

      return {
        rankingSnapshots: { ...state.rankingSnapshots, [stage]: snapshot },
        previewRankings: { ...state.previewRankings, [stage]: null },
        ...buildRankingStateUpdate(state, stage, players, advancedPlayers),
      }
    })
    // 自动广播
    setTimeout(() => get().broadcastTournamentData(), 100)
  },

  resetTournament: () => {
    set({
      stages: { ...defaultStages },
      currentStage: 'n216',
      isTournamentStarted: false,
      isCustomMode: false,
      customStages: [],
      timerRunning: false,
      timerSeconds: 0,
      timerLabel: '',
    })
    if (typeof window !== 'undefined') {
      broadcastSyncEvent('tournament', { type: 'reset' })
    }
  },

  startTournament: (stages) => {
    set({
      isTournamentStarted: true,
      currentStage: stages[0],
    })
  },

  setCurrentStage: (stage) => {
    set({ currentStage: stage })
  },

  broadcastTournamentData: () => {
    const { stages, currentStage, isTournamentStarted } = get()
    if (typeof window !== 'undefined' && isTournamentStarted) {
      broadcastSyncEvent('tournament', {
        type: 'update',
        stages,
        currentStage,
      })
    }
  },

  /**
   * 获取指定阶段的选手列表（按 seed 排序，只返回晋级的选手）
   */
  getStagePlayers: (stage: TournamentStage) => {
    const { stages } = get()
    const stageData = stages[stage]
    if (!stageData) return []
    const players = [...stageData.players]
    // 按 seed 排序，没 seed 的放在末尾
    players.sort((a, b) => {
      const seedA = typeof a.seed === 'number' ? a.seed : 9999
      const seedB = typeof b.seed === 'number' ? b.seed : 9999
      return seedA - seedB
    })
    return players
  },

  /**
   * 获取当前阶段的选手（排除已淘汰）
   */
  getCurrentStageActivePlayers: () => {
    const { currentStage, stages } = get()
    const stageData = stages[currentStage]
    if (!stageData) return []
    const active = stageData.players.filter(p => !p.eliminated)
    return [...active].sort((a, b) => {
      const seedA = typeof a.seed === 'number' ? a.seed : 9999
      const seedB = typeof b.seed === 'number' ? b.seed : 9999
      return seedA - seedB
    })
  },

  // Export all tournament data as JSON string
  exportTournamentData: () => {
    const { stages, currentStage, isTournamentStarted, timerRunning, timerSeconds, timerLabel, isCustomMode, customStages } = get()
    return JSON.stringify({ stages, currentStage, isTournamentStarted, timerRunning, timerSeconds, timerLabel, isCustomMode, customStages }, null, 2)
  },

  // Import tournament data from JSON string
  importTournamentData: (json: string) => {
    try {
      const data = JSON.parse(json)
      if (data && data.stages && data.currentStage) {
        set({
          stages: data.stages,
          currentStage: data.currentStage,
          isTournamentStarted: data.isTournamentStarted ?? false,
          timerRunning: data.timerRunning ?? false,
          timerSeconds: data.timerSeconds ?? 0,
          timerLabel: data.timerLabel ?? '',
          isCustomMode: data.isCustomMode ?? false,
          customStages: data.customStages || [],
        })
      }
    } catch (e) {
      console.error('Failed to import tournament data:', e)
    }
  },

  // Save current tournament state to history
  // ========== 阶段歌曲管理 ==========

  setStageSongs: (stage, songs) => {
    set((state) => ({
      stages: {
        ...state.stages,
        [stage]: { ...state.stages[stage], songs },
      },
    }))
  },

  addStageSong: (stage, song, label) => {
    set((state) => {
      const stageData = state.stages[stage]
      const newSong: StageSong = {
        id: `stage-song-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        song,
        label,
      }
      return {
        stages: {
          ...state.stages,
          [stage]: { ...stageData, songs: [...stageData.songs, newSong] },
        },
      }
    })
  },

  removeStageSong: (stage, songId) => {
    set((state) => {
      const stageData = state.stages[stage]
      return {
        stages: {
          ...state.stages,
          [stage]: { ...stageData, songs: stageData.songs.filter((s) => s.id !== songId) },
        },
      }
    })
  },

  // ========== 分组管理 ==========

  createGroups16to8: () => {
    set((state) => {
      const stageData = state.stages['16to8']
      if (stageData.players.length === 0) return state

      const players = [...stageData.players].sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999))
      const groups: MatchGroup[] = []

      for (let i = 0; i < 8; i++) {
        const high = players[i]
        const low = players[i + 8]
        if (high && low) {
          groups.push({
            id: `group-16to8-${i + 1}`,
            name: `第${i + 1}组 (${high.name} vs ${low.name})`,
            playerIds: [high.id, low.id],
            songs: [],
          })
        }
      }

      return {
        stages: {
          ...state.stages,
          '16to8': { ...stageData, groups },
        },
      }
    })
  },

  shuffleGroups8to4: () => {
    set((state) => {
      const stageData = state.stages['8to4']
      if (stageData.players.length === 0) return state

      const players = [...stageData.players].sort(() => Math.random() - 0.5)
      const groupA = players.slice(0, 4)
      const groupB = players.slice(4, 8)

      const groups: MatchGroup[] = [
        {
          id: 'group-8to4-a',
          name: '上半区',
          playerIds: groupA.map((p) => p.id),
          songs: [],
        },
        {
          id: 'group-8to4-b',
          name: '下半区',
          playerIds: groupB.map((p) => p.id),
          songs: [],
        },
      ]

      return {
        stages: {
          ...state.stages,
          '8to4': { ...stageData, groups },
        },
      }
    })
  },

  createGroupsSemi: () => {
    set((state) => {
      const stageData = state.stages['semi']
      if (stageData.players.length === 0) return state

      const players = [...stageData.players].sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999))
      const groups: MatchGroup[] = []

      if (players[0] && players[2]) {
        groups.push({
          id: 'group-semi-1',
          name: `${players[0].name} vs ${players[2].name}`,
          playerIds: [players[0].id, players[2].id],
          songs: [],
        })
      }
      if (players[1] && players[3]) {
        groups.push({
          id: 'group-semi-2',
          name: `${players[1].name} vs ${players[3].name}`,
          playerIds: [players[1].id, players[3].id],
          songs: [],
        })
      }

      return {
        stages: {
          ...state.stages,
          semi: { ...stageData, groups },
        },
      }
    })
  },

  setGroupSongs: (stage, groupId, songs) => {
    set((state) => {
      const stageData = state.stages[stage]
      const groups = stageData.groups.map((g) =>
        g.id === groupId ? { ...g, songs } : g
      )
      return {
        stages: {
          ...state.stages,
          [stage]: { ...stageData, groups },
        },
      }
    })
  },

  addGroupSong: (stage, groupId, song, label) => {
    set((state) => {
      const stageData = state.stages[stage]
      const newSong: StageSong = {
        id: `group-song-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        song,
        label,
      }
      const groups = stageData.groups.map((g) =>
        g.id === groupId ? { ...g, songs: [...g.songs, newSong] } : g
      )
      return {
        stages: {
          ...state.stages,
          [stage]: { ...stageData, groups },
        },
      }
    })
  },

  removeGroupSong: (stage, groupId, songId) => {
    set((state) => {
      const stageData = state.stages[stage]
      const groups = stageData.groups.map((g) =>
        g.id === groupId ? { ...g, songs: g.songs.filter((s) => s.id !== songId) } : g
      )
      return {
        stages: {
          ...state.stages,
          [stage]: { ...stageData, groups },
        },
      }
    })
  },

  saveToHistory: () => {
    if (typeof window === 'undefined') return
    try {
      const { stages, currentStage } = get()
      // Find champion (final stage winner)
      const finalStage = stages['final']
      const champion = finalStage.players.find((p) => p.rank === 1) || null

      const record: TournamentHistoryRecord = {
        id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        date: new Date().toLocaleString(),
        stages,
        currentStage,
        champion,
        createdAt: new Date().toISOString(),
      }

      const existingRaw = localStorage.getItem(HISTORY_STORAGE_KEY)
      const existing: TournamentHistoryRecord[] = existingRaw ? JSON.parse(existingRaw) : []
      existing.unshift(record)
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(existing))
    } catch (e) {
      console.warn('Failed to save tournament history:', e)
    }
  },

  // Load history list (summary)
  loadHistory: () => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
      if (!raw) return []
      const records: TournamentHistoryRecord[] = JSON.parse(raw)
      return records.map((r) => ({
        id: r.id,
        date: r.date,
        champion: r.champion?.name || '无冠军',
        createdAt: r.createdAt,
      }))
    } catch (e) {
      console.warn('Failed to load tournament history:', e)
      return []
    }
  },

  // Delete a history record
  deleteHistoryRecord: (id: string) => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
      if (!raw) return
      const records: TournamentHistoryRecord[] = JSON.parse(raw)
      const filtered = records.filter((r) => r.id !== id)
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered))
    } catch (e) {
      console.warn('Failed to delete history record:', e)
    }
  },

  // Get full history records
  getHistory: () => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
      if (!raw) return []
      return JSON.parse(raw)
    } catch (e) {
      console.warn('Failed to get tournament history:', e)
      return []
    }
  },

  // Clear all history
  clearHistory: () => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY)
    } catch (e) {
      console.warn('Failed to clear tournament history:', e)
    }
  },

  // Timer: start with label and duration
  startTimer: (label: string, seconds: number) => {
    set({ timerRunning: true, timerSeconds: seconds, timerLabel: label })
  },

  // Timer: stop (pause)
  stopTimer: () => {
    set({ timerRunning: false })
  },

  // Timer: reset to 0
  resetTimer: () => {
    set({ timerRunning: false, timerSeconds: 0, timerLabel: '' })
  },

  // Timer: decrement by 1
  tickTimer: () => {
    set((state) => {
      const next = state.timerSeconds - 1
      if (next <= 0) {
        return { timerSeconds: 0, timerRunning: false }
      }
      return { timerSeconds: next }
    })
  },

  // ========== 自定义赛制 ==========

  setCustomMode: (enabled) => {
    set({ isCustomMode: enabled })
  },

  setCustomStages: (configs) => {
    set({ customStages: configs })
  },

  // ========== 种子排名 ==========

  setPlayerSeed: (stage, playerId, seed) => {
    set((state) => {
      const stageData = state.stages[stage as TournamentStage]
      if (stageData.locked) return state

      const players = stageData.players.map((p) =>
        p.id === playerId
          ? { ...p, seed: seed !== null ? seed : undefined }
          : p
      )

      return {
        stages: {
          ...state.stages,
          [stage]: { ...stageData, players },
        },
      }
    })
  },

  applySeeding: (stage) => {
    set((state) => {
      const stageData = state.stages[stage as TournamentStage]
      if (stageData.locked) return state

      const players = [...stageData.players]
      const seeded = players
        .filter((p) => typeof p.seed === 'number')
        .sort((a, b) => (a.seed as number) - (b.seed as number))
      const unseeded = players.filter((p) => typeof p.seed !== 'number')

      // 生成 bracket 位置映射：positions[i] = 位置 i 应放的种子排名
      const positions = generateBracketSeeding(players.length)

      const newPlayers: TournamentPlayer[] = new Array(players.length)
      const usedIds = new Set<string>()

      // Step 1: 将已设置种子的选手放到 bracket 对应位置
      for (let i = 0; i < positions.length; i++) {
        const targetSeed = positions[i]
        const player = seeded.find((p) => p.seed === targetSeed && !usedIds.has(p.id))
        if (player) {
          newPlayers[i] = player
          usedIds.add(player.id)
        }
      }

      // Step 2: 剩余空位填入未设置种子的选手
      let unseededIdx = 0
      for (let i = 0; i < newPlayers.length; i++) {
        if (!newPlayers[i] && unseededIdx < unseeded.length) {
          newPlayers[i] = unseeded[unseededIdx++]
        }
      }

      // Step 3: 还有空位则填入剩余已设置种子的选手
      const remainingSeeded = seeded.filter((p) => !usedIds.has(p.id))
      let remainIdx = 0
      for (let i = 0; i < newPlayers.length; i++) {
        if (!newPlayers[i] && remainIdx < remainingSeeded.length) {
          newPlayers[i] = remainingSeeded[remainIdx++]
        }
      }

      return {
        stages: {
          ...state.stages,
          [stage]: { ...stageData, players: newPlayers.filter(Boolean) },
        },
      }
    })
  },

  // ========== 模板管理 ==========

  saveTemplate: (name) => {
    if (typeof window === 'undefined') return
    try {
      const { customStages, isCustomMode, stages } = get()
      const n216PlayerNames = stages.n216.players.map((p) => p.name)

      const template: TournamentTemplate = {
        id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        createdAt: new Date().toISOString(),
        customStages,
        isCustomMode,
        n216PlayerNames,
      }

      const existingRaw = localStorage.getItem(TEMPLATE_STORAGE_KEY)
      const existing: TournamentTemplate[] = existingRaw ? JSON.parse(existingRaw) : []
      existing.unshift(template)
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(existing))
    } catch (e) {
      console.warn('Failed to save template:', e)
    }
  },

  loadTemplate: (id) => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY)
      if (!raw) return
      const templates: TournamentTemplate[] = JSON.parse(raw)
      const template = templates.find((t) => t.id === id)
      if (!template) return

      // Load stored seeds
      const seedData = localStorage.getItem('tournament-seeds')
      const storedSeeds: Record<string, number> = seedData ? JSON.parse(seedData) : {}

      // 根据模板恢复选手名单（自动应用历史种子）
      const n216Players = template.n216PlayerNames.map((name) => {
        const storedSeed = storedSeeds[name]
        return {
          id: generateId(),
          name,
          score: null,
          dxScore: '',
          rank: null,
          advanced: false,
          eliminated: false,
          checkedIn: false,
          ...(storedSeed ? { seed: storedSeed } : {}),
        }
      })

      set({
        isCustomMode: template.isCustomMode,
        customStages: template.customStages,
        stages: {
          ...defaultStages,
          n216: { ...defaultStages.n216, players: n216Players },
        },
        currentStage: 'n216',
        isTournamentStarted: false,
        timerRunning: false,
        timerSeconds: 0,
        timerLabel: '',
      })
    } catch (e) {
      console.warn('Failed to load template:', e)
    }
  },

  deleteTemplate: (id) => {
    if (typeof window === 'undefined') return
    try {
      const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY)
      if (!raw) return
      const templates: TournamentTemplate[] = JSON.parse(raw)
      const filtered = templates.filter((t) => t.id !== id)
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(filtered))
    } catch (e) {
      console.warn('Failed to delete template:', e)
    }
  },

  getTemplates: () => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY)
      if (!raw) return []
      return JSON.parse(raw)
    } catch (e) {
      console.warn('Failed to get templates:', e)
      return []
    }
  },

  // ========== 自动种子更新 ==========

  getStoredSeeds: () => {
    if (typeof window === 'undefined') return {}
    try {
      const raw = localStorage.getItem('tournament-seeds')
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  },

  clearStoredSeeds: () => {
    if (typeof window === 'undefined') return
    localStorage.removeItem('tournament-seeds')
  },

  autoUpdateSeedsFromRankings: (stage) => {
    set((state) => {
      const stageData = state.stages[stage as TournamentStage]
      if (!stageData) return state

      const stored = state.getStoredSeeds()

      // 有排名的选手按排名更新 seed 字段
      const players = stageData.players.map((p) => {
        if (p.rank !== null && p.rank !== undefined) {
          stored[p.name] = p.rank
          return { ...p, seed: p.rank }
        }
        return p
      })

      if (typeof window !== 'undefined') {
        localStorage.setItem('tournament-seeds', JSON.stringify(stored))
      }

      return {
        stages: {
          ...state.stages,
          [stage]: { ...stageData, players },
        },
      }
    })
  },
}))

// Persist to localStorage on every state change
useTournamentStore.subscribe((state) => {
  saveToLocalStorage(state)
})

// Listen for stage songs sync events from other tabs/devices
if (typeof window !== 'undefined') {
  subscribeSyncEvents((event) => {
    if (event.type === 'stageSongs') {
      const payload = event.payload as {
        stage: TournamentStage
        groupId?: string
        songs: { song: Song | null; label: string }[]
      }
      if (!payload?.stage || !payload?.songs) return
      const store = useTournamentStore.getState()
      const stageData = store.stages[payload.stage]
      if (!stageData) return

      const newSongs: StageSong[] = payload.songs.map((s, idx) => ({
        id: `sync-song-${Date.now()}-${idx}`,
        song: s.song,
        label: s.label,
      }))

      if (payload.groupId && stageData.groups.length > 0) {
        store.setGroupSongs(payload.stage, payload.groupId, newSongs)
      } else {
        store.setStageSongs(payload.stage, newSongs)
      }
    }
  })
}
