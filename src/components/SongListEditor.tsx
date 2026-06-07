import { useState, useMemo, useCallback } from 'react'
import { Download, Plus, Trash2, Edit2, Save, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useSongStore, type Song, type Difficulty, type ChartType } from '@/store/songStore'

const PAGE_SIZE = 50

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

  // 分页计算
  const totalPages = Math.ceil(songs.length / PAGE_SIZE)
  const paginatedSongs = useMemo(
    () => songs.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [songs, currentPage]
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
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={saveAll}
          disabled={editingSongs.size === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-b from-green-600 to-green-700 border-3 border-green-400 text-white font-rajdhani font-bold hover:from-green-500 hover:to-green-600 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={18} /> 保存全部 ({editingSongs.size} 个更改)
        </button>
        <button
          onClick={exportJson}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-b from-blue-600 to-blue-700 border-3 border-blue-400 text-white font-rajdhani font-bold hover:from-blue-500 hover:to-blue-600 transition-all duration-200 shadow-lg"
        >
          <Download size={18} /> 导出 JSON
        </button>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-b from-purple-600 to-purple-700 border-3 border-purple-400 text-white font-rajdhani font-bold hover:from-purple-500 hover:to-purple-600 transition-all duration-200 shadow-lg"
        >
          <Plus size={18} /> 添加谱面
        </button>
      </div>

      {/* 添加谱面表单 */}
      {showForm && (
        <div className="mb-6 p-6 rounded-2xl bg-white border-3 border-blue-400 shadow-lg">
          <h3 className="text-xl font-bold text-gray-800 mb-4">添加新谱面</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">歌曲名称</label>
              <input
                type="text"
                value={newSong.name}
                onChange={e => setNewSong({ ...newSong, name: e.target.value })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none text-gray-700 bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">难度</label>
              <select
                value={newSong.difficulty}
                onChange={e => setNewSong({ ...newSong, difficulty: e.target.value as Difficulty })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none text-gray-700 bg-gray-50"
              >
                <option value="EXPERT">EXPERT</option>
                <option value="MASTER">MASTER</option>
                <option value="Re:MASTER">Re:MASTER</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">等级</label>
              <input
                type="number"
                min="1"
                max="15"
                value={newSong.level}
                onChange={e => setNewSong({ ...newSong, level: parseInt(e.target.value) || 10 })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none text-gray-700 bg-gray-50"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newSong.isPlus}
                  onChange={e => setNewSong({ ...newSong, isPlus: e.target.checked })}
                  className="w-5 h-5"
                />
                <span className="text-sm font-bold text-gray-600">+号</span>
              </label>
              <label className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-600">谱面类型</span>
                <select
                  value={newSong.chartType}
                  onChange={e => setNewSong({ ...newSong, chartType: e.target.value as ChartType })}
                  className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none text-gray-700 bg-gray-50"
                >
                  <option value="standard">Standard</option>
                  <option value="dx">DX</option>
                </select>
              </label>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">封面路径</label>
              <input
                type="text"
                value={newSong.cover}
                onChange={e => setNewSong({ ...newSong, cover: e.target.value })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none text-gray-700 bg-gray-50"
                placeholder="./public/covers/cover.png"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">BPM</label>
              <input
                type="number"
                min="0"
                value={newSong.bpm}
                onChange={e => setNewSong({ ...newSong, bpm: parseInt(e.target.value) || 120 })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none text-gray-700 bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">作曲家</label>
              <input
                type="text"
                value={newSong.author}
                onChange={e => setNewSong({ ...newSong, author: e.target.value })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none text-gray-700 bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">流派</label>
              <input
                type="text"
                value={newSong.genre}
                onChange={e => setNewSong({ ...newSong, genre: e.target.value })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none text-gray-700 bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-600 mb-1">谱师</label>
              <input
                type="text"
                value={newSong.difficultyAuthor}
                onChange={e => setNewSong({ ...newSong, difficultyAuthor: e.target.value })}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-400 focus:outline-none text-gray-700 bg-gray-50"
              />
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <button
              onClick={addNewSong}
              disabled={!newSong.name}
              className="px-6 py-2 rounded-xl bg-gradient-to-b from-green-600 to-green-700 border-3 border-green-400 text-white font-rajdhani font-bold hover:from-green-500 hover:to-green-600 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              添加
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-6 py-2 rounded-xl bg-gray-500 text-white font-rajdhani font-bold hover:bg-gray-400 transition-all duration-200"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 分页控件 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mb-4">
          <span className="text-slate-300 text-sm font-rajdhani">
            共 {songs.length} 首，第 {currentPage + 1}/{totalPages} 页
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1.5 rounded-lg bg-slate-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors flex items-center gap-1"
            >
              <ChevronLeft size={16} /> 上一页
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg bg-slate-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600 transition-colors flex items-center gap-1"
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
              className={`p-4 rounded-2xl border-3 transition-all duration-200 ${
                isEditing ? 'bg-blue-50 border-blue-400' : 'bg-white border-gray-300'
              }`}
            >
              {isEditing ? (
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">歌曲名称</label>
                    <input
                      type="text"
                      value={editedSong.name}
                      onChange={e => updateSong(song.id, 'name', e.target.value)}
                      className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-400 focus:outline-none text-gray-700 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">难度</label>
                    <select
                      value={editedSong.difficulty}
                      onChange={e => updateSong(song.id, 'difficulty', e.target.value)}
                      className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-400 focus:outline-none text-gray-700 bg-gray-50"
                    >
                      <option value="EXPERT">EXPERT</option>
                      <option value="MASTER">MASTER</option>
                      <option value="Re:MASTER">Re:MASTER</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">等级</label>
                    <input
                      type="number"
                      min="1"
                      max="15"
                      value={editedSong.level}
                      onChange={e => updateSong(song.id, 'level', parseInt(e.target.value) || 10)}
                      className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-400 focus:outline-none text-gray-700 bg-gray-50"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editedSong.isPlus}
                        onChange={e => updateSong(song.id, 'isPlus', e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-xs font-bold text-gray-500">+</span>
                    </label>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">BPM</label>
                      <input
                        type="number"
                        min="0"
                        value={editedSong.bpm}
                        onChange={e => updateSong(song.id, 'bpm', parseInt(e.target.value) || 120)}
                        className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-400 focus:outline-none text-gray-700 bg-gray-50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">封面路径</label>
                    <input
                      type="text"
                      value={editedSong.cover}
                      onChange={e => updateSong(song.id, 'cover', e.target.value)}
                      className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-400 focus:outline-none text-gray-700 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">谱面类型</label>
                    <select
                      value={editedSong.chartType}
                      onChange={e => updateSong(song.id, 'chartType', e.target.value)}
                      className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-400 focus:outline-none text-gray-700 bg-gray-50"
                    >
                      <option value="standard">Standard</option>
                      <option value="dx">DX</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">作曲家</label>
                    <input
                      type="text"
                      value={editedSong.author}
                      onChange={e => updateSong(song.id, 'author', e.target.value)}
                      className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-400 focus:outline-none text-gray-700 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">流派</label>
                    <input
                      type="text"
                      value={editedSong.genre}
                      onChange={e => updateSong(song.id, 'genre', e.target.value)}
                      className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-400 focus:outline-none text-gray-700 bg-gray-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">谱师</label>
                    <input
                      type="text"
                      value={editedSong.difficultyAuthor}
                      onChange={e => updateSong(song.id, 'difficultyAuthor', e.target.value)}
                      className="w-full px-2 py-1 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-400 focus:outline-none text-gray-700 bg-gray-50"
                    />
                  </div>
                  <div className="col-span-4 flex gap-3">
                    <button
                      onClick={() => saveEdit(song.id)}
                      className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-green-500 text-white text-sm font-bold hover:bg-green-400 transition-colors"
                    >
                      <Save size={14} /> 保存
                    </button>
                    <button
                      onClick={() => toggleEdit(song)}
                      className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-gray-500 text-white text-sm font-bold hover:bg-gray-400 transition-colors"
                    >
                      <X size={14} /> 取消
                    </button>
                    <button
                      onClick={() => deleteSong(song.id)}
                      className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-red-500 text-white text-sm font-bold hover:bg-red-400 transition-colors"
                    >
                      <Trash2 size={14} /> 删除
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                      {song.cover && (
                        <img src={song.cover} alt={song.name} className="w-full h-full object-cover" loading="lazy" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">{song.name}</h4>
                      <p className="text-sm text-gray-500">
                        {song.author} · {song.difficulty} Lv.{song.level}
                        {song.isPlus ? '+' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">BPM {song.bpm}</span>
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-bold ${
                        song.chartType === 'dx'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {song.chartType === 'dx' ? 'DX' : 'STD'}
                    </span>
                    <button
                      onClick={() => toggleEdit(song)}
                      className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => deleteSong(song.id)}
                      className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
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
        <div className="text-center py-12 text-gray-500">
          <p className="font-bold text-lg">暂无谱面</p>
          <p className="text-sm mt-1">点击「添加谱面」开始创建</p>
        </div>
      )}
    </div>
  )
}
