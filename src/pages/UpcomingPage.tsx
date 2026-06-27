import { useEffect, useMemo, useState } from 'react'
import {
  useTournamentStore,
  STAGE_LABELS,
  STAGE_ORDER,
  type TournamentStage,
  type MatchGroup,
  type TournamentPlayer,
} from '@/store/tournamentStore'
import { subscribeSyncEvents } from '@/utils/tabSync'
import { Trophy, Users, Clock, CheckCircle2, Music } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HighlightedGroup {
  stage: TournamentStage
  groupId: string
}

function getPlayerMap(players: TournamentPlayer[]) {
  return new Map(players.map((p) => [p.id, p]))
}

function EmptyState() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center page-enter px-4">
      <div className="glass-panel rounded-3xl p-8 max-w-md w-full text-center">
        <Trophy size={48} className="mx-auto text-amber-400 mb-4" />
        <h1 className="title-gradient text-2xl mb-2">接下来上场</h1>
        <p className="text-white/60 text-sm">当前没有进行中的赛事。</p>
      </div>
    </div>
  )
}

export default function UpcomingPage() {
  const { stages, currentStage, isTournamentStarted } = useTournamentStore()
  const [highlighted, setHighlighted] = useState<HighlightedGroup | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeSyncEvents((event) => {
      if (event.type === 'upcoming') {
        const payload = event.payload as HighlightedGroup | undefined
        if (payload?.stage && payload?.groupId) {
          setHighlighted(payload)
        }
      }
    })
    return () => unsubscribe()
  }, [])

  const displayGroup = useMemo((): {
    stage: TournamentStage
    group: MatchGroup
    players: TournamentPlayer[]
  } | null => {
    if (!isTournamentStarted) return null

    // 优先使用裁判台手动指定的上场分组
    if (highlighted) {
      const stageData = stages[highlighted.stage]
      const group = stageData?.groups.find((g) => g.id === highlighted.groupId)
      if (group) {
        const map = getPlayerMap(stageData.players)
        const players = group.playerIds
          .map((id) => map.get(id))
          .filter(Boolean) as TournamentPlayer[]
        return { stage: highlighted.stage, group, players }
      }
    }

    // 自动查找当前阶段未完成的分组
    const currentData = stages[currentStage]
    const currentPending = currentData?.groups.find((g) => !g.completed)
    if (currentPending) {
      const map = getPlayerMap(currentData.players)
      const players = currentPending.playerIds
        .map((id) => map.get(id))
        .filter(Boolean) as TournamentPlayer[]
      return { stage: currentStage, group: currentPending, players }
    }

    // 当前阶段全部完成，则按阶段顺序查找更早的未完成分组
    for (const stage of STAGE_ORDER) {
      const stageData = stages[stage]
      const pending = stageData?.groups.find((g) => !g.completed)
      if (pending) {
        const map = getPlayerMap(stageData.players)
        const players = pending.playerIds
          .map((id) => map.get(id))
          .filter(Boolean) as TournamentPlayer[]
        return { stage, group: pending, players }
      }
    }

    return null
  }, [highlighted, stages, currentStage, isTournamentStarted])

  if (!isTournamentStarted || !displayGroup) {
    return <EmptyState />
  }

  const { stage, group, players } = displayGroup
  const stageLabel = STAGE_LABELS[stage]
  const hasSongs = group.songs.length > 0

  return (
    <div className="min-h-screen flex flex-col items-center justify-center page-enter p-4 sm:p-8">
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-center gap-3 mb-6 sm:mb-10 animate-enter">
          <Clock size={28} className="text-cyan-400 animate-float-soft" />
          <h1 className="title-gradient text-2xl sm:text-4xl">接下来上场</h1>
        </div>

        <div
          key={group.id}
          className="glass-panel rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl animate-upcoming-card animate-glow-pulse"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 text-xs font-bold border border-cyan-500/20">
                {stageLabel}
              </span>
              <span className="text-white/60 text-xs sm:text-sm flex items-center gap-1.5">
                <Users size={14} />
                {players.length} 人
              </span>
            </div>
            {group.completed ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-400 text-sm font-bold">
                <CheckCircle2 size={16} />
                该组已完成
              </span>
            ) : null}
          </div>

          <h2 className="text-xl sm:text-3xl font-black text-white text-center mb-6 sm:mb-8">
            {group.name}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8 card-grid">
            {players.map((p) => (
              <div
                key={p.id}
                className={cn(
                  'flex items-center gap-4 rounded-2xl p-4 border',
                  p.advanced || p.rank === 1
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-white/5 border-white/10'
                )}
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-white text-xl sm:text-2xl font-black flex-shrink-0">
                  {p.name.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <div className="text-white text-lg sm:text-2xl font-black truncate">
                    {p.name}
                  </div>
                  {p.seed ? (
                    <div className="text-amber-300 text-xs sm:text-sm font-bold">
                      种子 {p.seed}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {hasSongs && (
            <div className="border-t border-white/10 pt-5">
              <div className="flex items-center gap-2 text-white/50 text-xs sm:text-sm mb-3">
                <Music size={14} />
                <span>本组用曲</span>
              </div>
              <div className="flex flex-wrap gap-2 stagger-children">
                {group.songs
                  .filter((s) => s.song)
                  .map((s) => (
                    <span
                      key={s.id}
                      className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/80 text-xs truncate max-w-[160px] sm:max-w-[240px]"
                      title={s.song?.name}
                    >
                      {s.label}: {s.song?.name}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
