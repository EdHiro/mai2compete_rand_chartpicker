import { useMemo, useRef, useState, useEffect } from 'react'
import SongCard from './SongCard'
import { useSongStore } from '@/store/songStore'
import { Disc3, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 30

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
      return true
    })
  }, [activeSongs, activeFilters, chartTypeFilter, genreFilter, minLevel, maxLevel, includePlusOnly])

  const visibleSongs = useMemo(
    () => filteredSongs.slice(0, displayCount),
    [filteredSongs, displayCount]
  )

  const hasMore = visibleSongs.length < filteredSongs.length

  // 切换曲库或筛选条件时重置分页
  useEffect(() => {
    setDisplayCount(PAGE_SIZE)
    setIsLoadingMore(false)
  }, [activePoolId, activeFilters, chartTypeFilter, genreFilter, minLevel, maxLevel, includePlusOnly])

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

  if (filteredSongs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-white/60">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-5 border border-white/10 shadow-lg">
          <Disc3 size={40} className="opacity-40" />
        </div>
        <p className="font-orbitron font-bold text-lg mb-1">没有符合条件的谱面</p>
        <p className="font-rajdhani text-sm text-white/40">尝试调整筛选条件或切换曲库</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* 顶部状态栏 */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="glass-panel-strong rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <Layers size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white/40 text-[10px] uppercase tracking-[0.18em] font-bold font-rajdhani">当前曲库</p>
              <p className="font-rajdhani font-bold text-white text-sm">{activePoolName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="chip">{filteredSongs.length} 张谱面</span>
            <span className="font-rajdhani text-xs text-white/40">
              已展示 {visibleSongs.length} / {filteredSongs.length}
            </span>
          </div>
        </div>
      </div>

      {/* 谱面网格：桌面端一行四首 */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
        {visibleSongs.map((song) => (
          <div
            key={song.id}
            className="flex justify-center w-full"
            style={{ contentVisibility: 'auto', containIntrinsicHeight: '520px' }}
          >
            <SongCard song={song} />
          </div>
        ))}
      </div>

      {/* 加载更多触发器 */}
      {hasMore && (
        <div ref={loaderRef} className="py-10 flex justify-center">
          <div className={cn(
            'inline-flex items-center gap-2 px-6 py-3 rounded-full glass-panel-strong border border-violet-500/30 text-violet-200 font-rajdhani font-bold text-sm',
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
