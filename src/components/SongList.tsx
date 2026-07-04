import { useMemo, useRef, useState, useEffect } from 'react'
import SongCard from './SongCard'
import { useSongStore } from '@/store/songStore'
import type { Difficulty } from '@/store/songStore'
import { Disc3, Layers, X, Filter, BarChart3, History } from 'lucide-react'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 30

const DIFFICULTY_META: Record<Difficulty, { short: string; dot: string; text: string }> = {
  BASIC: { short: 'BSC', dot: 'bg-emerald-400', text: 'text-emerald-300' },
  ADVANCED: { short: 'ADV', dot: 'bg-yellow-400', text: 'text-yellow-300' },
  EXPERT: { short: 'EXP', dot: 'bg-pink-500', text: 'text-pink-300' },
  MASTER: { short: 'MST', dot: 'bg-violet-500', text: 'text-violet-300' },
  'Re:MASTER': { short: 'ReM', dot: 'bg-fuchsia-400', text: 'text-fuchsia-300' },
  UTAGE: { short: 'UTG', dot: 'bg-cyan-400', text: 'text-cyan-300' },
}

function parseLevelValue(level: number, isPlus: boolean): number {
  return isPlus ? level + 0.5 : level
}

function parseInputValue(val: string): number {
  const hasPlus = val.includes('+')
  const numPart = parseInt(val.replace('+', '')) || 1
  return hasPlus ? numPart + 0.5 : numPart
}

