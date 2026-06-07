import { useMemo, useRef, useCallback, useState, useEffect } from 'react'
import SongCard from './SongCard'
import { useSongStore } from '@/store/songStore'
import { Disc3 } from 'lucide-react'

// 分页大小
const PAGE_SIZE = 30

export default function SongList() {
  const songs = useSongStore((state) => state.songs)
  const songPools = useSongStore((state) => state.songPools)
  const activePoolId = useSongStore((state) => state.activePoolId)
  const setActivePoolId = useSongStore((state) => state.setActivePoolId)
  const activeFilters = useSongStore((state) => state.activeFilters)
  const mainSongCount = useSongStore((state) => state.songs.length)

  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
  const loaderRef = useRef<HTMLDivElement>(null)

  // 根据 activePoolId 获取当前激活曲库的歌曲
  const activeSongs = useMemo(() => {
    if (activePoolId === 'main') return songs
    const pool = songPools.find(p => p.id === activePoolId)
    return pool?.songs || songs
  }, [songs, songPools, activePoolId])

  // 根据难度过滤
  const filteredSongs = useMemo(
    () => activeSongs.filter(song => activeFilters.has(song.difficulty)),
    [activeSongs, activeFilters]
  )

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
      { rootMargin: '200px' }
    )
    observer.observe(loader)
    return () => observer.disconnect()
  }, [hasMore, visibleSongs.length])

  // 切换曲库或过滤条件时重置分页
  useEffect(() => {
    setDisplayCount(PAGE_SIZE)
  }, [activePoolId, activeFilters])

  if (filteredSongs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/70">
        <Disc3 size={64} className="mb-4 opacity-50" />
        <p className="font-rajdhani text-lg">没有符合条件的谱面</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* 曲库切换器 已移至 多曲库管理（MultiPoolImport）组件 */}

      {/* 显示当前谱面数量 */}
      <div className="max-w-6xl mx-auto mb-4 text-center">
        <span className="text-slate-400 text-sm font-rajdhani">
          共 {filteredSongs.length} 张谱面，已展示 {visibleSongs.length} 张
        </span>
      </div>

      {/* 谱面网格 - 分页渲染 */}
      <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-8">
        {visibleSongs.map((song) => (
          <SongCard key={song.id} song={song} />
        ))}
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
    </div>
  )
}
