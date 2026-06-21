import { useState, useCallback, useRef } from 'react'
import type { Song } from '@/store/songStore'
import { Upload, Download, ArrowRightLeft, FileJson, Sparkles, AlertTriangle, Music2 } from 'lucide-react'

// 本文件实现前端转换工具：支持上传 JSON、粘贴、转换并下载

function parseLevel(levelStr: string | number | undefined) {
  if (!levelStr && levelStr !== 0) return { level: 1, isPlus: false }
  const s = String(levelStr).trim()
  const isPlus = s.includes('+')
  const num = parseInt(s.replace(/[^0-9]/g, ''), 10)
  return { level: Number.isFinite(num) ? num : 1, isPlus }
}

function convertType(type: any) {
  if (!type) return 'standard'
  const t = String(type).toLowerCase()
  if (t === 'dx') return 'dx'
  return 'standard'
}

function mapDifficultyName(name: any) {
  if (!name) return null
  const n = String(name).toLowerCase()
  if (n.includes('expert') || n.includes('ex')) return 'EXPERT'
  if (n.includes('master') && !n.includes('re')) return 'MASTER'
  if (n.includes('re') || n.includes('re:') || n.includes('re:master') || n.includes('re_master')) return 'Re:MASTER'
  if (n === 'm' || n === 'master') return 'MASTER'
  return null
}

function normalizeCover(c: any) {
  if (!c) return ''
  return String(c).replace('public\\', 'public/')
}

function normalizeItem(src: any) {
  const levelParse = parseLevel(src.level || src.Level || src.levelStr || '')
  return {
    id: src.id ? String(src.id) : undefined,
    name: src.name || src.title || src.song || '',
    difficulty: mapDifficultyName(src.difficulty) || src.difficulty || 'EXPERT',
    level: Number.isFinite(Number(levelParse.level)) ? Number(levelParse.level) : 1,
    isPlus: !!levelParse.isPlus || !!src.isPlus,
    cover: normalizeCover(src.cover || src.image || src.image_url || ''),
    author: src.author || src.artist || '',
    difficultyAuthor: src.difficultyAuthor || src.chartAuthor || '',
    bpm: Number(src.bpm) || 0,
    chartType: convertType(src.chartType || src.type || src.mode),
  } as Song
}

const difficultyColorMap: Record<string, string> = {
  BASIC: 'bg-difficulty-basic/20 text-difficulty-basicLight border-difficulty-basic/40',
  ADVANCED: 'bg-difficulty-advanced/20 text-difficulty-advancedLight border-difficulty-advanced/40',
  EXPERT: 'bg-difficulty-expert/20 text-difficulty-expertLight border-difficulty-expert/40',
  MASTER: 'bg-difficulty-master/20 text-difficulty-masterLight border-difficulty-master/40',
  'Re:MASTER': 'bg-difficulty-remaster/20 text-difficulty-remasterLight border-difficulty-remaster/40',
}

function difficultyBadgeClass(diff: string): string {
  return difficultyColorMap[diff] || 'bg-dark-border/40 text-white/70 border-dark-border/60'
}

