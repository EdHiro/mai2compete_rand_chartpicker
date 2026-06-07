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
    <header className={`sticky top-0 z-[100] bg-gradient-to-b from-blue-700 to-dark-bg border-b-4 border-blue-500 shadow-lg transition-all duration-500 ease-in-out ${collapsed ? '' : 'max-h-[80vh] overflow-y-auto'}`}>
      {/* Decorative top bar */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-pink-500" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* ========== 紧凑工具栏（始终可见，折叠时更突出） ========== */}
        <div className={`flex items-center justify-between gap-2 px-3 sm:px-4 transition-all duration-500 ease-in-out ${collapsed ? 'py-2' : 'py-3'}`}>
          {/* 左侧：展开按钮 + 谱面数 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg font-orbitron font-bold text-white text-xs
                bg-gradient-to-b from-blue-600 to-blue-700 border-2 border-blue-400
                hover:from-blue-500 hover:to-blue-600 transition-all duration-200"
              title={collapsed ? '展开' : '折叠'}
            >
              <ChevronDownIcon size={14} className={`transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`} />
              <span className="hidden sm:inline">{collapsed ? '展开' : '折叠'}</span>
            </button>
            {filteredCount > 0 && (
              <span className="font-rajdhani text-blue-200 text-xs whitespace-nowrap">
                {filteredCount} 张谱面
              </span>
            )}
          </div>

          {/* 中间：抽卡数量选择 + 筛选条件 */}
          <div className="flex items-center gap-1.5">
            {drawCounts.map((count) => (
              <button
                key={count}
                onClick={() => setDrawCount(count)}
                disabled={shaking}
                className={`
                  px-2 py-1 rounded-lg font-orbitron font-bold text-xs
                  transition-all duration-200 border-2
                  ${shaking ? 'opacity-50 cursor-not-allowed' : ''}
                  ${drawCount === count
                    ? 'text-white bg-gradient-to-b from-yellow-500 to-orange-600 border-yellow-300 scale-105'
                    : 'text-blue-200 bg-blue-800/50 border-blue-600 hover:bg-blue-700/50'
                  }
                `}
              >
                {count}
              </button>
            ))}

            <button
              onClick={() => { setCollapsed(false); setShowFilters(true) }}
              className={`
                flex items-center gap-1 px-2 py-1 rounded-lg font-rajdhani font-bold text-xs
                transition-all duration-200 border-2
                ${activeFilterCount > 0
                  ? 'text-white bg-gradient-to-b from-teal-500 to-teal-600 border-teal-400'
                  : 'text-teal-200 bg-teal-800/40 border-teal-600 hover:bg-teal-700/50'
                }
              `}
            >
              <Filter size={12} />
              <span className="hidden sm:inline">筛选</span>
              {activeFilterCount > 0 && (
                <span className="ml-0.5 px-1 py-0 rounded-full bg-yellow-400 text-yellow-900 text-[10px] font-black">
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
              flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl font-orbitron font-bold text-white text-xs sm:text-sm
              shadow-md transition-all duration-300 border-2 overflow-hidden relative
              ${filteredCount === 0 || shaking
                ? 'bg-gray-500 border-gray-400 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-b from-red-500 to-red-700 border-red-300 hover:from-red-400 hover:to-red-600'
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
          <div className="px-4 pb-6">
            {/* Title Section */}
            <div className="text-center mb-6">
              <div className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-2 rounded-xl border-3 border-blue-400 mb-3 shadow-lg">
                <p className="text-white font-rajdhani font-bold text-sm sm:text-lg">
                  请选择要抽取的谱面数量
                </p>
              </div>
              <h1 className="font-orbitron font-black text-2xl sm:text-3xl md:text-4xl text-white drop-shadow-lg mb-1">
                抽卡选谱
              </h1>
              {filteredCount > 0 && (
                <p className="font-rajdhani text-blue-200 text-xs sm:text-sm">
                  共有 {filteredCount} 张可抽选的谱面
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
                    transition-all duration-200 border-4 shadow-lg
                    ${shaking ? 'opacity-50 cursor-not-allowed' : ''}
                    ${drawCount === count
                      ? 'text-white bg-gradient-to-b from-yellow-500 to-orange-600 border-yellow-300 scale-110 shadow-yellow-500/50'
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
                    bg-gradient-to-b from-green-600 to-green-700 border-4 border-green-400 shadow-lg
                    hover:from-green-500 hover:to-green-600 transition-all duration-200 flex items-center gap-2"
                >
                  <Database size={16} />
                  谱面管理 {showPoolManager ? '▲' : '▼'}
                </button>
                {(songPools.length > 0 || songs.length > 0) && (
                  <button
                    onClick={() => setDrawMode(drawMode === 'multi' ? 'single' : 'multi')}
                    className={`
                      relative px-4 sm:px-6 py-2 rounded-xl font-rajdhani font-bold text-white text-xs sm:text-sm
                      border-4 shadow-lg transition-all duration-200
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
                    bg-gradient-to-b from-teal-600 to-teal-700 border-4 border-teal-400 shadow-lg
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
                  <div className="mt-4 w-full max-h-[60vh] overflow-y-auto bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl border-2 border-teal-400 shadow-2xl p-5">
                    {/* 难度筛选 */}
                    <div className="mb-5">
                      <p className="text-teal-300 text-xs font-rajdhani font-semibold mb-2 uppercase tracking-wider">难度筛选</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'BASIC' as const, label: 'BASIC', gradient: 'from-green-500 to-emerald-600', border: 'border-green-400' },
                          { value: 'ADVANCED' as const, label: 'ADVANCED', gradient: 'from-yellow-600 to-yellow-400', border: 'border-yellow-400' },
                          { value: 'EXPERT' as const, label: 'EXPERT', gradient: 'from-pink-500 to-red-600', border: 'border-red-400' },
                          { value: 'MASTER' as const, label: 'MASTER', gradient: 'from-purple-600 to-purple-800', border: 'border-purple-400' },
                          { value: 'Re:MASTER' as const, label: 'Re:MASTER', gradient: 'from-purple-100 to-purple-500', border: 'border-purple-400' },
                        ].map(({ value, label, gradient, border }) => {
                          const isActive = activeFilters.has(value)
                          return (
                            <button
                              key={value}
                              onClick={() => toggleFilter(value)}
                              className={`
                                relative px-5 py-2 rounded-xl font-orbitron font-black text-sm
                                transition-all duration-200 border-4 shadow-lg
                                ${isActive
                                  ? `text-white bg-gradient-to-b ${gradient} ${border} scale-105 shadow-black/30`
                                  : 'text-white bg-gradient-to-b from-gray-600 to-gray-700 border-gray-500 hover:from-gray-500 hover:to-gray-600'
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
                      <p className="text-teal-300 text-xs font-rajdhani font-semibold mb-2 uppercase tracking-wider">谱面类型</p>
                      <div className="flex flex-wrap gap-2">
                        {chartTypes.map(({ value, label }) => {
                          const isActive = chartTypeFilter.has(value)
                          return (
                            <button
                              key={value}
                              onClick={() => toggleChartTypeFilter(value)}
                              className={`
                                relative px-5 py-2 rounded-xl font-orbitron font-black text-sm
                                transition-all duration-200 border-4 shadow-lg
                                ${isActive
                                  ? 'text-white bg-gradient-to-b from-cyan-500 to-teal-600 border-cyan-400 scale-105 shadow-black/30'
                                  : 'text-white bg-gradient-to-b from-gray-600 to-gray-700 border-gray-500 hover:from-gray-500 hover:to-gray-600'
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
                      <p className="text-teal-300 text-xs font-rajdhani font-semibold mb-2 uppercase tracking-wider">流派</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setGenreFilter('')}
                          className={`
                            relative px-4 py-2 rounded-xl font-rajdhani font-bold text-sm
                            transition-all duration-200 border-3
                            ${!genreFilter
                              ? 'text-white bg-gradient-to-b from-indigo-500 to-indigo-600 border-indigo-400'
                              : 'text-slate-300 bg-gradient-to-b from-slate-600 to-slate-700 border-slate-500 hover:from-slate-500 hover:to-slate-600'
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
                              relative px-4 py-2 rounded-xl font-rajdhani font-bold text-sm
                              transition-all duration-200 border-3
                              ${genre === genreFilter
                                ? 'text-white bg-gradient-to-b from-indigo-500 to-indigo-600 border-indigo-400'
                                : 'text-slate-300 bg-gradient-to-b from-slate-600 to-slate-700 border-slate-500 hover:from-slate-500 hover:to-slate-600'
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
                      <p className="text-teal-300 text-xs font-rajdhani font-semibold mb-2 uppercase tracking-wider">等级区间</p>

                      {/* 预设区间 */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {presetRanges.map((range) => {
                          const isActive = minLevel === range.min.toString() && maxLevel === range.max.toString()
                          return (
                            <button
                              key={range.label}
                              onClick={() => handlePresetRange(range.min, range.max)}
                              className={`
                                px-3 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 border-2
                                ${isActive
                                  ? 'bg-gradient-to-b from-yellow-500 to-orange-600 border-yellow-300 text-white'
                                  : 'bg-gradient-to-b from-slate-600 to-slate-700 border-slate-500 text-white hover:from-slate-500 hover:to-slate-600'
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
                            className="w-16 px-2 py-1.5 rounded-lg bg-slate-700 text-white border border-teal-500 font-bold text-center"
                            placeholder="1"
                          />
                        </div>
                        <span className="text-teal-300 font-bold">-</span>
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
                            className="w-16 px-2 py-1.5 rounded-lg bg-slate-700 text-white border border-teal-500 font-bold text-center"
                            placeholder="15"
                          />
                        </div>
                        <button
                          onClick={handleApplyLevelRange}
                          className="px-4 py-1.5 rounded-lg bg-gradient-to-b from-green-500 to-green-600 text-white font-bold border border-green-400 hover:from-green-400 hover:to-green-500 transition-all duration-200"
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
                          w-full px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 border-2 flex items-center justify-center gap-2
                          ${includePlusOnly
                            ? 'bg-gradient-to-b from-yellow-500 to-orange-600 border-yellow-300 text-white'
                            : 'bg-gradient-to-b from-slate-600 to-slate-700 border-slate-500 text-slate-300 hover:from-slate-500 hover:to-slate-600'
                          }
                        `}
                      >
                        <Plus size={16} />
                        只选择 + 难度
                      </button>
                    </div>

                    {/* 底部：重置按钮 + 当前筛选状态 */}
                    <div className="border-t border-slate-600 pt-4 mt-4">
                      <button
                        onClick={handleResetLevelFilter}
                        className="w-full px-4 py-2 rounded-lg bg-gradient-to-b from-red-500 to-red-600 text-white font-bold border border-red-400 hover:from-red-400 hover:to-red-500 transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        <RotateCcw size={16} />
                        重置全部筛选
                      </button>
                      <div className="mt-3 text-center">
                        <p className="text-teal-300 text-xs">
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
                  group relative px-8 sm:px-16 py-4 sm:py-6 rounded-2xl font-orbitron font-black text-white text-xl sm:text-2xl
                  shadow-lg transition-all duration-300 border-4 overflow-hidden
                  ${filteredCount === 0 || shaking
                    ? 'bg-gray-500 border-gray-400 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-b from-red-500 to-red-700 border-red-300 hover:from-red-400 hover:to-red-600 hover:shadow-red-500/30'
                  }
                  ${shaking ? 'animate-gachaShake' : 'hover:scale-105'}
                `}
              >
                {!shaking && filteredCount > 0 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer" />
                )}
                <span className="relative z-10 flex items-center gap-3 sm:gap-4">
                  <Gift size={28} className={shaking ? 'animate-gachaBounce' : 'group-hover:rotate-12 transition-transform duration-300'} />
                  {shaking ? '抽卡中...' : '开始抽卡'}
                  <Sparkles size={24} className={shaking ? 'animate-gachaSparkle' : 'opacity-80'} />
                </span>
              </button>
            </div>

            {/* Active Filter Tags */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {activeFilters.size < 5 && (
                  <span className="px-3 py-1 rounded-full bg-slate-700 text-slate-300 text-xs font-rajdhani font-bold border border-slate-500">
                    难度: {[...activeFilters].join(', ')}
                  </span>
                )}
                {chartTypeFilter.size < 2 && (
                  <span className="px-3 py-1 rounded-full bg-slate-700 text-slate-300 text-xs font-rajdhani font-bold border border-slate-500">
                    类型: {[...chartTypeFilter].map(t => t === 'dx' ? 'DX' : 'STD').join(', ')}
                  </span>
                )}
                {genreFilter && (
                  <span className="px-3 py-1 rounded-full bg-slate-700 text-slate-300 text-xs font-rajdhani font-bold border border-slate-500">
                    流派: {genreFilter}
                  </span>
                )}
                {(minLevel !== '1' || maxLevel !== '15') && (
                  <span className="px-3 py-1 rounded-full bg-slate-700 text-slate-300 text-xs font-rajdhani font-bold border border-slate-500">
                    等级: {minLevel}-{maxLevel}
                  </span>
                )}
                {includePlusOnly && (
                  <span className="px-3 py-1 rounded-full bg-yellow-600 text-white text-xs font-rajdhani font-bold border border-yellow-400">
                    仅+难度
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
