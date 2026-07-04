import { useState, useMemo, useRef, useEffect, memo, useCallback } from 'react'
import { useSongStore, type Song, type PlayerSelection, type Difficulty } from '@/store/songStore'
import { useTournamentStore, type TournamentStage, type StageSong, type TournamentPlayer } from '@/store/tournamentStore'
import { broadcastSyncEvent, subscribeSyncEvents } from '@/utils/tabSync'
import { useToast } from '@/components/Toast'
import { Search, Eye, Send, Disc3, UserPlus, UserMinus, Users, Check, SlidersHorizontal, Ban, Trophy, Shuffle, X, ChevronRight, Command, Database, QrCode, Smartphone, Zap, RotateCcw } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { cn } from '@/lib/utils'

// 分页大小
const PAGE_SIZE = 48

// 难度筛选配置
const DIFFICULTY_CONFIG: { value: Difficulty | 'ALL'; label: string; gradient: string; border: string }[] = [
  { value: 'ALL', label: '全部', gradient: 'from-gray-500 to-gray-600', border: 'border-gray-400/50' },
  { value: 'BASIC', label: 'BASIC', gradient: 'from-green-500 to-emerald-600', border: 'border-green-400/50' },
  { value: 'ADVANCED', label: 'ADV', gradient: 'from-yellow-500 to-amber-600', border: 'border-yellow-400/50' },
  { value: 'EXPERT', label: 'EXP', gradient: 'from-pink-500 to-rose-600', border: 'border-pink-400/50' },
  { value: 'MASTER', label: 'MST', gradient: 'from-purple-500 to-purple-700', border: 'border-purple-400/50' },
  { value: 'Re:MASTER', label: 'Re:', gradient: 'from-amber-400 to-orange-500', border: 'border-amber-400/50' },
  { value: 'UTAGE', label: 'UTG', gradient: 'from-cyan-500 to-blue-600', border: 'border-cyan-400/50' },
]

// 玩家颜色配置（用于多玩家模式标识）
const PLAYER_COLORS = [
  { bg: 'from-blue-500 to-blue-600', border: 'border-blue-400/50', text: 'text-blue-200', glow: 'rgba(59,130,246,0.3)' },
  { bg: 'from-green-500 to-green-600', border: 'border-green-400/50', text: 'text-green-200', glow: 'rgba(34,197,94,0.3)' },
  { bg: 'from-purple-500 to-purple-600', border: 'border-purple-400/50', text: 'text-purple-200', glow: 'rgba(139,92,246,0.3)' },
  { bg: 'from-amber-500 to-orange-500', border: 'border-amber-400/50', text: 'text-amber-200', glow: 'rgba(245,158,11,0.3)' },
  { bg: 'from-pink-500 to-rose-500', border: 'border-pink-400/50', text: 'text-pink-200', glow: 'rgba(236,72,153,0.3)' },
  { bg: 'from-cyan-500 to-teal-500', border: 'border-cyan-400/50', text: 'text-cyan-200', glow: 'rgba(6,182,212,0.3)' },
]

