import { useState, lazy, Suspense } from 'react'
import GachaHeader from '@/components/GachaHeader'
import GachaResults from '@/components/GachaResults'
import SongList from '@/components/SongList'
import JsonImport from '@/components/JsonImport'
import SongPoolBuilder from '@/components/SongPoolBuilder'
import TournamentControl from '@/components/TournamentControl'
import { useSongStore } from '@/store/songStore'
import { Music, List, Disc3, FolderPlus, MousePointerClick, Trophy } from 'lucide-react'

type TabType = 'gacha' | 'editor' | 'poolBuilder' | 'tournament'

// 懒加载编辑器组件，仅在需要时加载
const SongListEditor = lazy(() => import('@/components/SongListEditor'))

interface HomeProps {
  onSwitchPage?: (target: 'home' | 'selector' | 'tournament') => void
}

export default function Home({ onSwitchPage }: HomeProps) {
  const { selectedSongs } = useSongStore()
  const [activeTab, setActiveTab] = useState<TabType>('gacha')

  return (
    <div className="min-h-screen relative">
      {/* Hero gradient bar at the very top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 z-10" />
      {/* Faint ambient glow / grid behind content */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-violet-700/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-radial from-blue-700/10 via-transparent to-transparent" style={{ backgroundPosition: '80% 20%' }} />
        <div className="absolute inset-0 hero-grid opacity-20 [background-size:48px_48px]" />
      </div>

      <GachaHeader />
      {selectedSongs.length > 0 ? (
        <GachaResults onSwitchPage={onSwitchPage} />
      ) : (
        <main className="relative z-0 px-4 pb-12">
          {/* Hero title */}
          <div className="max-w-6xl mx-auto mb-6 text-center">
            <div className="title-gradient text-xl sm:text-2xl md:text-3xl">
              RANDOM PLUS · 随机抽卡与赛事系统
            </div>
          </div>

          {/* 标签切换 - 优化样式 */}
          <div className="max-w-6xl mx-auto mb-8">
            <div className="glass-panel rounded-2xl p-2 flex gap-2 flex-wrap">
              <button
                onClick={() => setActiveTab('gacha')}
                className={`relative flex-1 min-w-[140px] flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-rajdhani font-bold text-sm transition-all duration-300 ${
                  activeTab === 'gacha'
                    ? 'bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-btn-shadow ring-1 ring-inset ring-white/10'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Music size={18} className={activeTab === 'gacha' ? 'text-blue-200' : ''} />
                <span>抽卡模式</span>
              </button>
              <button
                onClick={() => setActiveTab('editor')}
                className={`relative flex-1 min-w-[140px] flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-rajdhani font-bold text-sm transition-all duration-300 ${
                  activeTab === 'editor'
                    ? 'bg-gradient-to-b from-purple-500 to-purple-700 text-white shadow-btn-shadow ring-1 ring-inset ring-white/10'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <List size={18} className={activeTab === 'editor' ? 'text-purple-200' : ''} />
                <span>谱面列表编辑</span>
              </button>
              <button
                onClick={() => setActiveTab('poolBuilder')}
                className={`relative flex-1 min-w-[140px] flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-rajdhani font-bold text-sm transition-all duration-300 ${
                  activeTab === 'poolBuilder'
                    ? 'bg-gradient-to-b from-pink-500 to-pink-700 text-white shadow-btn-shadow ring-1 ring-inset ring-white/10'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <FolderPlus size={18} className={activeTab === 'poolBuilder' ? 'text-pink-200' : ''} />
                <span>构建谱面库</span>
              </button>
              <button
                onClick={() => setActiveTab('tournament')}
                className={`relative flex-1 min-w-[140px] flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-rajdhani font-bold text-sm transition-all duration-300 ${
                  activeTab === 'tournament'
                    ? 'bg-gradient-to-b from-amber-400 to-orange-600 text-white shadow-btn-shadow ring-1 ring-inset ring-white/10'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Trophy size={18} className={activeTab === 'tournament' ? 'text-amber-200' : ''} />
                <span>赛事管理</span>
              </button>
            </div>

            {/* 额外入口 - 细线风格 (violet/blue border) */}
            <button
              onClick={() => onSwitchPage?.('selector')}
              className="w-full mt-3 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-rajdhani font-bold text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all duration-200 border border-violet-500/30 hover:border-violet-400/50"
            >
              <MousePointerClick size={16} />
              <span>指定选谱</span>
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
          {activeTab === 'tournament' && <TournamentControl onSwitchPage={onSwitchPage} />}
        </main>
      )}
    </div>
  )
}