export default function ConvertTool() {
  const [inputText, setInputText] = useState('')
  const [items, setItems] = useState<Song[]>([])
  const [error, setError] = useState<string | null>(null)
  const [outName, setOutName] = useState('converted-songlist.json')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      setInputText(String(reader.result || ''))
    }
    reader.readAsText(f)
  }, [])

  const handleConvert = useCallback(() => {
    setError(null)
    try {
      let data: any = JSON.parse(inputText)
      if (!Array.isArray(data)) {
        if (data && typeof data === 'object' && Array.isArray(data.songs)) data = data.songs
        else if (data && typeof data === 'object') data = Object.values(data).flat().filter(Boolean)
      }
      if (!Array.isArray(data)) throw new Error('输入 JSON 必须为数组或包含 songs 数组')

      const out: Song[] = []
      for (const item of data) {
        if (!item) continue
        if (item.name && item.difficulty && typeof item.level !== 'undefined') {
          out.push(normalizeItem(item))
          continue
        }
        // 支持 maidata.json（title, lev_bas, lev_adv, lev_exp, dx_lev_exp, image_file）
        if (item.title && (item.lev_exp || item.dx_lev_exp || item.lev_mas || item.lev_adv || item.lev_bas)) {
          const cover = item.image_file ? `./public/covers/cover/${item.image_file}` : (item.cover || '')
          const mapping: any[] = [
            { key: 'dx_lev_exp', difficulty: 'EXPERT', chartType: 'dx' },
            { key: 'dx_lev_mas', difficulty: 'MASTER', chartType: 'dx' },
            { key: 'dx_lev_adv', difficulty: 'ADVANCED', chartType: 'dx' },
            { key: 'dx_lev_bas', difficulty: 'BASIC', chartType: 'dx' },
            { key: 'lev_exp', difficulty: 'EXPERT', chartType: 'standard' },
            { key: 'lev_mas', difficulty: 'MASTER', chartType: 'standard' },
            { key: 'lev_adv', difficulty: 'ADVANCED', chartType: 'standard' },
            { key: 'lev_bas', difficulty: 'BASIC', chartType: 'standard' },
            { key: 'lev_remas', difficulty: 'Re:MASTER', chartType: 'standard' }
          ]
          for (const m of mapping) {
            const raw = item[m.key]
            if (!raw) continue
            const levelInfo = parseLevel(String(raw))
            const entry = {
              name: item.title,
              difficulty: m.difficulty,
              level: levelInfo.level,
              isPlus: levelInfo.isPlus,
              cover,
              author: item.artist || '',
              difficultyAuthor: '',
              bpm: item.bpm || 0,
              chartType: m.chartType,
            }
            out.push(normalizeItem(entry))
          }
          continue
        }
        if (Array.isArray(item.charts) && item.charts.length) {
          for (const chart of item.charts) {
            const merged = Object.assign({}, item, chart)
            out.push(normalizeItem(merged))
          }
          continue
        }
        if (item.基础信息) {
          const base = item.基础信息
          const levels = base.等级 || []
          const mapping: any = {2: 'EXPERT', 3: 'MASTER', 4: 'Re:MASTER'}
          for (const idxStr of Object.keys(mapping)) {
            const idx = Number(idxStr)
            const lv = levels[idx]
            if (!lv) continue
            const levelInfo = parseLevel(String(lv))
            const entry = {
              name: base.歌名 || base.title,
              difficulty: mapping[idxStr],
              level: levelInfo.level,
              isPlus: levelInfo.isPlus,
              cover: base.image_url || base.cover || '',
              author: base.artist || base.作曲家 || '',
              difficultyAuthor: base.谱师 || '',
              bpm: base.bpm || 0,
              chartType: convertType(base.type),
            }
            out.push(normalizeItem(entry))
          }
          continue
        }
        if (item.levels && typeof item.levels === 'object') {
          for (const [k, v] of Object.entries(item.levels)) {
            const difficulty = mapDifficultyName(k)
            if (!difficulty) continue
            const levelInfo = parseLevel(String(v))
            const entry = Object.assign({}, item, {
              difficulty,
              level: levelInfo.level,
              isPlus: levelInfo.isPlus,
            })
            out.push(normalizeItem(entry))
          }
          continue
        }
        if (item.title || item.artist || item.level) {
          const fallback = {
            name: item.name || item.title,
            difficulty: item.difficulty || 'EXPERT',
            level: item.level || parseLevel(item.levelStr || '').level || 1,
            isPlus: !!item.isPlus,
            cover: item.cover || item.image || '',
            author: item.author || item.artist || '',
            difficultyAuthor: item.difficultyAuthor || '',
            bpm: item.bpm || 0,
            chartType: item.chartType || convertType(item.type),
          }
          out.push(normalizeItem(fallback))
          continue
        }
        // skip unknown
      }

      // assign ids
      for (let i = 0; i < out.length; i++) {
        if (!out[i].id) out[i].id = String(i + 1)
      }

      setItems(out)
    } catch (err: any) {
      setError(err.message || String(err))
    }
  }, [inputText])

  const handleDownload = useCallback(() => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = outName || 'converted-songlist.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [items, outName])

  return (
    <div className="min-h-screen bg-dark-bg text-white relative">
      {/* Hero 背景装饰 */}
      <div className="absolute inset-0 hero-grid pointer-events-none opacity-40" />
      <div className="absolute inset-0 radial-glow pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header 卡片 */}
        <div className="glass-panel-strong rounded-2xl border border-dark-border/50 shadow-card overflow-hidden mb-6">
          <div className="top-gradient-bar" />
          <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-[0_8px_20px_rgba(139,92,246,0.4)]">
                <FileJson size={22} className="text-white" />
                <Sparkles size={12} className="absolute -top-1 -right-1 text-yellow-300" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black font-orbitron title-gradient tracking-wider leading-tight">
                  转换工具
                </h1>
                <p className="text-sm text-white/60 font-rajdhani">JSON 曲库归一化 · 图形化界面</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFile}
                className="hidden"
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="btn-ghost flex items-center gap-2"
              >
                <Upload size={16} />
                <span className="font-rajdhani">上传 JSON</span>
              </button>
            </div>
          </div>
        </div>

        {/* 主体双列布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 左列：输入区 */}
          <section className="lg:col-span-2 space-y-4">
            <div className="glass-panel rounded-2xl border border-dark-border/50 shadow-card overflow-hidden">
              <div className="px-5 py-3 border-b border-dark-border/40 flex items-center justify-between">
                <h2 className="font-orbitron font-bold text-sm text-white/90 tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                  粘贴 JSON 源数据
                </h2>
                <span className="chip font-rajdhani">{inputText.length} 字符</span>
              </div>
              <div className="p-4">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder='例如：[{"name":"歌曲","difficulty":"EXPERT","level":12}]'
                  className="input-field font-mono text-xs leading-relaxed resize-y min-h-[280px]"
                  spellCheck={false}
                />
              </div>
            </div>

            {/* 操作行 */}
            <div className="glass-panel rounded-2xl border border-dark-border/50 shadow-card p-4">
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleConvert}
                  className="btn-primary-2 w-full flex items-center justify-center gap-2 text-sm"
                >
                  <ArrowRightLeft size={16} />
                  <span className="font-rajdhani">执行转换</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50 font-rajdhani shrink-0">输出文件名</span>
                  <input
                    value={outName}
                    onChange={(e) => setOutName(e.target.value)}
                    className="input-field py-2 text-sm flex-1"
                    placeholder="converted-songlist.json"
                  />
                </div>

                <button
                  onClick={handleDownload}
                  disabled={items.length === 0}
                  className="btn-ghost w-full flex items-center justify-center gap-2 text-sm"
                >
                  <Download size={16} />
                  <span className="font-rajdhani">下载 JSON</span>
                </button>
              </div>
            </div>
          </section>

          {/* 右列：结果区 */}
          <section className="lg:col-span-3 space-y-4">
            {/* 错误 Banner */}
            {error && (
              <div className="error-banner animate-fadeIn">
                <AlertTriangle size={16} className="shrink-0" />
                <span className="font-rajdhani font-semibold">{error}</span>
              </div>
            )}

            {/* 摘要 chips */}
            <div className="glass-panel rounded-2xl border border-dark-border/50 shadow-card p-4 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 mr-2">
                <Music2 size={16} className="text-purple-300" />
                <span className="font-orbitron font-bold text-sm text-white/90 tracking-wider">曲库摘要</span>
              </div>
              <span className="chip">
                <span className="text-blue-300">●</span> 共 <b className="text-white mx-1">{items.length}</b> 条记录
              </span>
              {items.length > 30 && (
                <span className="chip">仅预览前 30 条</span>
              )}
              {items.length === 0 && (
                <span className="chip text-white/50">等待转换...</span>
              )}
            </div>

            {/* 预览卡片网格 */}
            {items.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.slice(0, 30).map((it) => (
                  <div key={it.id} className="surface-card">
                    {/* 顶部条 */}
                    <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-70" />

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="font-orbitron font-bold text-sm text-white leading-snug line-clamp-2 flex-1">
                          {it.name || '（无名）'}
                        </h3>
                        <span className={`shrink-0 inline-flex items-center text-[10px] font-bold font-rajdhani px-2 py-1 rounded-md border ${difficultyBadgeClass(String(it.difficulty))}`}>
                          {it.difficulty}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <span className="chip !py-1 !text-[11px]">
                          Lv.{it.level}{it.isPlus ? '+' : ''}
                        </span>
                        {it.chartType && (
                          <span className="chip !py-1 !text-[11px] capitalize">
                            {it.chartType}
                          </span>
                        )}
                        {it.bpm ? (
                          <span className="chip !py-1 !text-[11px]">{it.bpm} BPM</span>
                        ) : null}
                      </div>

                      <div className="pt-3 border-t border-dark-border/40 text-xs text-white/60 font-rajdhani space-y-1">
                        {it.author && (
                          <div className="flex items-start gap-2">
                            <span className="text-white/40 shrink-0">作者</span>
                            <span className="text-white/80 line-clamp-1">{it.author}</span>
                          </div>
                        )}
                        {it.difficultyAuthor && (
                          <div className="flex items-start gap-2">
                            <span className="text-white/40 shrink-0">谱师</span>
                            <span className="text-white/80 line-clamp-1">{it.difficultyAuthor}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* 页脚 */}
        <footer className="mt-10 text-center text-white/40 text-xs font-rajdhani tracking-widest">
          JSON 曲库转换工具 · Neon Arcade
        </footer>
      </div>
    </div>
  )
}
