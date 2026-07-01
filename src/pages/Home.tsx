import { useState, lazy, Suspense } from 'react'
import GachaHeader from '@/components/GachaHeader'
import GachaResults from '@/components/GachaResults'
import SongList from '@/components/SongList'
import JsonImport from '@/components/JsonImport'
import SongPoolBuilder from '@/components/SongPoolBuilder'
import TournamentControl from '@/components/TournamentControl'
import { useSongStore } from '@/store/songStore'
import { Music, List, Disc3, FolderPlus, MousePointerClick, Trophy, Gavel, GitBranch, MonitorPlay } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    <div className="min-h-screen relative overflow-hidden page-enter">
      {/* Faint ambient glow / grid behind content */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-violet-500/10 blur-[120px] animate-fluid-float" />
        <div className="absolute top-[10%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-cyan-500/10 blur-[120px] animate-fluid-float-reverse" />
        <div className="absolute -bottom-[10%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-pink-500/10 blur-[120px] animate-fluid-float" />
        <div className="absolute inset-0 hero-grid opacity-15 [background-size:48px_48px]" />
      </div>

      <GachaHeader />
      {selectedSongs.length > 0 ? (
        <GachaResults onSwitchPage={onSwitchPage} />
      ) : (
        <main className="relative z-0 px-4 pb-12">
          {/* Hero title */}
          <div className="max-w-6xl mx-auto mb-8 text-center">
            <div className="title-gradient text-2xl sm:text-3xl md:text-4xl animate-enter-scale">
              RANDOM PLUS · 随机抽卡与赛事系统
            </div>
          </div>

          {/* 标签切换 - 优化样式 */}
          <div className="max-w-6xl mx-auto mb-8">
            <div className="glass-panel rounded-3xl p-2 flex gap-2 flex-wrap">
              <button
                onClick={() => setActiveTab('gacha')}
                className={cn(
                  'relative flex-1 min-w-[140px] flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-rajdhani font-bold text-sm transition-all duration-300 press-down',
                  activeTab === 'gacha'
                    ? 'tab-item-active text-white shadow-lg shadow-cyan-500/10'
                    : 'tab-item hover:bg-white/5'
                )}
              >
                <Music size={18} className={cn(activeTab === 'gacha' && 'text-cyan-300')} />
                <span>抽卡模式</span>
              </button>
              <button
                onClick={() => setActiveTab('editor')}
                className={cn(
                  'relative flex-1 min-w-[140px] flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-rajdhani font-bold text-sm transition-all duration-300 press-down',
                  activeTab === 'editor'
                    ? 'tab-item-active text-white shadow-lg shadow-violet-500/10'
                    : 'tab-item hover:bg-white/5'
                )}
              >
                <List size={18} className={cn(activeTab === 'editor' && 'text-violet-300')} />
                <span>谱面列表编辑</span>
              </button>
              <button
                onClick={() => setActiveTab('poolBuilder')}
                className={cn(
                  'relative flex-1 min-w-[140px] flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-rajdhani font-bold text-sm transition-all duration-300 press-down',
                  activeTab === 'poolBuilder'
                    ? 'tab-item-active text-white shadow-lg shadow-pink-500/10'
                    : 'tab-item hover:bg-white/5'
                )}
              >
                <FolderPlus size={18} className={cn(activeTab === 'poolBuilder' && 'text-pink-300')} />
                <span>构建谱面库</span>
              </button>
              <button
                onClick={() => setActiveTab('tournament')}
                className={cn(
                  'relative flex-1 min-w-[140px] flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-rajdhani font-bold text-sm transition-all duration-300 press-down',
                  activeTab === 'tournament'
                    ? 'tab-item-active text-white shadow-lg shadow-amber-500/10'
                    : 'tab-item hover:bg-white/5'
                )}
              >
                <Trophy size={18} className={cn(activeTab === 'tournament' && 'text-amber-300')} />
                <span>赛事管理</span>
              </button>
            </div>

            {/* 额外入口 - 细线风格 (violet/blue border) */}
            <div className="flex gap-3 mt-3 flex-wrap">
              <button
                onClick={() => onSwitchPage?.('selector')}
                className="flex-1 min-w-[120px] btn-secondary !flex press-down hover-lift"
              >
                <MousePointerClick size={16} />
                <span>指定选谱</span>
              </button>
              <button
                onClick={() => window.history.pushState({}, '', '/?referee=1')}
                className="flex-1 min-w-[120px] btn-secondary !flex press-down hover-lift"
              >
                <Gavel size={16} />
                <span>裁判台</span>
              </button>
              <button
                onClick={() => window.history.pushState({}, '', '/bracket')}
                className="flex-1 min-w-[120px] btn-secondary !flex press-down hover-lift"
              >
                <GitBranch size={16} />
                <span>赛事对阵</span>
              </button>
              <button
                onClick={() => window.history.pushState({}, '', '/upcoming')}
                className="flex-1 min-w-[120px] btn-secondary !flex press-down hover-lift"
              >
                <MonitorPlay size={16} />
                <span>上场展示</span>
              </button>
            </div>
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
                  <div className="w-20 h-20 rounded-3xl glass-panel flex items-center justify-center mb-4">
                    <Disc3 size={40} className="opacity-60 animate-spin" />
                  </div>
                  <p className="font-rajdhani text-lg">加载中...</p>
                </div>
              }
            >
              <SongListEditor />
            </Suspense>
          )}
          {activeTab === 'poolBuilder' && <SongPoolBuilder />}
          {activeTab === 'tournament' && <TournamentControl />}
        </main>
      )}
    </div>
  )
}
