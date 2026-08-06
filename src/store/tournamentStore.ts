import { create } from 'zustand'
import { broadcastSyncEvent, subscribeSyncEvents } from '@/utils/tabSync'
import type { Song } from '@/store/songStore'

// 赛事阶段（支持自定义阶段 ID）
export type TournamentStage = string

// 默认阶段显示名称
export const STAGE_LABELS: Record<string, string> = {
  n216: 'N进16',
  '16to8': '16进8',
  '8to4': '8进4',
  semi: '半决赛',
  semiLoser: '半决赛败者组',
  final: '决赛',
}

// 默认阶段排序
export const DEFAULT_STAGE_ORDER: string[] = ['n216', '16to8', '8to4', 'semi', 'semiLoser', 'final']

// 默认阶段晋级人数
const DEFAULT_ADVANCE_COUNT: Record<string, number> = {
  n216: 16,
  '16to8': 8,
  '8to4': 4,
  semi: 2,
  semiLoser: 1,
  final: 1,
}

// 获取阶段显示名称
export function getStageLabel(stage: string, customStages?: CustomStageConfig[]): string {
  if (customStages) {
    const custom = customStages.find((c) => c.id === stage)
    if (custom) return custom.name
  }
  return STAGE_LABELS[stage] || stage
}

// 获取阶段顺序
export function getStageOrder(isCustomMode: boolean, customStages?: CustomStageConfig[]): string[] {
  if (isCustomMode && customStages && customStages.length > 0) {
    return customStages.map((c) => c.id)
  }
  return DEFAULT_STAGE_ORDER
}

// 获取阶段晋级人数
export function getStageAdvanceCount(stage: string, customStages?: CustomStageConfig[]): number {
  if (customStages) {
    const custom = customStages.find((c) => c.id === stage)
    if (custom) return custom.advanceCount
  }
  return DEFAULT_ADVANCE_COUNT[stage] ?? 0
}

// 自定义阶段配置
export interface CustomStageConfig {
  id: string
  name: string
  playerCount: number
  advanceCount: number
  rankingMethod: 'global' | 'group'  // 排名方式：全局排名 / 分组排名
  groupCount: number                  // 分组数量（分组排名时有效）
  advancePerGroup: number            // 每组晋级人数（分组排名时有效）
  songCount: number                  // 该阶段歌曲总数（如 4 表示 2+2）
  loserStageId?: string             // 败者组阶段 ID（该阶段淘汰选手进入此阶段）
}

// 默认阶段歌曲数
const DEFAULT_SONG_COUNT: Record<string, number> = {
  n216: 4,
  '16to8': 4,
  '8to4': 4,
  semi: 4,
  semiLoser: 4,
  final: 4,
}

// 默认败者组路由
const DEFAULT_LOSER_STAGE_MAP: Record<string, string> = {
  semi: 'semiLoser',
}

// 获取阶段歌曲数
export function getStageSongCount(stage: string, customStages?: CustomStageConfig[]): number {
  if (customStages) {
    const custom = customStages.find((c) => c.id === stage)
    if (custom) return custom.songCount
  }
  return DEFAULT_SONG_COUNT[stage] ?? 4
}

// 获取败者组阶段 ID
export function getLoserStageId(stage: string, isCustomMode: boolean, customStages?: CustomStageConfig[]): string | undefined {
  if (isCustomMode && customStages) {
    return customStages.find((c) => c.id === stage)?.loserStageId
  }
  return DEFAULT_LOSER_STAGE_MAP[stage]
}

// 迁移旧版 CustomStageConfig（补充缺失字段的默认值）
export function migrateCustomStageConfig(
  config: Partial<CustomStageConfig> & { id: string; name: string; playerCount: number; advanceCount: number }
): CustomStageConfig {
  return {
    id: config.id,
    name: config.name,
    playerCount: config.playerCount,
    advanceCount: config.advanceCount,
    rankingMethod: config.rankingMethod || 'global',
    groupCount: config.groupCount || 0,
    advancePerGroup: config.advancePerGroup || 1,
    songCount: config.songCount || 4,
    ...(config.loserStageId ? { loserStageId: config.loserStageId } : {}),
  }
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
  rating: number | null // 选手评级（用于相似 rating 分组）
}

// 阶段分配的歌曲
export interface StageSong {
  id: string
  song: Song | null
  label: string // 如"课题曲1"、"自选1"
}

