import { create } from 'zustand'
import { broadcastSyncEvent } from '@/utils/tabSync'
import { fetchMusicData } from '@/api/divingFish'

export type Difficulty = 'BASIC' | 'ADVANCED' | 'EXPERT' | 'MASTER' | 'Re:MASTER'
export type ChartType = 'dx' | 'standard'

export interface Song {
  id: string
  name: string
  difficulty: Difficulty
  level: number
  isPlus: boolean
  cover: string
  author: string
  difficultyAuthor: string
  bpm: number
  chartType: ChartType
  genre: string
  levelValue: number // 拟合定数 (level_value from lxns API)
}

export interface SongPool {
  id: string
  name: string
  songs: Song[]
}

// 玩家选曲
export interface PlayerSelection {
  playerId: string
  playerName: string
  song: Song | null
}

// 多库抽取模式
export type MultiDrawMode = 'mixed' | 'perPool'

// 解析输入值字符串（如 "12+"），返回数值（12.5）
function parseInputValue(val: string): number {
  const hasPlus = val.includes('+')
  const numPart = parseInt(val.replace('+', '')) || 1
  return hasPlus ? numPart + 0.5 : numPart
}

/**
 * 解析等级数值，返回可比较的数值
 */
function parseSongLevel(song: Song): number {
  return song.isPlus ? song.level + 0.5 : song.level
}

/**
 * 真随机数生成器 - 使用 Web Crypto API
 * @param max 最大值 (exclusive)，返回 [0, max) 范围的随机整数
 */
function getRandomIndex(max: number): number {
  if (max <= 1) return 0
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return array[0] % max
}

// 从 localStorage 加载持久化设置
function loadPersistedSettings(): Partial<SongStore> {
  try {
    const saved = localStorage.getItem('maimai-draw-settings')
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        selectedPools: Array.isArray(parsed.selectedPools) ? parsed.selectedPools : [],
        multiDrawMode: parsed.multiDrawMode === 'perPool' ? 'perPool' : 'mixed',
        perPoolDrawCounts: typeof parsed.perPoolDrawCounts === 'object' ? parsed.perPoolDrawCounts : {},
      }
    }
  } catch {
    // ignore
  }
  return {}
}

// 保存设置到 localStorage
function persistSettings(state: Pick<SongStore, 'selectedPools' | 'multiDrawMode' | 'perPoolDrawCounts'>) {
  try {
    localStorage.setItem('maimai-draw-settings', JSON.stringify({
      selectedPools: state.selectedPools,
      multiDrawMode: state.multiDrawMode,
      perPoolDrawCounts: state.perPoolDrawCounts,
    }))
  } catch {
    // ignore
  }
}

// 从 localStorage 加载持久化曲库
function loadPersistedPools(): { songs: Song[]; songPools: SongPool[] } {
  try {
    const saved = localStorage.getItem('maimai-draw-pools')
    if (saved) {
      const parsed = JSON.parse(saved)
      return {
        songs: Array.isArray(parsed.songs) ? parsed.songs : [],
        songPools: Array.isArray(parsed.songPools) ? parsed.songPools : [],
      }
    }
  } catch {
    // ignore
  }
  return { songs: [], songPools: [] }
}

// 保存曲库到 localStorage
function persistPools(state: { songs: Song[]; songPools: SongPool[] }) {
  try {
    localStorage.setItem('maimai-draw-pools', JSON.stringify({
      songs: state.songs,
      songPools: state.songPools,
    }))
  } catch {
    // ignore
  }
}

