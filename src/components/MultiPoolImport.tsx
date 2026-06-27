import { useRef, useState, useMemo } from 'react'
import { Upload, Trash2, Database, AlertCircle, CheckCircle, Square, Shuffle, Layers, Eye, Minus, Plus } from 'lucide-react'
import { useSongStore, type Song, type Difficulty, type ChartType, type MultiDrawMode } from '@/store/songStore'
import { cn } from '@/lib/utils'

interface PoolImportResult {
  success: boolean
  message: string
  count: number
  name: string
  poolId?: string
}

function PoolCheckbox({ checked, disabled, onChange }: { checked: boolean; disabled: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`w-6 h-6 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      {checked ? (
        <div className="w-5 h-5 rounded bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center border-2 border-white/40 shadow-lg shadow-violet-500/20">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      ) : (
        <Square size={20} className={disabled ? 'text-white/20' : 'text-white/40'} />
      )}
    </button>
  )
}

export default function MultiPoolImport() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importResult, setImportResult] = useState<PoolImportResult | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const addSongPool = useSongStore((state) => state.addSongPool)
  const removeSongPool = useSongStore((state) => state.removeSongPool)
  const togglePoolSelection = useSongStore((state) => state.togglePoolSelection)
  const setMultiDrawMode = useSongStore((state) => state.setMultiDrawMode)
  const setPerPoolDrawCount = useSongStore((state) => state.setPerPoolDrawCount)
  const getDrawPreview = useSongStore((state) => state.getDrawPreview)

  const songPools = useSongStore((state) => state.songPools)
  const selectedPools = useSongStore((state) => state.selectedPools)
  const songs = useSongStore((state) => state.songs)
  const drawMode = useSongStore((state) => state.drawMode)
  const activePoolId = useSongStore((state) => state.activePoolId)
  const setActivePoolIdLocal = useSongStore((state) => state.setActivePoolId)
  const drawCount = useSongStore((state) => state.drawCount)
  const multiDrawMode = useSongStore((state) => state.multiDrawMode)
  const perPoolDrawCounts = useSongStore((state) => state.perPoolDrawCounts)

  const preview = useMemo(() => getDrawPreview(), [getDrawPreview, selectedPools, multiDrawMode, perPoolDrawCounts, drawCount])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      setImportResult({
        success: false,
        message: '请选择 JSON 文件',
        count: 0,
        name: file.name
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        const result = validateAndParseSongs(data)

        if (result.success && result.songs) {
          const poolName = file.name.replace('.json', '')
          const poolId = addSongPool(poolName, result.songs)
          setActivePoolIdLocal(poolId)
          if (drawMode === 'multi' && poolId !== 'main') {
            togglePoolSelection(poolId)
          }
          setImportResult({
            success: true,
            message: `成功导入 ${result.songs.length} 张谱面到曲库 "${poolName}"`,
            count: result.songs.length,
            name: poolName,
            poolId
          })
        } else {
          setImportResult({
            success: false,
            message: result.error || '导入失败',
            count: 0,
            name: file.name
          })
        }
      } catch {
        setImportResult({
          success: false,
          message: 'JSON 文件格式错误',
          count: 0,
          name: file.name
        })
      }
    }
    reader.readAsText(file)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemovePool = (poolId: string) => {
    removeSongPool(poolId)
  }

  const hasMainPool = songs.length > 0
  // 按库抽取时限制最多选择 drawCount 个曲库；混合抽取无限制
  const maxSelections = multiDrawMode === 'perPool' ? drawCount : Infinity
  const isAtLimit = multiDrawMode === 'perPool' && selectedPools.length >= maxSelections

  // 按库抽取时的总抽取数
  const totalPerPoolDraws = selectedPools.reduce((sum, pid) => sum + (perPoolDrawCounts[pid] || 1), 0)

  return (
    <div className="w-full max-w-lg mx-auto animate-enter">
      <div className="glass-panel rounded-3xl p-5 shadow-2xl shadow-black/40">
        {/* 标题栏 */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Database size={18} className="text-white" />
          </div>
          <h3 className="font-rajdhani font-bold text-white text-lg animate-enter">多谱面库管理</h3>
          <span className="ml-auto text-xs text-violet-200 chip">已选 {selectedPools.length} 个谱面库</span>
        </div>

        {/* 导入按钮 */}
        <div className="mb-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary w-full press-down btn-shimmer"
          >
            <Upload size={18} />
            导入谱面库 (JSON)
          </button>
        </div>

        {/* 导入结果 */}
        {importResult && (
          <div className={cn(
            'mb-4 p-3 rounded-2xl flex items-center gap-2 backdrop-blur-md border',
            importResult.success
              ? 'bg-green-500/10 border-green-400/30'
              : 'bg-rose-500/10 border-rose-400/30'
          )}>
            {importResult.success ? (
              <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-rose-400 flex-shrink-0" />
            )}
            <p className={cn('text-sm', importResult.success ? 'text-green-200' : 'text-rose-200')}>
              {importResult.message}
            </p>
          </div>
        )}

        {/* 抽取模式选择（仅多库模式且非单抽时显示） */}
        {drawMode === 'multi' && drawCount > 1 && selectedPools.length > 0 && (
          <div className="mb-4 p-4 rounded-3xl glass-panel">
            <p className="text-white/50 text-xs font-rajdhani font-semibold mb-2 uppercase tracking-wider">抽取模式</p>
            <div className="flex gap-2">
              <button
                onClick={() => setMultiDrawMode('mixed')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200 border',
                  multiDrawMode === 'mixed'
                    ? 'btn-primary border-transparent'
                    : 'btn-secondary'
                )}
              >
                <Shuffle size={14} />
                混合抽取
              </button>
              <button
                onClick={() => setMultiDrawMode('perPool')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200 border',
                  multiDrawMode === 'perPool'
                    ? 'btn-primary border-transparent'
                    : 'btn-secondary'
                )}
              >
                <Layers size={14} />
                按库抽取
              </button>
            </div>

            {/* 模式说明 */}
            <p className="text-white/40 text-xs mt-2">
              {multiDrawMode === 'mixed'
                ? `从所有选中谱面库中随机混合抽取 ${drawCount} 张谱面`
                : `从每个选中谱面库中分别抽取指定数量的谱面`
              }
            </p>

            {/* 按库抽取：数量设置 */}
            {multiDrawMode === 'perPool' && (
              <div className="mt-3 space-y-2">
                <p className="text-white/60 text-xs font-rajdhani">每库抽取数量（最多 {drawCount} 张）</p>
                {selectedPools.map(poolId => {
                  const pool = poolId === 'main'
                    ? { id: 'main', name: '主库' }
                    : songPools.find(p => p.id === poolId)
                  if (!pool) return null
                  const count = perPoolDrawCounts[poolId] || 1
                  return (
                    <div key={poolId} className="flex items-center justify-between px-3 py-2 rounded-xl glass-panel">
                      <span className="text-white text-sm font-bold truncate">{pool.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPerPoolDrawCount(poolId, count - 1)}
                          disabled={count <= 1}
                          className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                            count <= 1
                              ? 'btn-secondary opacity-50 cursor-not-allowed'
                              : 'btn-secondary hover:border-white/20'
                          )}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-white font-rajdhani font-bold w-6 text-center">{count}</span>
                        <button
                          onClick={() => setPerPoolDrawCount(poolId, count + 1)}
                          disabled={count >= drawCount}
                          className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center transition-colors press-down',
                            count >= drawCount
                              ? 'btn-secondary opacity-50 cursor-not-allowed'
                              : 'btn-secondary hover:border-white/20'
                          )}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
                <p className="text-white/40 text-xs">
                  总计将抽取 {totalPerPoolDraws} 张谱面
                </p>
              </div>
            )}

            {/* 抽取预览 */}
            <div className="mt-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1 text-violet-300 text-xs font-rajdhani hover:text-violet-200 transition-colors"
              >
                <Eye size={14} />
                {showPreview ? '隐藏预览' : '显示预览'}
              </button>
              {showPreview && (
                <div className="mt-2 space-y-1.5">
                  {preview.map(item => (
                    <div
                      key={item.poolId}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 rounded-xl text-xs backdrop-blur-md border',
                        item.available >= item.count
                          ? 'bg-green-500/10 border-green-400/30'
                          : item.available > 0
                            ? 'bg-yellow-500/10 border-yellow-400/30'
                            : 'bg-rose-500/10 border-rose-400/30'
                      )}
                    >
                      <span className="text-white font-bold">{item.poolName}</span>
                      <span className="text-white/60">
                        {multiDrawMode === 'perPool'
                          ? `抽 ${item.count} 张 / 可用 ${item.available} 张`
                          : `可用 ${item.available} 张`
                        }
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 曲库列表 */}
        {(hasMainPool || songPools.length > 0) && (
          <div className="space-y-2">
            <p className="text-white/60 text-sm font-rajdhani font-semibold mb-2">
              曲库列表 ({(hasMainPool ? 1 : 0) + songPools.length})
            </p>

            {/* Main pool */}
            {hasMainPool && (
              <div
                onClick={() => { if (drawMode === 'single') setActivePoolIdLocal('main') }}
                role={drawMode === 'single' ? 'button' : undefined}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200 cursor-pointer',
                  (drawMode === 'multi' && selectedPools.includes('main')) || (drawMode === 'single' && activePoolId === 'main')
                    ? 'glass-panel border-violet-400/50 shadow-lg shadow-violet-500/10'
                    : 'glass-panel hover:border-white/20'
                )}
              >
                {drawMode === 'multi' && (
                  <PoolCheckbox
                    checked={selectedPools.includes('main')}
                    disabled={!selectedPools.includes('main') && isAtLimit}
                    onChange={() => togglePoolSelection('main')}
                  />
                )}
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Database size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold">主库</p>
                  <p className="text-white/40 text-xs">{songs.length} 张谱面</p>
                </div>
                {drawMode === 'multi' && selectedPools.includes('main') && multiDrawMode === 'perPool' && (
                  <span className="text-violet-300 text-xs font-rajdhani">
                    抽 {perPoolDrawCounts['main'] || 1} 张
                  </span>
                )}
                {drawMode === 'single' && activePoolId === 'main' && (
                  <span className="ml-2 text-xs badge-success">当前激活</span>
                )}
              </div>
            )}

            {/* Imported pools */}
            {songPools.map((pool) => (
              <div
                key={pool.id}
                onClick={() => { if (drawMode === 'single') setActivePoolIdLocal(pool.id) }}
                role={drawMode === 'single' ? 'button' : undefined}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200 cursor-pointer hover-lift',
                  (drawMode === 'multi' && selectedPools.includes(pool.id)) || (drawMode === 'single' && activePoolId === pool.id)
                    ? 'glass-panel border-violet-400/50 shadow-lg shadow-violet-500/10'
                    : 'glass-panel hover:border-white/20'
                )}
              >
                {drawMode === 'multi' && (
                  <PoolCheckbox
                    checked={selectedPools.includes(pool.id)}
                    disabled={!selectedPools.includes(pool.id) && isAtLimit}
                    onChange={() => togglePoolSelection(pool.id)}
                  />
                )}
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <Database size={14} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-bold">{pool.name}</p>
                  <p className="text-white/40 text-xs">{pool.songs.length} 张谱面</p>
                </div>
                {drawMode === 'multi' && selectedPools.includes(pool.id) && multiDrawMode === 'perPool' && (
                  <span className="text-violet-300 text-xs font-rajdhani">
                    抽 {perPoolDrawCounts[pool.id] || 1} 张
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemovePool(pool.id) }}
                  className="p-1.5 rounded-lg btn-danger"
                >
                  <Trash2 size={14} />
                </button>
                {drawMode === 'single' && activePoolId === pool.id && (
                  <span className="ml-2 text-xs badge-success">当前激活</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface ValidationResult {
  success: boolean
  songs?: Song[]
  error?: string
}

function validateAndParseSongs(data: unknown): ValidationResult {
  if (!Array.isArray(data)) {
    return { success: false, error: 'JSON 数据必须是数组格式' }
  }

  const songs: Song[] = []
  const validDifficulties: Difficulty[] = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER']
  const validChartTypes: ChartType[] = ['dx', 'standard']

  for (let i = 0; i < data.length; i++) {
    const item = data[i]

    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      return { success: false, error: `第 ${i + 1} 项不是有效的对象` }
    }

    const obj = item as Record<string, unknown>

    const requiredFields = ['id', 'name', 'difficulty', 'level', 'isPlus', 'cover', 'author', 'difficultyAuthor', 'bpm', 'chartType']
    for (const field of requiredFields) {
      if (!(field in obj)) {
        return { success: false, error: `第 ${i + 1} 项缺少字段: ${field}` }
      }
    }

    if (typeof obj.id !== 'string') {
      return { success: false, error: `第 ${i + 1} 项: id 必须是字符串` }
    }
    if (typeof obj.name !== 'string') {
      return { success: false, error: `第 ${i + 1} 项: name 必须是字符串` }
    }
    if (!validDifficulties.includes(obj.difficulty as Difficulty)) {
      return { success: false, error: `第 ${i + 1} 项: difficulty 必须是 BASIC、ADVANCED、EXPERT、MASTER 或 Re:MASTER` }
    }
    if (typeof obj.level !== 'number' || obj.level < 1 || obj.level > 15) {
      return { success: false, error: `第 ${i + 1} 项: level 必须是 1-15 之间的数字` }
    }
    if (typeof obj.isPlus !== 'boolean') {
      return { success: false, error: `第 ${i + 1} 项: isPlus 必须是布尔值` }
    }
    if (typeof obj.cover !== 'string') {
      return { success: false, error: `第 ${i + 1} 项: cover 必须是字符串` }
    }
    if (typeof obj.author !== 'string') {
      return { success: false, error: `第 ${i + 1} 项: author 必须是字符串` }
    }
    if (typeof obj.difficultyAuthor !== 'string') {
      return { success: false, error: `第 ${i + 1} 项: difficultyAuthor 必须是字符串` }
    }
    if (typeof obj.bpm !== 'number' || obj.bpm < 0) {
      return { success: false, error: `第 ${i + 1} 项: bpm 必须是正数` }
    }
    if (!validChartTypes.includes(obj.chartType as ChartType)) {
      return { success: false, error: `第 ${i + 1} 项: chartType 必须是 dx 或 standard` }
    }

    songs.push({
      id: obj.id as string,
      name: obj.name as string,
      difficulty: obj.difficulty as Difficulty,
      level: obj.level as number,
      isPlus: obj.isPlus as boolean,
      cover: obj.cover as string,
      author: obj.author as string,
      difficultyAuthor: obj.difficultyAuthor as string,
      bpm: obj.bpm as number,
      chartType: obj.chartType as ChartType,
      genre: typeof obj.genre === 'string' ? obj.genre : '',
      levelValue: typeof obj.levelValue === 'number' ? obj.levelValue : (obj.level as number) + ((obj.isPlus as boolean) ? 0.5 : 0),
    })
  }

  return { success: true, songs }
}