export default function SongList() {
  const songs = useSongStore((state) => state.songs)
  const songPools = useSongStore((state) => state.songPools)
  const activePoolId = useSongStore((state) => state.activePoolId)

  const activeFilters = useSongStore((state) => state.activeFilters)
  const chartTypeFilter = useSongStore((state) => state.chartTypeFilter)
  const genreFilter = useSongStore((state) => state.genreFilter)
  const minLevel = useSongStore((state) => state.minLevel)
  const maxLevel = useSongStore((state) => state.maxLevel)
  const includePlusOnly = useSongStore((state) => state.includePlusOnly)
  const versionFilter = useSongStore((state) => state.versionFilter)
  const designerFilter = useSongStore((state) => state.designerFilter)
  const versions = useSongStore((state) => state.versions)
  const drawHistory = useSongStore((state) => state.drawHistory)

  const toggleFilter = useSongStore((state) => state.toggleFilter)
  const toggleChartTypeFilter = useSongStore((state) => state.toggleChartTypeFilter)
  const setGenreFilter = useSongStore((state) => state.setGenreFilter)
  const setIncludePlusOnly = useSongStore((state) => state.setIncludePlusOnly)
  const setVersionFilter = useSongStore((state) => state.setVersionFilter)
  const setDesignerFilter = useSongStore((state) => state.setDesignerFilter)
  const resetLevelFilter = useSongStore((state) => state.resetLevelFilter)
  const resetAllFilters = useSongStore((state) => state.resetAllFilters)

  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const loaderRef = useRef<HTMLDivElement>(null)

  const activePoolName = useMemo(() => {
    if (activePoolId === 'main') return '主库'
    const pool = songPools.find((p) => p.id === activePoolId)
    return pool?.name || '未知曲库'
  }, [activePoolId, songPools])

  const activeSongs = useMemo(() => {
    if (activePoolId === 'main') return songs
    const pool = songPools.find((p) => p.id === activePoolId)
    return pool?.songs || songs
  }, [songs, songPools, activePoolId])

  const filteredSongs = useMemo(() => {
    const minValue = parseInputValue(minLevel)
    const maxValue = parseInputValue(maxLevel)

    return activeSongs.filter((song) => {
      if (!activeFilters.has(song.difficulty)) return false
      if (!chartTypeFilter.has(song.chartType)) return false
      if (genreFilter && song.genre !== genreFilter) return false
      const songValue = parseLevelValue(song.level, song.isPlus)
      if (songValue < minValue || songValue > maxValue) return false
      if (includePlusOnly && !song.isPlus) return false
      if (versionFilter !== 'ALL' && song.version !== versionFilter) return false
      if (designerFilter && song.difficultyAuthor !== designerFilter) return false
      return true
    })
  }, [activeSongs, activeFilters, chartTypeFilter, genreFilter, minLevel, maxLevel, includePlusOnly, versionFilter, designerFilter])

  // 已抽过数量（联动抽卡历史）
  const drawnCount = useMemo(() => {
    let n = 0
    for (const song of filteredSongs) {
      if (drawHistory.has(song.id)) n++
    }
    return n
  }, [filteredSongs, drawHistory])

  // 各难度数量分布
  const difficultyStats = useMemo(() => {
    const stats: Record<Difficulty, number> = {
      BASIC: 0, ADVANCED: 0, EXPERT: 0, MASTER: 0, 'Re:MASTER': 0, UTAGE: 0,
    }
    for (const song of filteredSongs) {
      stats[song.difficulty]++
    }
    return stats
  }, [filteredSongs])

  // 是否处于默认筛选状态（用于决定是否显示回显条）
  const isDefaultFilter = useMemo(() => {
    return activeFilters.size === 6
      && chartTypeFilter.size === 2
      && !genreFilter
      && minLevel === '1'
      && maxLevel === '15'
      && !includePlusOnly
      && versionFilter === 'ALL'
      && !designerFilter
  }, [activeFilters, chartTypeFilter, genreFilter, minLevel, maxLevel, includePlusOnly, versionFilter, designerFilter])

  // 筛选签名（网格淡入动画 key + 分页重置依赖）
  const filterSignature = useMemo(() => {
    return [
      [...activeFilters].join(','),
      [...chartTypeFilter].join(','),
      genreFilter,
      minLevel, maxLevel,
      includePlusOnly ? '1' : '0',
      versionFilter === 'ALL' ? 'ALL' : String(versionFilter),
      designerFilter,
    ].join('|')
  }, [activeFilters, chartTypeFilter, genreFilter, minLevel, maxLevel, includePlusOnly, versionFilter, designerFilter])

  // 筛选回显 chips：仅展示非默认维度的激活项
  const filterChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void; tone: string }[] = []
    // 难度（仅当未全选时显示激活项）
    if (activeFilters.size < 6) {
      for (const diff of activeFilters) {
        const meta = DIFFICULTY_META[diff]
        chips.push({
          key: `diff-${diff}`,
          label: meta.short,
          onRemove: () => toggleFilter(diff),
          tone: meta.text,
        })
      }
    }
    // 谱面类型（仅当未全选时显示激活项）
    if (chartTypeFilter.size < 2) {
      for (const ct of chartTypeFilter) {
        chips.push({
          key: `ct-${ct}`,
          label: ct === 'dx' ? 'DX' : 'STD',
          onRemove: () => toggleChartTypeFilter(ct),
          tone: 'text-cyan-300',
        })
      }
    }
    // 流派
    if (genreFilter) {
      chips.push({
        key: 'genre',
        label: genreFilter,
        onRemove: () => setGenreFilter(''),
        tone: 'text-amber-300',
      })
    }
    // 版本
    if (versionFilter !== 'ALL') {
      const versionTitle = versions.find((v) => v.version === versionFilter)?.title ?? String(versionFilter)
      chips.push({
        key: 'version',
        label: versionTitle,
        onRemove: () => setVersionFilter('ALL'),
        tone: 'text-indigo-300',
      })
    }
    // 谱师
    if (designerFilter) {
      chips.push({
        key: 'designer',
        label: designerFilter,
        onRemove: () => setDesignerFilter(''),
        tone: 'text-teal-300',
      })
    }
    // 定数范围
    if (minLevel !== '1' || maxLevel !== '15') {
      chips.push({
        key: 'level',
        label: `${minLevel} ~ ${maxLevel}`,
        onRemove: () => resetLevelFilter(),
        tone: 'text-rose-300',
      })
    }
    // 仅+
    if (includePlusOnly) {
      chips.push({
        key: 'plus',
        label: '仅 +',
        onRemove: () => setIncludePlusOnly(false),
        tone: 'text-fuchsia-300',
      })
    }
    return chips
  }, [activeFilters, chartTypeFilter, genreFilter, minLevel, maxLevel, includePlusOnly, versionFilter, designerFilter, versions, toggleFilter, toggleChartTypeFilter, setGenreFilter, setVersionFilter, setDesignerFilter, resetLevelFilter, setIncludePlusOnly])

  const visibleSongs = useMemo(
    () => filteredSongs.slice(0, displayCount),
    [filteredSongs, displayCount]
  )

  const hasMore = visibleSongs.length < filteredSongs.length

  // 切换曲库或筛选条件时重置分页
  useEffect(() => {
    setDisplayCount(PAGE_SIZE)
    setIsLoadingMore(false)
  }, [activePoolId, filterSignature])

  // 无限滚动
  useEffect(() => {
    const loader = loaderRef.current
    if (!loader || !hasMore) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoadingMore) {
          setIsLoadingMore(true)
          setDisplayCount((prev) => prev + PAGE_SIZE)
          window.setTimeout(() => setIsLoadingMore(false), 300)
        }
      },
      { rootMargin: '300px' }
    )

    observer.observe(loader)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore])

  // 区分空状态：曲库为空 vs 筛选无结果
  if (activeSongs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-white/60 animate-enter-scale">
        <div className="w-20 h-20 rounded-3xl glass-panel flex items-center justify-center mb-5 shadow-lg">
          <Disc3 size={40} className="opacity-40" />
        </div>
        <p className="font-orbitron font-bold text-lg mb-1">曲库为空</p>
        <p className="font-rajdhani text-sm text-white/40">请先导入谱面或从 lxns.net 拉取</p>
      </div>
    )
  }

  if (filteredSongs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-white/60 animate-enter-scale">
        <div className="w-20 h-20 rounded-3xl glass-panel flex items-center justify-center mb-5 shadow-lg border border-rose-400/20">
          <Filter size={36} className="opacity-50 text-rose-300" />
        </div>
        <p className="font-orbitron font-bold text-lg mb-1">没有符合条件的谱面</p>
        <p className="font-rajdhani text-sm text-white/40 mb-5">当前筛选条件下无匹配结果</p>
        <button
          onClick={resetAllFilters}
          className="btn-secondary press-down text-sm"
        >
          <X size={16} />
          清空筛选条件
        </button>
      </div>
    )
  }

  return (
    <div className="relative animate-enter">
      {/* 顶部状态栏 */}
      <div className="max-w-7xl mx-auto mb-5">
        <div className="glass-panel rounded-3xl px-5 py-4 flex flex-col gap-4 animate-enter">
          {/* 第一行：曲库 + 数量 + 进度 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Layers size={18} className="text-white" />
              </div>
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-[0.18em] font-bold font-rajdhani">当前曲库</p>
                <p className="font-rajdhani font-bold text-white text-sm">{activePoolName}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <span className="chip">{filteredSongs.length} 张谱面</span>
              <span className="font-rajdhani text-xs text-white/40">
                已展示 {visibleSongs.length} / {filteredSongs.length}
              </span>
              {drawnCount > 0 && (
                <span className="inline-flex items-center gap-1 font-rajdhani text-xs text-amber-300/80">
                  <History size={12} />
                  已抽 {drawnCount}
                </span>
              )}
            </div>
          </div>

          {/* 第二行：难度分布统计 */}
          <div className="flex items-center gap-2 flex-wrap">
            <BarChart3 size={14} className="text-white/40 shrink-0" />
            {(Object.keys(DIFFICULTY_META) as Difficulty[]).map((diff) => {
              const meta = DIFFICULTY_META[diff]
              const count = difficultyStats[diff]
              const isDim = !activeFilters.has(diff)
              return (
                <div
                  key={diff}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-rajdhani font-bold border transition-all',
                    isDim
                      ? 'opacity-30 border-white/5 text-white/40'
                      : cn('border-white/10 bg-white/[0.03]', meta.text)
                  )}
                  title={`${diff}: ${count} 张`}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', meta.dot)} />
                  <span>{meta.short}</span>
                  <span className="opacity-60">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 筛选状态回显条 */}
      {!isDefaultFilter && (
        <div className="max-w-7xl mx-auto mb-5 animate-enter">
          <div className="glass-panel rounded-2xl px-4 py-3 flex items-center gap-2 flex-wrap border border-cyan-400/20">
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-bold text-cyan-300 font-rajdhani shrink-0">
              <Filter size={12} />
              筛选
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {filterChips.map((chip) => (
                <button
                  key={chip.key}
                  onClick={chip.onRemove}
                  className={cn(
                    'group inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-bold font-rajdhani bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all press-down',
                    chip.tone
                  )}
                  title="点击移除该筛选"
                >
                  <span>{chip.label}</span>
                  <span className="w-4 h-4 rounded-full bg-white/5 group-hover:bg-white/15 flex items-center justify-center transition-colors">
                    <X size={10} />
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={resetAllFilters}
              className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold font-rajdhani text-rose-300 hover:bg-rose-500/10 transition-colors press-down shrink-0"
            >
              <X size={12} />
              清空全部
            </button>
          </div>
        </div>
      )}

      {/* 谱面网格：自适应列数，大屏填满、小屏不溢出 */}
      <div
        key={filterSignature}
        className="max-w-7xl mx-auto grid gap-4 lg:gap-6 card-grid"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
        }}
      >
        {visibleSongs.map((song, index) => (
          <div
            key={song.id}
            className="flex justify-center w-full song-item-enter"
            style={{
              contentVisibility: 'auto',
              containIntrinsicHeight: '520px',
              animationDelay: `${Math.min(index * 25, 400)}ms`,
            }}
          >
            <SongCard song={song} isDrawn={drawHistory.has(song.id)} />
          </div>
        ))}
      </div>

      {/* 加载更多触发器 */}
      {hasMore && (
        <div ref={loaderRef} className="py-10 flex justify-center">
          <div className={cn(
            'inline-flex items-center gap-2 px-6 py-3 rounded-full glass-panel border border-violet-400/30 text-violet-200 font-rajdhani font-bold text-sm',
            isLoadingMore && 'animate-pulse'
          )}>
            <Disc3 size={18} className={cn('opacity-70', isLoadingMore && 'animate-spin')} />
            加载更多…
          </div>
        </div>
      )}
    </div>
  )
}