const SelectorSongCard = memo(({ song, isSelected, isFocused, onClick }: { song: Song; isSelected: boolean; isFocused?: boolean; onClick: () => void }) => {
  const getDiffColor = (diff: string) => {
    switch (diff) {
      case 'BASIC': return 'from-green-500/80 to-emerald-600/80 border-green-400/50'
      case 'ADVANCED': return 'from-yellow-500/80 to-amber-600/80 border-yellow-400/50'
      case 'EXPERT': return 'from-pink-500/80 to-rose-600/80 border-pink-400/50'
      case 'MASTER': return 'from-purple-500/80 to-purple-700/80 border-purple-400/50'
      case 'Re:MASTER': return 'from-amber-400/80 to-orange-500/80 border-amber-400/50'
      case 'UTAGE': return 'from-cyan-500/80 to-blue-600/80 border-cyan-400/50'
      default: return 'from-gray-500/80 to-gray-600/80 border-gray-400/50'
    }
  }

  return (
    <button
      onClick={onClick}
      className={`relative w-full text-left rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.02] hover-lift ${
        isSelected
          ? 'ring-2 ring-amber-400 shadow-[0_0_24px_rgba(250,204,21,0.3)] border border-amber-400/50'
          : isFocused
            ? 'ring-2 ring-white/40 border border-white/20 scale-[1.01] shadow-[0_0_16px_rgba(255,255,255,0.15)]'
            : 'border border-white/10 hover:border-white/25'
      }`}
      style={{ height: 340 }}
    >
      {/* Tiny top gradient bar - premium accent */}
      <div className="absolute top-[2px] left-[2px] right-[2px] h-[3px] rounded-t-[8px] bg-gradient-to-r from-cyan-400/80 via-violet-500/70 to-pink-500/80 z-20 pointer-events-none" />
      <img
        src={song.cover}
        alt={song.name}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Chart type badge */}
      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-black/50 backdrop-blur-sm text-[10px] font-bold text-white border border-white/10">
        {song.chartType === 'dx' ? 'DX' : 'STD'}
      </div>

      {/* Difficulty badge */}
      <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[10px] font-bold text-white bg-gradient-to-b ${getDiffColor(song.difficulty)}`}>
        {song.difficulty}
      </div>

      {/* Level badge */}
      <div className="absolute top-8 left-2 px-2 py-0.5 rounded-lg text-[10px] font-bold text-white bg-black/50 backdrop-blur-sm border border-white/10">
        Lv.{song.level}{song.isPlus ? '+' : ''}
      </div>

      {/* Title */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-white text-sm font-bold leading-tight line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {song.name}
        </p>
        <p className="text-white/50 text-[10px] mt-1 truncate">
          {song.author}
        </p>
      </div>

      {/* Selected overlay */}
      {isSelected && (
        <div className="absolute inset-0 bg-amber-400/10 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-amber-400/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <Eye size={20} className="text-amber-900" />
          </div>
        </div>
      )}
      {/* Keyboard focus hint */}
      {isFocused && !isSelected && (
        <div className="absolute bottom-14 right-2 z-20 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/60 text-white/60 text-[9px] font-mono">
          <Command size={8} />
          <span>↵</span>
        </div>
      )}
    </button>
  )
})

SelectorSongCard.displayName = 'SelectorSongCard'

interface SongSelectorProps {
  onSwitchPage?: (target: 'home' | 'selector') => void
  initialMultiMode?: boolean
  initialPlayerName?: string | null
}

export default function SongSelector({ onSwitchPage, initialMultiMode = false, initialPlayerName = null }: SongSelectorProps) {
  const songs = useSongStore((state) => state.songs)
  const songPools = useSongStore((state) => state.songPools)
  const activePoolId = useSongStore((state) => state.activePoolId)
  const setActivePoolId = useSongStore((state) => state.setActivePoolId)
  const mainSongCount = useSongStore((state) => state.songs.length)
  const playerSelections = useSongStore((state) => state.playerSelections)
  const addPlayer = useSongStore((state) => state.addPlayer)
  const removePlayer = useSongStore((state) => state.removePlayer)
  const updatePlayerSelection = useSongStore((state) => state.updatePlayerSelection)
  const setPlayerSelections = useSongStore((state) => state.setPlayerSelections)
  const drawSongs = useSongStore((state) => state.drawSongs)
  const clearSelectedSongs = useSongStore((state) => state.clearSelectedSongs)
  const gachaSelectedSongs = useSongStore((state) => state.selectedSongs)

  const { showToast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
  const loaderRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)

  // 多玩家模式
  const [multiMode, setMultiMode] = useState(false)
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null)
  const [sentToOBS, setSentToOBS] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  // 半决赛/决赛生成的 2+2 用曲（生成后暂存，点击同步到 OBS 才发送）
  // self 歌曲额外记录玩家名，random 歌曲用 label 展示
  const [semiFinalSongs, setSemiFinalSongs] = useState<
    { song: Song; label: string; playerName?: string; playerId?: string }[] | null
  >(null)

  // 终端模式：通过 URL 的 multiplayer=1 进入的移动端选曲界面
  const [isTerminalMode] = useState(() => {
    if (typeof window === 'undefined') return false
    const params = new URLSearchParams(window.location.search)
    return params.get('multiplayer') === '1'
  })

  // 终端模式下未选择玩家时显示玩家选择器
  const [showPlayerPicker, setShowPlayerPicker] = useState(false)

  // 根据 URL 参数初始化多人模式
  useEffect(() => {
    if (initialMultiMode) {
      setMultiMode(true)
      // 如果 URL 里带了 player_name，则尝试在 playerSelections 中找到并激活
      if (initialPlayerName && playerSelections.length > 0) {
        const existing = playerSelections.find(p => p.playerName === initialPlayerName)
        if (existing) {
          setActivePlayerId(existing.playerId)
          return
        }
      }
      // 终端模式下没有匹配玩家时弹出玩家选择器
      if (isTerminalMode) {
        setShowPlayerPicker(true)
      }
      // 非终端模式下如果还没有任何玩家，添加一个占位
      else if (playerSelections.length === 0) {
        addPlayer(initialPlayerName || '玩家1')
      }
    }
  }, [initialMultiMode, initialPlayerName, isTerminalMode, playerSelections, addPlayer, setActivePlayerId, setMultiMode])

  // 单人模式选中的谱面列表（最多4张）
  const [singleSelectedSongs, setSingleSelectedSongs] = useState<Song[]>([])

  // 键盘导航状态
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [columnsCount, setColumnsCount] = useState(2) // 响应式列数

  // 难度快捷筛选
  const [quickDiffFilter, setQuickDiffFilter] = useState<Difficulty | 'ALL'>('ALL')

  // 版本筛选 & 谱师筛选
  const aliases = useSongStore((state) => state.aliases)
  const versions = useSongStore((state) => state.versions)
  const [versionFilter, setVersionFilter] = useState<number | 'ALL'>('ALL')
  const [designerFilter, setDesignerFilter] = useState('')

  // Tournament sync target
  const tournamentCurrentStage = useTournamentStore((state) => state.currentStage)
  const tournamentStages = useTournamentStore((state) => state.stages)
  const isTournamentStarted = useTournamentStore((state) => state.isTournamentStarted)
  const getStagePlayers = useTournamentStore((state) => state.getStagePlayers)
  const [sendTargetStage, setSendTargetStage] = useState<TournamentStage | ''>('')
  const [sendTargetGroup, setSendTargetGroup] = useState<string>('')
  const [showTournamentSync, setShowTournamentSync] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)

  // Header 折叠：滚动自动折叠，可手动展开；终端模式下默认折叠以留出更多空间给谱面网格
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(isTerminalMode)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop
      // 使用滞后阈值避免在边界处反复跳变
      setIsHeaderCollapsed((prev) => {
        if (!prev && scrollY > 120) return true
        if (prev && scrollY < 40) return false
        return prev
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // 筛选面板
  const [showFilters, setShowFilters] = useState(false)
  const minLevelValue = useSongStore((state) => state.minLevelValue)
  const maxLevelValue = useSongStore((state) => state.maxLevelValue)
  const setLevelValueRange = useSongStore((state) => state.setLevelValueRange)
  const excludedPoolIds = useSongStore((state) => state.excludedPoolIds)
  const toggleExcludedPool = useSongStore((state) => state.toggleExcludedPool)

  // 根据 activePoolId 获取当前激活曲库的谱面（排除已排除的曲库）
  const activeSongs = useMemo(() => {
    let source: Song[]
    if (activePoolId === 'all') {
      // 合并主库和所有额外曲库
      source = [...songs]
      for (const pool of songPools) {
        source.push(...pool.songs)
      }
    } else if (activePoolId === 'main') {
      source = songs
    } else {
      const pool = songPools.find(p => p.id === activePoolId)
      source = pool?.songs || songs
    }
    // 排除曲库：过滤掉属于被排除曲库的谱面
    if (excludedPoolIds.length > 0) {
      const excludedSongs = new Set<string>()
      for (const poolId of excludedPoolIds) {
        if (poolId === 'main') {
          for (const s of songs) excludedSongs.add(s.id)
        } else {
          const pool = songPools.find(p => p.id === poolId)
          if (pool) {
            for (const s of pool.songs) excludedSongs.add(s.id)
          }
        }
      }
      source = source.filter(s => !excludedSongs.has(s.id))
    }
    return source
  }, [songs, songPools, activePoolId, excludedPoolIds])

  // 搜索过滤 + 难度快捷筛选 + 拟合定数过滤 + 版本/谱师筛选
  const filteredSongs = useMemo(() => {
    let result = activeSongs
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(song => {
        // 名称、作者、分类匹配
        if (
          song.name.toLowerCase().includes(query) ||
          song.author.toLowerCase().includes(query) ||
          song.genre.toLowerCase().includes(query)
        ) return true
        // 别名匹配
        const songAliases = aliases[song.songId]
        if (songAliases && songAliases.some(a => a.toLowerCase().includes(query))) return true
        return false
      })
    }
    // 难度快捷筛选
    if (quickDiffFilter !== 'ALL') {
      result = result.filter(song => song.difficulty === quickDiffFilter)
    }
    // 版本筛选
    if (versionFilter !== 'ALL') {
      result = result.filter(song => song.version === versionFilter)
    }
    // 谱师筛选
    if (designerFilter.trim()) {
      const q = designerFilter.trim().toLowerCase()
      result = result.filter(song => song.difficultyAuthor.toLowerCase().includes(q))
    }
    // 拟合定数过滤
    result = result.filter(song =>
      song.levelValue >= minLevelValue && song.levelValue <= maxLevelValue
    )
    return result
  }, [activeSongs, searchQuery, quickDiffFilter, minLevelValue, maxLevelValue, aliases, versionFilter, designerFilter])

  // 分页展示
  const visibleSongs = useMemo(
    () => filteredSongs.slice(0, displayCount),
    [filteredSongs, displayCount]
  )

  const hasMore = visibleSongs.length < filteredSongs.length

  // IntersectionObserver 自动加载更多
  useEffect(() => {
    const loader = loaderRef.current
    if (!loader || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDisplayCount((prev) => prev + PAGE_SIZE)
        }
      },
      { rootMargin: '300px' }
    )
    observer.observe(loader)
    return () => observer.disconnect()
  }, [hasMore, visibleSongs.length])

  // 切换曲库或搜索时重置分页
  useEffect(() => {
    setDisplayCount(PAGE_SIZE)
    setFocusedIndex(-1)
  }, [activePoolId, searchQuery, minLevelValue, maxLevelValue, quickDiffFilter])

  // 计算网格列数（用于键盘导航）
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth
      if (width >= 1280) setColumnsCount(6)
      else if (width >= 1024) setColumnsCount(5)
      else if (width >= 768) setColumnsCount(4)
      else if (width >= 640) setColumnsCount(3)
      else setColumnsCount(2)
    }
    updateColumns()
    window.addEventListener('resize', updateColumns)
    return () => window.removeEventListener('resize', updateColumns)
  }, [])

  // 判断某张谱面是否被当前激活玩家选中
  const isSongSelectedByActivePlayer = (song: Song) => {
    if (multiMode) {
      if (!activePlayerId) return false
      const ps = playerSelections.find(p => p.playerId === activePlayerId)
      return ps?.song?.id === song.id
    }
    // 单人模式
    return singleSelectedSongs.some(s => s.id === song.id)
  }

  // 判断某张谱面是否被任何玩家选中（用于展示其他玩家已选的标记）
  const getSongSelectedByOtherPlayer = (song: Song): string | null => {
    if (!multiMode) return null
    const ps = playerSelections.find(p => p.playerId !== activePlayerId && p.song?.id === song.id)
    return ps ? ps.playerName : null
  }

  const handleSelectSong = (song: Song) => {
    if (multiMode && activePlayerId) {
      updatePlayerSelection(activePlayerId, song)
      setSentToOBS(false)
    } else {
      // 单人模式：切换选中/取消选中，最多4张
      setSentToOBS(false)
      setSingleSelectedSongs(prev => {
        const exists = prev.find(s => s.id === song.id)
        if (exists) {
          return prev.filter(s => s.id !== song.id)
        }
        if (prev.length >= 4) {
          return prev // 已达上限，不再添加
        }
        return [...prev, song]
      })
    }
  }

  // 保持 ref 指向最新的 handleSelectSong，避免键盘监听 useEffect 闭包过期
  const handleSelectSongRef = useRef(handleSelectSong)
  handleSelectSongRef.current = handleSelectSong

  // 弹窗 Escape 关闭
  useEffect(() => {
    if (!showPlayerPicker) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPlayerPicker(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showPlayerPicker])

  const handleAddPlayer = () => {
    const name = newPlayerName.trim() || `玩家${playerSelections.length + 1}`
    addPlayer(name)
    setNewPlayerName('')
  }

  const handleSendToOBS = () => {
    const targetStage = sendTargetStage || tournamentCurrentStage

    // 半决赛/决赛：如果已生成 2+2，使用多玩家风格同步到 OBSDisplay
    // 自选歌曲显示对应玩家名，随机歌曲显示“随机1/随机2”
    if (semiFinalSongs && targetStage && ['semi', 'final'].includes(targetStage)) {
      broadcastSyncEvent('multiSelect', {
        songs: semiFinalSongs.map(s => ({
          playerId: s.playerId || `semi-${s.label}`,
          playerName: s.playerName || s.label,
          song: s.song,
          label: s.label,
        })),
      })
      setSentToOBS(true)
      return
    }

    const selections = playerSelections.filter(ps => ps.song !== null)
    if (selections.length === 0) return

    // 2 人选曲时标记为自选1/自选2，便于 OBS 后续插入随机曲（自选1/随机1/自选2/随机2）
    const songsPayload = selections.length === 2
      ? selections.map((ps, idx) => ({
          playerId: ps.playerId,
          playerName: ps.playerName,
          song: ps.song,
          label: `自选${idx + 1}`,
        }))
      : selections.map(ps => ({
          playerId: ps.playerId,
          playerName: ps.playerName,
          song: ps.song,
        }))

    broadcastSyncEvent('multiSelect', { songs: songsPayload })
    setSentToOBS(true)
  }

  const isRandomLabel = (label?: string) => label === '随机1' || label === '随机2'

  // 将 2+2 用曲按 自选1/随机1/自选2/随机2 排序
  const sortStageSongs = (songs: StageSong[]): StageSong[] => {
    const order = ['自选1', '随机1', '自选2', '随机2']
    return [...songs].sort((a, b) => {
      const idxA = order.indexOf(a.label)
      const idxB = order.indexOf(b.label)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return 0
    })
  }

  const handleSendToTournament = (sourceSongs: Song[]) => {
    if (sourceSongs.length === 0) return
    const targetStage = sendTargetStage || tournamentCurrentStage
    if (!targetStage) return

    const store = useTournamentStore.getState()
    const stageData = store.stages[targetStage]
    const groups = stageData?.groups || []
    const groupId = sendTargetGroup && groups.some((g) => g.id === sendTargetGroup)
      ? sendTargetGroup
      : groups[0]?.id

    const payloadSongs = sourceSongs.map((song, idx) => ({
      song,
      label: `自选${idx + 1}`,
    }))
    const newSelfSongs: StageSong[] = payloadSongs.map((s, idx) => ({
      id: `selector-song-${Date.now()}-${idx}`,
      song: s.song,
      label: s.label,
    }))

    if (groupId && stageData?.groups?.length > 0) {
      const group = stageData.groups.find(g => g.id === groupId)
      const existingRandom = (group?.songs || []).filter(s => isRandomLabel(s.label))
      const merged = sortStageSongs([...newSelfSongs, ...existingRandom])
      store.setGroupSongs(targetStage, groupId, merged)
    } else {
      const existingRandom = (stageData?.songs || []).filter(s => isRandomLabel(s.label))
      const merged = sortStageSongs([...newSelfSongs, ...existingRandom])
      store.setStageSongs(targetStage, merged)
    }

    broadcastSyncEvent('stageSongs', {
      stage: targetStage,
      groupId,
      songs: payloadSongs,
    })
  }

  // 多人模式：把每位玩家的选曲按所在分组自动分配（避免全部堆到第一个分组）
  // 同步时保留已有随机曲，并按 自选1/随机1/自选2/随机2 排序
  const handleSendPlayersToTournament = useCallback(() => {
    const targetStage = sendTargetStage || tournamentCurrentStage
    if (!targetStage) return

    const store = useTournamentStore.getState()
    const stageData = store.stages[targetStage]
    if (!stageData) return

    const activeSelections = playerSelections.filter(ps => ps.song)
    if (activeSelections.length === 0) return

    if (stageData.groups.length > 0) {
      const groupMap = new Map<string, StageSong[]>()
      const orphanSongs: StageSong[] = []

      activeSelections.forEach((ps) => {
        const group = stageData.groups.find(g =>
          g.playerIds.some(pid => {
            const p = stageData.players.find(pl => pl.id === pid)
            return p?.name === ps.playerName
          })
        )
        const stageSong: StageSong = {
          id: `selector-player-${Date.now()}-${ps.playerId}`,
          song: ps.song!,
          label: ps.playerName,
        }
        if (group) {
          const arr = groupMap.get(group.id) || []
          arr.push(stageSong)
          groupMap.set(group.id, arr)
        } else {
          orphanSongs.push(stageSong)
        }
      })

      groupMap.forEach((songs, groupId) => {
        // 保留该分组已有的随机曲
        const group = stageData.groups.find(g => g.id === groupId)
        const existingRandom = (group?.songs || []).filter(s => isRandomLabel(s.label))
        const merged = sortStageSongs([...songs, ...existingRandom])
        store.setGroupSongs(targetStage, groupId, merged)
        broadcastSyncEvent('stageSongs', {
          stage: targetStage,
          groupId,
          songs: merged.map(s => ({ song: s.song, label: s.label })),
        })
      })

      if (orphanSongs.length > 0) {
        const existingRandom = (stageData.songs || []).filter(s => isRandomLabel(s.label))
        const merged = sortStageSongs([...orphanSongs, ...existingRandom])
        store.setStageSongs(targetStage, merged)
        broadcastSyncEvent('stageSongs', {
          stage: targetStage,
          groupId: undefined,
          songs: merged.map(s => ({ song: s.song, label: s.label })),
        })
      }
    } else {
      const existingRandom = (stageData.songs || []).filter(s => isRandomLabel(s.label))
      const stageSongs: StageSong[] = activeSelections.map((ps, idx) => ({
        id: `selector-player-${Date.now()}-${idx}`,
        song: ps.song!,
        label: ps.playerName,
      }))
      const merged = sortStageSongs([...stageSongs, ...existingRandom])
      store.setStageSongs(targetStage, merged)
      broadcastSyncEvent('stageSongs', {
        stage: targetStage,
        groupId: stageData.groups[0]?.id,
        songs: merged.map(s => ({ song: s.song, label: s.label })),
      })
    }
  }, [playerSelections, sendTargetStage, tournamentCurrentStage])

  const handleClearSelections = () => {
    const cleared = playerSelections
      .filter((ps) => !ps.playerId.startsWith('__random-'))
      .map((ps) => ({ ...ps, song: null }))
    setPlayerSelections(cleared)
    setSemiFinalSongs(null)
    setSentToOBS(false)
    clearSelectedSongs()
  }

  // 随机从当前筛选结果中选一首
  const handleRandomPick = () => {
    if (filteredSongs.length === 0) return
    const randomSong = filteredSongs[Math.floor(Math.random() * filteredSongs.length)]
    handleSelectSong(randomSong)
  }

  // 从单人模式选中列表中随机挑选指定数量
  const handleRandomFill = (count: number) => {
    if (filteredSongs.length === 0) return
    const shuffled = [...filteredSongs].sort(() => Math.random() - 0.5)
    const picks = shuffled.slice(0, count)
    setSingleSelectedSongs(picks)
    setSentToOBS(false)
  }

  // 半决赛/决赛：在选曲页直接抽卡 2 首（不切页到抽卡模式）
  const handleDrawGachaForSemi = () => {
    drawSongs(2)
    showToast('已抽取 2 首随机谱面，点击"生成 2+2"', 'success')
  }

  // 半决赛/决赛：2 人各 1 首自选 + 随机 2 首，按 自选1/随机1/自选2/随机2 排列
  // 随机两首来自抽卡模式（useSongStore.selectedSongs）
  const handleGenerateSemiFinalSongs = () => {
    const targetStage = sendTargetStage || tournamentCurrentStage
    if (!targetStage) return

    // 多人模式：取 2 位已选曲的玩家作为自选；单人模式：取前 2 张已选谱面
    const activeSelections = multiMode
      ? playerSelections.filter(ps => ps.song).slice(0, 2)
      : singleSelectedSongs.slice(0, 2).map((song, idx) => ({
          playerId: `self-${idx}`,
          playerName: `自选${idx + 1}`,
          song,
        }))

    if (activeSelections.length < 2) {
      showToast('请先选择两首自选歌曲', 'info')
      return
    }

    // 从抽卡结果取最后两首作为随机歌曲
    const gachaSongs = useSongStore.getState().selectedSongs
    if (gachaSongs.length < 2) {
      showToast('请先在抽卡模式抽取两首随机歌曲', 'info')
      return
    }
    const randomSongs = gachaSongs.slice(-2)

    const selfSongs = activeSelections.map(ps => ps.song!)

    // 顺序：自选1 + 随机1 + 自选2 + 随机2
    const arranged = multiMode
      ? [
          { song: selfSongs[0], label: '自选1', playerName: activeSelections[0].playerName, playerId: activeSelections[0].playerId },
          { song: randomSongs[0], label: '随机1' },
          { song: selfSongs[1], label: '自选2', playerName: activeSelections[1].playerName, playerId: activeSelections[1].playerId },
          { song: randomSongs[1], label: '随机2' },
        ]
      : [
          { song: selfSongs[0], label: '自选1', playerName: '自选1', playerId: 'self-1' },
          { song: randomSongs[0], label: '随机1' },
          { song: selfSongs[1], label: '自选2', playerName: '自选2', playerId: 'self-2' },
          { song: randomSongs[1], label: '随机2' },
        ]

    const stageSongs: StageSong[] = arranged.map((s, idx) => ({
      id: `selector-semifinal-${Date.now()}-${idx}`,
      song: s.song,
      label: s.label,
    }))

    const store = useTournamentStore.getState()
    const stageData = store.stages[targetStage]
    const groups = stageData?.groups || []
    const groupId = sendTargetGroup && groups.some((g) => g.id === sendTargetGroup)
      ? sendTargetGroup
      : groups[0]?.id

    if (groupId && groups.length > 0) {
      store.setGroupSongs(targetStage, groupId, stageSongs)
    } else {
      store.setStageSongs(targetStage, stageSongs)
    }

    // 把随机1、随机2 也作为虚拟玩家选曲保存，便于裁判页/多设备同步
    const withoutRandom = playerSelections.filter((ps) => !ps.playerId.startsWith('__random-'))
    setPlayerSelections([
      ...withoutRandom,
      {
        playerId: '__random-1__',
        playerName: '随机1',
        song: randomSongs[0],
      },
      {
        playerId: '__random-2__',
        playerName: '随机2',
        song: randomSongs[1],
      },
    ])

    // 半决赛/决赛：仅写入本地赛事 store（tournament 快照会自动同步到其他设备）
    // 不广播 stageSongs，避免 OBS 提前展示；等点击"同步到OBS"后再发送
    showToast('已生成 2+2，点击"同步到OBS"后展示', 'success')

    // 暂存 2+2 结果，等点击“同步到 OBS”后再发送
    setSemiFinalSongs(arranged)
    setSentToOBS(false)
  }

  // ============= 赛事选手同步 & 多设备联动 =============

  // 1. 从当前赛事阶段同步选手到多玩家模式（支持按分组同步）
  const handleSyncPlayersFromTournament = useCallback((targetStage?: TournamentStage, targetGroupId?: string) => {
    const stage = targetStage || tournamentCurrentStage
    if (!stage) return

    let players: TournamentPlayer[] = []
    if (targetGroupId) {
      const store = useTournamentStore.getState()
      const stageData = store.stages[stage]
      const group = stageData?.groups.find(g => g.id === targetGroupId)
      if (group && stageData) {
        players = group.playerIds
          .map(pid => stageData.players.find(p => p.id === pid))
          .filter(Boolean) as TournamentPlayer[]
      }
    } else {
      players = getStagePlayers(stage)
    }

    if (players.length === 0) return

    // 清除旧的 playerSelections，用赛事选手替换
    const newSelections: PlayerSelection[] = players.map((player, idx) => ({
      playerId: `tournament-${stage}-${player.id || idx}`,
      playerName: player.name,
      song: null,
    }))
    setPlayerSelections(newSelections)
    setMultiMode(true)
    setActivePlayerId(newSelections[0]?.playerId || null)
    setSingleSelectedSongs([])

    // 广播到其他设备：告诉它们把这些玩家设置为当前多玩家模式
    broadcastSyncEvent('syncPlayers', {
      players: newSelections,
      sourceStage: stage,
    })
  }, [tournamentCurrentStage, getStagePlayers, setPlayerSelections])

  // 2. 多设备联动：接收其他设备的同步消息
  useEffect(() => {
    const unsubscribe = subscribeSyncEvents((event) => {
      // 其他设备从赛事同步了选手 -> 本地同步
      if (event.type === 'syncPlayers' && event.payload.players) {
        const players = event.payload.players as PlayerSelection[]
        setPlayerSelections(players)
        setMultiMode(true)
        if (players.length > 0 && !activePlayerId) {
          setActivePlayerId(players[0].playerId)
        }
        setSingleSelectedSongs([])
      }

      // 其他设备更新了玩家选曲 -> 本地同步
      if (event.type === 'playerSelections' && event.payload.selections) {
        const selections = event.payload.selections as PlayerSelection[]
        // 用传入的内容更新本地 playerSelections
        setPlayerSelections(selections)
        setSentToOBS(false)
      }
    })
    return unsubscribe
  }, [setPlayerSelections, activePlayerId])

  // 3. 当玩家选曲发生变化时，广播到其他设备
  const broadcastPlayerSelections = useCallback(() => {
    if (playerSelections.length === 0) return
    broadcastSyncEvent('playerSelections', {
      selections: playerSelections,
    })
  }, [playerSelections])

  // 当 playerSelections 变更时自动广播（避免自己发给自己的循环）
  const lastBroadcastRef = useRef<string>('')
  useEffect(() => {
    if (!multiMode) return
    const currentSnapshot = JSON.stringify(playerSelections)
    if (currentSnapshot === lastBroadcastRef.current) return
    lastBroadcastRef.current = currentSnapshot
    // 轻微延迟以避免频繁广播
    const timer = setTimeout(() => {
      broadcastPlayerSelections()
    }, 150)
    return () => clearTimeout(timer)
  }, [playerSelections, multiMode, broadcastPlayerSelections])

  // 构建曲库选项列表
  const poolOptions = useMemo(() => {
    const options: { id: string; label: string; count: number }[] = []
    if (songs.length > 0) {
      options.push({ id: 'main', label: '主库', count: songs.length })
    }
    for (const pool of songPools) {
      options.push({ id: pool.id, label: pool.name, count: pool.songs.length })
    }
    // 总曲库选项（只有当有多个曲库时才显示）
    const totalAvailable = options.reduce((sum, o) => sum + o.count, 0)
    if (options.length > 1) {
      options.unshift({ id: 'all', label: '全部曲库', count: totalAvailable })
    }
    return options
  }, [songs, songPools])

  // 多玩家模式下已选谱面数
  const selectedCount = playerSelections.filter(ps => ps.song !== null).length

  // 移动端扫码链接
  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}${window.location.pathname}?selector=1&multiplayer=1`
  }, [])

  // 键盘导航事件监听（在所有 handlers 定义之后）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (filteredSongs.length === 0) return
      const total = visibleSongs.length
      if (total === 0) return
      const target = e.target as HTMLElement
      // 跳过输入框内的按键
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        setFocusedIndex(prev => Math.min(prev + 1, total - 1))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setFocusedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex(prev => Math.min(prev + columnsCount, total - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex(prev => Math.max(prev - columnsCount, 0))
      } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < total) {
        e.preventDefault()
        handleSelectSongRef.current(visibleSongs[focusedIndex])
      } else if (e.key === 'Escape') {
        setFocusedIndex(-1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filteredSongs, visibleSongs, focusedIndex, columnsCount])

  return (
    <div className="min-h-screen flex flex-col page-enter">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/10 transition-all duration-300">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500" />
        <div className={`relative z-10 max-w-7xl mx-auto px-4 transition-all duration-300 ${isHeaderCollapsed ? 'py-2' : 'py-4'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="title-gradient text-xl sm:text-2xl drop-shadow-lg animate-enter">
                  {isTerminalMode ? '选手选曲终端' : '指定谱面'}
                </h1>
                <div className="font-rajdhani text-[11px] sm:text-xs tracking-[0.3em] uppercase text-white/40 mt-1">
                  {isTerminalMode ? 'MOBILE SELECTOR · 移动端选曲' : 'SELECT YOUR CHARTS · 指定选曲'}
                </div>
              </div>
              {/* 曲库选择器 */}
              <div className="relative flex items-center">
                <Database size={12} className="absolute left-3 text-yellow-400 pointer-events-none" />
                <select
                  value={activePoolId}
                  onChange={(e) => setActivePoolId(e.target.value)}
                  disabled={poolOptions.length <= 1}
                  className={`input-glass appearance-none pl-8 pr-8 py-1.5 text-xs w-auto ${
                    poolOptions.length <= 1 ? 'cursor-default opacity-60' : 'cursor-pointer hover:bg-white/10 hover:text-white hover:border-white/20'
                  }`}
                  title="选择曲库"
                >
                  {poolOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label} ({option.count} 张)
                    </option>
                  ))}
                </select>
                {poolOptions.length > 1 && (
                  <ChevronRight size={10} className="absolute right-3 text-white/40 rotate-90 pointer-events-none" />
                )}
                <span className="ml-2 text-white/40 text-xs font-rajdhani hidden sm:inline">
                  {filteredSongs.length} / {activeSongs.length} 张
                </span>
              </div>
            </div>
            {!isTerminalMode && (
              <button
                onClick={() => onSwitchPage?.('home')}
                className="btn-secondary press-down"
              >
                返回抽卡
              </button>
            )}
          </div>

          {/* 模式切换 */}
          {!isTerminalMode && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button
              onClick={() => {
                setMultiMode(false)
                setActivePlayerId(null)
              }}
              className={!multiMode ? 'tab-item-active press-down' : 'tab-item press-down'}
            >
              非玩家模式
            </button>
            <button
              onClick={() => {
                setMultiMode(true)
                if (playerSelections.length === 0) {
                  addPlayer('玩家1')
                }
                setActivePlayerId(playerSelections[0]?.playerId || null)
                setSingleSelectedSongs([])
              }}
              className={multiMode ? 'tab-item-active press-down' : 'tab-item press-down'}
            >
              <Users size={14} className="inline mr-1" />
              玩家名模式
            </button>

            {/* 从赛事同步选手 */}
            {isTournamentStarted && (
              <div className="relative ml-2">
                <button
                  onClick={() => setShowTournamentSync(!showTournamentSync)}
                  className="btn-primary press-down btn-shimmer"
                >
                  <Zap size={14} />
                  <span className="hidden sm:inline">从赛事同步</span>
                  <span className="sm:hidden">赛事</span>
                </button>

                {/* 赛事阶段下拉 */}
                {showTournamentSync && (
                  <div className="absolute top-full left-0 mt-2 w-64 rounded-2xl bg-[#0b0c15] border border-white/10 shadow-2xl z-[100] overflow-hidden">
                    <div className="p-2 border-b border-white/10">
                      <p className="text-white/40 text-[10px] font-rajdhani uppercase tracking-wider">同步到选手</p>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {(['n216', '16to8', '8to4', 'semi', 'final'] as TournamentStage[]).map((stage) => {
                        const players = getStagePlayers(stage)
                        if (players.length === 0) return null
                        const stageData = tournamentStages[stage]
                        const groups = stageData?.groups || []
                        const hasGroups = groups.length > 0
                        const stageName = { n216: 'N进16', '16to8': '16进8', '8to4': '8进4', semi: '半决赛', final: '决赛' }[stage]
                        const isCurrent = stage === tournamentCurrentStage
                        return (
                          <div key={stage} className="border-b border-white/10 last:border-b-0">
                            <button
                              onClick={() => {
                                handleSyncPlayersFromTournament(stage)
                                setShowTournamentSync(false)
                              }}
                              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-white/5 transition-all duration-150 press-down"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {isCurrent ? (
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-white/20 flex-shrink-0" />
                                )}
                                <span className="text-sm font-rajdhani text-white truncate">{stageName}</span>
                                {hasGroups && <span className="text-[10px] text-white/40">全部</span>}
                                {isCurrent && (
                                  <span className="badge-success">当前</span>
                                )}
                              </div>
                              <span className="text-white/40 text-[11px] font-mono flex-shrink-0">{players.length} 人</span>
                            </button>

                            {hasGroups && (
                              <div className="pb-1">
                                {groups.map((g) => {
                                  const groupPlayers = g.playerIds
                                    .map(pid => stageData.players.find(p => p.id === pid))
                                    .filter(Boolean)
                                  return (
                                    <button
                                      key={g.id}
                                      onClick={() => {
                                        handleSyncPlayersFromTournament(stage, g.id)
                                        setShowTournamentSync(false)
                                      }}
                                      className="w-full flex items-center justify-between gap-2 pl-8 pr-3 py-2 text-left hover:bg-white/5 transition-all duration-150 press-down"
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white/30 flex-shrink-0" />
                                        <span className="text-xs font-rajdhani text-white/70 truncate">{g.name}</span>
                                      </div>
                                      <span className="text-white/40 text-[11px] font-mono flex-shrink-0">{groupPlayers.length} 人</span>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 扫码链接按钮（多玩家模式下显示） */}
            {multiMode && playerSelections.length > 0 && (
              <button
                onClick={() => {
                  if (isHeaderCollapsed) setIsHeaderCollapsed(false)
                  setShowQRCode(!showQRCode)
                }}
                className="btn-secondary press-down"
                title="生成移动端扫码链接"
              >
                <QrCode size={14} />
                <span className="hidden md:inline">扫码</span>
              </button>
            )}
          </div>
          )}

          {/* 可折叠扩展区域 */}
          {!isHeaderCollapsed && (
            <>
              {/* 扫码链接弹窗 */}
              {!isTerminalMode && showQRCode && multiMode && (
            <div className="mb-4 p-4 rounded-3xl glass-panel border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-bold text-sm font-rajdhani flex items-center gap-2">
                  <Smartphone size={14} className="text-emerald-400" />
                  移动端扫码联动
                </h3>
                <button
                  onClick={() => setShowQRCode(false)}
                  className="text-white/40 hover:text-white transition-colors press-down"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 p-3 rounded-2xl bg-white">
                  {shareUrl ? (
                    <QRCodeSVG value={shareUrl} size={160} level="M" includeMargin />
                  ) : (
                    <QrCode size={80} className="text-black" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/60 text-xs font-rajdhani mb-2">
                    在其他设备（手机/平板）浏览器打开下方链接：
                  </p>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="input-glass flex-1 text-xs font-mono"
                    />
                    <button
                      onClick={() => navigator.clipboard?.writeText(shareUrl)}
                      className="btn-primary text-xs px-3 py-2 press-down"
                    >
                      复制
                    </button>
                  </div>
                  <p className="text-emerald-300/80 text-[11px] font-rajdhani">
                    · 扫码后选择你的选手名字，即可独立选曲<br/>
                    · 所有设备实时同步，选曲自动互通<br/>
                    · 建议设备连接同一 Wi-Fi 以保证稳定
                  </p>
                </div>
              </div>
            </div>
          )}


          {/* Search bar + filter toggle + collapse button */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索谱面名称、别名、作者或流派..."
                className="input-glass pl-10"
              />
            </div>
            <button
              onClick={() => {
                if (isHeaderCollapsed) setIsHeaderCollapsed(false)
                setShowFilters(!showFilters)
              }}
              className={showFilters ? 'tab-item-active press-down' : 'tab-item press-down'}
            >
              <SlidersHorizontal size={16} />
              筛选
            </button>
            <button
              onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
              className="tab-item press-down"
              title={isHeaderCollapsed ? '展开' : '折叠'}
            >
              <ChevronRight
                size={16}
                className={`transition-transform duration-300 ${isHeaderCollapsed ? 'rotate-90' : '-rotate-90'}`}
              />
            </button>
          </div>

          {/* 筛选面板 */}
          {showFilters && (
            <div className="mb-4 p-4 rounded-3xl glass-panel border border-white/10 space-y-4">
              {/* 版本筛选 + 谱师筛选 */}
              <div className="flex flex-wrap items-center gap-3">
                {versions.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-white/60 font-rajdhani font-bold text-xs whitespace-nowrap">版本</span>
                    <select
                      value={versionFilter}
                      onChange={(e) => setVersionFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                      className="input-glass text-xs font-rajdhani py-1.5 px-2 rounded-lg min-w-[120px]"
                    >
                      <option value="ALL">全部版本</option>
                      {versions.map(v => (
                        <option key={v.version} value={v.version}>{v.title}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                  <span className="text-white/60 font-rajdhani font-bold text-xs whitespace-nowrap">谱师</span>
                  <input
                    type="text"
                    value={designerFilter}
                    onChange={(e) => setDesignerFilter(e.target.value)}
                    placeholder="输入谱师名筛选"
                    className="input-glass text-xs font-rajdhani py-1.5 px-2 rounded-lg flex-1"
                  />
                  {designerFilter && (
                    <button
                      onClick={() => setDesignerFilter('')}
                      className="text-white/40 hover:text-white text-xs"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* 拟合定数范围 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white font-rajdhani font-bold text-sm">拟合定数范围</span>
                  <span className="text-amber-400 text-xs font-rajdhani">
                    {minLevelValue.toFixed(1)} - {maxLevelValue.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1.0"
                    max="15.5"
                    step="0.1"
                    value={minLevelValue}
                    onChange={(e) => setLevelValueRange(parseFloat(e.target.value), maxLevelValue)}
                    className="flex-1 accent-amber-400"
                  />
                  <input
                    type="range"
                    min="1.0"
                    max="15.5"
                    step="0.1"
                    value={maxLevelValue}
                    onChange={(e) => setLevelValueRange(minLevelValue, parseFloat(e.target.value))}
                    className="flex-1 accent-amber-400"
                  />
                </div>
                <div className="flex justify-between text-white/30 text-[10px] mt-1">
                  <span>1.0</span>
                  <span>15.5</span>
                </div>
              </div>

              {/* 排除曲库 */}
              {(songPools.length > 0 || mainSongCount > 0) && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Ban size={14} className="text-red-400" />
                    <span className="text-white font-rajdhani font-bold text-sm">排除曲库</span>
                    <span className="text-white/40 text-xs font-rajdhani">
                      选中后将从结果中排除该曲库的所有谱面
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {mainSongCount > 0 && (
                      <button
                        onClick={() => toggleExcludedPool('main')}
                        className={`px-3 py-1.5 rounded-lg font-rajdhani font-bold text-xs transition-all duration-200 border ${
                          excludedPoolIds.includes('main')
                            ? 'bg-red-500/20 text-red-300 border-red-500/30 line-through press-down'
                            : 'btn-secondary text-xs px-3 py-1.5'
                        }`}
                      >
                        主库 ({mainSongCount})
                      </button>
                    )}
                    {songPools.map((pool) => (
                      <button
                        key={pool.id}
                        onClick={() => toggleExcludedPool(pool.id)}
                        className={`px-3 py-1.5 rounded-lg font-rajdhani font-bold text-xs transition-all duration-200 border ${
                          excludedPoolIds.includes(pool.id)
                            ? 'bg-red-500/20 text-red-300 border-red-500/30 line-through press-down'
                            : 'btn-secondary text-xs px-3 py-1.5'
                        }`}
                      >
                        {pool.name} ({pool.songs.length})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 多人模式：玩家管理 */}
          {multiMode && (
            <div className="space-y-3">
              {/* 玩家列表 - 带颜色编码 + 移动端友好 */}
              <div className="flex flex-wrap items-center gap-2 stagger-children">
                {playerSelections.filter((ps) => !ps.playerId.startsWith('__random-')).map((ps, idx) => {
                  const colorIdx = idx % PLAYER_COLORS.length
                  const color = PLAYER_COLORS[colorIdx]
                  const isActive = activePlayerId === ps.playerId
                  return (
                    <div
                      key={ps.playerId}
                      onClick={() => setActivePlayerId(isActive ? null : ps.playerId)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all duration-200 border hover-lift ${
                        isActive
                          ? `${color.bg} text-white ${color.border} shadow-[0_2px_12px_${color.glow}] ring-1 ring-inset ring-white/10`
                          : ps.song
                            ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/30 hover:bg-emerald-500/15'
                            : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {/* 颜色编码小圆点 */}
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-white' : ps.song ? 'bg-green-400' : 'bg-white/30'}`}
                      />
                      <span className="font-rajdhani font-bold text-sm whitespace-nowrap max-w-[100px] truncate">{ps.playerName}</span>
                      {ps.song && <Check size={12} className="flex-shrink-0" />}
                      {/* 已选谱面标题（紧凑显示） */}
                      {ps.song && (
                        <span className="text-[10px] text-white/70 hidden lg:inline max-w-[160px] truncate">
                          · {ps.song.name}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removePlayer(ps.playerId)
                          if (activePlayerId === ps.playerId) {
                            const remaining = playerSelections.filter(p => p.playerId !== ps.playerId)
                            setActivePlayerId(remaining[0]?.playerId || null)
                          }
                        }}
                        className="ml-1 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors press-down"
                        title="移除玩家"
                      >
                        <UserMinus size={12} />
                      </button>
                    </div>
                  )
                })}

                {/* 添加玩家（仅非终端模式） */}
                {!isTerminalMode && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      placeholder="玩家名称"
                      className="input-glass w-24 px-3 py-1.5 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddPlayer()
                      }}
                    />
                    <button
                      onClick={handleAddPlayer}
                      className="btn-primary px-3 py-1.5 press-down"
                    >
                      <UserPlus size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* 当前激活玩家提示 - 移动端优化 */}
              {activePlayerId && (
                <div className="text-amber-200/80 text-xs font-rajdhani flex items-center gap-2 flex-wrap">
                  <span className="badge-warning">
                    当前：{playerSelections.find(p => p.playerId === activePlayerId)?.playerName}
                  </span>
                  <span className="text-white/50">· 点击谱面卡片即可分配选曲</span>
                  {isTerminalMode && (
                    <button
                      onClick={() => setShowPlayerPicker(true)}
                      className="text-cyan-300 hover:text-cyan-200 underline text-[11px]"
                    >
                      切换玩家
                    </button>
                  )}
                  {!isTerminalMode && <span className="hidden sm:inline text-white/30">· 点击其他玩家切换</span>}
                </div>
              )}

              {/* 发送按钮 */}
              {selectedCount > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-3xl glass-panel border border-white/10">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-bold flex items-center gap-2">
                      已选 <span className="text-amber-300">{selectedCount}/{playerSelections.length}</span> 人
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {playerSelections.filter(ps => ps.song).map((ps) => {
                        const colorIdx = playerSelections.indexOf(ps) % PLAYER_COLORS.length
                        const color = PLAYER_COLORS[colorIdx]
                        return (
                          <span
                            key={ps.playerId}
                            className={`text-[10px] px-2 py-0.5 rounded-full bg-white/5 border ${color.border} ${color.text}`}
                          >
                            {ps.playerName}: {ps.song!.name}
                          </span>
                        )
                      })}
                    </div>
                    {/* 半决赛/决赛：抽卡结果预览 */}
                    {gachaSelectedSongs.length > 0 &&
                      (sendTargetStage || tournamentCurrentStage) &&
                      ['semi', 'final'].includes((sendTargetStage || tournamentCurrentStage)!) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-400/50 text-amber-200">
                          随机:
                        </span>
                        {gachaSelectedSongs.slice(-2).map((s, i) => (
                          <span
                            key={`gacha-${i}`}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70"
                          >
                            随机{i + 1}: {s.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {!isTerminalMode && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={sendTargetStage}
                        onChange={(e) => {
                          setSendTargetStage(e.target.value as TournamentStage | '')
                          setSendTargetGroup('')
                        }}
                        className="input-glass px-2 py-1.5 text-xs w-auto"
                        title="赛事目标阶段"
                      >
                        <option value="">自动 ({tournamentCurrentStage || '无'})</option>
                        <option value="n216">N进16</option>
                        <option value="16to8">16进8</option>
                        <option value="8to4">8进4</option>
                        <option value="semi">半决赛</option>
                        <option value="final">决赛</option>
                      </select>

                      {(() => {
                        const targetStage = sendTargetStage || tournamentCurrentStage
                        const groups = targetStage ? tournamentStages[targetStage]?.groups || [] : []
                        return groups.length > 0 ? (
                          <select
                            value={sendTargetGroup}
                            onChange={(e) => setSendTargetGroup(e.target.value)}
                            className="input-glass px-2 py-1.5 text-xs w-auto"
                            title="目标分组"
                          >
                            <option value="">自动 ({groups[0]?.name})</option>
                            {groups.map((g) => (
                              <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                          </select>
                        ) : null
                      })()}

                      {/* 半决赛/决赛 2+2 流程：先选 2 首自选，再抽卡 2 首，最后生成 */}
                      {(sendTargetStage || tournamentCurrentStage) &&
                        ['semi', 'final'].includes((sendTargetStage || tournamentCurrentStage)!) && (
                        <button
                          onClick={handleDrawGachaForSemi}
                          title="抽卡模式抽取 2 首随机谱面"
                          className={cn(
                            'btn-secondary text-xs press-down',
                            gachaSelectedSongs.length >= 2 && 'badge-success cursor-default'
                          )}
                          disabled={gachaSelectedSongs.length >= 2}
                        >
                          <Shuffle size={14} />
                          <span>{gachaSelectedSongs.length >= 2 ? '随机已抽' : '抽卡x2'}</span>
                        </button>
                      )}

                      {/* 半决赛/决赛 2+2 生成（多人模式：2 人各 1 首自选） */}
                      {selectedCount >= 2 && gachaSelectedSongs.length >= 2 &&
                        (sendTargetStage || tournamentCurrentStage) &&
                        ['semi', 'final'].includes((sendTargetStage || tournamentCurrentStage)!) && (
                        <button
                          onClick={handleGenerateSemiFinalSongs}
                          title="生成自选1 + 随机1 + 自选2 + 随机2"
                          className="btn-primary press-down btn-shimmer"
                        >
                          <Shuffle size={14} />
                          <span>生成 2+2</span>
                        </button>
                      )}

                      <button
                        onClick={handleSendToOBS}
                        disabled={sentToOBS}
                        className={sentToOBS ? 'badge-success cursor-default press-down btn-shimmer' : 'btn-primary press-down btn-shimmer'}
                      >
                        <Send size={14} />
                        {sentToOBS ? '已同步' : '同步到OBS'}
                      </button>
                      <button
                        onClick={handleSendPlayersToTournament}
                        className="btn-secondary press-down"
                      >
                        <Trophy size={14} />
                        赛事
                      </button>
                      <button
                        onClick={handleClearSelections}
                        className="btn-secondary text-xs px-3 py-2 press-down"
                      >
                        <RotateCcw size={12} className="inline mr-1" />
                        清空
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
            </>
          )}
        </div>
      </header>

      {/* 终端模式：玩家选择器 */}
      {isTerminalMode && showPlayerPicker && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="player-picker-title"
        >
          <div className="relative w-full max-w-sm glass-panel rounded-3xl border border-white/10 p-6 animate-enter">
            <h2 id="player-picker-title" className="text-xl font-black text-white text-center mb-2">
              请选择你的选手名
            </h2>
            <p className="text-white/50 text-xs text-center mb-6 font-rajdhani">
              选择后仅可为该选手指定谱面
            </p>

            {playerSelections.filter(ps => !ps.playerId.startsWith('__random-')).length === 0 ? (
              <div className="text-center py-8">
                <Users size={48} className="mx-auto text-white/20 mb-3" />
                <p className="text-white/60 text-sm">等待赛事主机同步选手...</p>
                <p className="text-white/40 text-xs mt-2">主机同步后本页面会自动刷新</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {playerSelections
                  .filter(ps => !ps.playerId.startsWith('__random-'))
                  .map((ps, idx) => {
                    const color = PLAYER_COLORS[idx % PLAYER_COLORS.length]
                    return (
                      <button
                        key={ps.playerId}
                        onClick={() => {
                          setActivePlayerId(ps.playerId)
                          setShowPlayerPicker(false)
                          // 选择玩家后滚动到谱面网格，避免被长标题遮挡
                          requestAnimationFrame(() => {
                            mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          })
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-150 press-down ${
                          activePlayerId === ps.playerId
                            ? `${color.bg} text-white ${color.border} ring-1 ring-inset ring-white/10`
                            : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${activePlayerId === ps.playerId ? 'bg-white' : 'bg-white/30'}`} />
                        <span className="font-rajdhani font-bold text-base truncate">{ps.playerName}</span>
                        {ps.song && (
                          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 truncate max-w-[120px]">
                            已选: {ps.song.name}
                          </span>
                        )}
                      </button>
                    )
                  })}
              </div>
            )}

            {activePlayerId && (
              <button
                onClick={() => setShowPlayerPicker(false)}
                className="mt-4 w-full btn-secondary press-down"
              >
                取消
              </button>
            )}
          </div>
        </div>
      )}

      <main ref={mainRef} className="flex-1 px-4 py-4 max-w-7xl mx-auto w-full">
        {/* 曲库切换器 已移至 多曲库管理（MultiPoolImport）组件 */}

        {/* 难度快捷筛选 + 操作按钮栏 */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {/* 难度快捷筛选 */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {DIFFICULTY_CONFIG.map(({ value, label, gradient, border }) => {
              const isActive = quickDiffFilter === value
              return (
                <button
                  key={value}
                  onClick={() => setQuickDiffFilter(value)}
                  className={`px-2.5 py-1 rounded-lg font-orbitron font-black text-[10px] transition-all duration-150 border press-down ${
                    isActive
                      ? `bg-gradient-to-b ${gradient} ${border} shadow-md text-white`
                      : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/80'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* 右侧操作按钮 */}
          <div className="ml-auto flex items-center gap-2">
            {/* 随机选曲 */}
            <button
              onClick={handleRandomPick}
              disabled={filteredSongs.length === 0}
              title="随机选一首"
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30 press-down"
            >
              <Shuffle size={12} />
              <span>随机</span>
            </button>
            {/* 键盘导航提示 */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white/30 text-[10px] font-rajdhani">
              <span className="px-1 py-0.5 rounded bg-white/5 border border-white/10 font-mono">↑↓←→</span>
              <span>导航</span>
              <span className="px-1 py-0.5 rounded bg-white/5 border border-white/10 font-mono">↵</span>
              <span>选择</span>
            </div>
          </div>
        </div>

        {/* 谱面数量提示（已筛选时显示） */}
        {(searchQuery || quickDiffFilter !== 'ALL' || minLevelValue > 1 || maxLevelValue < 15.5) && (
          <div className="flex items-center gap-2 mb-3 text-xs font-rajdhani text-white/40">
            <span>
              {filteredSongs.length === activeSongs.length
                ? `共 ${activeSongs.length} 张谱面`
                : `筛选结果：${filteredSongs.length} 张（总计 ${activeSongs.length} 张）`
              }
            </span>
            <button
              onClick={() => { setSearchQuery(''); setQuickDiffFilter('ALL'); setLevelValueRange(1, 15.5) }}
              className="ml-2 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/40 hover:text-white/60 hover:border-white/20 transition-all press-down"
            >
              重置筛选
            </button>
          </div>
        )}

        {/* Song grid - 分页渲染 */}
        {filteredSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/50 animate-enter">
            <Disc3 size={64} className="mb-4 opacity-40" />
            <p className="font-rajdhani text-lg">
              {activeSongs.length === 0 ? '当前曲库为空，请先导入谱面' : '没有符合条件的谱面'}
            </p>
            {(searchQuery || quickDiffFilter !== 'ALL') && (
              <button
                onClick={() => { setSearchQuery(''); setQuickDiffFilter('ALL') }}
                className="mt-4 btn-secondary press-down"
              >
                清除筛选
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 card-grid" ref={gridRef}>
              {visibleSongs.map((song, index) => {
                const isSelected = isSongSelectedByActivePlayer(song)
                const otherPlayer = getSongSelectedByOtherPlayer(song)
                return (
                  <div key={song.id} className="relative">
                    <SelectorSongCard
                      song={song}
                      isSelected={isSelected}
                      isFocused={index === focusedIndex}
                      onClick={() => handleSelectSong(song)}
                    />
                    {/* 其他玩家已选标记 */}
                    {otherPlayer && (
                      <div className="absolute top-1 right-1 z-10 px-2 py-0.5 rounded-full badge-error text-[10px]">
                        {otherPlayer}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 加载更多触发器 */}
            {hasMore && (
              <div ref={loaderRef} className="py-8 text-center">
                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl glass-panel border border-white/10 text-white/50 font-rajdhani font-bold text-sm">
                  <Disc3 size={18} className="animate-spin opacity-50" />
                  加载更多...
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* 浮动选择操作栏（单人模式选中时固定显示在底部） */}
      {!multiMode && singleSelectedSongs.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-white/10 px-4 py-3 shadow-[0_-8px_32px_rgba(0,0,0,0.4)]">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            {/* 已选谱面缩略图预览 */}
            <div className="flex items-center gap-2">
              {singleSelectedSongs.map((song) => (
                <div key={song.id} className="relative group">
                  <img
                    src={song.cover}
                    alt={song.name}
                    className="w-10 h-10 rounded-lg object-cover border border-white/10"
                  />
                  <button
                    onClick={() => handleSelectSong(song)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity press-down"
                  >
                    <X size={8} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold">
                已选 {singleSelectedSongs.length}/4
              </p>
              <p className="text-white/40 text-xs truncate font-rajdhani">
                {singleSelectedSongs.map(s => s.name).join(' · ')}
              </p>
              {/* 半决赛/决赛：抽卡结果预览 */}
              {gachaSelectedSongs.length > 0 &&
                (sendTargetStage || tournamentCurrentStage) &&
                ['semi', 'final'].includes((sendTargetStage || tournamentCurrentStage)!) && (
                <p className="text-amber-200/70 text-xs truncate font-rajdhani mt-0.5">
                  随机: {gachaSelectedSongs.slice(-2).map((s, i) => `随机${i + 1}: ${s.name}`).join(' · ')}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* 随机填满剩余槽位 */}
              {singleSelectedSongs.length < 4 && (
                <button
                  onClick={() => handleRandomFill(4)}
                  title="随机填满"
                  className="btn-secondary text-xs px-3 py-1.5 press-down"
                >
                  <Shuffle size={12} />
                  <span>随机填充</span>
                </button>
              )}

              {/* 半决赛/决赛：抽卡x2 + 生成 2+2 */}
              {(sendTargetStage || tournamentCurrentStage) &&
                ['semi', 'final'].includes((sendTargetStage || tournamentCurrentStage)!) && (
                <button
                  onClick={handleDrawGachaForSemi}
                  title="抽卡模式抽取 2 首随机谱面"
                  className={cn(
                    'btn-secondary text-xs px-3 py-1.5 press-down',
                    gachaSelectedSongs.length >= 2 && 'badge-success cursor-default'
                  )}
                  disabled={gachaSelectedSongs.length >= 2}
                >
                  <Shuffle size={12} />
                  <span>{gachaSelectedSongs.length >= 2 ? '随机已抽' : '抽卡x2'}</span>
                </button>
              )}

              {singleSelectedSongs.length === 2 && gachaSelectedSongs.length >= 2 &&
                (sendTargetStage || tournamentCurrentStage) &&
                ['semi', 'final'].includes((sendTargetStage || tournamentCurrentStage)!) && (
                <button
                  onClick={handleGenerateSemiFinalSongs}
                  title="生成自选2 + 随机2"
                  className="btn-primary text-xs px-3 py-1.5 press-down btn-shimmer"
                >
                  <Shuffle size={12} />
                  <span>生成 2+2</span>
                </button>
              )}

              {/* 赛事阶段选择 */}
              <select
                value={sendTargetStage}
                onChange={(e) => {
                  setSendTargetStage(e.target.value as TournamentStage | '')
                  setSendTargetGroup('')
                }}
                className="input-glass px-2 py-1.5 text-xs w-auto"
                title="赛事目标阶段"
              >
                <option value="">自动 ({tournamentCurrentStage || '无'})</option>
                <option value="n216">N进16</option>
                <option value="16to8">16进8</option>
                <option value="8to4">8进4</option>
                <option value="semi">半决赛</option>
                <option value="final">决赛</option>
              </select>

              {(() => {
                const targetStage = sendTargetStage || tournamentCurrentStage
                const groups = targetStage ? tournamentStages[targetStage]?.groups || [] : []
                return groups.length > 0 ? (
                  <select
                    value={sendTargetGroup}
                    onChange={(e) => setSendTargetGroup(e.target.value)}
                    className="input-glass px-2 py-1.5 text-xs w-auto"
                    title="目标分组"
                  >
                    <option value="">自动 ({groups[0]?.name})</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                ) : null
              })()}

              {/* 同步到OBS */}
              <button
                onClick={() => {
                  const targetStage = sendTargetStage || tournamentCurrentStage
                  if (semiFinalSongs && targetStage && ['semi', 'final'].includes(targetStage)) {
                    broadcastSyncEvent('multiSelect', {
                      songs: semiFinalSongs.map(s => ({
                        playerId: s.playerId || `semi-${s.label}`,
                        playerName: s.playerName || s.label,
                        song: s.song,
                        label: s.label,
                      })),
                    })
                  } else {
                    broadcastSyncEvent('select', { songs: singleSelectedSongs })
                  }
                  setSentToOBS(true)
                }}
                disabled={sentToOBS}
                className={sentToOBS ? 'badge-success cursor-default press-down btn-shimmer' : 'btn-primary press-down btn-shimmer'}
              >
                <Send size={14} />
                {sentToOBS ? '已同步' : '同步到OBS'}
              </button>

              {/* 发送到赛事 */}
              <button
                onClick={() => handleSendToTournament(singleSelectedSongs)}
                className="btn-secondary text-xs px-3 py-2 press-down"
              >
                <Trophy size={14} />
                赛事
              </button>

              {/* 清空 */}
              <button
                onClick={() => { setSingleSelectedSongs([]); setSemiFinalSongs(null); setSentToOBS(false) }}
                className="btn-secondary text-xs px-3 py-2 press-down"
              >
                <X size={14} className="inline mr-1" />
                清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
