import { useState, useMemo, useCallback, useEffect } from 'react'
import { Download, Plus, Trash2, Edit2, Save, X, ChevronLeft, ChevronRight, Search, ArrowUpDown } from 'lucide-react'
import { useSongStore, type Song, type Difficulty, type ChartType } from '@/store/songStore'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 50

type SearchField = 'name' | 'author' | 'bpm' | 'levelValue' | 'difficultyAuthor'
type SortField = 'name' | 'level' | 'bpm' | 'levelValue'
type SortDirection = 'asc' | 'desc'

export default function SongListEditor() {
  const songs = useSongStore((state) => state.songs)
  const importSongs = useSongStore((state) => state.importSongs)
  const [editingSongs, setEditingSongs] = useState<Map<string, Song>>(new Map())
  const [showForm, setShowForm] = useState(false)
  const [newSong, setNewSong] = useState<Omit<Song, 'id'>>({
    name: '',
    difficulty: 'EXPERT',
    level: 10,
    isPlus: false,
    cover: '',
    author: '',
    difficultyAuthor: '',
    bpm: 120,
    chartType: 'standard',
    genre: '',
    levelValue: 10.0,
  })
  const [currentPage, setCurrentPage] = useState(0)

  // 搜索与排序状态
  const [searchQuery, setSearchQuery] = useState('')
  const [searchField, setSearchField] = useState<SearchField>('name')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  // 搜索条件变化时重置分页
  useEffect(() => {
    setCurrentPage(0)
  }, [searchQuery, searchField, sortField, sortDirection])

  // 过滤与排序计算
  const filteredAndSortedSongs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    let result = [...songs]

    if (q) {
      result = result.filter((s) => {
        const value = String(s[searchField] ?? '').toLowerCase()
        return value.includes(q)
      })
    }

    result.sort((a, b) => {
      let aVal: number | string = a[sortField] ?? ''
      let bVal: number | string = b[sortField] ?? ''
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [songs, searchQuery, searchField, sortField, sortDirection])

  // 分页计算
  const totalPages = Math.ceil(filteredAndSortedSongs.length / PAGE_SIZE)
  const paginatedSongs = useMemo(
    () => filteredAndSortedSongs.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [filteredAndSortedSongs, currentPage]
  )

  const toggleEdit = useCallback((song: Song) => {
    setEditingSongs(prev => {
      const next = new Map(prev)
      if (next.has(song.id)) {
        next.delete(song.id)
      } else {
        next.set(song.id, { ...song })
      }
      return next
    })
  }, [])

  const updateSong = useCallback((id: string, field: keyof Song, value: unknown) => {
    setEditingSongs(prev => {
      const next = new Map(prev)
      const song = next.get(id)
      if (song) {
        next.set(id, { ...song, [field]: value })
      }
      return next
    })
  }, [])

  const saveEdit = useCallback((id: string) => {
    setEditingSongs(prev => {
      const edited = prev.get(id)
      if (!edited) return prev
      
      const next = new Map(prev)
      next.delete(id)
      
      // Update in the store
      const updated = songs.map(s => s.id === id ? edited : s)
      importSongs(updated)
      return next
    })
  }, [songs, importSongs])

  const deleteSong = useCallback((id: string) => {
    const updated = songs.filter(s => s.id !== id)
    importSongs(updated)
    setEditingSongs(prev => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [songs, importSongs])

  const saveAll = useCallback(() => {
    const updated = songs.map(s => editingSongs.get(s.id) || s)
    importSongs(updated)
    setEditingSongs(new Map())
  }, [songs, editingSongs, importSongs])

  const exportJson = useCallback(() => {
    const data = JSON.stringify(songs, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'songlist.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [songs])

  const addNewSong = useCallback(() => {
    const song: Song = {
      id: `song-${Date.now()}`,
      ...newSong
    }
    importSongs([...songs, song])
    setNewSong({
      name: '',
      difficulty: 'EXPERT',
      level: 10,
      isPlus: false,
      cover: '',
      author: '',
      difficultyAuthor: '',
      bpm: 120,
      chartType: 'standard',
      genre: '',
      levelValue: 10.0,
    })
    setShowForm(false)
  }, [newSong, songs, importSongs])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 操作按钮 */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={saveAll}
          disabled={editingSongs.size === 0}
          className={cn('btn-primary', editingSongs.size === 0 && 'opacity-50 cursor-not-allowed')}
        >
          <Save size={18} /> 保存全部 ({editingSongs.size} 个更改)
        </button>
        <button
          onClick={exportJson}
          className="btn-secondary"
        >
          <Download size={18} /> 导出 JSON
        </button>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          <Plus size={18} /> 添加谱面
        </button>
      </div>

      {/* 搜索与排序栏 */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-3xl glass-panel">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <Search size={18} className="text-white/40" />
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value as SearchField)}
            className="input-refined w-auto text-sm py-2 px-3"
          >
            <option value="name">曲名</option>
            <option value="author">作曲家</option>
            <option value="difficultyAuthor">谱师</option>
            <option value="bpm">BPM</option>
            <option value="levelValue">定数</option>
          </select>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索..."
            className="input-refined flex-1 text-sm py-2 px-3 min-w-[120px]"
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <ArrowUpDown size={18} className="text-white/40" />
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="input-refined w-auto text-sm py-2 px-3"
          >
            <option value="name">按曲名</option>
            <option value="level">按等级</option>
            <option value="bpm">按BPM</option>
            <option value="levelValue">按定数</option>
          </select>
          <button
            onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
            className="btn-secondary text-xs py-2 px-3"
          >
            {sortDirection === 'asc' ? '升序' : '降序'}
          </button>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSearchField('name')
              }}
              className="btn-danger text-xs py-2 px-3"
            >
              清除
            </button>
          )}
        </div>
      </div>

      {/* 添加谱面表单 */}
      {showForm && (
        <div className="mb-6 p-6 rounded-3xl glass-panel">
          <h3 className="text-xl font-bold text-white mb-4">添加新谱面</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">歌曲名称</label>
              <input
                type="text"
                value={newSong.name}
                onChange={e => setNewSong({ ...newSong, name: e.target.value })}
                className="input-refined w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">难度</label>
              <select
                value={newSong.difficulty}
                onChange={e => setNewSong({ ...newSong, difficulty: e.target.value as Difficulty })}
                className="input-refined w-full text-sm"
              >
                <option value="EXPERT">EXPERT</option>
                <option value="MASTER">MASTER</option>
                <option value="Re:MASTER">Re:MASTER</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">等级</label>
              <input
                type="number"
                min="1"
                max="15"
                value={newSong.level}
                onChange={e => setNewSong({ ...newSong, level: parseInt(e.target.value) || 10 })}
                className="input-refined w-full text-sm"
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-white/80 font-bold text-sm">
                <input
                  type="checkbox"
                  checked={newSong.isPlus}
                  onChange={e => setNewSong({ ...newSong, isPlus: e.target.checked })}
                  className="w-5 h-5 rounded border-white/20 bg-white/5 text-cyan-400 focus:ring-cyan-400/30"
                />
                +号
              </label>
              <label className="flex items-center gap-2 text-white/80 font-bold text-sm">
                <span>谱面类型</span>
                <select
                  value={newSong.chartType}
                  onChange={e => setNewSong({ ...newSong, chartType: e.target.value as ChartType })}
                  className="input-refined w-auto text-sm py-1.5 px-2"
                >
                  <option value="standard">Standard</option>
                  <option value="dx">DX</option>
                </select>
              </label>
            </div>
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">封面路径</label>
              <input
                type="text"
                value={newSong.cover}
                onChange={e => setNewSong({ ...newSong, cover: e.target.value })}
                className="input-refined w-full text-sm"
                placeholder="./public/covers/cover.png"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">BPM</label>
              <input
                type="number"
                min="0"
                value={newSong.bpm}
                onChange={e => setNewSong({ ...newSong, bpm: parseInt(e.target.value) || 120 })}
                className="input-refined w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">作曲家</label>
              <input
                type="text"
                value={newSong.author}
                onChange={e => setNewSong({ ...newSong, author: e.target.value })}
                className="input-refined w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">流派</label>
              <input
                type="text"
                value={newSong.genre}
                onChange={e => setNewSong({ ...newSong, genre: e.target.value })}
                className="input-refined w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-white/50 uppercase tracking-wider mb-1.5">谱师</label>
              <input
                type="text"
                value={newSong.difficultyAuthor}
                onChange={e => setNewSong({ ...newSong, difficultyAuthor: e.target.value })}
                className="input-refined w-full text-sm"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={addNewSong}
              disabled={!newSong.name}
              className={cn('btn-primary', !newSong.name && 'opacity-50 cursor-not-allowed')}
            >
              添加
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="btn-secondary"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 分页控件 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/50 text-sm font-rajdhani">
            共 {songs.length} 张，第 {currentPage + 1}/{totalPages} 页
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className={cn('btn-secondary text-xs py-1.5 px-3', currentPage === 0 && 'opacity-50 cursor-not-allowed')}
            >
              <ChevronLeft size={16} /> 上一页
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className={cn('btn-secondary text-xs py-1.5 px-3', currentPage >= totalPages - 1 && 'opacity-50 cursor-not-allowed')}
            >
              下一页 <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 谱面列表 */}
      <div className="space-y-4">
        {paginatedSongs.map((song) => {
          const isEditing = editingSongs.has(song.id)
          const editedSong = editingSongs.get(song.id) || song

          return (
            <div
              key={song.id}
              className={cn(
                'p-4 rounded-3xl border transition-all duration-200',
                isEditing ? 'glass-panel border-cyan-400/40' : 'glass-panel border-white/10'
              )}
            >
              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">歌曲名称</label>
                    <input
                      type="text"
                      value={editedSong.name}
                      onChange={e => updateSong(song.id, 'name', e.target.value)}
                      className="input-refined w-full text-xs py-1.5 px-2"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">难度</label>
                    <select
                      value={editedSong.difficulty}
                      onChange={e => updateSong(song.id, 'difficulty', e.target.value)}
                      className="input-refined w-full text-xs py-1.5 px-2"
                    >
                      <option value="EXPERT">EXPERT</option>
                      <option value="MASTER">MASTER</option>
                      <option value="Re:MASTER">Re:MASTER</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">等级</label>
                    <input
                      type="number"
                      min="1"
                      max="15"
                      value={editedSong.level}
                      onChange={e => updateSong(song.id, 'level', parseInt(e.target.value) || 10)}
                      className="input-refined w-full text-xs py-1.5 px-2"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-white/80 font-bold text-xs">
                      <input
                        type="checkbox"
                        checked={editedSong.isPlus}
                        onChange={e => updateSong(song.id, 'isPlus', e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-400 focus:ring-cyan-400/30"
                      />
                      +
                    </label>
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">BPM</label>
                      <input
                        type="number"
                        min="0"
                        value={editedSong.bpm}
                        onChange={e => updateSong(song.id, 'bpm', parseInt(e.target.value) || 120)}
                        className="input-refined w-full text-xs py-1.5 px-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">封面路径</label>
                    <input
                      type="text"
                      value={editedSong.cover}
                      onChange={e => updateSong(song.id, 'cover', e.target.value)}
                      className="input-refined w-full text-xs py-1.5 px-2"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">谱面类型</label>
                    <select
                      value={editedSong.chartType}
                      onChange={e => updateSong(song.id, 'chartType', e.target.value)}
                      className="input-refined w-full text-xs py-1.5 px-2"
                    >
                      <option value="standard">Standard</option>
                      <option value="dx">DX</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">作曲家</label>
                    <input
                      type="text"
                      value={editedSong.author}
                      onChange={e => updateSong(song.id, 'author', e.target.value)}
                      className="input-refined w-full text-xs py-1.5 px-2"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">流派</label>
                    <input
                      type="text"
                      value={editedSong.genre}
                      onChange={e => updateSong(song.id, 'genre', e.target.value)}
                      className="input-refined w-full text-xs py-1.5 px-2"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">谱师</label>
                    <input
                      type="text"
                      value={editedSong.difficultyAuthor}
                      onChange={e => updateSong(song.id, 'difficultyAuthor', e.target.value)}
                      className="input-refined w-full text-xs py-1.5 px-2"
                    />
                  </div>
                  <div className="lg:col-span-2 flex gap-2 items-end">
                    <button
                      onClick={() => saveEdit(song.id)}
                      className="btn-primary text-xs py-1.5 px-3"
                    >
                      <Save size={14} /> 保存
                    </button>
                    <button
                      onClick={() => toggleEdit(song)}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      <X size={14} /> 取消
                    </button>
                    <button
                      onClick={() => deleteSong(song.id)}
                      className="btn-danger text-xs py-1.5 px-3"
                    >
                      <Trash2 size={14} /> 删除
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 border border-white/10">
                      {song.cover && (
                        <img src={song.cover} alt={song.name} className="w-full h-full object-cover" loading="lazy" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{song.name}</h4>
                      <p className="text-sm text-white/50">
                        {song.author} · {song.difficulty} Lv.{song.level}
                        {song.isPlus ? '+' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-white/50">BPM {song.bpm}</span>
                    <span
                      className={cn(
                        'px-2 py-1 rounded-lg text-xs font-bold',
                        song.chartType === 'dx'
                          ? 'bg-violet-500/20 text-violet-200 border border-violet-500/30'
                          : 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30'
                      )}
                    >
                      {song.chartType === 'dx' ? 'DX' : 'STD'}
                    </span>
                    <button
                      onClick={() => toggleEdit(song)}
                      className="p-2 rounded-xl bg-white/5 text-cyan-300 border border-white/10 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => deleteSong(song.id)}
                      className="p-2 rounded-xl bg-white/5 text-rose-300 border border-white/10 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {songs.length === 0 && (
        <div className="text-center py-12 text-white/40">
          <div className="w-16 h-16 rounded-3xl glass-panel flex items-center justify-center mx-auto mb-4">
            <Search size={28} className="opacity-40" />
          </div>
          <p className="font-bold text-lg">暂无谱面</p>
          <p className="text-sm mt-1">点击「添加谱面」开始创建</p>
        </div>
      )}
    </div>
  )
}
