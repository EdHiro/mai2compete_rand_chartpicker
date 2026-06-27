import { Sparkles, Gift, RotateCcw, Plus, Database, ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useSongStore, type ChartType } from '@/store/songStore'
import { useState, useEffect, useMemo, useCallback } from 'react'
import MultiPoolImport from './MultiPoolImport'
import { cn } from '@/lib/utils'

const drawCounts = [1, 2, 3, 4]

const chartTypes: { value: ChartType; label: string }[] = [
  { value: 'standard', label: '标准谱面' },
  { value: 'dx', label: 'DX谱面' },
]

// 预设难度区间（支持 "13+" 这类带加号的字符串，会被 parseInputValue 正确解析为 13.5）
const presetRanges = [
  { label: '1-7', min: '1', max: '7' },
  { label: '8-11', min: '8', max: '11' },
  { label: '12-13', min: '12', max: '13' },
  { label: '13+', min: '13+', max: '13+' },
  { label: '14', min: '14', max: '14' },
  { label: '14+', min: '14+', max: '14+' },
  { label: '14-15', min: '14', max: '15'}
]

const difficultyConfig = [
  { value: 'BASIC' as const, label: 'BASIC', gradient: 'from-green-500 to-emerald-600', border: 'border-green-400/50', shadow: 'shadow-green-500/25', text: 'text-green-200' },
  { value: 'ADVANCED' as const, label: 'ADVANCED', gradient: 'from-yellow-500 to-amber-600', border: 'border-yellow-400/50', shadow: 'shadow-yellow-500/25', text: 'text-yellow-200' },
  { value: 'EXPERT' as const, label: 'EXPERT', gradient: 'from-pink-500 to-rose-600', border: 'border-pink-400/50', shadow: 'shadow-pink-500/25', text: 'text-pink-200' },
  { value: 'MASTER' as const, label: 'MASTER', gradient: 'from-purple-500 to-purple-700', border: 'border-purple-400/50', shadow: 'shadow-purple-500/25', text: 'text-purple-200' },
  { value: 'Re:MASTER' as const, label: 'Re:MASTER', gradient: 'from-amber-400 to-orange-500', border: 'border-amber-400/50', shadow: 'shadow-amber-500/25', text: 'text-amber-200' },
]

function parseLevelValue(level: number, isPlus: boolean): number {
  return isPlus ? level + 0.5 : level
}

function parseInputValue(val: string): number {
  const hasPlus = val.includes('+')
  const numPart = parseInt(val.replace('+', '')) || 1
  return hasPlus ? numPart + 0.5 : numPart
}

function formatLevelRange(min: string, max: string): string {
  if (min === max) return min
  return `${min}-${max}`
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-rajdhani font-bold text-[11px] uppercase tracking-[0.18em] text-white/40 mb-3">
      {children}
    </p>
  )
}

