import { Sparkles, Gift, RotateCcw, Plus, Database, ChevronDown, Filter, ChevronUp, ChevronDown as ChevronDownIcon } from 'lucide-react'
import { useSongStore, type ChartType } from '@/store/songStore'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import MultiPoolImport from './MultiPoolImport'

const drawCounts = [1, 2, 3, 4]

const chartTypes: { value: ChartType; label: string }[] = [
  { value: 'standard', label: '标准谱面' },
  { value: 'dx', label: 'DX谱面' },
]

// 预设难度区间
const presetRanges = [
  { label: '1-7', min: 1, max: 7 },
  { label: '8-11', min: 8, max: 11 },
  { label: '12-13', min: 12, max: 13 },
  { label: '13+', min: 13, max: 15 },
  { label: '14', min: 14, max: 14 },
  { label: '14+', min: 14, max: 15 },
]

function parseLevelValue(level: number, isPlus: boolean): number {
  return isPlus ? level + 0.5 : level
}

function parseInputValue(val: string): number {
  const hasPlus = val.includes('+')
  const numPart = parseInt(val.replace('+', '')) || 1
  return hasPlus ? numPart + 0.5 : numPart
}

export default function GachaHeader() {
  const { drawCount, setDrawCount, drawSongs, setIsDrawing, minLevel, maxLevel, setLevelRange, includePlusOnly, setIncludePlusOnly, resetLevelFilter, songPools, drawMode, setDrawMode, selectedPools, chartTypeFilter, toggleChartTypeFilter, genreFilter, setGenreFilter, activeFilters, toggleFilter, multiDrawMode } = useSongStore()
  const [shaking, setShaking] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [tempMin, setTempMin] = useState(minLevel)
  const [tempMax, setTempMax] = useState(maxLevel)
  const [showPoolManager, setShowPoolManager] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)



  useEffect(() => {
    setTempMin(minLevel)
    setTempMax(maxLevel)
  }, [minLevel, maxLevel])

  const songs = useSongStore((state) => state.songs)

  const genres = useMemo(() => {
    const genreSet = new Set<string>()
    for (let i = 0; i < songs.length; i++) {
      if (songs[i].genre) genreSet.add(songs[i].genre)
    }
    return Array.from(genreSet).sort()
  }, [songs])

  const filteredCount = useMemo(() => {
    const minValue = parseInputValue(minLevel)
    const maxValue = parseInputValue(maxLevel)

    let count = 0
    for (let i = 0; i < songs.length; i++) {
      const song = songs[i]
      if (!activeFilters.has(song.difficulty)) continue
      if (!chartTypeFilter.has(song.chartType)) continue
      if (genreFilter && song.genre !== genreFilter) continue
      const songValue = parseLevelValue(song.level, song.isPlus)
      if (songValue < minValue || songValue > maxValue) continue
      if (includePlusOnly && !song.isPlus) continue
      count++
    }
    return count
  }, [songs, activeFilters, chartTypeFilter, genreFilter, minLevel, maxLevel, includePlusOnly])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false)
      }
    }
    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFilters])

  const handleDraw = () => {
    if (filteredCount === 0) return

    setShaking(true)
    setIsDrawing(true)

    setTimeout(() => {
      drawSongs(drawCount)
      setShaking(false)
      setIsDrawing(false)
    }, 2000)
  }

  const handleApplyLevelRange = () => {
    const minLvl = parseInt(tempMin.replace('+', '')) || 1
    const maxLvl = parseInt(tempMax.replace('+', '')) || 15
    const minHasPlus = tempMin.includes('+')
    const maxHasPlus = tempMax.includes('+')
    setLevelRange(
      minLvl + (minHasPlus ? '+' : ''),
      maxLvl + (maxHasPlus ? '+' : '')
    )
  }

  const handleResetLevelFilter = () => {
    setTempMin('1')
    setTempMax('15')
    setIncludePlusOnly(false)
    resetLevelFilter()
    setGenreFilter('')
  }

  const handlePresetRange = (min: number, max: number) => {
    setTempMin(min.toString())
    setTempMax(max.toString())
    setLevelRange(min.toString(), max.toString())
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (genreFilter) count++
    if (includePlusOnly) count++
    if (minLevel !== '1' || maxLevel !== '15') count++
    if (activeFilters.size < 5) count++
    if (chartTypeFilter.size < 2) count++
    return count
  }, [genreFilter, includePlusOnly, minLevel, maxLevel, activeFilters, chartTypeFilter])

  return (
    <header className={`sticky top-0 z-[100] transition-all duration-500 ease-in-out ${collapsed ? '' : 'max-h-[80vh] overflow-y-auto'}`}>
      {/* Decorative gradient top bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500" />

      {/* Main glass panel header */}
      <div className="relative z-10 bg-dark-bg/95 backdrop-blur-md border-b border-dark-border/50 before:content-[''] before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.03] before:to-transparent before:pointer-events-none">
        <div className="max-w-6xl mx-auto">
          {/* ========== 紧凑工具栏 ========== */}
          <div className={`flex items-center justify-between gap-2 px-3 sm:px-4 py-3 transition-all duration-500 ease-in-out`}>
            {/* 左侧：展开按钮 + 谱面数 */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-rajdhani font-bold text-white text-xs
                  bg-dark-card border border-dark-border/50
                  hover:bg-dark-hover hover:border-white/20 transition-all duration-200"
                title={collapsed ? '展开' : '折叠'}
              >
                <ChevronDownIcon size={14} className={`transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`} />
                <span className="hidden sm:inline">{collapsed ? '展开' : '折叠'}</span>
              </button>
              {filteredCount > 0 && (
                <span className="font-rajdhani text-blue-300/80 text-xs whitespace-nowrap">
                  {filteredCount} 张谱面
                </span>
              )}
            </div>

            {/* 中间：抽卡数量选择 + 筛选条件 */}
            <div className="flex items-center gap-2">
              {drawCounts.map((count) => (
                <button
                  key={count}
                  onClick={() => setDrawCount(count)}
                  disabled={shaking}
                  className={`
                    px-3 py-1.5 rounded-lg font-orbitron font-bold text-xs
                    transition-all duration-200 border
                    ${shaking ? 'opacity-50 cursor-not-allowed' : ''}
                    ${drawCount === count
                      ? 'text-white bg-gradient-to-b from-amber-500 to-orange-600 border-amber-400/50 shadow-[0_2px_12px_rgba(245,158,11,0.3)]'
                      : 'text-white/60 bg-dark-card border-dark-border/50 hover:bg-dark-hover hover:text-white'
                    }
                  `}
                >
                  {count}
                </button>
              ))}

              <button
                onClick={() => { setCollapsed(false); setShowFilters(true) }}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-rajdhani font-bold text-xs
                  transition-all duration-200 border
                  ${activeFilterCount > 0
                    ? 'text-white bg-gradient-to-b from-cyan-600 to-cyan-700 border-cyan-500/50 shadow-[0_2px_12px_rgba(6,182,212,0.3)]'
                    : 'text-white/60 bg-dark-card border-dark-border/50 hover:bg-dark-hover hover:text-white'
                  }
                `}
              >
                <Filter size={12} />
                <span className="hidden sm:inline">筛选</span>
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0 rounded-full bg-amber-400 text-amber-900 text-[10px] font-black">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* 右侧：抽卡按钮 */}
            <button
              onClick={handleDraw}
              disabled={filteredCount === 0 || shaking}
              className={`
                flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-xl font-orbitron font-bold text-white text-xs sm:text-sm
                shadow-lg transition-all duration-300 border overflow-hidden relative
                ${filteredCount === 0 || shaking
                  ? 'bg-gray-600/50 border-gray-500/50 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-b from-red-500 to-red-700 border-red-500/50 hover:from-red-400 hover:to-red-600 hover:shadow-[0_4px_20px_rgba(239,68,68,0.4)]'
                }
                ${shaking ? 'animate-gachaShake' : ''}
              `}
            >
              {!shaking && filteredCount > 0 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer" />
              )}
              <Gift size={14} className={shaking ? 'animate-gachaBounce' : ''} />
              <span className="hidden sm:inline">{shaking ? '抽选中...' : '开始抽谱'}</span>
              <Sparkles size={12} className={shaking ? 'animate-gachaSparkle' : 'opacity-80'} />
            </button>
          </div>

        {/* ========== 展开内容区域 ========== */}
        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${collapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'}`}>
          <div className="px-4 pb-6 pt-2">
            {/* Title Section */}
            <div className="text-center mb-6">
              <div className="inline-block glass-panel px-6 py-3 rounded-2xl mb-3">
                <p className="text-white/80 font-rajdhani font-bold text-sm sm:text-base">
                  请选择要抽取的谱面数量
                </p>
              </div>
              <h1 className="font-orbitron font-black text-2xl sm:text-3xl md:text-4xl drop-shadow-lg mb-2">
                <span className="title-gradient">抽卡选谱</span>
              </h1>
              <p className="font-rajdhani text-xs sm:text-sm tracking-[0.3em] uppercase text-white/40">
                GACHA · RANDOM SELECT
              </p>
              {filteredCount > 0 && (
                <p className="font-rajdhani text-blue-300/70 text-xs sm:text-sm">
                  共有 <span className="text-blue-300 font-bold">{filteredCount}</span> 张可抽选的谱面
                </p>
              )}
            </div>

            {/* Count Selector */}
            <div className="flex justify-center gap-2 sm:gap-3 mb-6">
              {drawCounts.map((count) => (
                <button
                  key={count}
                  onClick={() => setDrawCount(count)}
                  disabled={shaking}
                  className={`
                    relative px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-orbitron font-black text-sm sm:text-base
                    transition-all duration-200 border-2 shadow-lg
                    ${shaking ? 'opacity-50 cursor-not-allowed' : ''}
                    ${drawCount === count
                      ? 'text-white bg-gradient-to-b from-yellow-500 to-orange-600 border-yellow-300 scale-110 shadow-yellow-500/50 ring-1 ring-inset ring-white/10'
                      : 'text-white bg-gradient-to-b from-blue-600 to-blue-700 border-blue-400 hover:from-blue-500 hover:to-blue-600'
                    }
                  `}
                >
                  {count} 张谱面
                </button>
              ))}
            </div>

            {/* Multi-pool Management */}
            <div className="flex flex-col items-center gap-3 mb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowPoolManager(!showPoolManager)}
                  className="relative px-4 sm:px-6 py-2 rounded-xl font-rajdhani font-bold text-white text-xs sm:text-sm
                    bg-gradient-to-b from-green-600 to-green-700 border-2 border-green-400 shadow-lg
                    hover:from-green-500 hover:to-green-600 transition-all duration-200 flex items-center gap-2"
                >
                  <Database size={16} />
                  谱面库管理 {showPoolManager ? '▲' : '▼'}
                </button>
                {(songPools.length > 0 || songs.length > 0) && (
                  <button
                    onClick={() => setDrawMode(drawMode === 'multi' ? 'single' : 'multi')}
                    className={`
                      relative px-4 sm:px-6 py-2 rounded-xl font-rajdhani font-bold text-white text-xs sm:text-sm
                      border-2 shadow-lg transition-all duration-200
                      ${drawMode === 'multi'
                        ? 'bg-gradient-to-b from-yellow-500 to-orange-600 border-yellow-300'
                        : 'bg-gradient-to-b from-slate-600 to-slate-700 border-slate-400'
                      }
                    `}
                  >
                    {drawMode === 'multi' ? '多库抽取 ✓' : '单库抽取'}
                  </button>
                )}
              </div>

              {showPoolManager && (
                <MultiPoolImport />
              )}

              {drawMode === 'multi' && (
                <div className="text-center">
                  <p className="text-green-200 text-xs sm:text-sm font-rajdhani">
                    多库模式: 已选中 {selectedPools.length} 个曲库
                    {multiDrawMode === 'perPool'
                      ? `，按库抽取`
                      : `，混合抽取 ${drawCount} 张`
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Filter Toggle Button */}
            <div className="flex justify-center mb-6">
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-6 sm:px-8 py-2.5 rounded-xl font-rajdhani font-bold text-white text-sm sm:text-base
                    bg-gradient-to-b from-teal-600 to-teal-700 border-2 border-teal-400 shadow-lg
                    hover:from-teal-500 hover:to-teal-600 transition-all duration-200"
                >
                  <Filter size={18} />
                  筛选条件
                  <ChevronDown size={16} className={`transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                  {activeFilterCount > 0 && (
                    <span className="ml-1 px-2 py-0.5 rounded-full bg-yellow-400 text-yellow-900 text-xs font-black">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Filter Panel - inline expansion */}
                {showFilters && (
                  <div className="mt-4 w-full max-h-[60vh] overflow-y-auto glass-panel rounded-2xl border border-dark-border/50 p-5">
                    {/* 难度筛选 */}
                    <div className="mb-5">
                      <p className="text-blue-300/80 text-xs font-rajdhani font-semibold mb-3 uppercase tracking-wider">难度筛选</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'BASIC' as const, label: 'BASIC', gradient: 'from-green-500 to-emerald-600', border: 'border-green-400/50', shadow: 'shadow-[0_2px_12px_rgba(34,197,94,0.3)]' },
                          { value: 'ADVANCED' as const, label: 'ADVANCED', gradient: 'from-yellow-500 to-amber-600', border: 'border-yellow-400/50', shadow: 'shadow-[0_2px_12px_rgba(234,179,8,0.3)]' },
                          { value: 'EXPERT' as const, label: 'EXPERT', gradient: 'from-pink-500 to-rose-600', border: 'border-pink-400/50', shadow: 'shadow-[0_2px_12px_rgba(236,72,153,0.3)]' },
                          { value: 'MASTER' as const, label: 'MASTER', gradient: 'from-purple-500 to-purple-700', border: 'border-purple-400/50', shadow: 'shadow-[0_2px_12px_rgba(139,92,246,0.3)]' },
                          { value: 'Re:MASTER' as const, label: 'Re:MASTER', gradient: 'from-amber-400 to-orange-500', border: 'border-amber-400/50', shadow: 'shadow-[0_2px_12px_rgba(251,191,36,0.3)]' },
                        ].map(({ value, label, gradient, border, shadow }) => {
                          const isActive = activeFilters.has(value)
                          return (
                            <button
                              key={value}
                              onClick={() => toggleFilter(value)}
                              className={`
                                relative px-4 py-2 rounded-xl font-orbitron font-black text-xs
                                transition-all duration-200 border
                                ${isActive
                                  ? `text-white bg-gradient-to-b ${gradient} ${border} shadow-md ${shadow}`
                                  : 'text-white/60 bg-dark-card border-dark-border/50 hover:bg-dark-hover hover:text-white'
                                }
                              `}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* 谱面类型筛选 */}
                    <div className="mb-5">
                      <p className="text-blue-300/80 text-xs font-rajdhani font-semibold mb-3 uppercase tracking-wider">谱面类型</p>
                      <div className="flex flex-wrap gap-2">
                        {chartTypes.map(({ value, label }) => {
                          const isActive = chartTypeFilter.has(value)
                          return (
                            <button
                              key={value}
                              onClick={() => toggleChartTypeFilter(value)}
                              className={`
                                relative px-4 py-2 rounded-xl font-orbitron font-black text-xs
                                transition-all duration-200 border
                                ${isActive
                                  ? 'text-white bg-gradient-to-b from-cyan-500 to-teal-600 border-cyan-400/50 shadow-[0_2px_12px_rgba(6,182,212,0.3)]'
                                  : 'text-white/60 bg-dark-card border-dark-border/50 hover:bg-dark-hover hover:text-white'
                                }
                              `}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* 流派筛选 */}
                    <div className="mb-5">
                      <p className="text-blue-300/80 text-xs font-rajdhani font-semibold mb-3 uppercase tracking-wider">流派</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setGenreFilter('')}
                          className={`
                            relative px-3 py-1.5 rounded-lg font-rajdhani font-bold text-xs
                            transition-all duration-200 border
                            ${!genreFilter
                              ? 'text-white bg-gradient-to-b from-indigo-500 to-indigo-600 border-indigo-400/50 shadow-[0_2px_12px_rgba(99,102,241,0.3)]'
                              : 'text-white/60 bg-dark-card border-dark-border/50 hover:bg-dark-hover hover:text-white'
                            }
                          `}
                        >
                          全部
                        </button>
                        {genres.map((genre) => (
                          <button
                            key={genre}
                            onClick={() => setGenreFilter(genre)}
                            className={`
                              relative px-3 py-1.5 rounded-lg font-rajdhani font-bold text-xs
                              transition-all duration-200 border
                              ${genre === genreFilter
                                ? 'text-white bg-gradient-to-b from-indigo-500 to-indigo-600 border-indigo-400/50 shadow-[0_2px_12px_rgba(99,102,241,0.3)]'
                                : 'text-white/60 bg-dark-card border-dark-border/50 hover:bg-dark-hover hover:text-white'
                              }
                            `}
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 难度区间 */}
                    <div className="mb-5">
                      <p className="text-blue-300/80 text-xs font-rajdhani font-semibold mb-3 uppercase tracking-wider">等级区间</p>

                      {/* 预设区间 */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {presetRanges.map((range) => {
                          const isActive = minLevel === range.min.toString() && maxLevel === range.max.toString()
                          return (
                            <button
                              key={range.label}
                              onClick={() => handlePresetRange(range.min, range.max)}
                              className={`
                                px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 border
                                ${isActive
                                  ? 'bg-gradient-to-b from-amber-500 to-orange-600 text-white border-amber-400/50 shadow-[0_2px_12px_rgba(245,158,11,0.3)]'
                                  : 'bg-dark-card text-white/60 border-dark-border/50 hover:bg-dark-hover hover:text-white'
                                }
                              `}
                            >
                              {range.label}
                            </button>
                          )
                        })}
                      </div>

                      {/* 自定义区间 */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={tempMin}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9+]/g, '')
                              const numPart = val.replace('+', '')
                              if (!numPart) {
                                setTempMin('')
                              } else if (parseInt(numPart) >= 1 && parseInt(numPart) <= 15) {
                                const hasPlus = val.includes('+')
                                setTempMin(numPart + (hasPlus ? '+' : ''))
                              }
                            }}
                            className="w-16 px-3 py-2 rounded-xl bg-dark-card text-white border-2 border-dark-border/50 font-bold text-center text-sm focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                            placeholder="1"
                          />
                        </div>
                        <span className="text-white/40 font-bold">-</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={tempMax}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9+]/g, '')
                              const numPart = val.replace('+', '')
                              if (!numPart) {
                                setTempMax('')
                              } else if (parseInt(numPart) >= 1 && parseInt(numPart) <= 15) {
                                const hasPlus = val.includes('+')
                                setTempMax(numPart + (hasPlus ? '+' : ''))
                              }
                            }}
                            className="w-16 px-3 py-2 rounded-xl bg-dark-card text-white border-2 border-dark-border/50 font-bold text-center text-sm focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                            placeholder="15"
                          />
                        </div>
                        <button
                          onClick={handleApplyLevelRange}
                          className="px-4 py-1.5 rounded-xl bg-gradient-to-b from-green-500 to-green-600 text-white font-bold border border-green-400/50 hover:from-green-400 hover:to-green-500 transition-all duration-200 shadow-[0_2px_12px_rgba(34,197,94,0.3)]"
                        >
                          应用
                        </button>
                      </div>
                    </div>

                    {/* 只选+难度 */}
                    <div className="mb-4">
                      <button
                        onClick={() => setIncludePlusOnly(!includePlusOnly)}
                        className={`
                          w-full px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 border flex items-center justify-center gap-2
                          ${includePlusOnly
                            ? 'bg-gradient-to-b from-amber-500 to-orange-600 text-white border-amber-400/50 shadow-[0_2px_12px_rgba(245,158,11,0.3)]'
                            : 'bg-dark-card text-white/60 border-dark-border/50 hover:bg-dark-hover hover:text-white'
                          }
                        `}
                      >
                        <Plus size={14} />
                        只选择 + 难度
                      </button>
                    </div>

                    {/* 底部：重置按钮 + 当前筛选状态 */}
                    <div className="border-t border-dark-border/30 pt-4 mt-4">
                      <button
                        onClick={handleResetLevelFilter}
                        className="w-full px-4 py-2 rounded-xl bg-gradient-to-b from-red-500/80 to-red-600/80 text-white font-bold border border-red-400/50 hover:from-red-500 hover:to-red-600 transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        <RotateCcw size={14} />
                        重置全部筛选
                      </button>
                      <div className="mt-3 text-center">
                        <p className="text-white/50 text-xs">
                          当前: 等级 {minLevel}-{maxLevel}
                          {includePlusOnly && ' | 仅+难度'}
                          {genreFilter && ` | 流派: ${genreFilter}`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Draw Button */}
            <div className="flex flex-col items-center gap-4 mb-6">
              <button
                onClick={handleDraw}
                disabled={filteredCount === 0 || shaking}
                className={`
                  group relative px-10 sm:px-20 py-5 sm:py-6 rounded-2xl font-orbitron font-black text-white text-xl sm:text-2xl
                  shadow-xl transition-all duration-300 border-4 overflow-hidden ring-1 ring-inset ring-white/20
                  ${filteredCount === 0 || shaking
                    ? 'bg-gray-600/50 border-gray-500/50 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-b from-red-500 to-red-700 border-red-400/50 hover:from-red-400 hover:to-red-600 hover:shadow-[0_8px_40px_rgba(239,68,68,0.4)] hover:-translate-y-1'
                  }
                  ${shaking ? 'animate-gachaShake' : ''}
                `}
              >
                {!shaking && filteredCount > 0 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer" />
                )}
                <span className="relative z-10 flex items-center gap-4 sm:gap-5">
                  <Gift size={32} className={shaking ? 'animate-gachaBounce' : 'group-hover:rotate-12 transition-transform duration-300'} />
                  {shaking ? '抽卡中...' : '开始抽卡'}
                  <Sparkles size={28} className={shaking ? 'animate-gachaSparkle' : 'opacity-80'} />
                </span>
              </button>
            </div>

            {/* Active Filter Tags */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {activeFilters.size < 5 && (
                  <span className="badge-info">
                    难度: {[...activeFilters].join(', ')}
                  </span>
                )}
                {chartTypeFilter.size < 2 && (
                  <span className="badge-info">
                    类型: {[...chartTypeFilter].map(t => t === 'dx' ? 'DX' : 'STD').join(', ')}
                  </span>
                )}
                {genreFilter && (
                  <span className="badge-warning">
                    流派: {genreFilter}
                  </span>
                )}
                {(minLevel !== '1' || maxLevel !== '15') && (
                  <span className="badge-warning">
                    等级: {minLevel}-{maxLevel}
                  </span>
                )}
                {includePlusOnly && (
                  <span className="badge-warning">
                    仅+难度
                  </span>
                )}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
    </header>
  )
}
