import { useState, useEffect, useRef } from 'react'
import {
  STAGE_LABELS,
  STAGE_ORDER,
  type TournamentStage,
  type TournamentStageData,
} from '@/store/tournamentStore'
import { subscribeSyncEvents, type SyncEvent, getConnectionStatus } from '@/utils/tabSync'
import { Trophy, Sparkles, Medal, Crown, ChevronDown } from 'lucide-react'

// 从 localStorage 加载缓存数据
function loadCachedData(): { stages?: Record<string, unknown>; currentStage?: string; isTournamentStarted?: boolean } | null {
  try {
    const saved = localStorage.getItem('tournament-cache')
    if (saved) {
      return JSON.parse(saved)
    }
  } catch {
    // ignore
  }
  return null
}

export default function OBSTournament() {
  const [isStarted, setIsStarted] = useState(false)
  const [stages, setStages] = useState<Record<string, TournamentStageData | null>>({
    n216: null,
    '16to8': null,
    '8to4': null,
    semi: null,
    final: null,
  })
  const [currentStage, setCurrentStage] = useState<TournamentStage>('n216')
  const [viewMode, setViewMode] = useState<'current' | 'all' | 'champion'>('current')
  const [animateKey, setAnimateKey] = useState(0)
  const [showChampionAnimation, setShowChampionAnimation] = useState(false)
  const prevFinalLockedRef = useRef(false)
  const lastAnimateTimeRef = useRef(0)
  const ANIMATION_COOLDOWN = 800

  // Load cached data on mount
  useEffect(() => {
    const cached = loadCachedData()
    if (cached?.isTournamentStarted) {
      setIsStarted(true)
      if (cached.currentStage) {
        setCurrentStage(cached.currentStage as TournamentStage)
      }
      if (cached.stages) {
        setStages(cached.stages as Record<string, TournamentStageData>)
      }
    }
  }, [])

  // 检测决赛冠军 → 触发冠军展示动画
  useEffect(() => {
    const finalStage = stages['final']
    const isFinalLocked = finalStage?.locked === true
    const hasChampion = finalStage?.players.some((p) => p.rank === 1 && p.score !== null)

    if (isFinalLocked && hasChampion && !prevFinalLockedRef.current) {
      setShowChampionAnimation(true)
      setViewMode('champion')
      setAnimateKey(k => k + 1)
    }
    prevFinalLockedRef.current = isFinalLocked
  }, [stages])

  // Listen for tournament sync events
  useEffect(() => {
    let prevStage: TournamentStage | null = null
    let prevStageLocked: Record<string, boolean> = {}

    // 从缓存初始化锁定状态，避免加载后立即重复播放入场动画
    const cached = loadCachedData()
    if (cached?.stages) {
      for (const stage of STAGE_ORDER) {
        const stageData = cached.stages[stage] as { locked?: boolean } | undefined
        prevStageLocked[stage] = !!stageData?.locked
      }
    }

    const shouldAnimate = () => {
      const now = Date.now()
      if (now - lastAnimateTimeRef.current < ANIMATION_COOLDOWN) return false
      lastAnimateTimeRef.current = now
      return true
    }

    const handleTournamentEvent = (payload: { type: string; stages?: Record<string, TournamentStageData>; currentStage?: TournamentStage }) => {
      if (payload.type === 'update') {
        const newStages = payload.stages
        const newCurrentStage = payload.currentStage

        if (newStages) {
          setStages(newStages)
        }
        if (newCurrentStage) {
          setCurrentStage(newCurrentStage)
        }
        setIsStarted(true)

        // Cache to localStorage
        localStorage.setItem('tournament-cache', JSON.stringify({
          isTournamentStarted: true,
          stages: newStages,
          currentStage: newCurrentStage,
        }))

        // 检测阶段切换或新的阶段锁定 → 触发入场动画（带冷却，防止重复播放）
        if (newCurrentStage && newCurrentStage !== prevStage) {
          if (shouldAnimate()) setAnimateKey(k => k + 1)
          prevStage = newCurrentStage
        }

        if (newStages) {
          for (const stage of STAGE_ORDER) {
            const newLocked = newStages[stage]?.locked
            const wasLocked = prevStageLocked[stage]
            if (newLocked && !wasLocked) {
              if (shouldAnimate()) setAnimateKey(k => k + 1)
            }
            prevStageLocked[stage] = !!newLocked
          }
        }
      } else if (payload.type === 'reset') {
        setIsStarted(false)
        setStages({
          n216: null,
          '16to8': null,
          '8to4': null,
          semi: null,
          final: null,
        })
        prevStage = null
        prevStageLocked = {}
        localStorage.removeItem('tournament-cache')
        setShowChampionAnimation(false)
        setViewMode('current')
      }
    }

    const unsubscribe = subscribeSyncEvents((event: SyncEvent) => {
      if (event.type === 'tournament') {
        handleTournamentEvent(event.payload as { type: string; stages?: Record<string, TournamentStageData>; currentStage?: TournamentStage })
      }
    })

    return unsubscribe
  }, [])

  // 更新页面标题为当前赛段
  useEffect(() => {
    if (isStarted && STAGE_LABELS[currentStage]) {
      if (viewMode === 'champion') {
        document.title = '🏆 冠军诞生 - 赛事'
      } else {
        document.title = `${STAGE_LABELS[currentStage]} - 赛事`
      }
    }
  }, [currentStage, isStarted, viewMode])

  // ============ 冠军页面 ============
  if (viewMode === 'champion') {
    const finalStage = stages['final']
    const champion = finalStage?.players.find((p) => p.rank === 1)
    const runnerUp = finalStage?.players.find((p) => p.rank === 2)

    return (
      <div className="h-screen bg-dark-bg relative overflow-hidden flex items-center justify-center">
        {/* 背景光效 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-radial from-amber-500/20 via-amber-900/5 to-transparent animate-pulse" />
          {/* 光束 */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60vw] h-[60vh] bg-gradient-to-b from-amber-400/15 via-transparent to-transparent blur-3xl animate-[beamPulse_3s_ease-in-out_infinite]" />
        </div>

        {/* 装饰粒子 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-amber-400/60"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `floatParticle ${3 + Math.random() * 4}s ease-in-out ${Math.random() * 3}s infinite`,
                opacity: Math.random() * 0.5 + 0.3,
              }}
            />
          ))}
        </div>

        {/* 冠军展示 */}
        <div key={`champion-${animateKey}`} className="relative z-10 text-center">
          {/* 皇冠图标 */}
          <div className="mb-6 opacity-0 animate-[championReveal_0.8s_ease-out_0.2s_forwards]">
            <Crown className="mx-auto text-amber-400 drop-shadow-[0_0_30px_rgba(245,158,11,0.8)] animate-[crownFloat_2s_ease-in-out_infinite]" size={80} />
          </div>

          {/* 冠军标题 */}
          <div className="opacity-0 animate-[championReveal_0.6s_ease-out_0.5s_forwards] mb-4">
            <span className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-sm font-bold">
              <Medal size={18} /> 冠军诞生
            </span>
          </div>

          {/* 冠军名字 */}
          <div className="opacity-0 animate-[championReveal_1s_ease-out_0.8s_forwards]">
            <h1 className="text-8xl md:text-9xl font-black text-white drop-shadow-[0_0_40px_rgba(255,255,255,0.3)] leading-none mb-6">
              {champion?.name || '---'}
            </h1>
          </div>

          {/* 冠军分数 */}
          {champion?.score !== null && champion?.score !== undefined && (
            <div className="opacity-0 animate-[championReveal_0.6s_ease-out_1.3s_forwards] mb-8">
              <div className="inline-flex flex-col items-center gap-1 px-8 py-4 rounded-2xl bg-dark-card border border-amber-500/40">
                <span className="text-white/50 text-sm font-medium">完成率</span>
                <span className="text-amber-300 font-mono text-5xl font-black">{champion.score.toFixed(4)}</span>
              </div>
              {champion.dxScore && (
                <div className="mt-3 inline-flex flex-col items-center gap-1 px-6 py-2 rounded-xl bg-blue-500/10 border border-blue-400/30">
                  <span className="text-blue-400/70 text-xs font-medium">DX分数</span>
                  <span className="text-blue-300 font-mono text-2xl font-bold">DX {champion.dxScore}</span>
                </div>
              )}
            </div>
          )}

          {/* 亚军展示 */}
          {runnerUp && (
            <div className="opacity-0 animate-[championReveal_0.6s_ease-out_1.6s_forwards] mt-4">
              <div className="inline-flex items-center gap-3 px-5 py-2 rounded-xl bg-dark-card border border-dark-border/40">
                <Medal className="text-white/40" size={20} />
                <span className="text-white/60 font-bold">亚军</span>
                <span className="text-white font-bold text-lg">{runnerUp.name}</span>
                {runnerUp.score !== null && (
                  <span className="text-green-400 font-mono text-sm">{runnerUp.score.toFixed(4)}</span>
                )}
              </div>
            </div>
          )}

          {/* 按钮 */}
          <div className="opacity-0 animate-[championReveal_0.5s_ease-out_2s_forwards] mt-10 flex gap-4 justify-center">
            <button
              onClick={() => setViewMode('current')}
              className="px-6 py-3 rounded-xl bg-dark-card text-white/80 border border-dark-border/50 hover:bg-dark-hover transition-all font-bold text-base flex items-center gap-2"
            >
              返回赛事
            </button>
            <button
              onClick={() => setViewMode('all')}
              className="px-6 py-3 rounded-xl bg-gradient-to-b from-amber-500 to-orange-700 text-white font-bold border border-amber-400/40 shadow-[0_4px_20px_rgba(245,158,11,0.3)] hover:from-amber-400 hover:to-orange-600 transition-all text-base"
            >
              查看总览
            </button>
          </div>
        </div>

        {/* 全局动画样式 - 冠军页 */}
        <style>{`
          @keyframes championReveal {
            from { opacity: 0; transform: scale(0.8) translateY(20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes crownFloat {
            0%, 100% { transform: translateY(0) rotate(-2deg); }
            50% { transform: translateY(-8px) rotate(2deg); }
          }
          @keyframes beamPulse {
            0%, 100% { opacity: 0.5; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.1); }
          }
          @keyframes floatParticle {
            0%, 100% { transform: translateY(0) scale(1); opacity: 0.5; }
            50% { transform: translateY(-40px) scale(1.5); opacity: 1; }
          }
        `}</style>
      </div>
    )
  }

  if (!isStarted) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <Trophy size={64} className="mx-auto mb-4 text-white/30" />
          <p className="text-white/50 text-xl font-bold">等待赛事开始...</p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dark-card border border-dark-border/50 text-xs font-bold text-white/50">
            {getConnectionStatus() === 'connected' ? (
              <span className="text-green-400">● 已连接</span>
            ) : (
              <span className="text-amber-400">○ 连接中...</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 获取有数据的阶段
  const activeStages = STAGE_ORDER.filter((s) => stages[s] && stages[s]!.players.length > 0 && stages[s]!.locked)

  // ============ 总览页面 ============
  if (viewMode === 'all') {
    // 找冠军
    const finalStage = stages['final']
    const champion = finalStage?.players.find((p) => p.rank === 1 && finalStage.locked)
    const showChampionBtn = !!champion

    return (
      <div className="min-h-screen bg-dark-bg py-6">
        <div className="w-[90vw] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl font-black text-white flex items-center gap-4">
              <Trophy className="text-amber-400" size={48} />
              赛事晋级总览
            </h1>
            <div className="flex gap-3">
              {showChampionBtn && (
                <button
                  onClick={() => {
                    setShowChampionAnimation(true)
                    setViewMode('champion')
                    setAnimateKey(k => k + 1)
                  }}
                  className="px-5 py-3 rounded-xl bg-gradient-to-b from-amber-500 to-orange-700 text-white text-lg font-bold border border-amber-400/40 shadow-[0_2px_12px_rgba(245,158,11,0.25)] hover:from-amber-400 hover:to-orange-600 transition-all flex items-center gap-2"
                >
                  <Crown size={18} /> 冠军页
                </button>
              )}
              <button
                onClick={() => setViewMode('current')}
                className="px-5 py-3 rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 text-white text-lg font-bold border border-blue-400/40 shadow-[0_2px_12px_rgba(59,130,246,0.25)] hover:from-blue-400 hover:to-blue-600 transition-all"
              >
                查看当前阶段
              </button>
            </div>
          </div>

          {STAGE_ORDER.map((stage) => {
            const stageData = stages[stage]
            if (!stageData || !stageData.locked) return null
            const stagePlayers = stageData.players
              .filter((p) => p.score !== null)
              .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
            if (stagePlayers.length === 0) return null

            const isStageFinal = stage === 'final'
            const showStageRank = stage === 'semi' || stage === 'final'

            return (
              <div key={stage} className="mb-6 bg-dark-card rounded-2xl border border-dark-border/40 overflow-hidden">
                <div className="px-6 py-4 bg-dark-bg/70 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-xl text-base font-black ${
                      stage === currentStage
                        ? 'bg-gradient-to-b from-blue-500 to-blue-700 text-white border border-blue-400/40'
                        : 'bg-dark-bg text-white/70 border border-dark-border/50'
                    }`}>
                      {STAGE_LABELS[stage]}
                    </span>
                    <span className="text-green-400 text-sm">✓ 已锁定</span>
                  </h2>
                  {/* 阶段内晋级/排名标签 */}
                  <div className="flex items-center gap-2">
                    {stage === 'final' && champion && (
                      <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold flex items-center gap-1">
                        <Crown size={12} /> {champion.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* 晋级选手区块 */}
                <div className="px-6 py-5">
                  {isStageFinal && stagePlayers.length === 2 ? (
                    /* 决赛并排展示 */
                    <div className="flex items-stretch justify-center gap-8">
                      {stagePlayers.map((p) => (
                        <div
                          key={p.id}
                          className={`flex-1 max-w-md flex flex-col items-center justify-center gap-4 px-10 py-12 rounded-2xl border-2 ${
                            p.rank === 1
                              ? 'bg-gradient-to-b from-amber-500/25 to-dark-card border-amber-500/60'
                              : 'bg-gradient-to-b from-dark-hover to-dark-card border-dark-border/60'
                          }`}
                        >
                          {showStageRank && p.rank !== null && (
                            <span className={`w-16 h-16 rounded-full font-black flex items-center justify-center text-2xl ${
                              p.rank === 1 ? 'bg-amber-500 text-amber-900' : 'bg-white/70 text-dark-bg'
                            }`}>
                              {p.rank}
                            </span>
                          )}
                          <span className="text-white font-black text-4xl text-center">{p.name}</span>
                          <div className="flex flex-col items-center gap-2 mt-2">
                            <div className="flex flex-col items-center">
                              <span className="text-green-400 text-sm font-bold opacity-70">完成率</span>
                              <span className="text-green-300 font-mono text-3xl">{p.score?.toFixed(4)}</span>
                            </div>
                            {p.dxScore && (
                              <div className="flex flex-col items-center">
                                <span className="text-blue-400 text-sm font-bold opacity-70">DX分数</span>
                                <span className="text-blue-300 font-mono text-xl">DX {p.dxScore}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* 其他阶段网格布局 */
                    <div className={`grid gap-4 ${
                      stagePlayers.length <= 4 ? 'grid-cols-4' :
                      stagePlayers.length <= 8 ? 'grid-cols-8' : 'grid-cols-8'
                    }`}>
                      {stagePlayers.map((p) => {
                        const is8to4Adv = stage === '8to4' && p.advanced
                        const is16to8Adv = stage === '16to8' && p.advanced
                        const isAdvLabel = is8to4Adv || is16to8Adv
                        const advLabel = is8to4Adv ? '晋级' : is16to8Adv ? '8强' : ''
                        const isEliminated = p.eliminated && stage !== 'final'
                        return (
                        <div
                          key={p.id}
                          className={`flex flex-col items-center justify-center gap-4 px-4 py-10 rounded-2xl border-2 ${
                            stagePlayers.length <= 8 ? 'min-h-[320px]' : ''
                          } ${
                            isAdvLabel
                              ? 'bg-gradient-to-b from-blue-500/25 to-dark-card border-blue-400/60 ring-4 ring-blue-400/20'
                              : isEliminated
                              ? 'bg-gradient-to-b from-red-500/10 to-dark-card border-red-500/40 opacity-80'
                              : showStageRank
                              ? p.rank === 1
                                ? 'bg-gradient-to-b from-amber-500/25 to-dark-card border-amber-500/50'
                                : p.rank === 2
                                ? 'bg-gradient-to-b from-dark-hover to-dark-card border-dark-border/50'
                                : 'bg-gradient-to-b from-green-500/15 to-dark-card border-green-500/40'
                              : 'bg-gradient-to-b from-green-500/15 to-dark-card border-green-500/40'
                          }`}
                        >
                          {isAdvLabel && (
                            <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 text-sm font-bold">
                              {advLabel}
                            </span>
                          )}
                          {isEliminated && (
                            <span className="px-3 py-1 rounded-full bg-red-500/20 border border-red-400/40 text-red-300 text-sm font-bold">
                              淘汰
                            </span>
                          )}
                          {showStageRank && !isAdvLabel && !isEliminated && p.rank !== null && (
                            <span className={`w-14 h-14 rounded-full font-black flex items-center justify-center text-xl ${
                              p.rank === 1 ? 'bg-amber-500 text-amber-900' :
                              p.rank === 2 ? 'bg-white/70 text-dark-bg' :
                              'bg-dark-bg text-white/60'
                            }`}>
                              {p.rank}
                            </span>
                          )}
                          <span className={`font-bold text-2xl text-center ${isEliminated ? 'text-white/50' : 'text-white'}`}>{p.name}</span>
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex flex-col items-center">
                              <span className={`text-xs font-bold opacity-70 ${isEliminated ? 'text-red-400/70' : 'text-green-400'}`}>完成率</span>
                              <span className={`font-mono text-2xl ${isEliminated ? 'text-red-300/70' : 'text-green-300'}`}>{p.score?.toFixed(4)}</span>
                            </div>
                            {p.dxScore && (
                              <div className="flex flex-col items-center">
                                <span className="text-blue-400 text-xs font-bold opacity-70">DX分数</span>
                                <span className="text-blue-300 font-mono text-base">DX {p.dxScore}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ============ 当前阶段页面 ============
  const stageData = stages[currentStage]
  const currentPlayers = stageData?.players
    .filter((p) => p.score !== null)
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)) ?? []

  const showRank = currentStage === 'semi' || currentStage === 'final'
  const isFinal = currentStage === 'final'
  const finalStage = stages['final']
  const hasChampion = finalStage?.locked && finalStage?.players.some((p) => p.rank === 1)

  if (activeStages.length === 0) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <p className="text-white/50 text-xl font-bold">等待赛事结果...</p>
      </div>
    )
  }

  return (
    <div className="h-screen bg-dark-bg p-6 relative overflow-hidden flex flex-col">
      {/* Background ambient effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-radial from-amber-500/10 via-transparent to-transparent" />
      </div>

      {/* 90vw 宽度容器，居中显示 */}
      <div className="w-[90vw] mx-auto relative z-10 flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 mb-4">
          <h1 className="text-5xl font-black text-white flex items-center gap-5">
            <Trophy className="text-amber-400" size={56} />
            {STAGE_LABELS[currentStage]}
          </h1>
          <div className="flex gap-3 items-center">
            {activeStages.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setCurrentStage(s as TournamentStage)
                  setAnimateKey(k => k + 1)
                }}
                className={`px-5 py-3 rounded-xl text-lg font-bold transition-all ${
                  s === currentStage
                    ? 'bg-gradient-to-b from-blue-500 to-blue-700 text-white border border-blue-400/40 shadow-[0_2px_12px_rgba(59,130,246,0.25)]'
                    : 'bg-dark-card text-white/60 border border-dark-border/50 hover:bg-dark-hover hover:text-white'
                }`}
              >
                {STAGE_LABELS[s]}
              </button>
            ))}
            {activeStages.length > 1 && (
              <button
                onClick={() => setViewMode('all')}
                className="px-5 py-3 rounded-xl bg-dark-card text-white/70 border border-dark-border/50 hover:bg-dark-hover hover:text-white text-lg font-bold transition-all"
              >
                总览
              </button>
            )}
            {hasChampion && (
              <button
                onClick={() => {
                  setShowChampionAnimation(true)
                  setViewMode('champion')
                  setAnimateKey(k => k + 1)
                }}
                className="px-5 py-3 rounded-xl bg-gradient-to-b from-amber-500 to-orange-700 text-white font-bold border border-amber-400/40 shadow-[0_2px_12px_rgba(245,158,11,0.25)] hover:from-amber-400 hover:to-orange-600 transition-all text-lg flex items-center gap-2"
              >
                <Crown size={18} /> 冠军
              </button>
            )}
          </div>
        </div>

        {/* 选手区块 - 带入场动画 */}
        {currentPlayers.length > 0 && (
          <div key={`stage-${currentStage}-${animateKey}`} className="flex-1 min-h-0">
            {/* 决赛：并排展示两个选手 */}
            {isFinal ? (
              <div className="flex items-stretch justify-center gap-10 h-full">
                {currentPlayers.map((p, index) => (
                  <div
                    key={p.id}
                    className={`flex-1 flex flex-col items-center justify-center gap-6 px-12 rounded-3xl border-2 opacity-0 animate-[fadeSlideUp_0.6s_ease-out_both] ${
                      p.rank === 1
                        ? 'bg-gradient-to-b from-amber-500/25 to-dark-card border-amber-500/60'
                        : 'bg-gradient-to-b from-dark-hover to-dark-card border-dark-border/60'
                    }`}
                    style={{ animationDelay: `${index * 200}ms` }}
                  >
                    {showRank && p.rank !== null && (
                      <span className={`w-24 h-24 rounded-full font-black flex items-center justify-center text-4xl ${
                        p.rank === 1 ? 'bg-amber-500 text-amber-900' : 'bg-white/70 text-dark-bg'
                      }`}>
                        {p.rank}
                      </span>
                    )}
                    <span className="text-white font-black text-6xl text-center">{p.name}</span>
                    <div className="flex flex-col items-center gap-4 mt-6">
                      <div className="flex flex-col items-center">
                        <span className="text-green-400 text-base font-bold opacity-70">完成率</span>
                        <span className="text-green-300 font-mono text-5xl">{p.score?.toFixed(4)}</span>
                      </div>
                      {p.dxScore && (
                        <div className="flex flex-col items-center">
                          <span className="text-blue-400 text-base font-bold opacity-70">DX分数</span>
                          <span className="text-blue-300 font-mono text-3xl">DX {p.dxScore}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* 其他阶段：自适应网格布局 */
              <div className={`grid gap-5 h-full ${
                currentPlayers.length <= 4
                  ? 'grid-cols-4'
                  : currentPlayers.length <= 8
                  ? 'grid-cols-8'
                  : 'grid-cols-8'
              }`}>
                {currentPlayers.map((p, index) => {
                  const is8to4Advanced = currentStage === '8to4' && p.advanced
                  const is16to8Advanced = currentStage === '16to8' && p.advanced
                  const isAdvancedLabel = is8to4Advanced || is16to8Advanced
                  const advancedLabel = is8to4Advanced ? '晋级' : is16to8Advanced ? '8强' : ''
                  const isEliminated = p.eliminated
                  return (
                  <div
                    key={p.id}
                    className={`flex flex-col items-center justify-center gap-4 px-5 rounded-2xl border-2 opacity-0 animate-[fadeSlideUp_0.6s_ease-out_both] ${
                      isAdvancedLabel
                        ? 'bg-gradient-to-b from-blue-500/25 to-dark-card border-blue-400/60 ring-4 ring-blue-400/20'
                        : isEliminated
                        ? 'bg-gradient-to-b from-red-500/10 to-dark-card border-red-500/40 opacity-80'
                        : showRank
                        ? p.rank === 1
                          ? 'bg-gradient-to-b from-amber-500/25 to-dark-card border-amber-500/50'
                          : p.rank === 2
                          ? 'bg-gradient-to-b from-dark-hover to-dark-card border-dark-border/50'
                          : 'bg-gradient-to-b from-green-500/15 to-dark-card border-green-500/40'
                        : 'bg-gradient-to-b from-green-500/15 to-dark-card border-green-500/40'
                    }`}
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    {isAdvancedLabel && (
                      <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 text-sm font-bold">
                        {advancedLabel}
                      </span>
                    )}
                    {isEliminated && (
                      <span className="px-3 py-1 rounded-full bg-red-500/20 border border-red-400/40 text-red-300 text-sm font-bold">
                        淘汰
                      </span>
                    )}
                    {showRank && !isAdvancedLabel && !isEliminated && p.rank !== null && (
                      <span className={`w-16 h-16 rounded-full font-black flex items-center justify-center text-2xl ${
                        p.rank === 1 ? 'bg-amber-500 text-amber-900' :
                        p.rank === 2 ? 'bg-white/70 text-dark-bg' :
                        'bg-dark-bg text-white/60'
                      }`}>
                        {p.rank}
                      </span>
                    )}
                    <span className={`font-bold text-3xl text-center ${isEliminated ? 'text-white/50' : 'text-white'}`}>{p.name}</span>
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex flex-col items-center">
                        <span className={`text-sm font-bold opacity-70 ${isEliminated ? 'text-red-400/70' : 'text-green-400'}`}>完成率</span>
                        <span className={`font-mono text-3xl ${isEliminated ? 'text-red-300/70' : 'text-green-300'}`}>{p.score?.toFixed(4)}</span>
                      </div>
                      {p.dxScore && (
                        <div className="flex flex-col items-center">
                          <span className="text-blue-400 text-sm font-bold opacity-70">DX分数</span>
                          <span className="text-blue-300 font-mono text-xl">DX {p.dxScore}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 全局动画样式 */}
      <style>{`
        @keyframes fadeSlideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}
