import { useState, useCallback } from 'react'
import type { Song } from '@/store/songStore'

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

export default function ConvertTool() {
  const [inputText, setInputText] = useState('')
  const [items, setItems] = useState<Song[]>([])
  const [error, setError] = useState<string | null>(null)
  const [outName, setOutName] = useState('converted-songlist.json')

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
    <div className="min-h-screen bg-dark-bg text-white p-6">
      <header className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">转换工具 — 图形化界面</h1>
        <div className="flex items-center gap-3">
          <input type="file" accept="application/json" onChange={handleFile} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="mb-4">
          <label className="block mb-2">或粘贴源 JSON：</label>
          <textarea value={inputText} onChange={e => setInputText(e.target.value)} className="w-full h-40 p-2 text-black" />
        </div>

        <div className="flex gap-3 mb-6">
          <button onClick={handleConvert} className="px-4 py-2 bg-green-600 rounded">转换</button>
          <input value={outName} onChange={e => setOutName(e.target.value)} className="px-3 py-2 text-black" />
          <button onClick={handleDownload} className="px-4 py-2 bg-blue-600 rounded" disabled={items.length === 0}>下载 JSON</button>
        </div>

        {error && <p className="text-red-400 mb-4">{error}</p>}

        <p className="mb-2">转换后记录数： {items.length}</p>

        <div className="grid grid-cols-3 gap-4">
          {items.slice(0, 30).map(it => (
            <div key={it.id} className="p-2 bg-gray-800 rounded">
              <p className="font-bold">{it.name}</p>
              <p className="text-sm">{it.difficulty} {it.level}{it.isPlus ? '+' : ''}</p>
              <p className="text-sm">{it.author} • {it.bpm} BPM</p>
            </div>
          ))}
        </div>

        {items.length > 30 && <p className="mt-4">仅预览前 30 条。</p>}
      </main>
    </div>
  )
}