interface SongStore {
  // 单个曲库模式（兼容旧版）
  songs: Song[]
  // 多曲库模式
  songPools: SongPool[]
  // 当前查看的曲库：'main' = 主库, 或 pool.id
  activePoolId: string
  // 当前使用的模式：'single' = 单库, 'multi' = 多库
  drawMode: 'single' | 'multi'
  // 多库模式下选中的曲库列表（用于抽取）
  selectedPools: string[]
  // 多库抽取模式：'mixed' = 混合抽取, 'perPool' = 按库抽取
  multiDrawMode: MultiDrawMode
  // 按库抽取模式下，每个曲库的抽取数量
  perPoolDrawCounts: Record<string, number>
  selectedSong: Song | null
  selectedSongs: Song[]
  activeFilters: Set<Difficulty>
  minLevel: string
  maxLevel: string
  includePlusOnly: boolean
  chartTypeFilter: Set<ChartType>
  genreFilter: string
  drawCount: number
  isDrawing: boolean
  drawKey: number
  drawHistory: Set<string>
  maxHistorySize: number
  selectRandomSong: () => void
  drawSongs: (count: number, fromMultiPools?: boolean) => void
  toggleFilter: (difficulty: Difficulty) => void
  setLevelRange: (min: string, max: string) => void
  setIncludePlusOnly: (include: boolean) => void
  resetLevelFilter: () => void
  setDrawCount: (count: number) => void
  setIsDrawing: (isDrawing: boolean) => void
  clearSelectedSongs: () => void
  importSongs: (newSongs: Song[]) => void
  importSongsFromAPI: () => Promise<{ success: boolean; count: number; error?: string }>
  // 多曲库相关方法
  addSongPool: (name: string, songs: Song[]) => string
  removeSongPool: (poolId: string) => void
  setActivePoolId: (poolId: string) => void
  setDrawMode: (mode: 'single' | 'multi') => void
  togglePoolSelection: (poolId: string) => void
  setMultiDrawMode: (mode: MultiDrawMode) => void
  setPerPoolDrawCount: (poolId: string, count: number) => void
  getActiveSongs: () => Song[]
  getFilteredSongs: (activeFilters: Set<Difficulty>, includePlusOnly: boolean, chartTypeFilter: Set<ChartType>, genreFilter: string, poolSongs?: Song[]) => Song[]
  toggleChartTypeFilter: (chartType: ChartType) => void
  setGenreFilter: (genre: string) => void
  // 获取抽取预览
  getDrawPreview: () => { poolId: string; poolName: string; count: number; available: number }[]
  // 获取抽取历史（用于去重）
  getDrawHistory: () => Set<string>
  // 多玩家选曲
  playerSelections: PlayerSelection[]
  setPlayerSelections: (selections: PlayerSelection[]) => void
  updatePlayerSelection: (playerId: string, song: Song | null) => void
  addPlayer: (name: string) => void
  removePlayer: (playerId: string) => void
  renamePlayer: (playerId: string, name: string) => void
  // 拟合定数筛选
  minLevelValue: number
  maxLevelValue: number
  setLevelValueRange: (min: number, max: number) => void
  // 排除曲库
  excludedPoolIds: string[]
  toggleExcludedPool: (poolId: string) => void
}

const mockSongs: Song[] = [

]

const persisted = loadPersistedSettings()
const persistedPools = loadPersistedPools()

