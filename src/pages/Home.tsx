import { useState, lazy, Suspense } from 'react'
import GachaHeader from '@/components/GachaHeader'
import GachaResults from '@/components/GachaResults'
import SongList from '@/components/SongList'
import JsonImport from '@/components/JsonImport'
import SongPoolBuilder from '@/components/SongPoolBuilder'
import { useSongStore } from '@/store/songStore'
import { Music, List, Disc3, FolderPlus, MousePointerClick } from 'lucide-react'

type TabType = 'gacha' | 'editor' | 'poolBuilder'

// 懒加载编辑器组件，仅在需要时加载
const SongListEditor = lazy(() => import('@/components/SongListEditor'))

interface HomeProps {
  onSwitchPage?: (target: 'home' | 'selector') => void
}

export default function Home({ onSwitchPage }: HomeProps) {
  const { selectedSongs } = useSongStore()
  const [activeTab, setActiveTab] = useState<TabType>('gacha')

  return (
    <div className="min-h-screen bg-dark-bg">
      <GachaHeader />
      {selectedSongs.length > 0 ? (
        <GachaResults onSwitchPage={onSwitchPage} />
      ) : (
        <main className="px-4 pb-12">
          {/* 标签切换 */}
          <div className="max-w-6xl mx-auto mb-6 flex gap-3 flex-wrap">
            <button
              onClick={() => setActiveTab('gacha')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-rajdhani font-bold transition-all duration-200 shadow-lg ${
                activeTab === 'gacha'
                  ? 'bg-gradient-to-b from-blue-600 to-blue-700 border-3 border-blue-400 text-white'
                  : 'bg-gray-700 border-3 border-gray-600 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Music size={18} />
              抽卡模式
            </button>
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-rajdhani font-bold transition-all duration-200 shadow-lg ${
                activeTab === 'editor'
                  ? 'bg-gradient-to-b from-purple-600 to-purple-700 border-3 border-purple-400 text-white'
                  : 'bg-gray-700 border-3 border-gray-600 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <List size={18} />
              曲目列表编辑
            </button>
            <button
              onClick={() => setActiveTab('poolBuilder')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-rajdhani font-bold transition-all duration-200 shadow-lg ${
                activeTab === 'poolBuilder'
                  ? 'bg-gradient-to-b from-pink-600 to-pink-700 border-3 border-pink-400 text-white'
                  : 'bg-gray-700 border-3 border-gray-600 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <FolderPlus size={18} />
              曲库构建
            </button>
            <button
              onClick={() => onSwitchPage?.('selector')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-rajdhani font-bold transition-all duration-200 shadow-lg bg-gray-700 border-3 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-white"
            >
              <MousePointerClick size={18} />
              指定选曲
            </button>
          </div>

          {activeTab === 'gacha' && (
            <>
              <JsonImport />
              <SongList />
            </>
          )}
          {activeTab === 'editor' && (
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center py-20 text-white/70">
                  <Disc3 size={64} className="mb-4 opacity-50 animate-spin" />
                  <p className="font-rajdhani text-lg">加载中...</p>
                </div>
              }
            >
              <SongListEditor />
            </Suspense>
          )}
          {activeTab === 'poolBuilder' && <SongPoolBuilder />}
        </main>
      )}
    </div>
  )
}
