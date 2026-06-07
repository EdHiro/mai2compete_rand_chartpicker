import { useState, useMemo, useRef, useEffect, memo } from 'react'
import { useSongStore, type Song, type PlayerSelection } from '@/store/songStore'
import { broadcastSyncEvent } from '@/utils/tabSync'
import { Search, Eye, Send, Disc3, UserPlus, UserMinus, Users, Check, SlidersHorizontal, Ban } from 'lucide-react'

// 分页大小
const PAGE_SIZE = 48

const SelectorSongCard = memo(({ song, isSelected, onClick }: { song: Song; isSelected: boolean; onClick: () => void }) => {
  const getDiffColor = (diff: string) => {
    switch (diff) {
      case 'BASIC': return 'from-green-500 to-emerald-600 border-green-400'
      case 'ADVANCED': return 'from-yellow-600 to-yellow-400 border-yellow-400'
      case 'EXPERT': return 'from-pink-500 to-red-600 border-red-400'
      case 'MASTER': return 'from-purple-600 to-purple-800 border-purple-400'
      case 'Re:MASTER': return 'from-purple-100 to-purple-500 border-purple-400'
      default: return 'from-gray-500 to-gray-600 border-gray-400'
    }
  }

  return (
    <button
      onClick={onClick}
      className={`relative w-full text-left rounded-xl overflow-hidden border-2 transition-all duration-200 hover:scale-[1.02] ${
        isSelected
          ? 'ring-2 ring-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)] border-yellow-400'
          : 'border-transparent hover:border-white/30'
      }`}
      style={{ height: 340 }}
    >
      <img
        src={song.cover}
        alt={song.name}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {/* Chart type badge */}
      <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/60 text-[10px] font-bold text-white border border-white/20">
        {song.chartType === 'dx' ? 'DX' : 'STD'}
      </div>

      {/* Difficulty badge */}
      <div className={`absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold text-white bg-gradient-to-b ${getDiffColor(song.difficulty)}`}>
        {song.difficulty}
      </div>

      {/* Level badge */}
      <div className="absolute top-8 left-2 px-2 py-0.5 rounded text-[10px] font-bold text-white bg-black/60 border border-white/20">
        Lv.{song.level}{song.isPlus ? '+' : ''}
      </div>

      {/* Title */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-white text-sm font-bold leading-tight line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {song.name}
        </p>
        <p className="text-white/60 text-[10px] mt-1 truncate">
          {song.author}
        </p>
      </div>

      {/* Selected overlay */}
      {isSelected && (
        <div className="absolute inset-0 bg-yellow-400/10 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg">
            <Eye size={20} className="text-yellow-900" />
          </div>
        </div>
      )}
    </button>
  )
})

SelectorSongCard.displayName = 'SelectorSongCard'

interface SongSelectorProps {
  onSwitchPage?: (target: 'home' | 'selector') => void
}

export default function SongSelector({ onSwitchPage }: SongSelectorProps) {
  const songs = useSongStore((state) => state.songs)
  const songPools = useSongStore((state) => state.songPools)
  const activePoolId = useSongStore((state) => state.activePoolId)
  const setActivePoolId = useSongStore((state) => state.setActivePoolId)
  const mainSongCount = useSongStore((state) => state.songs.length)
  const playerSelections = useSongStore((state) => state.playerSelections)
  const addPlayer = useSongStore((state) => state.addPlayer)
  const removePlayer = useSongStore((state) => state.removePlayer)
  const renamePlayer = useSongStore((state) => state.renamePlayer)
  const updatePlayerSelection = useSongStore((state) => state.updatePlayerSelection)
  const setPlayerSelections = useSongStore((state) => state.setPlayerSelections)

  const [searchQuery, setSearchQuery] = useState('')
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
  const loaderRef = useRef<HTMLDivElement>(null)

  // 多玩家模式
  const [multiMode, setMultiMode] = useState(false)
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null)
  const [sentToOBS, setSentToOBS] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')

  // 单人模式选中的谱面列表（最多4张）
  const [singleSelectedSongs, setSingleSelectedSongs] = useState<Song[]>([])

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

  // 搜索过滤 + 拟合定数过滤
  const filteredSongs = useMemo(() => {
    let result = activeSongs
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(song =>
        song.name.toLowerCase().includes(query) ||
        song.author.toLowerCase().includes(query) ||
        song.genre.toLowerCase().includes(query)
      )
    }
    // 拟合定数过滤
    result = result.filter(song =>
      song.levelValue >= minLevelValue && song.levelValue <= maxLevelValue
    )
    return result
  }, [activeSongs, searchQuery, minLevelValue, maxLevelValue])

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
  }, [activePoolId, searchQuery, minLevelValue, maxLevelValue])

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

  const handleAddPlayer = () => {
    const name = newPlayerName.trim() || `玩家${playerSelections.length + 1}`
    addPlayer(name)
    setNewPlayerName('')
  }

  const handleSendToOBS = () => {
    const selections = playerSelections.filter(ps => ps.song !== null)
    if (selections.length === 0) return
    broadcastSyncEvent('multiSelect', {
      songs: selections.map(ps => ({
        playerId: ps.playerId,
        playerName: ps.playerName,
        song: ps.song,
      }))
    })
    setSentToOBS(true)
  }

  const handleClearSelections = () => {
    const cleared = playerSelections.map(ps => ({ ...ps, song: null }))
    setPlayerSelections(cleared)
    setSentToOBS(false)
  }

  // 已选中的谱面数量
  const selectedCount = playerSelections.filter(ps => ps.song !== null).length

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-b from-blue-700 to-dark-bg border-b-4 border-blue-500 shadow-lg">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-pink-500" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-orbitron font-black text-xl sm:text-2xl text-white drop-shadow-lg">
              指定谱面
            </h1>
            <button
              onClick={() => onSwitchPage?.('home')}
              className="px-4 py-2 rounded-lg font-rajdhani font-bold text-sm text-white bg-gradient-to-b from-slate-600 to-slate-700 border-2 border-slate-400 hover:from-slate-500 hover:to-slate-600 transition-all duration-200"
            >
              返回抽卡
            </button>
          </div>

          {/* 模式切换 */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => {
                setMultiMode(false)
                setActivePlayerId(null)
              }}
              className={`px-4 py-2 rounded-lg font-rajdhani font-bold text-sm transition-all duration-200 border-2 ${
                !multiMode
                  ? 'bg-gradient-to-b from-blue-600 to-blue-700 text-white border-blue-400'
                  : 'bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-slate-600'
              }`}
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
              className={`px-4 py-2 rounded-lg font-rajdhani font-bold text-sm transition-all duration-200 border-2 ${
                multiMode
                  ? 'bg-gradient-to-b from-purple-600 to-purple-700 text-white border-purple-400'
                  : 'bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-slate-600'
              }`}
            >
              <Users size={14} className="inline mr-1" />
              玩家名模式
            </button>

            {/* 单人模式：选中谱面提示 + 同步按钮 */}
            {!multiMode && singleSelectedSongs.length > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-yellow-900/50 to-orange-900/50 border-2 border-yellow-500/50">
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold">
                    已选 {singleSelectedSongs.length}/4
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {singleSelectedSongs.map(s => (
                      <span key={s.id} className="text-[10px] px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-200 border border-yellow-500/30 truncate max-w-[120px]">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    broadcastSyncEvent('select', { songs: singleSelectedSongs })
                    setSentToOBS(true)
                  }}
                  disabled={sentToOBS}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-rajdhani font-bold text-sm transition-all duration-200 border-2 whitespace-nowrap ${
                    sentToOBS
                      ? 'bg-green-600 border-green-400 text-white'
                      : 'bg-gradient-to-b from-yellow-500 to-orange-600 border-yellow-300 text-white hover:from-yellow-400 hover:to-orange-500'
                  }`}
                >
                  <Send size={14} />
                  {sentToOBS ? '已同步' : '同步到OBS'}
                </button>
                <button
                  onClick={() => {
                    setSingleSelectedSongs([])
                    setSentToOBS(false)
                  }}
                  className="px-3 py-2 rounded-lg bg-slate-700 text-slate-300 border-2 border-slate-500 hover:bg-slate-600 transition-all duration-200 text-xs font-bold"
                >
                  清空
                </button>
              </div>
            )}
          </div>

          {/* Search bar + filter toggle */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索谱面名称、作者或流派..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 text-white border-2 border-slate-600 focus:border-blue-400 focus:outline-none font-rajdhani text-sm placeholder:text-slate-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-rajdhani font-bold text-sm transition-all duration-200 border-2 ${
                showFilters
                  ? 'bg-gradient-to-b from-blue-600 to-blue-700 text-white border-blue-400'
                  : 'bg-slate-800 text-slate-300 border-slate-600 hover:bg-slate-700'
              }`}
            >
              <SlidersHorizontal size={16} />
              筛选
            </button>
          </div>

          {/* 筛选面板 */}
          {showFilters && (
            <div className="mb-4 p-4 rounded-xl bg-slate-800/80 border-2 border-slate-600 space-y-4">
              {/* 拟合定数范围 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white font-rajdhani font-bold text-sm">拟合定数范围</span>
                  <span className="text-yellow-400 text-xs font-rajdhani">
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
                    className="flex-1 accent-yellow-400"
                  />
                  <input
                    type="range"
                    min="1.0"
                    max="15.5"
                    step="0.1"
                    value={maxLevelValue}
                    onChange={(e) => setLevelValueRange(minLevelValue, parseFloat(e.target.value))}
                    className="flex-1 accent-yellow-400"
                  />
                </div>
                <div className="flex justify-between text-slate-500 text-[10px] mt-1">
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
                    <span className="text-slate-400 text-xs font-rajdhani">
                      选中后将从结果中排除该曲库的所有谱面
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {mainSongCount > 0 && (
                      <button
                        onClick={() => toggleExcludedPool('main')}
                        className={`px-3 py-1.5 rounded-lg font-rajdhani font-bold text-xs transition-all duration-200 border-2 ${
                          excludedPoolIds.includes('main')
                            ? 'bg-red-600/50 text-red-200 border-red-400 line-through'
                            : 'bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-slate-600'
                        }`}
                      >
                        主库 ({mainSongCount})
                      </button>
                    )}
                    {songPools.map((pool) => (
                      <button
                        key={pool.id}
                        onClick={() => toggleExcludedPool(pool.id)}
                        className={`px-3 py-1.5 rounded-lg font-rajdhani font-bold text-xs transition-all duration-200 border-2 ${
                          excludedPoolIds.includes(pool.id)
                            ? 'bg-red-600/50 text-red-200 border-red-400 line-through'
                            : 'bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-slate-600'
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
              {/* 玩家列表 */}
              <div className="flex flex-wrap items-center gap-2">
                {playerSelections.map((ps) => (
                  <div
                    key={ps.playerId}
                    onClick={() => setActivePlayerId(activePlayerId === ps.playerId ? null : ps.playerId)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                      activePlayerId === ps.playerId
                        ? 'bg-gradient-to-b from-yellow-500 to-orange-600 text-white border-yellow-300'
                        : ps.song
                          ? 'bg-green-700/50 text-green-200 border-green-500'
                          : 'bg-slate-700/50 text-slate-300 border-slate-600 hover:bg-slate-600'
                    }`}
                  >
                    <span className="font-rajdhani font-bold text-sm">{ps.playerName}</span>
                    {ps.song && <Check size={14} />}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removePlayer(ps.playerId)
                        if (activePlayerId === ps.playerId) {
                          const remaining = playerSelections.filter(p => p.playerId !== ps.playerId)
                          setActivePlayerId(remaining[0]?.playerId || null)
                        }
                      }}
                      className="ml-1 text-white/60 hover:text-white"
                    >
                      <UserMinus size={12} />
                    </button>
                  </div>
                ))}

                {/* 添加玩家 */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder="玩家名称"
                    className="w-24 px-2 py-1.5 rounded-lg bg-slate-800 text-white border-2 border-slate-600 focus:border-blue-400 focus:outline-none font-rajdhani text-sm placeholder:text-slate-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddPlayer()
                    }}
                  />
                  <button
                    onClick={handleAddPlayer}
                    className="px-3 py-2 rounded-lg bg-gradient-to-b from-green-600 to-green-700 text-white border-2 border-green-400 hover:from-green-500 hover:to-green-600 transition-all duration-200"
                  >
                    <UserPlus size={14} />
                  </button>
                </div>
              </div>

              {/* 当前激活玩家提示 */}
              {activePlayerId && (
                <div className="text-yellow-200 text-xs font-rajdhani">
                  当前为 <span className="font-bold text-yellow-400">
                    {playerSelections.find(p => p.playerId === activePlayerId)?.playerName}
                  </span> 选曲，点击谱面卡片即可分配
                </div>
              )}

              {/* 发送按钮 */}
              {selectedCount > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-yellow-900/50 to-orange-900/50 border-2 border-yellow-500/50">
                  <div className="flex-1">
                    <p className="text-white text-sm font-bold">
                      已选 {selectedCount}/{playerSelections.length} 人
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {playerSelections.filter(ps => ps.song).map(ps => (
                        <span key={ps.playerId} className="text-[10px] px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-200 border border-yellow-500/30">
                          {ps.playerName}: {ps.song!.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleSendToOBS}
                    disabled={sentToOBS}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-rajdhani font-bold text-sm transition-all duration-200 border-2 ${
                      sentToOBS
                        ? 'bg-green-600 border-green-400 text-white'
                        : 'bg-gradient-to-b from-yellow-500 to-orange-600 border-yellow-300 text-white hover:from-yellow-400 hover:to-orange-500'
                    }`}
                  >
                    <Send size={14} />
                    {sentToOBS ? '已同步' : '同步到OBS'}
                  </button>
                  <button
                    onClick={handleClearSelections}
                    className="px-3 py-2 rounded-lg bg-slate-700 text-slate-300 border-2 border-slate-500 hover:bg-slate-600 transition-all duration-200 text-xs font-bold"
                  >
                    清空
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-4 max-w-7xl mx-auto w-full">
        {/* 曲库切换器 已移至 多曲库管理（MultiPoolImport）组件 */}

        {/* Song grid - 分页渲染 */}
        {filteredSongs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-white/70">
            <Disc3 size={64} className="mb-4 opacity-50" />
            <p className="font-rajdhani text-lg">
              {activeSongs.length === 0 ? '当前曲库为空，请先导入谱面' : '没有符合条件的谱面'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {visibleSongs.map((song) => {
                const isSelected = isSongSelectedByActivePlayer(song)
                const otherPlayer = getSongSelectedByOtherPlayer(song)
                return (
                  <div key={song.id} className="relative">
                    <SelectorSongCard
                      song={song}
                      isSelected={isSelected}
                      onClick={() => handleSelectSong(song)}
                    />
                    {/* 其他玩家已选标记 */}
                    {otherPlayer && (
                      <div className="absolute top-1 right-1 z-10 px-2 py-0.5 rounded bg-red-500 text-white text-[10px] font-bold">
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
                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 text-slate-300 font-rajdhani font-bold text-sm">
                  <Disc3 size={18} className="animate-spin opacity-50" />
                  加载更多...
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