// 分组/对阵
export type MatchGroupStatus = 'pending' | 'playing' | 'completed'

export interface MatchGroup {
  id: string
  name: string // 如"第1组"、"上半区"、"1v3"
  playerIds: string[]
  songs: StageSong[] // 该组比赛用曲（覆盖阶段级别）
  completed?: boolean // 该组对局是否已完成
  status?: MatchGroupStatus // 对局进行状态
}

// 赛事阶段数据
export interface TournamentStageData {
  stage: string
  players: TournamentPlayer[]
  locked: boolean // 是否已锁定（锁定后不能再修改分数）
  songs: StageSong[] // 阶段通用歌曲（所有人共享）
  groups: MatchGroup[] // 分组信息
}

// 排名快照（用于撤销）
export interface RankingSnapshot {
  current: TournamentStageData
  next: TournamentStageData | null
  next2?: TournamentStageData | null // 半决赛同时影响决赛与半决赛败者组
}

// 赛事历史记录
export interface TournamentHistoryRecord {
  id: string
  date: string
  stages: Record<string, TournamentStageData>
  currentStage: string
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
  stages: Record<string, TournamentStageData>
  currentStage: TournamentStage
  isTournamentStarted: boolean

  // 自定义赛制
  isCustomMode: boolean
  customStages: CustomStageConfig[]

  // 排名预览与快照
  previewRankings: Record<string, TournamentPlayer[] | null>
  rankingSnapshots: Record<string, RankingSnapshot | null>

  // Timer state
  timerRunning: boolean
  timerSeconds: number
  timerLabel: string

  // 设置选手名称（批量初始化）
  setPlayerNames: (stage: TournamentStage, names: string[]) => void

  // 更新单个选手信息
  updatePlayer: (stage: TournamentStage, playerId: string, data: Partial<Omit<TournamentPlayer, 'id'>>) => void

  // 更新选手签到状态（不受阶段锁定限制）
  updatePlayerCheckIn: (stage: TournamentStage, playerId: string, checkedIn: boolean) => void

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
  updateFutureStages: (configs: CustomStageConfig[]) => void  // 比赛中途修改未来阶段

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
  createGroupsN216: () => { success: boolean; message?: string }
  createGroups16to8: () => { success: boolean; message?: string }
  shuffleGroups8to4: () => { success: boolean; message?: string }
  createGroupsSemi: () => { success: boolean; message?: string }
  createGroupsSemiLoser: () => { success: boolean; message?: string }
  createGroupsByRating: (stage: TournamentStage, groupSize: number) => { success: boolean; message?: string }
  setGroupSongs: (stage: TournamentStage, groupId: string, songs: StageSong[]) => void
  addGroupSong: (stage: TournamentStage, groupId: string, song: Song | null, label: string) => void
  removeGroupSong: (stage: TournamentStage, groupId: string, songId: string) => void
  setGroupCompleted: (stage: TournamentStage, groupId: string, completed: boolean) => void
  setGroupStatus: (stage: TournamentStage, groupId: string, status: MatchGroupStatus) => void

  // 选手评级
  updatePlayerRating: (stage: TournamentStage, playerId: string, rating: number | null) => void
}

