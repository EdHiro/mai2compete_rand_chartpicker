import { useRef, useState } from 'react'
import { Upload, AlertCircle, CheckCircle, Cloud, X } from 'lucide-react'
import { useSongStore, type Song, type Difficulty, type ChartType } from '@/store/songStore'
import { cn } from '@/lib/utils'

interface ImportResult {
  success: boolean
  message: string
  count: number
}

interface PendingImport {
  songs: Song[]
  duplicates: { song: Song; existing: Song; poolId: string; poolName: string }[]
  poolName: string
}

export default function JsonImport() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const { importSongs, addSongPool, importSongsFromAPI } = useSongStore()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.json')) {
      setImportResult({
        success: false,
        message: '请选择 JSON 文件',
        count: 0
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        
        // Validate and parse the data
        const result = validateAndParseSongs(data)
        
        if (result.success && result.songs) {
          const { songs: mainSongs, songPools } = useSongStore.getState()
          const poolName = file.name.replace(/\.json$/i, '')

          // 构建现有谱面映射（id -> { song, poolId, poolName }）
          const existingMap = new Map<string, { song: Song; poolId: string; poolName: string }>()
          mainSongs.forEach((s) => existingMap.set(s.id, { song: s, poolId: 'main', poolName: '主库' }))
          songPools.forEach((p) => p.songs.forEach((s) => {
            if (!existingMap.has(s.id)) {
              existingMap.set(s.id, { song: s, poolId: p.id, poolName: p.name })
            }
          }))

          const duplicates: PendingImport['duplicates'] = []
          for (const song of result.songs) {
            const existing = existingMap.get(song.id)
            if (existing) {
              duplicates.push({ song, existing: existing.song, poolId: existing.poolId, poolName: existing.poolName })
            }
          }

          if (duplicates.length > 0) {
            setPendingImport({ songs: result.songs, duplicates, poolName })
            return
          }

          // 无重复时直接导入
          if (mainSongs.length > 0) {
            addSongPool(poolName, result.songs)
            setImportResult({
              success: true,
              message: `成功导入 ${result.songs.length} 张谱面到额外曲库「${poolName}」`,
              count: result.songs.length
            })
          } else {
            importSongs(result.songs)
            setImportResult({
              success: true,
              message: `成功导入 ${result.songs.length} 张谱面到主库`,
              count: result.songs.length
            })
          }
        } else {
          setImportResult({
            success: false,
            message: result.error || '导入失败',
            count: 0
          })
        }
      } catch {
        setImportResult({
          success: false,
          message: 'JSON 文件格式错误',
          count: 0
        })
      }
    }
    reader.readAsText(file)
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 组件挂载时自动从 lxns API 导入（如果主库为空且从未导入过）
  useState(() => {
    const checkAndImport = async () => {
      const { songs, songPools } = useSongStore.getState()
      // 如果主库和额外曲库都为空，才自动导入
      if (songs.length === 0 && songPools.length === 0) {
        setIsLoading(true)
        const result = await importSongsFromAPI()
        setIsLoading(false)
        setImportResult({
          success: result.success,
          message: result.success
            ? `已从 lxns API 自动导入 ${result.count} 张谱面`
            : result.error || '自动导入失败',
          count: result.count
        })
      }
    }
    checkAndImport()
  })

  const handleApiImport = async () => {
    setIsLoading(true)
    const result = await importSongsFromAPI()
    setIsLoading(false)

    setImportResult({
      success: result.success,
      message: result.success
        ? `成功从 lxns API 导入 ${result.count} 张谱面`
        : result.error || '导入失败',
      count: result.count
    })
  }

  const applyImport = (mode: 'skip' | 'overwrite' | 'pool') => {
    if (!pendingImport) return
    const { songs, poolName } = pendingImport
    const { songs: mainSongs } = useSongStore.getState()

    if (mode === 'pool') {
      addSongPool(poolName, songs)
      setImportResult({
        success: true,
        message: `已创建曲库「${poolName}」，导入 ${songs.length} 张谱面`,
        count: songs.length
      })
    } else if (mode === 'overwrite') {
      const merged = [...mainSongs]
      for (const s of songs) {
        const idx = merged.findIndex((x) => x.id === s.id)
        if (idx >= 0) merged[idx] = s
        else merged.push(s)
      }
      importSongs(merged)
      setImportResult({
        success: true,
        message: `已覆盖主库，共 ${merged.length} 张谱面`,
        count: merged.length
      })
    } else {
      // skip：仅导入不重复的谱面
      const existingIds = new Set(mainSongs.map((s) => s.id))
      const newOnly = songs.filter((s) => !existingIds.has(s.id))
      if (mainSongs.length === 0) {
        importSongs(newOnly)
      } else {
        addSongPool(poolName, newOnly)
      }
      setImportResult({
        success: true,
        message: `跳过重复，导入 ${newOnly.length} 张新谱面`,
        count: newOnly.length
      })
    }

    setPendingImport(null)
  }

  return (
    <div className="mb-6 animate-enter">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="btn-primary press-down btn-shimmer"
        >
          <Upload size={18} />
          导入谱面数据 (JSON)
        </button>

        <button
          onClick={handleApiImport}
          disabled={isLoading}
          className={cn(
            'btn-secondary press-down',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Cloud size={18} className={cn(isLoading && 'animate-spin')} />
          {isLoading ? '获取中...' : '从 lxns 导入'}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      {importResult && (
        <div className={cn(
          'mt-3 flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold animate-enter',
          importResult.success
            ? 'badge-success'
            : 'badge-error'
        )}>
          {importResult.success ? (
            <CheckCircle size={18} className="flex-shrink-0" />
          ) : (
            <AlertCircle size={18} className="flex-shrink-0" />
          )}
          <span>{importResult.message}</span>
        </div>
      )}

      {/* 重复谱面处理弹窗 */}
      {pendingImport && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">
                检测到 {pendingImport.duplicates.length} 张重复谱面
              </h3>
              <button
                onClick={() => setPendingImport(null)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/50 hover:text-white transition-colors press-down"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-white/50 mb-4">
              新文件「{pendingImport.poolName}」共 {pendingImport.songs.length} 张谱面，
              其中 {pendingImport.duplicates.length} 张与现有曲库重复。
            </p>
            <div className="max-h-60 overflow-auto space-y-2 mb-4 rounded-2xl p-3 glass-panel stagger-children">
              {pendingImport.duplicates.map((d) => (
                <div key={d.song.id} className="text-sm border-b border-white/10 last:border-0 pb-2 last:pb-0">
                  <p className="font-bold text-white">
                    {d.song.name} · {d.song.difficulty} Lv.{d.song.level}{d.song.isPlus ? '+' : ''}
                  </p>
                  <p className="text-white/40 text-xs">
                    已存在于：{d.poolName}（ID: {d.song.id}）
                  </p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => applyImport('skip')}
                className="btn-primary text-xs py-2.5 press-down btn-shimmer"
              >
                跳过重复，导入新谱面
              </button>
              <button
                onClick={() => applyImport('overwrite')}
                className="btn-secondary text-xs py-2.5 border-amber-400/30 text-amber-200 hover:text-white press-down"
              >
                覆盖主库
              </button>
              <button
                onClick={() => applyImport('pool')}
                className="btn-secondary text-xs py-2.5 border-violet-400/30 text-violet-200 hover:text-white press-down"
              >
                全部导入为新曲库
              </button>
              <button
                onClick={() => setPendingImport(null)}
                className="btn-secondary text-xs py-2.5 press-down"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
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
  const validDifficulties: Difficulty[] = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER', 'UTAGE']
  const validChartTypes: ChartType[] = ['dx', 'standard']

  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      return { success: false, error: `第 ${i + 1} 项不是有效的对象` }
    }

    const obj = item as Record<string, unknown>

    // Validate required fields
    const requiredFields = ['id', 'name', 'difficulty', 'level', 'isPlus', 'cover', 'author', 'difficultyAuthor', 'bpm', 'chartType']
    for (const field of requiredFields) {
      if (!(field in obj)) {
        return { success: false, error: `第 ${i + 1} 项缺少字段: ${field}` }
      }
    }

    // Validate types
    if (typeof obj.id !== 'string') {
      return { success: false, error: `第 ${i + 1} 项: id 必须是字符串` }
    }
    if (typeof obj.name !== 'string') {
      return { success: false, error: `第 ${i + 1} 项: name 必须是字符串` }
    }
    if (!validDifficulties.includes(obj.difficulty as Difficulty)) {
      return { success: false, error: `第 ${i + 1} 项: difficulty 必须是 BASIC、ADVANCED、EXPERT、MASTER、Re:MASTER 或 UTAGE` }
    }
    if (typeof obj.level !== 'number' || obj.level < 0 || obj.level > 15) {
      return { success: false, error: `第 ${i + 1} 项: level 必须是 0-15 之间的数字` }
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
      songId: typeof obj.songId === 'number' ? obj.songId : 0,
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
      version: typeof obj.version === 'number' ? obj.version : 0,
    })
  }

  return { success: true, songs }
}
