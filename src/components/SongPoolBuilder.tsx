import { useState, useMemo, useCallback } from 'react'
import { Download, Plus, Check, Search, X, FolderPlus, Trash2 } from 'lucide-react'
import { useSongStore, type Song, type Difficulty, type ChartType } from '@/store/songStore'

const PAGE_SIZE = 30

export default function SongPoolBuilder() {
  const songs = useSongStore((state) => state.songs)
  const songPools = useSongStore((state) => state.songPools)
  const addSongPool = useSongStore((state) => state.addSongPool)
  const removeSongPool = useSongStore((state) => state.removeSongPool)

  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set())
  const [poolName, setPoolName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | ''>('')
  const [filterChartType, setFilterChartType] = useState<ChartType | ''>('')
  const [minLevelValue, setMinLevelValue] = useState(1.0)
  const [maxLevelValue, setMaxLevelValue] = useState(15.5)
  const [currentPage, setCurrentPage] = useState(0)
  const [showBuilder, setShowBuilder] = useState(false)

  // 合并主库和所有曲库的歌曲作为可选来源
  const allAvailableSongs = useMemo(() => {
    const result = [...songs]
    const seenIds = new Set(songs.map(s => s.id))
    for (const pool of songPools) {
      for (const song of pool.songs) {
        if (!seenIds.has(song.id)) {
          result.push(song)
          seenIds.add(song.id)
        }
      }
    }
    return result
  }, [songs, songPools])

  // 筛选歌曲
  const filteredSongs = useMemo(() => {
    let result = allAvailableSongs

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.author.toLowerCase().includes(q) ||
        s.genre.toLowerCase().includes(q)
      )
    }

    if (filterDifficulty) {
      result = result.filter(s => s.difficulty === filterDifficulty)
    }

    if (filterChartType) {
      result = result.filter(s => s.chartType === filterChartType)
    }

    // 定数范围过滤
    result = result.filter(s => s.levelValue >= minLevelValue && s.levelValue <= maxLevelValue)

    return result
  }, [allAvailableSongs, searchQuery, filterDifficulty, filterChartType, minLevelValue, maxLevelValue])

  const totalPages = Math.ceil(filteredSongs.length / PAGE_SIZE)
  const paginatedSongs = useMemo(
    () => filteredSongs.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [filteredSongs, currentPage]
  )

  const toggleSongSelection = useCallback((songId: string) => {
    setSelectedSongIds(prev => {
      const next = new Set(prev)
      if (next.has(songId)) {
        next.delete(songId)
      } else {
        next.add(songId)
      }
      return next
    })
  }, [])

  const selectAllVisible = useCallback(() => {
    setSelectedSongIds(prev => {
      const next = new Set(prev)
      for (const song of paginatedSongs) {
        next.add(song.id)
      }
      return next
    })
  }, [paginatedSongs])

  const deselectAllVisible = useCallback(() => {
    setSelectedSongIds(prev => {
      const next = new Set(prev)
      for (const song of paginatedSongs) {
        next.delete(song.id)
      }
      return next
    })
  }, [paginatedSongs])

  const selectedSongs = useMemo(() => {
    return allAvailableSongs.filter(s => selectedSongIds.has(s.id))
  }, [allAvailableSongs, selectedSongIds])

  const createPool = useCallback(() => {
    if (!poolName.trim() || selectedSongs.length === 0) return
    addSongPool(poolName.trim(), selectedSongs)
    setPoolName('')
    setSelectedSongIds(new Set())
    setShowBuilder(false)
  }, [poolName, selectedSongs, addSongPool])

  const exportSelectedAsJson = useCallback(() => {
    if (selectedSongs.length === 0) return
    const data = JSON.stringify(selectedSongs, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${poolName.trim() || 'custom-pool'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [selectedSongs, poolName])

  const exportPoolAsJson = useCallback((pool: { name: string; songs: Song[] }) => {
    const data = JSON.stringify(pool.songs, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${pool.name}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  if (!showBuilder) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* 已创建的曲库列表 */}
        {songPools.length > 0 && (
          <div className="mb-6">
            <h3 className="text-white font-rajdhani font-bold text-lg mb-3 flex items-center gap-2">
              <FolderPlus size={20} />
              已创建的曲库
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {songPools.map(pool => (
                <div
                  key={pool.id}
                  className="p-4 rounded-xl bg-gradient-to-b from-slate-700 to-slate-800 border-2 border-slate-600 hover:border-slate-500 transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-bold truncate">{pool.name}</h4>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => exportPoolAsJson(pool)}
                        className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                        title="导出 JSON"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={() => removeSongPool(pool.id)}
                        className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm">{pool.songs.length} 首谱面</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setShowBuilder(true)}
          className="w-full py-4 rounded-xl bg-gradient-to-b from-purple-600 to-purple-700 border-3 border-purple-400 text-white font-rajdhani font-bold text-lg hover:from-purple-500 hover:to-purple-600 transition-all duration-200 shadow-lg flex items-center justify-center gap-3"
        >
          <Plus size={24} />
          从现有谱面中创建新曲库
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* 顶部操作栏 */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBuilder(false)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-600 text-white font-rajdhani font-bold hover:bg-slate-500 transition-all duration-200"
          >
            <X size={18} /> 关闭
          </button>
          <h2 className="text-white font-orbitron font-bold text-xl">创建新曲库</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-300 font-rajdhani">
            已选择 {selectedSongIds.size} 首
          </span>
          {selectedSongs.length > 0 && (
            <button
              onClick={exportSelectedAsJson}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 border-2 border-blue-400 text-white font-rajdhani font-bold hover:from-blue-500 hover:to-blue-600 transition-all duration-200 shadow-lg"
            >
              <Download size={16} /> 导出 JSON
            </button>
          )}
        </div>
      </div>

      {/* 曲库名称输入 */}
      <div className="mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={poolName}
            onChange={e => setPoolName(e.target.value)}
            placeholder="输入曲库名称..."
            className="flex-1 px-4 py-3 rounded-xl bg-slate-700 text-white border-2 border-slate-600 font-bold focus:border-purple-400 focus:outline-none transition-colors"
          />
          <button
            onClick={createPool}
            disabled={!poolName.trim() || selectedSongs.length === 0}
            className="px-6 py-3 rounded-xl bg-gradient-to-b from-green-600 to-green-700 border-2 border-green-400 text-white font-rajdhani font-bold hover:from-green-500 hover:to-green-600 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Check size={18} /> 创建曲库
          </button>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(0) }}
            placeholder="搜索谱面、作曲家、流派..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-700 text-white border-2 border-slate-600 font-rajdhani focus:border-purple-400 focus:outline-none transition-colors"
          />
        </div>
        <select
          value={filterDifficulty}
          onChange={e => { setFilterDifficulty(e.target.value as Difficulty | ''); setCurrentPage(0) }}
          className="px-4 py-2.5 rounded-xl bg-slate-700 text-white border-2 border-slate-600 font-rajdhani focus:border-purple-400 focus:outline-none transition-colors"
        >
          <option value="">全部难度</option>
          <option value="BASIC">BASIC</option>
          <option value="ADVANCED">ADVANCED</option>
          <option value="EXPERT">EXPERT</option>
          <option value="MASTER">MASTER</option>
          <option value="Re:MASTER">Re:MASTER</option>
        </select>
        <select
          value={filterChartType}
          onChange={e => { setFilterChartType(e.target.value as ChartType | ''); setCurrentPage(0) }}
          className="px-4 py-2.5 rounded-xl bg-slate-700 text-white border-2 border-slate-600 font-rajdhani focus:border-purple-400 focus:outline-none transition-colors"
        >
          <option value="">全部类型</option>
          <option value="standard">标准谱面</option>
          <option value="dx">DX谱面</option>
        </select>
      </div>

      {/* 定数范围 */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-slate-300 text-sm font-rajdhani font-semibold whitespace-nowrap">定数范围</span>
        <div className="flex items-center gap-2 flex-1">
          <input
            type="range"
            min="1.0"
            max="15.5"
            step="0.1"
            value={minLevelValue}
            onChange={e => { setMinLevelValue(parseFloat(e.target.value)); setCurrentPage(0) }}
            className="flex-1 accent-purple-400"
          />
          <span className="text-yellow-400 text-xs font-rajdhani font-bold w-10 text-center">{minLevelValue.toFixed(1)}</span>
        </div>
        <span className="text-slate-500">-</span>
        <div className="flex items-center gap-2 flex-1">
          <input
            type="range"
            min="1.0"
            max="15.5"
            step="0.1"
            value={maxLevelValue}
            onChange={e => { setMaxLevelValue(parseFloat(e.target.value)); setCurrentPage(0) }}
            className="flex-1 accent-purple-400"
          />
          <span className="text-yellow-400 text-xs font-rajdhani font-bold w-10 text-center">{maxLevelValue.toFixed(1)}</span>
        </div>
        <button
          onClick={() => { setMinLevelValue(1.0); setMaxLevelValue(15.5); setCurrentPage(0) }}
          className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-600 transition-colors"
        >
          重置
        </button>
      </div>

      {/* 批量选择按钮 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={selectAllVisible}
          className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-sm font-bold hover:bg-slate-600 transition-colors"
        >
          全选本页
        </button>
        <button
          onClick={deselectAllVisible}
          className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-sm font-bold hover:bg-slate-600 transition-colors"
        >
          取消本页
        </button>
        <button
          onClick={() => setSelectedSongIds(new Set())}
          className="px-3 py-1.5 rounded-lg bg-red-700/50 text-red-300 text-sm font-bold hover:bg-red-700 transition-colors"
        >
          清空全部
        </button>
      </div>

      {/* 分页信息 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mb-4">
          <span className="text-slate-400 text-sm font-rajdhani">
            共 {filteredSongs.length} 首，第 {currentPage + 1}/{totalPages} 页
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1.5 rounded-lg bg-slate-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors text-sm"
            >
              上一页
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg bg-slate-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors text-sm"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* 歌曲列表 */}
      <div className="space-y-2">
        {paginatedSongs.map(song => {
          const isSelected = selectedSongIds.has(song.id)
          return (
            <div
              key={song.id}
              onClick={() => toggleSongSelection(song.id)}
              className={`
                flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200
                ${isSelected
                  ? 'bg-purple-700/30 border-purple-400 shadow-lg'
                  : 'bg-slate-800 border-slate-700 hover:border-slate-500 hover:bg-slate-750'
                }
              `}
            >
              {/* 选择框 */}
              <div className={`
                w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200
                ${isSelected ? 'bg-purple-500 border-purple-400' : 'border-slate-500'}
              `}>
                {isSelected && <Check size={14} className="text-white" />}
              </div>

              {/* 封面 */}
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                {song.cover && (
                  <img src={song.cover} alt={song.name} className="w-full h-full object-cover" loading="lazy" />
                )}
              </div>

              {/* 信息 */}
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-bold truncate">{song.name}</h4>
                <p className="text-slate-400 text-sm truncate">
                  {song.author} · {song.genre}
                </p>
              </div>

              {/* 难度标签 */}
              <span className={`
                px-2 py-1 rounded-lg text-xs font-bold flex-shrink-0
                ${song.difficulty === 'BASIC' ? 'bg-green-600 text-white' :
                  song.difficulty === 'ADVANCED' ? 'bg-sky-600 text-white' :
                  song.difficulty === 'EXPERT' ? 'bg-pink-600 text-white' :
                  song.difficulty === 'MASTER' ? 'bg-purple-600 text-white' :
                  'bg-yellow-600 text-white'}
              `}>
                {song.difficulty}
              </span>

              {/* 等级 */}
              <span className="text-white font-rajdhani font-bold text-sm flex-shrink-0">
                Lv.{song.level}{song.isPlus ? '+' : ''}
              </span>

              {/* 定数 */}
              <span className="text-yellow-400 font-rajdhani font-bold text-xs flex-shrink-0">
                {song.levelValue.toFixed(1)}
              </span>

              {/* 谱面类型 */}
              <span className={`
                px-2 py-1 rounded-lg text-xs font-bold flex-shrink-0
                ${song.chartType === 'dx' ? 'bg-purple-500 text-white' : 'bg-blue-500 text-white'}
              `}>
                {song.chartType === 'dx' ? 'DX' : 'STD'}
              </span>
            </div>
          )
        })}
      </div>

      {filteredSongs.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p className="font-bold text-lg">未找到匹配谱面</p>
          <p className="text-sm mt-1">尝试调整搜索条件</p>
        </div>
      )}
    </div>
  )
}