function generateId(): string {
  return `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function createEmptyStageData(stage: string): TournamentStageData {
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
      const isCustom = data.isCustomMode || false
      const customStages: CustomStageConfig[] = (data.customStages || []).map(migrateCustomStageConfig)
      const stageOrder = getStageOrder(isCustom, customStages)

      // Migrate old stage data to new structure (songs/groups fields)
      const migratedStages: Record<string, TournamentStageData> = {}
      for (const stageId of stageOrder) {
        if (data.stages[stageId]) {
          migratedStages[stageId] = migrateStageData(data.stages[stageId])
        } else {
          migratedStages[stageId] = createEmptyStageData(stageId)
        }
      }
      // Also include any stages in data that aren't in the stage order (backward compat)
      for (const key of Object.keys(data.stages)) {
        if (!migratedStages[key]) {
          migratedStages[key] = migrateStageData(data.stages[key])
        }
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

function buildDefaultStages(isCustomMode: boolean, customStages: CustomStageConfig[]): Record<string, TournamentStageData> {
  const stageOrder = getStageOrder(isCustomMode, customStages)
  const stages: Record<string, TournamentStageData> = {}
  for (const stageId of stageOrder) {
    stages[stageId] = createEmptyStageData(stageId)
  }
  return stages
}

function getAdvanceCountForStage(stage: string, customStages: CustomStageConfig[]): number {
  return getStageAdvanceCount(stage, customStages)
}

function computeStageRankings(
  stageData: TournamentStageData,
  advanceCount: number,
  customConfig?: CustomStageConfig
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
    // 按组计算晋级：使用自定义配置的 perGroupAdvance，或按比例分配
    const perGroupAdvance = customConfig?.advancePerGroup
      ?? Math.max(1, Math.floor(advanceCount / stageData.groups.length))

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

  // 半决赛败者组固定排名：胜者第 3 名（季军），败者第 4 名
  if (stageData.stage === 'semiLoser') {
    players = players.map((p) =>
      p.advanced
        ? { ...p, rank: 3 }
        : { ...p, rank: 4, eliminated: true }
    )
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
  const stageOrder = getStageOrder(state.isCustomMode, state.customStages)
  const stageIdx = stageOrder.indexOf(stage)
  const nextStage = stageOrder[stageIdx + 1]
  const stagesUpdate: Record<TournamentStage, TournamentStageData> = { ...state.stages }

  stagesUpdate[stage] = { ...stagesUpdate[stage], players, locked: true }

  const resetPlayerForNextStage = (p: TournamentPlayer): TournamentPlayer => ({
    ...p,
    score: null,
    dxScore: '',
    rank: null,
    advanced: false,
    eliminated: false,
    rating: null,
  })

  const buildGroupForStage = (stagePlayers: TournamentPlayer[], stageId: string): MatchGroup[] =>
    stagePlayers.length >= 2
      ? [
          {
            id: `${stageId}-${Date.now()}`,
            name: getStageLabel(stageId, state.customStages),
            playerIds: stagePlayers.map((p) => p.id),
            songs: [],
            completed: false,
            status: 'pending',
          },
        ]
      : []

  // 通用晋级：将晋级选手复制到下一阶段
  if (!state.isCustomMode && stage === 'semi') {
    // 半决赛特殊：胜者晋级决赛（跳过 semiLoser）
    const finalPlayers = advancedPlayers.map(resetPlayerForNextStage)
    stagesUpdate.final = {
      ...stagesUpdate.final,
      players: finalPlayers,
      groups: buildGroupForStage(finalPlayers, 'final'),
    }
  } else if (nextStage && advancedPlayers.length > 0) {
    const nextPlayers = advancedPlayers.map(resetPlayerForNextStage)
    const nextGroups = buildGroupForStage(nextPlayers, nextStage)
    stagesUpdate[nextStage] = {
      ...stagesUpdate[nextStage],
      players: nextPlayers,
      groups: nextGroups,
    }
  }

  // 败者组：将淘汰选手复制到败者组阶段
  const loserStageId = getLoserStageId(stage, state.isCustomMode, state.customStages)
  if (loserStageId && stagesUpdate[loserStageId]) {
    const eliminatedPlayers = players.filter((p) => !p.advanced && p.score !== null)
    if (eliminatedPlayers.length > 0) {
      const loserPlayers = eliminatedPlayers.map(resetPlayerForNextStage)
      stagesUpdate[loserStageId] = {
        ...stagesUpdate[loserStageId],
        players: loserPlayers,
        groups: [],
      }
    }
  }

  // 默认模式：半决赛败者组不晋级到决赛
  if (!state.isCustomMode && stage === 'semiLoser') {
    // 半决赛败者组：胜者获得季军，不进入决赛，仅锁定自身
  }

  return { stages: stagesUpdate }
}

const persisted = loadFromLocalStorage()

const defaultStages = buildDefaultStages(
  persisted?.isCustomMode || false,
  persisted?.customStages || []
)

// 确保 stages 始终包含所有 stageOrder 中的阶段（防止旧数据缺失 key 导致崩溃）
function ensureAllStages(
  stages: Record<string, TournamentStageData>,
  isCustomMode: boolean,
  customStages: CustomStageConfig[]
): Record<string, TournamentStageData> {
  const stageOrder = getStageOrder(isCustomMode, customStages)
  const result = { ...stages }
  for (const stageId of stageOrder) {
    if (!result[stageId]) {
      result[stageId] = createEmptyStageData(stageId)
    }
  }
  return result
}

const initialStages = ensureAllStages(
  (persisted?.stages as Record<string, TournamentStageData>) || defaultStages,
  persisted?.isCustomMode || false,
  persisted?.customStages || []
)

export const useTournamentStore = create<TournamentState>((set, get) => ({
  stages: initialStages,
  currentStage: (persisted?.currentStage as string) || 'n216',
  isTournamentStarted: persisted?.isTournamentStarted || false,

  isCustomMode: persisted?.isCustomMode || false,
  customStages: persisted?.customStages || [],

  previewRankings: persisted?.previewRankings || {},
  rankingSnapshots: persisted?.rankingSnapshots || {},

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
              rating: null,
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

  updatePlayerCheckIn: (stage, playerId, checkedIn) => {
    set((state) => {
      const stageData = state.stages[stage as TournamentStage]
      const players = stageData.players.map((p) =>
        p.id === playerId ? { ...p, checkedIn } : p
      )
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
      rating: null,
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
          rating: null,
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
      const customConfig = state.customStages.find((c) => c.id === stage)
      const { players } = computeStageRankings(stageData, advanceCount, customConfig)
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
      const customConfig = state.customStages.find((c) => c.id === stage)

      let players: TournamentPlayer[]
      let advancedPlayers: TournamentPlayer[]

      if (preview) {
        players = preview
        advancedPlayers = preview.filter((p) => p.advanced)
      } else {
        const result = computeStageRankings(stageData, advanceCount, customConfig)
        players = result.players
        advancedPlayers = result.advancedPlayers
      }

      // 保存快照（用于撤销）
      const stageOrder = getStageOrder(state.isCustomMode, state.customStages)
      const stageIdx = stageOrder.indexOf(stage)
      const nextStage = stageOrder[stageIdx + 1]
      const snapshot: RankingSnapshot = {
        current: { ...stageData },
        next: nextStage ? { ...state.stages[nextStage] } : null,
      }
      if (!state.isCustomMode && stage === 'semi') {
        snapshot.next2 = { ...state.stages.final }
      }

      return {
        rankingSnapshots: { ...state.rankingSnapshots, [stage]: snapshot },
        previewRankings: { ...state.previewRankings, [stage]: null },
        ...buildRankingStateUpdate(state, stage, players, advancedPlayers),
      }
    })
  },

  undoRankings: (stage) => {
    set((state) => {
      const snapshot = state.rankingSnapshots[stage]
      if (!snapshot) return state

      const newStages = { ...state.stages, [stage]: snapshot.current }
      const stageOrder = getStageOrder(state.isCustomMode, state.customStages)
      const stageIdx = stageOrder.indexOf(stage)
      const nextStage = stageOrder[stageIdx + 1]
      if (snapshot.next && nextStage) {
        newStages[nextStage] = snapshot.next
      }
      if (!state.isCustomMode && stage === 'semi' && snapshot.next2) {
        newStages.final = snapshot.next2
      }

      return {
        stages: newStages,
        rankingSnapshots: { ...state.rankingSnapshots, [stage]: null },
        previewRankings: { ...state.previewRankings, [stage]: null },
      }
    })
  },

  calculateRankings: (stage) => {
    set((state) => {
      const stageData = state.stages[stage]
      if (stageData.locked) return state

      const advanceCount = getAdvanceCountForStage(stage, state.customStages)
      const customConfig = state.customStages.find((c) => c.id === stage)
      const { players, advancedPlayers } = computeStageRankings(stageData, advanceCount, customConfig)

      // 保存快照（用于撤销）
      const stageOrder = getStageOrder(state.isCustomMode, state.customStages)
      const stageIdx = stageOrder.indexOf(stage)
      const nextStage = stageOrder[stageIdx + 1]
      const snapshot: RankingSnapshot = {
        current: { ...stageData },
        next: nextStage ? { ...state.stages[nextStage] } : null,
      }
      if (!state.isCustomMode && stage === 'semi') {
        snapshot.next2 = { ...state.stages.final }
      }

      return {
        rankingSnapshots: { ...state.rankingSnapshots, [stage]: snapshot },
        previewRankings: { ...state.previewRankings, [stage]: null },
        ...buildRankingStateUpdate(state, stage, players, advancedPlayers),
      }
    })
  },

  resetTournament: () => {
    set({
      stages: buildDefaultStages(false, []),
      currentStage: DEFAULT_STAGE_ORDER[0],
      isTournamentStarted: false,
      isCustomMode: false,
      customStages: [],
      previewRankings: {},
      rankingSnapshots: {},
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
    const state = get()
    if (typeof window !== 'undefined' && state.isTournamentStarted) {
      broadcastSyncEvent('tournament', {
        type: 'update',
        stages: state.stages,
        currentStage: state.currentStage,
        isTournamentStarted: state.isTournamentStarted,
        timerRunning: state.timerRunning,
        timerSeconds: state.timerSeconds,
        timerLabel: state.timerLabel,
        isCustomMode: state.isCustomMode,
        customStages: state.customStages,
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

  createGroupsN216: () => {
    const result = { success: false, message: '' }
    set((state) => {
      const stageData = state.stages['n216']
      if (stageData.players.length === 0) {
        result.message = '当前阶段没有选手'
        return state
      }
      if (stageData.players.length < 16) {
        result.message = `N进16 至少需要 16 名选手，当前有 ${stageData.players.length} 名`
        return state
      }

      // 按种子排序，未设置种子的放在末尾
      const players = [...stageData.players].sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999))

      // 两人为一组：高种子 vs 低种子
      const groups: MatchGroup[] = []
      const total = players.length
      for (let i = 0; i < total / 2; i++) {
        const high = players[i]
        const low = players[total - 1 - i]
        if (high && low) {
          groups.push({
            id: `group-n216-${i + 1}`,
            name: `第${i + 1}组 (${high.name} vs ${low.name})`,
            playerIds: [high.id, low.id],
            songs: [],
          })
        }
      }

      result.success = true
      result.message = `已按种子生成 ${groups.length} 个两人小组，课题曲统一`
      return {
        stages: {
          ...state.stages,
          n216: { ...stageData, groups },
        },
      }
    })
    return result
  },

  createGroups16to8: () => {
    const result = { success: false, message: '' }
    set((state) => {
      const stageData = state.stages['16to8']
      if (stageData.players.length === 0) {
        result.message = '当前阶段没有选手'
        return state
      }
      if (stageData.players.length !== 16) {
        result.message = `16进8 需要 16 名选手，当前有 ${stageData.players.length} 名`
        return state
      }

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

      result.success = true
      result.message = `已生成 ${groups.length} 组对阵`
      return {
        stages: {
          ...state.stages,
          '16to8': { ...stageData, groups },
        },
      }
    })
    return result
  },

  shuffleGroups8to4: () => {
    const result = { success: false, message: '' }
    set((state) => {
      const stageData = state.stages['8to4']
      if (stageData.players.length === 0) {
        result.message = '当前阶段没有选手'
        return state
      }
      if (stageData.players.length !== 8) {
        result.message = `8进4 需要 8 名选手，当前有 ${stageData.players.length} 名`
        return state
      }

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

      result.success = true
      result.message = '已随机分为上下半区'
      return {
        stages: {
          ...state.stages,
          '8to4': { ...stageData, groups },
        },
      }
    })
    return result
  },

  createGroupsSemi: () => {
    const result = { success: false, message: '' }
    set((state) => {
      const stageData = state.stages['semi']
      if (stageData.players.length === 0) {
        result.message = '当前阶段没有选手'
        return state
      }
      if (stageData.players.length !== 4) {
        result.message = `半决赛需要 4 名选手，当前有 ${stageData.players.length} 名`
        return state
      }

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

      result.success = true
      result.message = '已生成半决赛对阵'
      return {
        stages: {
          ...state.stages,
          semi: { ...stageData, groups },
        },
      }
    })
    return result
  },

  createGroupsSemiLoser: () => {
    const result = { success: false, message: '' }
    set((state) => {
      const stageData = state.stages['semiLoser']
      if (stageData.players.length === 0) {
        result.message = '半决赛败者组没有选手，请先完成半决赛排名'
        return state
      }
      if (stageData.players.length !== 2) {
        result.message = `半决赛败者组需要 2 名选手，当前有 ${stageData.players.length} 名`
        return state
      }

      const players = [...stageData.players].sort((a, b) => (a.seed ?? 999) - (b.seed ?? 999))
      const groups: MatchGroup[] = [
        {
          id: 'group-semiloser-1',
          name: `${players[0].name} vs ${players[1].name}`,
          playerIds: [players[0].id, players[1].id],
          songs: [],
        },
      ]

      result.success = true
      result.message = '已生成半决赛败者组对阵'
      return {
        stages: {
          ...state.stages,
          semiLoser: { ...stageData, groups },
        },
      }
    })
    return result
  },

  createGroupsByRating: (stage, groupSize) => {
    const result = { success: false, message: '' }
    set((state) => {
      const stageData = state.stages[stage]
      if (!stageData) {
        result.message = '阶段不存在'
        return state
      }
      if (stageData.locked) {
        result.message = '阶段已锁定，无法修改分组'
        return state
      }
      if (stageData.players.length === 0) {
        result.message = '当前阶段没有选手'
        return state
      }
      const ratedPlayers = stageData.players.filter((p) => p.rating !== null && p.rating !== undefined)
      if (ratedPlayers.length < 2) {
        result.message = '至少需要 2 名有 rating 的选手才能分组'
        return state
      }
      if (groupSize < 2) {
        result.message = '每组至少需要 2 人'
        return state
      }

      // 按 rating 升序排列
      const sorted = [...ratedPlayers].sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0))
      const groups: MatchGroup[] = []
      let groupIdx = 1

      for (let i = 0; i < sorted.length; i += groupSize) {
        const groupPlayers = sorted.slice(i, i + groupSize)
        if (groupPlayers.length < 2) {
          // 不足一组的选手合并到最后一组
          if (groups.length > 0) {
            const lastGroup = groups[groups.length - 1]
            lastGroup.playerIds.push(...groupPlayers.map((p) => p.id))
            lastGroup.name = `第${groups.length}组 (${lastGroup.playerIds.length}人)`
          }
          break
        }
        const names = groupPlayers.map((p) => p.name).join(' vs ')
        groups.push({
          id: `group-rating-${stage}-${groupIdx}`,
          name: `第${groupIdx}组 (${names})`,
          playerIds: groupPlayers.map((p) => p.id),
          songs: [],
        })
        groupIdx++
      }

      // 未设置 rating 的选手单独成组（放在末尾）
      const unratedPlayers = stageData.players.filter((p) => p.rating === null || p.rating === undefined)
      if (unratedPlayers.length > 0) {
        const unratedNames = unratedPlayers.map((p) => p.name).join(' vs ')
        groups.push({
          id: `group-rating-${stage}-unrated`,
          name: `未评级 (${unratedNames})`,
          playerIds: unratedPlayers.map((p) => p.id),
          songs: [],
        })
      }

      result.success = true
      result.message = `已按 rating 生成 ${groups.length} 组（${groupSize}人/组，${ratedPlayers.length}人有评级${
        unratedPlayers.length > 0 ? `，${unratedPlayers.length}人无评级` : ''
      }）`
      return {
        stages: {
          ...state.stages,
          [stage]: { ...stageData, groups },
        },
      }
    })
    return result
  },

  updatePlayerRating: (stage, playerId, rating) => {
    set((state) => {
      const stageData = state.stages[stage]
      if (!stageData || stageData.locked) return state
      const players = stageData.players.map((p) =>
        p.id === playerId ? { ...p, rating } : p
      )
      return {
        stages: {
          ...state.stages,
          [stage]: { ...stageData, players },
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

  setGroupCompleted: (stage, groupId, completed) => {
    set((state) => {
      const stageData = state.stages[stage]
      const groups = stageData.groups.map((g) =>
        g.id === groupId ? { ...g, completed } : g
      )
      return {
        stages: {
          ...state.stages,
          [stage]: { ...stageData, groups },
        },
      }
    })
  },

  setGroupStatus: (stage, groupId, status) => {
    set((state) => {
      const stageData = state.stages[stage]
      const groups = stageData.groups.map((g) =>
        g.id === groupId
          ? { ...g, status, completed: status === 'completed' }
          : g
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

  updateFutureStages: (configs) => {
    set((state) => {
      if (!state.isTournamentStarted) {
        // 赛事未开始，直接全部更新
        return { customStages: configs }
      }
      // 比赛中途：只更新当前阶段之后的阶段
      const stageOrder = getStageOrder(state.isCustomMode, state.customStages)
      const currentIdx = stageOrder.indexOf(state.currentStage)
      const updatedStages = state.customStages.map((s, idx) => {
        if (idx > currentIdx) {
          const updated = configs.find((c) => c.id === s.id)
          if (updated) return updated
        }
        return s
      })
      return { customStages: updatedStages }
    })
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
      const stageOrder = getStageOrder(isCustomMode, customStages)
      const firstStage = stageOrder[0] || 'n216'
      const firstStageData = stages[firstStage]
      const playerNames = firstStageData ? firstStageData.players.map((p) => p.name) : []

      const template: TournamentTemplate = {
        id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        createdAt: new Date().toISOString(),
        customStages,
        isCustomMode,
        n216PlayerNames: playerNames,
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
      const migratedCustomStages = template.customStages.map(migrateCustomStageConfig)
      const stageOrder = getStageOrder(template.isCustomMode, migratedCustomStages)
      const firstStage = stageOrder[0] || 'n216'
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
          rating: null,
          ...(storedSeed ? { seed: storedSeed } : {}),
        }
      })

      const newStages = buildDefaultStages(template.isCustomMode, migratedCustomStages)
      set({
        isCustomMode: template.isCustomMode,
        customStages: migratedCustomStages,
        stages: {
          ...newStages,
          [firstStage]: { ...newStages[firstStage], players: n216Players },
        },
        currentStage: firstStage,
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

// 本地变更防抖广播，避免连续输入/计时器每秒都产生大量同步包
let isApplyingRemoteUpdate = false
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null
const SYNC_DEBOUNCE_MS = 250

function broadcastTournamentSnapshot(): void {
  const state = useTournamentStore.getState()
  if (!state.isTournamentStarted) return

  broadcastSyncEvent('tournament', {
    type: 'update',
    stages: state.stages,
    currentStage: state.currentStage,
    isTournamentStarted: state.isTournamentStarted,
    timerRunning: state.timerRunning,
    timerSeconds: state.timerSeconds,
    timerLabel: state.timerLabel,
    isCustomMode: state.isCustomMode,
    customStages: state.customStages,
  })
}

// Persist to localStorage on every state change, and auto-broadcast when tournament is active
useTournamentStore.subscribe(() => {
  const state = useTournamentStore.getState()
  saveToLocalStorage(state)

  if (isApplyingRemoteUpdate || !state.isTournamentStarted) return

  if (syncDebounceTimer) clearTimeout(syncDebounceTimer)
  syncDebounceTimer = setTimeout(() => {
    syncDebounceTimer = null
    broadcastTournamentSnapshot()
  }, SYNC_DEBOUNCE_MS)
})

// Listen for sync events from other tabs/devices
if (typeof window !== 'undefined') {
  subscribeSyncEvents((event) => {
    if (event.type === 'tournament') {
      const payload = event.payload as {
        type: string
        stages?: Record<TournamentStage, TournamentStageData>
        currentStage?: TournamentStage
        isTournamentStarted?: boolean
        timerRunning?: boolean
        timerSeconds?: number
        timerLabel?: string
        isCustomMode?: boolean
        customStages?: CustomStageConfig[]
      }

      if (payload.type === 'update') {
        isApplyingRemoteUpdate = true
        useTournamentStore.setState((state) => ({
          isTournamentStarted: payload.isTournamentStarted ?? state.isTournamentStarted,
          stages: payload.stages ?? state.stages,
          currentStage: payload.currentStage ?? state.currentStage,
          timerRunning: payload.timerRunning ?? state.timerRunning,
          timerSeconds: payload.timerSeconds ?? state.timerSeconds,
          timerLabel: payload.timerLabel ?? state.timerLabel,
          isCustomMode: payload.isCustomMode ?? state.isCustomMode,
          customStages: payload.customStages ?? state.customStages,
        }))
        isApplyingRemoteUpdate = false
      } else if (payload.type === 'reset') {
        isApplyingRemoteUpdate = true
        const resetStages = buildDefaultStages(false, [])
        useTournamentStore.setState({
          stages: { ...resetStages },
          currentStage: DEFAULT_STAGE_ORDER[0],
          isTournamentStarted: false,
          isCustomMode: false,
          customStages: [],
          timerRunning: false,
          timerSeconds: 0,
          timerLabel: '',
        })
        isApplyingRemoteUpdate = false
      }
    }

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

      isApplyingRemoteUpdate = true
      if (payload.groupId && stageData.groups.length > 0) {
        store.setGroupSongs(payload.stage, payload.groupId, newSongs)
      } else {
        store.setStageSongs(payload.stage, newSongs)
      }
      isApplyingRemoteUpdate = false
    }
  })
}
