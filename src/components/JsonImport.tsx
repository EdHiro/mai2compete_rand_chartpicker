import { useRef, useState } from 'react'
import { Upload, AlertCircle, CheckCircle, Cloud } from 'lucide-react'
import { useSongStore, type Song, type Difficulty, type ChartType } from '@/store/songStore'

interface ImportResult {
  success: boolean
  message: string
  count: number
}

export default function JsonImport() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { importSongs, importSongsFromAPI } = useSongStore()

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
          // 如果主库已有数据，作为额外曲库导入；否则作为主库
          const { songs: mainSongs, addSongPool } = useSongStore.getState()
          if (mainSongs.length > 0) {
            const poolName = file.name.replace(/\.json$/i, '')
            const poolId = addSongPool(poolName, result.songs)
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

  return (
    <div className="mb-6">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 border-3 border-blue-400 text-white font-rajdhani font-bold hover:from-blue-500 hover:to-blue-600 transition-all duration-200 shadow-lg"
        >
          <Upload size={18} />
          导入谱面数据 (JSON)
        </button>

        <button
          onClick={handleApiImport}
          disabled={isLoading}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border-3 font-rajdhani font-bold transition-all duration-200 shadow-lg ${
            isLoading
              ? 'bg-gray-500 border-gray-400 text-gray-300 cursor-not-allowed'
              : 'bg-gradient-to-b from-green-600 to-green-700 border-green-400 text-white hover:from-green-500 hover:to-green-600'
          }`}
        >
          <Cloud size={18} className={isLoading ? 'animate-spin' : ''} />
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
        <div className={`mt-3 flex items-center gap-2 px-4 py-2 rounded-lg ${
          importResult.success 
            ? 'bg-green-100 border-2 border-green-400 text-green-800'
            : 'bg-red-100 border-2 border-red-400 text-red-800'
        }`}>
          {importResult.success ? (
            <CheckCircle size={18} className="flex-shrink-0" />
          ) : (
            <AlertCircle size={18} className="flex-shrink-0" />
          )}
          <span className="font-bold text-sm">{importResult.message}</span>
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
  const validDifficulties: Difficulty[] = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER']
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
      return { success: false, error: `第 ${i + 1} 项: difficulty 必须是 EXPERT、MASTER 或 Re:MASTER` }
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