export default function GachaHeader() {
  const {
    drawCount, setDrawCount, drawSongs, setIsDrawing,
    minLevel, maxLevel, setLevelRange,
    includePlusOnly, setIncludePlusOnly, resetLevelFilter,
    songPools, drawMode, setDrawMode, selectedPools,
    chartTypeFilter, toggleChartTypeFilter,
    genreFilter, setGenreFilter,
    activeFilters, toggleFilter,
    multiDrawMode,
  } = useSongStore()

  const [shaking, setShaking] = useState(false)
  const [collapsed, setCollapsed] = useState(true)
  const [tempMin, setTempMin] = useState(minLevel)
  const [tempMax, setTempMax] = useState(maxLevel)
  const [showPoolManager, setShowPoolManager] = useState(false)

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

  const handleDraw = useCallback(() => {
    if (filteredCount === 0) return

    setShaking(true)
    setIsDrawing(true)

    setTimeout(() => {
      drawSongs(drawCount)
      setShaking(false)
      setIsDrawing(false)
    }, 2000)
  }, [filteredCount, drawCount, drawSongs, setIsDrawing])

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

  const handlePresetRange = (min: string, max: string) => {
    setTempMin(min)
    setTempMax(max)
    setLevelRange(min, max)
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

  const toggleCollapsed = () => setCollapsed((c) => !c)
  const expand = () => setCollapsed(false)

  return (
    <header className={cn(
      'sticky top-0 z-50 transition-all duration-500 ease-out animate-enter',
      !collapsed && 'max-h-[90vh]'
    )}>
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/80 via-violet-400/80 to-transparent z-10" />

      {/* Toolbar */}
      <div className="relative bg-[#0b0c15]/80 backdrop-blur-2xl border-b border-white/10 shadow-2xl shadow-black/40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
            {/* Brand */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={toggleCollapsed}
                className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all press-down"
                title={collapsed ? '展开' : '折叠'}
              >
                <ChevronDown size={18} className={cn('transition-transform duration-300', !collapsed && 'rotate-180')} />
              </button>

              <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 via-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Gift size={18} className="text-white" />
              </div>

              <div className="hidden sm:block min-w-0">
                <h1 className="font-orbitron font-black text-base md:text-lg title-gradient truncate leading-tight">
                  抽卡选谱
                </h1>
                <p className="font-rajdhani text-[10px] uppercase tracking-[0.2em] text-white/40 truncate leading-none">
                  Gacha Terminal
                </p>
              </div>

              {filteredCount > 0 && (
                <span className="hidden md:inline-flex badge-info ml-1">
                  {filteredCount} 张候选
                </span>
              )}
            </div>

            {/* Draw count segment */}
            <div className="flex items-center p-1 rounded-2xl bg-white/5 border border-white/10">
              {drawCounts.map((count) => (
                <button
                  key={count}
                  onClick={() => setDrawCount(count)}
                  disabled={shaking}
                  className={cn(
                    'relative px-2.5 sm:px-4 py-1.5 rounded-xl font-orbitron font-bold text-xs sm:text-sm transition-all duration-200 min-w-[2.25rem] press-down',
                    drawCount === count
                      ? 'text-white bg-gradient-to-b from-amber-400 to-orange-600 shadow-[0_0_16px_rgba(245,158,11,0.45)]'
                      : 'text-white/50 hover:text-white hover:bg-white/5',
                    shaking && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {count}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={expand}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl border text-xs font-bold transition-all press-down',
                  activeFilterCount > 0
                    ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-100 shadow-[0_0_16px_rgba(6,182,212,0.2)]'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/20'
                )}
              >
                <SlidersHorizontal size={14} />
                <span className="hidden sm:inline">筛选</span>
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 px-1.5 py-0 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <button
                onClick={handleDraw}
                disabled={filteredCount === 0 || shaking}
                className={cn(
                  'group relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl font-orbitron font-bold text-white text-xs sm:text-sm border overflow-hidden transition-all duration-300 press-down btn-shimmer',
                  filteredCount === 0 || shaking
                    ? 'bg-white/5 border-white/10 cursor-not-allowed opacity-50'
                    : 'bg-gradient-to-b from-rose-500 to-rose-700 border-rose-400/50 hover:from-rose-400 hover:to-rose-600 hover:shadow-[0_4px_24px_rgba(244,63,94,0.45)] hover:-translate-y-0.5',
                  shaking && 'animate-gachaShake'
                )}
              >
                {!shaking && filteredCount > 0 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer" />
                )}
                <Gift size={16} className={cn('relative z-10', shaking && 'animate-gachaBounce')} />
                <span className="relative z-10 hidden sm:inline">{shaking ? '抽选中…' : '开始抽谱'}</span>
                <Sparkles size={14} className="relative z-10 hidden sm:block opacity-80" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible control deck */}
      <div className={cn(
        'overflow-hidden transition-all duration-500 ease-out bg-[#0b0c15]/80 backdrop-blur-2xl border-b border-white/10',
        collapsed ? 'max-h-0 opacity-0' : 'max-h-[85vh] opacity-100 overflow-y-auto'
      )}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-5 space-y-5">
          {/* Active filter strip */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-thin pb-1 stagger-children">
              <span className="font-rajdhani font-bold text-[11px] uppercase tracking-wider text-white/40 shrink-0">
                已启用
              </span>
              <div className="flex items-center gap-2">
                {activeFilters.size < 5 && (
                  <span className="badge-info whitespace-nowrap">难度: {[...activeFilters].join(', ')}</span>
                )}
                {chartTypeFilter.size < 2 && (
                  <span className="badge-info whitespace-nowrap">类型: {[...chartTypeFilter].map(t => t === 'dx' ? 'DX' : 'STD').join(', ')}</span>
                )}
                {genreFilter && (
                  <span className="badge-warning whitespace-nowrap">流派: {genreFilter}</span>
                )}
                {(minLevel !== '1' || maxLevel !== '15') && (
                  <span className="badge-warning whitespace-nowrap">等级: {formatLevelRange(minLevel, maxLevel)}</span>
                )}
                {includePlusOnly && (
                  <span className="badge-warning whitespace-nowrap">仅+难度</span>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5">
            {/* Filters */}
            <section className="lg:col-span-8 glass-panel rounded-3xl p-4 sm:p-5 animate-enter">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Difficulty */}
                <div>
                  <SectionLabel>难度筛选</SectionLabel>
                  <div className="flex flex-wrap gap-2 stagger-children">
                    {difficultyConfig.map(({ value, label, gradient, border, shadow, text }) => {
                      const isActive = activeFilters.has(value)
                      return (
                        <button
                      key={value}
                      onClick={() => toggleFilter(value)}
                      className={cn(
                        'relative px-3 py-2 rounded-xl font-orbitron font-black text-xs border transition-all duration-200 press-down',
                        isActive
                          ? `text-white bg-gradient-to-b ${gradient} ${border} shadow-lg ${shadow} scale-[1.02]`
                          : `bg-white/5 border-white/10 ${text} hover:bg-white/10 hover:text-white hover:border-white/20`
                      )}
                    >
                      {label}
                    </button>
                      )
                    })}
                  </div>
                </div>

                {/* Chart type */}
                <div>
                  <SectionLabel>谱面类型</SectionLabel>
                  <div className="flex flex-wrap gap-2 stagger-children">
                    {chartTypes.map(({ value, label }) => {
                      const isActive = chartTypeFilter.has(value)
                      return (
                        <button
                          key={value}
                          onClick={() => toggleChartTypeFilter(value)}
                          className={cn(
                            'relative px-3 py-2 rounded-xl font-orbitron font-black text-xs border transition-all duration-200 press-down',
                            isActive
                              ? 'text-white bg-gradient-to-b from-cyan-500 to-teal-600 border-cyan-400/50 shadow-lg shadow-cyan-500/25 scale-[1.02]'
                              : 'bg-white/5 border-white/10 text-cyan-200 hover:bg-white/10 hover:text-white hover:border-white/20'
                          )}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Genre */}
                <div className="md:col-span-2">
                  <SectionLabel>流派</SectionLabel>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto scrollbar-thin pr-1">
                    <button
                      onClick={() => setGenreFilter('')}
                      className={cn(
                        'px-3 py-1.5 rounded-xl font-rajdhani font-bold text-xs border transition-all duration-200 press-down',
                        !genreFilter
                          ? 'text-white bg-gradient-to-b from-indigo-500 to-indigo-600 border-indigo-400/50 shadow-lg shadow-indigo-500/25'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/20'
                      )}
                    >
                      全部
                    </button>
                    {genres.map((genre) => (
                      <button
                        key={genre}
                        onClick={() => setGenreFilter(genre)}
                        className={cn(
                          'px-3 py-1.5 rounded-xl font-rajdhani font-bold text-xs border transition-all duration-200 press-down',
                          genre === genreFilter
                            ? 'text-white bg-gradient-to-b from-indigo-500 to-indigo-600 border-indigo-400/50 shadow-lg shadow-indigo-500/25'
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/20'
                        )}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Level range */}
                <div className="md:col-span-2">
                  <SectionLabel>等级区间</SectionLabel>
                  <div className="flex flex-wrap gap-2 mb-3 stagger-children">
                    {presetRanges.map((range) => {
                      const isActive = minLevel === range.min && maxLevel === range.max
                      return (
                        <button
                          key={range.label}
                          onClick={() => handlePresetRange(range.min, range.max)}
                          className={cn(
                            'px-3 py-1.5 rounded-xl font-rajdhani font-bold text-xs border transition-all duration-200 press-down',
                            isActive
                              ? 'text-white bg-gradient-to-b from-amber-500 to-orange-600 border-amber-400/50 shadow-lg shadow-amber-500/25'
                              : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/20'
                          )}
                        >
                          {range.label}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex items-center gap-2">
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
                      className="input-refined w-16 px-3 py-2 text-center text-sm font-bold"
                      placeholder="1"
                    />
                    <span className="text-white/40 font-bold">-</span>
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
                      className="input-refined w-16 px-3 py-2 text-center text-sm font-bold"
                      placeholder="15"
                    />
                    <button
                      onClick={handleApplyLevelRange}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 text-white font-bold text-xs border border-emerald-400/50 hover:from-emerald-400 hover:to-emerald-500 transition-all duration-200 shadow-[0_2px_12px_rgba(34,197,94,0.3)] press-down"
                    >
                      应用
                    </button>
                  </div>
                </div>

                {/* Plus only */}
                <div className="md:col-span-2">
                  <button
                    onClick={() => setIncludePlusOnly(!includePlusOnly)}
                    className={cn(
                      'w-full px-4 py-2.5 rounded-xl font-rajdhani font-bold text-sm border transition-all duration-200 flex items-center justify-center gap-2 press-down',
                      includePlusOnly
                        ? 'text-white bg-gradient-to-b from-amber-500 to-orange-600 border-amber-400/50 shadow-lg shadow-amber-500/25'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white hover:border-white/20'
                    )}
                  >
                    <Plus size={14} />
                    只选择 + 难度
                  </button>
                </div>
              </div>
            </section>

            {/* Settings */}
            <section className="lg:col-span-4 flex flex-col gap-4 lg:gap-5 animate-enter">
              <div className="glass-panel rounded-3xl p-4 sm:p-5">
                <SectionLabel>曲库设置</SectionLabel>

                <div className="flex flex-wrap gap-2 mb-3">
                  <button
                    onClick={() => setShowPoolManager(!showPoolManager)}
                    className="btn-secondary text-xs press-down"
                  >
                    <Database size={14} />
                    {showPoolManager ? '收起管理' : '管理曲库'}
                  </button>
                  {(songPools.length > 0 || songs.length > 0) && (
                    <button
                      onClick={() => setDrawMode(drawMode === 'multi' ? 'single' : 'multi')}
                      className={cn(
                        'relative inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-rajdhani font-bold text-xs text-white border shadow-lg transition-all duration-200 press-down',
                        drawMode === 'multi'
                          ? 'bg-gradient-to-b from-yellow-500 to-orange-600 border-yellow-300/50'
                          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                      )}
                    >
                      {drawMode === 'multi' ? '多库抽取 ✓' : '单库抽取'}
                    </button>
                  )}
                </div>

                {showPoolManager && (
                  <div className="mt-3">
                    <MultiPoolImport />
                  </div>
                )}

                {drawMode === 'multi' && (
                  <p className="mt-3 text-green-200/80 text-xs font-rajdhani">
                    多库模式：已选中 {selectedPools.length} 个曲库
                    {multiDrawMode === 'perPool' ? '，按库抽取' : `，混合抽取 ${drawCount} 张`}
                  </p>
                )}
              </div>

              <div className="glass-panel rounded-3xl p-4 sm:p-5">
                <SectionLabel>当前状态</SectionLabel>
                <div className="flex flex-wrap gap-2 stagger-children">
                  <span className="chip">抽取 {drawCount} 张</span>
                  <span className="chip">等级 {formatLevelRange(minLevel, maxLevel)}</span>
                  {includePlusOnly && <span className="chip">仅 + 难度</span>}
                  {genreFilter && <span className="chip">流派: {genreFilter}</span>}
                  <span className="chip text-cyan-200">
                    候选 <span className="text-white font-bold">{filteredCount}</span> 张
                  </span>
                </div>
              </div>

              <button
                onClick={handleResetLevelFilter}
                className="btn-danger w-full text-xs sm:text-sm press-down"
              >
                <RotateCcw size={14} />
                重置全部筛选
              </button>
            </section>
          </div>

          {/* Main draw CTA */}
          <div className="flex justify-center pt-2">
            <button
              onClick={handleDraw}
              disabled={filteredCount === 0 || shaking}
              className={cn(
                'group relative px-10 sm:px-20 py-5 sm:py-6 rounded-3xl font-orbitron font-black text-white text-xl sm:text-2xl border-[3px] overflow-hidden ring-1 ring-inset ring-white/20 transition-all duration-300 press-down btn-shimmer',
                filteredCount === 0 || shaking
                  ? 'bg-white/5 border-white/10 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-b from-rose-500 to-rose-700 border-rose-400/50 hover:from-rose-400 hover:to-rose-600 hover:shadow-[0_8px_40px_rgba(244,63,94,0.45)] hover:-translate-y-1',
                shaking && 'animate-gachaShake'
              )}
            >
              {!shaking && filteredCount > 0 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shimmer" />
              )}
              <span className="relative z-10 flex items-center gap-4 sm:gap-5">
                <Gift size={32} className={cn(shaking ? 'animate-gachaBounce' : 'group-hover:rotate-12 transition-transform duration-300')} />
                {shaking ? '抽卡中…' : '开始抽卡'}
                <Sparkles size={28} className={cn(shaking && 'animate-gachaSparkle')} />
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