export const useSongStore = create<SongStore>((set, get) => ({
  songs: persistedPools.songs.length > 0 ? persistedPools.songs : mockSongs,
  songPools: persistedPools.songPools,
  activePoolId: 'main',
  drawMode: 'single',
  selectedPools: persisted.selectedPools || [],
  multiDrawMode: persisted.multiDrawMode || 'mixed',
  perPoolDrawCounts: persisted.perPoolDrawCounts || {},
  selectedSong: null,
  selectedSongs: [],
  activeFilters: new Set(['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER']),
  minLevel: '1',
  maxLevel: '15',
  includePlusOnly: false,
  chartTypeFilter: new Set(['dx', 'standard']),
  genreFilter: '',
  drawCount: 1,
  isDrawing: false,
  drawKey: 0,
  // 抽取历史记录（用于去重，最多保存最近 500 首）
  drawHistory: new Set<string>(),
  // 最大历史记录数
  maxHistorySize: 500,
  // 多玩家选曲状态
  playerSelections: [],
  // 拟合定数筛选范围
  minLevelValue: 1.0,
  maxLevelValue: 15.5,
  // 排除曲库
  excludedPoolIds: [],

  // 获取当前激活曲库的歌曲
  getActiveSongs: () => {
    const { songs, songPools, activePoolId } = get()
    if (activePoolId === 'main') {
      // 如果主库为空但有已导入曲库，使用第一个曲库
      if (songs.length === 0 && songPools.length > 0) {
        return songPools[0].songs
      }
      return songs
    }
    const pool = songPools.find(p => p.id === activePoolId)
    return pool?.songs || songs
  },

  // 获取过滤后的歌曲
  getFilteredSongs: (af: Set<Difficulty>, ipOnly: boolean, ctf: Set<ChartType>, gf: string, poolSongs?: Song[]) => {
    const { minLevel, maxLevel } = get()
    const source = poolSongs || get().getActiveSongs()
    const minValue = parseInputValue(minLevel)
    const maxValue = parseInputValue(maxLevel)

    const result: Song[] = []
    for (let i = 0; i < source.length; i++) {
      const song = source[i]
      if (!af.has(song.difficulty)) continue
      if (!ctf.has(song.chartType)) continue
      if (gf && song.genre !== gf) continue
      const songValue = parseSongLevel(song)
      if (songValue < minValue || songValue > maxValue) continue
      if (ipOnly && !song.isPlus) continue
      result.push(song)
    }
    return result
  },

  // 获取抽取预览
  getDrawPreview: () => {
    const { selectedPools, songPools, songs, multiDrawMode, perPoolDrawCounts, drawCount, activeFilters, includePlusOnly, chartTypeFilter, genreFilter, getFilteredSongs } = get()
    const preview: { poolId: string; poolName: string; count: number; available: number }[] = []

    for (const poolId of selectedPools) {
      let poolSongs: Song[]
      let poolName: string
      if (poolId === 'main') {
        poolSongs = songs
        poolName = '主库'
      } else {
        const pool = songPools.find(p => p.id === poolId)
        if (!pool) continue
        poolSongs = pool.songs
        poolName = pool.name
      }

      const filtered = getFilteredSongs(activeFilters, includePlusOnly, chartTypeFilter, genreFilter, poolSongs)
      const available = filtered.length

      if (multiDrawMode === 'perPool') {
        const count = perPoolDrawCounts[poolId] || 1
        preview.push({ poolId, poolName, count, available })
      } else {
        preview.push({ poolId, poolName, count: 0, available })
      }
    }

    // 混合模式下，显示总数量
    if (multiDrawMode === 'mixed') {
      const totalAvailable = preview.reduce((sum, p) => sum + p.available, 0)
      if (preview.length > 0) {
        return [{ poolId: 'mixed', poolName: '混合抽取', count: drawCount, available: totalAvailable }]
      }
    }

    return preview
  },

  selectRandomSong: () => {
    const { activeFilters, includePlusOnly, chartTypeFilter, genreFilter, getFilteredSongs } = get()
    const filteredSongs = getFilteredSongs(activeFilters, includePlusOnly, chartTypeFilter, genreFilter)
    if (filteredSongs.length === 0) return
    const randomIndex = getRandomIndex(filteredSongs.length)
    set({ selectedSong: filteredSongs[randomIndex] })
  },

  drawSongs: (count: number, fromMultiPools?: boolean) => {
    const { activeFilters, includePlusOnly, chartTypeFilter, genreFilter, getFilteredSongs, songPools, drawMode, multiDrawMode, perPoolDrawCounts, drawHistory, maxHistorySize } = get()
    const useMulti = fromMultiPools || (drawMode === 'multi' && count > 1)

    // Fisher-Yates 洗牌算法，确保每次抽取都是均匀随机
    function shuffleArray<T>(arr: T[]): T[] {
      const result = [...arr]
      for (let i = result.length - 1; i > 0; i--) {
        const j = getRandomIndex(i + 1)
        ;[result[i], result[j]] = [result[j], result[i]]
      }
      return result
    }

    // 从候选池中不重复抽取指定数量
    // 如果可用歌曲不够，抽完所有可用歌曲后返回实际数量
    function drawFromPool(pool: Song[], needCount: number): Song[] {
      if (pool.length === 0) return []

      // 筛选出从未被抽过的歌曲
      const newSongs = pool.filter(s => !drawHistory.has(s.id))

      if (newSongs.length >= needCount) {
        // 新歌曲足够，随机抽取指定数量
        const shuffled = shuffleArray(newSongs)
        return shuffled.slice(0, needCount)
      }

      if (newSongs.length > 0) {
        // 新歌曲不够但还有，全部返回（本轮抽取数量会少于请求数量）
        return shuffleArray(newSongs)
      }

      // 所有歌曲都抽过了，重置历史记录后重新抽取
      const shuffled = shuffleArray(pool)
      return shuffled.slice(0, needCount)
    }

    // 多库模式：使用选中的曲库抽取
    if (useMulti) {
      const { selectedPools, songs } = get()
      const poolsToUse: { id: string; name: string; songs: Song[] }[] = []

      // 收集选中的曲库
      for (const poolId of selectedPools) {
        if (poolId === 'main') {
          poolsToUse.push({ id: 'main', name: '主库', songs })
        } else {
          const pool = songPools.find(p => p.id === poolId)
          if (pool) poolsToUse.push({ id: pool.id, name: pool.name, songs: pool.songs })
        }
      }

      if (poolsToUse.length === 0) return

      const result: Song[] = []
      let historyReset = false

      if (multiDrawMode === 'perPool') {
        // 按库抽取：从每个选中的曲库中抽取指定数量
        for (const pool of poolsToUse) {
          const poolCount = perPoolDrawCounts[pool.id] || 1
          const filtered = getFilteredSongs(activeFilters, includePlusOnly, chartTypeFilter, genreFilter, pool.songs)

          // 检查是否所有歌曲都抽过了
          const newSongs = filtered.filter(s => !drawHistory.has(s.id))
          if (newSongs.length === 0 && filtered.length > 0) {
            historyReset = true // 标记需要重置历史
          }

          const drawn = drawFromPool(filtered, poolCount)
          result.push(...drawn)
        }
      } else {
        // 混合抽取：从所有选中曲库的合并歌曲中随机抽取
        const allSongs: Song[] = []
        for (const pool of poolsToUse) {
          const filtered = getFilteredSongs(activeFilters, includePlusOnly, chartTypeFilter, genreFilter, pool.songs)
          allSongs.push(...filtered)
        }

        const newSongs = allSongs.filter(s => !drawHistory.has(s.id))
        if (newSongs.length === 0 && allSongs.length > 0) {
          historyReset = true
        }

        const drawn = drawFromPool(allSongs, count)
        result.push(...drawn)
      }

      // 更新历史记录
      let finalHistory: Set<string>
      if (historyReset) {
        // 所有歌曲都抽过一轮，重置历史记录
        finalHistory = new Set(result.map(s => s.id))
      } else {
        finalHistory = new Set(drawHistory)
        for (const song of result) {
          finalHistory.add(song.id)
        }
      }

      // 限制历史记录大小
      if (finalHistory.size > maxHistorySize) {
        const arr = Array.from(finalHistory)
        finalHistory = new Set(arr.slice(arr.length - maxHistorySize))
      }

      set({ selectedSongs: result, selectedSong: result.length > 0 ? result[0] : null, drawKey: (get() as SongStore).drawKey + 1, drawHistory: finalHistory })

      if (typeof window !== 'undefined') {
        broadcastSyncEvent('draw', { songs: result })
      }
      return
    }

    // 单库模式
    const filteredSongs = getFilteredSongs(activeFilters, includePlusOnly, chartTypeFilter, genreFilter)
    if (filteredSongs.length === 0) return

    const result = drawFromPool(filteredSongs, count)

    // 更新历史记录
    let finalHistory: Set<string>
    const newSongs = filteredSongs.filter(s => !drawHistory.has(s.id))
    if (newSongs.length === 0 && filteredSongs.length > 0) {
      // 所有歌曲都抽过一轮，重置历史记录
      finalHistory = new Set(result.map(s => s.id))
    } else {
      finalHistory = new Set(drawHistory)
      for (const song of result) {
        finalHistory.add(song.id)
      }
    }

    if (finalHistory.size > maxHistorySize) {
      const arr = Array.from(finalHistory)
      finalHistory = new Set(arr.slice(arr.length - maxHistorySize))
    }

    set({ selectedSongs: result, selectedSong: result.length > 0 ? result[0] : null, drawKey: (get() as SongStore).drawKey + 1, drawHistory: finalHistory })

    if (typeof window !== 'undefined') {
      broadcastSyncEvent('draw', { songs: result })
    }
  },

  toggleFilter: (difficulty) => {
    const { activeFilters } = get()
    const newFilters = new Set(activeFilters)
    if (newFilters.has(difficulty)) {
      newFilters.delete(difficulty)
    } else {
      newFilters.add(difficulty)
    }
    set({ activeFilters: newFilters })
  },

  toggleChartTypeFilter: (chartType) => {
    const { chartTypeFilter } = get()
    // 如果只有一个被选中且点击的就是那个，不取消（至少保留一个）
    if (chartTypeFilter.size === 1 && chartTypeFilter.has(chartType)) return
    const newFilter = new Set(chartTypeFilter)
    if (newFilter.has(chartType)) {
      newFilter.delete(chartType)
    } else {
      newFilter.add(chartType)
    }
    set({ chartTypeFilter: newFilter })
  },

  setGenreFilter: (genre) => {
    set({ genreFilter: genre })
  },

  setLevelRange: (min, max) => {
    set({ minLevel: min, maxLevel: max })
  },

  setIncludePlusOnly: (include) => {
    set({ includePlusOnly: include })
  },

  resetLevelFilter: () => {
    set({ minLevel: '1', maxLevel: '15', includePlusOnly: false })
  },

  setDrawCount: (count) => {
    const { selectedPools } = get()
    // 如果已选数量超过新限制，裁剪掉多余的
    if (selectedPools.length > count) {
      set({ drawCount: count, selectedPools: selectedPools.slice(0, count) })
    } else {
      set({ drawCount: count })
    }
  },

  setIsDrawing: (isDrawing) => {
    set({ isDrawing })
  },

  clearSelectedSongs: () => {
    set({ selectedSongs: [], selectedSong: null })
  },

  importSongs: (newSongs: Song[]) => {
    // 导入的歌曲直接作为主库（覆盖现有主库）
    set((state) => {
      const next = { songs: newSongs, activePoolId: 'main' as const }
      if (typeof window !== 'undefined') {
        broadcastSyncEvent('import', { songs: newSongs })
        persistPools({ songs: newSongs, songPools: state.songPools })
      }
      return next
    })
  },

  importSongsFromAPI: async () => {
    try {
      const songs = await fetchMusicData()
      if (songs.length === 0) {
        return { success: false, count: 0, error: '未获取到歌曲数据' }
      }
      get().importSongs(songs)
      return { success: true, count: songs.length }
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取歌曲数据失败'
      return { success: false, count: 0, error: message }
    }
  },

  addSongPool: (name: string, songs: Song[]): string => {
    const { songPools, songs: mainSongs } = get()
    // 如果主库为空，直接作为主库
    if (mainSongs.length === 0) {
      set({ songs, activePoolId: 'main' })
      if (typeof window !== 'undefined') {
        persistPools({ songs, songPools })
      }
      return 'main'
    }
    const newPool: SongPool = {
      id: `pool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      songs
    }
    const newPools = [...songPools, newPool]
    set({ songPools: newPools })
    if (typeof window !== 'undefined') {
      persistPools({ songs: mainSongs, songPools: newPools })
    }
    return newPool.id
  },

  removeSongPool: (poolId) => {
    const { songPools, activePoolId, selectedPools, perPoolDrawCounts, songs: mainSongs } = get()
    const newPools = songPools.filter(p => p.id !== poolId)
    const newSelectedPools = selectedPools.filter(id => id !== poolId)
    const newPerPoolCounts = { ...perPoolDrawCounts }
    delete newPerPoolCounts[poolId]
    // 如果删除的是当前激活的曲库，切换回主库
    if (activePoolId === poolId) {
      set({ songPools: newPools, activePoolId: 'main', selectedPools: newSelectedPools, perPoolDrawCounts: newPerPoolCounts })
    } else {
      set({ songPools: newPools, selectedPools: newSelectedPools, perPoolDrawCounts: newPerPoolCounts })
    }
    persistSettings({ selectedPools: newSelectedPools, multiDrawMode: get().multiDrawMode, perPoolDrawCounts: newPerPoolCounts })
    if (typeof window !== 'undefined') {
      persistPools({ songs: mainSongs, songPools: newPools })
    }
  },

  setActivePoolId: (poolId) => {
    set({ activePoolId: poolId })
  },

  setDrawMode: (mode) => {
    set({ drawMode: mode })
    // 切换到多库模式时，清空已选曲库
    if (mode === 'multi') {
      set({ selectedPools: [] })
      persistSettings({ selectedPools: [], multiDrawMode: get().multiDrawMode, perPoolDrawCounts: get().perPoolDrawCounts })
    }
  },

  togglePoolSelection: (poolId: string) => {
    const { selectedPools, drawCount, multiDrawMode } = get()
    let newSelectedPools: string[]
    if (selectedPools.includes(poolId)) {
      newSelectedPools = selectedPools.filter(id => id !== poolId)
    } else {
      // 按库抽取时限制最多选择 drawCount 个曲库；混合抽取无限制
      if (multiDrawMode === 'perPool' && selectedPools.length >= drawCount) return
      newSelectedPools = [...selectedPools, poolId]
    }
    set({ selectedPools: newSelectedPools })
    persistSettings({ selectedPools: newSelectedPools, multiDrawMode: get().multiDrawMode, perPoolDrawCounts: get().perPoolDrawCounts })
  },

  setMultiDrawMode: (mode: MultiDrawMode) => {
    set({ multiDrawMode: mode })
    persistSettings({ selectedPools: get().selectedPools, multiDrawMode: mode, perPoolDrawCounts: get().perPoolDrawCounts })
  },

  setPerPoolDrawCount: (poolId: string, count: number) => {
    const { perPoolDrawCounts, drawCount, selectedPools } = get()
    // 限制每个曲库的抽取数量不超过总抽取数量
    const validCount = Math.max(1, Math.min(count, drawCount))
    const newCounts = { ...perPoolDrawCounts, [poolId]: validCount }

    // 限制所有曲库的抽取总数不超过 drawCount
    const total = selectedPools.reduce((sum, pid) => sum + (newCounts[pid] || 1), 0)
    if (total > drawCount) {
      // 如果超出，不允许增加，保持原值
      return
    }

    set({ perPoolDrawCounts: newCounts })
    persistSettings({ selectedPools: get().selectedPools, multiDrawMode: get().multiDrawMode, perPoolDrawCounts: newCounts })
  },

  getDrawHistory: () => {
    return get().drawHistory
  },

  setPlayerSelections: (selections) => {
    set({ playerSelections: selections })
  },

  updatePlayerSelection: (playerId, song) => {
    const { playerSelections } = get()
    const newSelections = playerSelections.map(ps =>
      ps.playerId === playerId ? { ...ps, song } : ps
    )
    set({ playerSelections: newSelections })
  },

  addPlayer: (name) => {
    const { playerSelections } = get()
    const newPlayer: PlayerSelection = {
      playerId: `player-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      playerName: name,
      song: null,
    }
    set({ playerSelections: [...playerSelections, newPlayer] })
  },

  removePlayer: (playerId) => {
    const { playerSelections } = get()
    set({ playerSelections: playerSelections.filter(ps => ps.playerId !== playerId) })
  },

  renamePlayer: (playerId, name) => {
    const { playerSelections } = get()
    const newSelections = playerSelections.map(ps =>
      ps.playerId === playerId ? { ...ps, playerName: name } : ps
    )
    set({ playerSelections: newSelections })
  },

  setLevelValueRange: (min, max) => {
    set({ minLevelValue: Math.min(min, max), maxLevelValue: Math.max(min, max) })
  },

  toggleExcludedPool: (poolId) => {
    const { excludedPoolIds } = get()
    const newExcluded = excludedPoolIds.includes(poolId)
      ? excludedPoolIds.filter(id => id !== poolId)
      : [...excludedPoolIds, poolId]
    set({ excludedPoolIds: newExcluded })
  },
}))
