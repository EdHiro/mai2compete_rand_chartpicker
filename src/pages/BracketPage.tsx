import { useEffect, useMemo, useRef, useState } from 'react'
import {
  useTournamentStore,
  STAGE_LABELS,
  STAGE_ORDER,
  type TournamentStageData,
  type TournamentPlayer,
  type MatchGroup,
} from '@/store/tournamentStore'
import { Trophy, ArrowLeft, Swords, Crown, CheckCircle2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LineDef {
  id: string
  points: { x: number; y: number }[]
}

function getPlayerMap(players: TournamentPlayer[]) {
  return new Map(players.map((p) => [p.id, p]))
}

function MatchCard({
  group,
  stageData,
  registerRowRef,
}: {
  group: MatchGroup
  stageData: TournamentStageData
  registerRowRef?: (playerId: string, el: HTMLDivElement | null) => void
}) {
  const map = useMemo(() => getPlayerMap(stageData.players), [stageData.players])
  const players = group.playerIds.map((id) => map.get(id)).filter(Boolean) as TournamentPlayer[]
  const advancedCount = players.filter((p) => p.advanced).length
  const isCompleted = group.completed || group.status === 'completed'

  return (
    <div
      className={cn(
        'relative rounded-2xl p-3 min-w-[220px] border backdrop-blur-md transition-all',
        isCompleted
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : 'bg-white/[0.04] border-white/10 hover:border-white/20'
      )}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 opacity-60" />
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Swords size={14} className="text-cyan-400 flex-shrink-0" />
          <span className="text-xs font-bold text-white truncate">{group.name}</span>
        </div>
        {isCompleted ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
            <CheckCircle2 size={10} />
            已完成
          </span>
        ) : advancedCount > 0 ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
            <Clock size={10} />
            进行中
          </span>
        ) : null}
      </div>
      <div className="space-y-2">
        {players.map((p) => (
          <div
            key={p.id}
            ref={(el) => registerRowRef?.(p.id, el)}
            className={cn(
              'flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs border',
              p.advanced
                ? 'bg-emerald-500/15 text-emerald-100 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.08)]'
                : 'bg-white/5 text-white/70 border-white/5'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              {p.advanced && <Crown size={12} className="text-amber-400 flex-shrink-0" />}
              <span className="truncate max-w-[110px]">{p.name}</span>
              {p.seed && (
                <span className="text-[9px] text-amber-300 bg-amber-500/10 px-1 py-0.5 rounded flex-shrink-0">
                  种子{p.seed}
                </span>
              )}
            </div>
            <span className="tabular-nums font-mono font-bold">{p.score?.toFixed(4) ?? '-'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StageColumn({
  stageIdx,
  stage,
  stageData,
  registerRowRef,
}: {
  stageIdx: number
  stage: string
  stageData: TournamentStageData
  registerRowRef: (stageIdx: number, groupIdx: number, playerId: string, el: HTMLDivElement | null) => void
}) {
  const label = STAGE_LABELS[stage as keyof typeof STAGE_LABELS] || stage
  const groups = stageData.groups
  const completedGroups = groups.filter((g) => g.completed || g.status === 'completed').length

  return (
    <div className="flex flex-col gap-6 min-w-[260px] z-10">
      <div className="sticky left-0 bg-black/20 backdrop-blur-sm rounded-2xl p-4 border border-white/5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-white text-xs font-black">
            {stageIdx + 1}
          </div>
          <h2 className="text-lg font-bold text-white">{label}</h2>
        </div>
        <p className="text-xs text-white/40">
          {stageData.players.length} 人 · {groups.length || 1} 场
          {groups.length > 0 && (
            <span className="ml-2 text-white/30">
              · {completedGroups}/{groups.length} 完成
            </span>
          )}
        </p>
      </div>
      {groups.length > 0 ? (
        <div className="flex flex-col gap-6">
          {groups.map((g, groupIdx) => (
            <MatchCard
              key={g.id}
              group={g}
              stageData={stageData}
              registerRowRef={(playerId, el) => registerRowRef(stageIdx, groupIdx, playerId, el)}
            />
          ))}
        </div>
      ) : (
        <div className="glass-panel rounded-2xl p-4 text-center text-white/40 text-xs">
          本阶段未生成分组
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center page-enter px-4">
      <div className="glass-panel rounded-3xl p-8 max-w-md w-full text-center">
        <Trophy size={48} className="mx-auto text-amber-400 mb-4" />
        <h1 className="title-gradient text-2xl mb-2">赛事对阵</h1>
        <p className="text-white/60 text-sm mb-6">当前没有进行中的赛事。</p>
        <button
          onClick={() => {
            window.history.pushState({}, '', '/')
            window.location.reload()
          }}
          className="btn-secondary press-down"
        >
          <ArrowLeft size={16} />
          <span>返回首页</span>
        </button>
      </div>
    </div>
  )
}

export default function BracketPage() {
  const { stages, isTournamentStarted } = useTournamentStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [lines, setLines] = useState<LineDef[]>([])
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 })

  const stageList = useMemo(
    () => STAGE_ORDER.map((s) => ({ stage: s, data: stages[s] })),
    [stages]
  )

  const champion = useMemo(() => {
    const finalPlayers = stages.final.players
    return finalPlayers.find((p) => p.rank === 1) || finalPlayers.find((p) => p.advanced) || null
  }, [stages.final.players])

  const registerRowRef = (
    stageIdx: number,
    groupIdx: number,
    playerId: string,
    el: HTMLDivElement | null
  ) => {
    const key = `${stageIdx}-${groupIdx}-${playerId}`
    if (el) {
      rowRefs.current.set(key, el)
    } else {
      rowRefs.current.delete(key)
    }
  }

  // 计算精确到选手的直角连接线
  const computeLines = () => {
    const container = containerRef.current
    if (!container) return

    const containerRect = container.getBoundingClientRect()
    const scrollLeft = container.scrollLeft
    const scrollTop = container.scrollTop
    const nextLines: LineDef[] = []

    for (let i = 1; i < STAGE_ORDER.length; i++) {
      const prevStageIdx = i - 1
      const currStageIdx = i
      const prevStage = stages[STAGE_ORDER[prevStageIdx]]
      const currStage = stages[STAGE_ORDER[currStageIdx]]
      const prevPlayerMap = getPlayerMap(prevStage.players)

      currStage.groups.forEach((targetGroup, targetGroupIdx) => {
        targetGroup.playerIds.forEach((playerId) => {
          const prevPlayer = prevPlayerMap.get(playerId)
          if (!prevPlayer || !prevPlayer.advanced) return

          // 上一阶段中该选手所在分组
          const sourceGroupIdx = prevStage.groups.findIndex((g) => g.playerIds.includes(playerId))
          if (sourceGroupIdx < 0) return

          const sourceEl = rowRefs.current.get(`${prevStageIdx}-${sourceGroupIdx}-${playerId}`)
          const targetEl = rowRefs.current.get(`${currStageIdx}-${targetGroupIdx}-${playerId}`)
          if (!sourceEl || !targetEl) return

          const sourceRect = sourceEl.getBoundingClientRect()
          const targetRect = targetEl.getBoundingClientRect()

          const sx = sourceRect.left + sourceRect.width - containerRect.left + scrollLeft
          const sy = sourceRect.top + sourceRect.height / 2 - containerRect.top + scrollTop
          const tx = targetRect.left - containerRect.left + scrollLeft
          const ty = targetRect.top + targetRect.height / 2 - containerRect.top + scrollTop
          const midX = (sx + tx) / 2

          nextLines.push({
            id: `${prevStageIdx}-${sourceGroupIdx}-${currStageIdx}-${targetGroupIdx}-${playerId}`,
            points: [
              { x: sx, y: sy },
              { x: midX, y: sy },
              { x: midX, y: ty },
              { x: tx, y: ty },
            ],
          })
        })
      })
    }

    setSvgSize({ width: container.scrollWidth, height: container.scrollHeight })
    setLines(nextLines)
  }

  useEffect(() => {
    computeLines()
    const handleResize = () => computeLines()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stages])

  if (!isTournamentStarted) {
    return <EmptyState />
  }

  return (
    <div className="min-h-screen flex flex-col page-enter">
      <header className="sticky top-0 z-50 glass-panel border-b border-white/10">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy size={24} className="text-amber-400" />
            <h1 className="title-gradient text-xl sm:text-2xl">赛事对阵 Bracket</h1>
          </div>
          <button
            onClick={() => {
              window.history.pushState({}, '', '/')
              window.location.reload()
            }}
            className="btn-secondary press-down"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">返回</span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-x-auto relative" ref={containerRef}>
        <div className="flex items-stretch gap-6 sm:gap-10 p-4 sm:p-8 min-w-max relative">
          <svg
            className="absolute top-0 left-0 pointer-events-none z-0"
            width={svgSize.width}
            height={svgSize.height}
          >
            <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(34,211,238,0.5)" />
              <stop offset="100%" stopColor="rgba(168,85,247,0.5)" />
            </linearGradient>
            <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {lines.map((line) => (
            <g key={line.id}>
              <polyline
                points={line.points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                filter="url(#lineGlow)"
              />
              <polyline
                points={line.points.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth={1}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </g>
          ))}
          </svg>

          {stageList.map(({ stage, data }, stageIdx) => (
            <StageColumn
              key={stage}
              stageIdx={stageIdx}
              stage={stage}
              stageData={data}
              registerRowRef={registerRowRef}
            />
          ))}
          {champion && (
            <div className="flex flex-col gap-4 min-w-[200px] justify-center z-10">
              <div className="glass-panel rounded-2xl p-4 border border-amber-500/30 bg-amber-500/10">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy size={18} className="text-amber-400" />
                  <span className="text-sm font-bold text-white">冠军</span>
                </div>
                <div className="text-2xl font-black text-amber-300 truncate">{champion.name}</div>
                <div className="text-xs text-white/50 mt-1">
                  {champion.score?.toFixed(4) ?? ''}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
