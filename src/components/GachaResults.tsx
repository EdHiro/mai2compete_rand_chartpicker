import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Music, RefreshCw, ExternalLink, MousePointerClick, Trophy, Sparkles, CheckCircle2 } from 'lucide-react'
import { Song, Difficulty, useSongStore } from '@/store/songStore'
import { useTournamentStore, type TournamentStage, type StageSong, STAGE_LABELS } from '@/store/tournamentStore'
import { broadcastSyncEvent } from '@/utils/tabSync'
import SongCardContent from './SongCardContent'
import { cn } from '@/lib/utils'

interface DrawCardProps {
  song: Song
  index: number
  showFront: boolean
  animationState: 'enter' | 'exit'
}

const getDifficultyCode = (difficulty: Difficulty): string => {
  switch (difficulty) {
    case 'EXPERT':
      return 'EXP'
    case 'MASTER':
      return 'MST'
    case 'Re:MASTER':
      return 'MST_Re'
    default:
      return ''
  }
}

const getCardBgImage = (difficulty: Difficulty): string => {
  const code = getDifficultyCode(difficulty)
  return `/levbg/Sprite/UI_TST_MBase_${code}.png`
}

const ENTRANCE_BG = '/levbg/Sprite/UI_TST_MBase_DMY.png'

const DrawCard = function ({ song, index, showFront, animationState }: DrawCardProps) {
  const isExiting = animationState === 'exit'
  const bgForBack = isExiting ? getCardBgImage(song.difficulty) : ENTRANCE_BG

  return (
    <div
      className={cn(
        'relative w-[300px] h-[520px] perspective-1000',
        isExiting ? 'animate-cardExit' : 'animate-cardEntrance'
      )}
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <div
        className={cn(
          'w-full h-full preserve-3d transition-transform duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
          showFront && 'rotate-y-180'
        )}
      >
        {/* Back */}
        <div className="absolute inset-0 backface-hidden">
          <div className="relative w-full h-full rounded-[32px] overflow-hidden shadow-card">
            <div className="absolute inset-0 bg-dark-card" />
            <div className="absolute inset-0 animate-cardGlow opacity-30" />
            <img
              src={bgForBack}
              alt="Card Background"
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

            <div className="absolute top-[72px] left-1/2 z-20 w-[220px] -translate-x-1/2">
              <div className="relative h-12 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-black uppercase tracking-[0.26em] text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.75)]">
                    {song.chartType}
                  </span>
                </div>
              </div>
            </div>

            <div className="absolute top-[150px] left-1/2 z-10 -translate-x-1/2">
              <div className="w-48 h-48 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center animate-cardPulse">
                <Music size={80} className="text-white/60" />
              </div>
            </div>
          </div>
        </div>

        {/* Front */}
        <div className="absolute inset-0 backface-hidden rotate-y-180">
          <SongCardContent song={song} className="w-full h-full" />
        </div>
      </div>

      {/* Reveal flash effect */}
      <div
        className={cn(
          'absolute inset-0 pointer-events-none rounded-[32px] z-30',
          showFront && 'animate-cardReveal'
        )}
      />
    </div>
  )
}

interface GachaResultsProps {
  onSwitchPage?: (target: 'home' | 'selector') => void
}

function StatusBadge({ phase, revealedCount, total }: { phase: string; revealedCount: number; total: number }) {
  const configs: Record<string, { text: string; color: string; icon: React.ReactNode; pulse?: boolean }> = {
    building: { text: '卡片生成中…', color: 'border-blue-500/30 text-blue-300', icon: <Sparkles size={14} />, pulse: true },
    revealing: { text: `开卡中… ${revealedCount} / ${total}`, color: 'border-yellow-500/30 text-yellow-300', icon: <Sparkles size={14} />, pulse: true },
    done: { text: '全部揭晓！', color: 'border-green-500/30 text-green-300', icon: <Sparkles size={14} /> },
    exiting: { text: '卡片回收中…', color: 'border-amber-500/30 text-amber-300', icon: <RefreshCw size={14} /> },
    idle: { text: '准备就绪', color: 'border-white/10 text-white/50', icon: <Sparkles size={14} /> },
  }
  const config = configs[phase] || configs.idle

  return (
    <div className={cn(
      'inline-flex items-center gap-2 px-4 py-2 rounded-xl glass-panel-strong border',
      config.color,
      config.pulse && 'animate-pulse'
    )}>
      {config.icon}
      <span className="font-rajdhani font-bold text-sm">{config.text}</span>
    </div>
  )
}

export default function GachaResults({ onSwitchPage }: GachaResultsProps) {
  const { selectedSongs, clearSelectedSongs, drawKey, drawSongs: storeDrawSongs, drawCount } = useSongStore()
  const tournamentCurrentStage = useTournamentStore((state) => state.currentStage)
  const tournamentStages = useTournamentStore((state) => state.stages)
  const isTournamentStarted = useTournamentStore((state) => state.isTournamentStarted)
  const [sendTargetStage, setSendTargetStage] = useState<TournamentStage | ''>('')
  const [sendTargetGroup, setSendTargetGroup] = useState<string>('')

  const [revealedCount, setRevealedCount] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'building' | 'revealing' | 'done' | 'exiting'>('idle')
  const [displaySongs, setDisplaySongs] = useState<Song[]>([])
  const [exitingSongs, setExitingSongs] = useState<Song[]>([])
  const [exitKey, setExitKey] = useState(0)
  const [autoSyncStage, setAutoSyncStage] = useState<TournamentStage | null>(null)
  const [autoSyncGroup, setAutoSyncGroup] = useState<string>('')
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([])
  const autoSentDrawKeyRef = useRef<number | null>(null)

  // 将抽卡结果写入本地赛事 store 并广播到其他端
  const syncSongsToStage = useCallback((targetStage: TournamentStage, songs: Song[], targetGroupId?: string) => {
    if (!targetStage || songs.length === 0) return
    const store = useTournamentStore.getState()
    const stageData = store.stages[targetStage]
    const firstGroupId = stageData?.groups?.[0]?.id
    const groupId = targetGroupId && stageData?.groups?.some((g) => g.id === targetGroupId)
      ? targetGroupId
      : firstGroupId

    const payloadSongs = songs.map((song, idx) => ({
      song,
      label: `课题曲${idx + 1}`,
    }))
    const stageSongs: StageSong[] = payloadSongs.map((s, idx) => ({
      id: `gacha-song-${Date.now()}-${idx}`,
      song: s.song,
      label: s.label,
    }))

    if (groupId && stageData?.groups?.length > 0) {
      store.setGroupSongs(targetStage, groupId, stageSongs)
    } else {
      store.setStageSongs(targetStage, stageSongs)
    }

    broadcastSyncEvent('stageSongs', {
      stage: targetStage,
      groupId,
      songs: payloadSongs,
    })
  }, [])

  const handleSendToTournament = useCallback(() => {
    const sourceSongs = exitingSongs.length > 0 ? exitingSongs : displaySongs
    if (sourceSongs.length === 0) return
    const targetStage = sendTargetStage || tournamentCurrentStage
    if (!targetStage) return

    const stageData = tournamentStages[targetStage]
    const groups = stageData?.groups || []
    const groupId = sendTargetGroup || groups[0]?.id
    const groupName = groups.find((g) => g.id === groupId)?.name || ''

    syncSongsToStage(targetStage, sourceSongs, groupId)
    setAutoSyncStage(targetStage)
    setAutoSyncGroup(groupName)
    autoSentDrawKeyRef.current = drawKey
  }, [displaySongs, drawKey, exitingSongs, sendTargetGroup, sendTargetStage, syncSongsToStage, tournamentCurrentStage, tournamentStages])

  // Cleanup timeouts on unmount
  useEffect(() => {
    const timeouts = timeoutRefs.current
    return () => {
      timeouts.forEach(clearTimeout)
    }
  }, [])

  // Start reveal animation when songs change
  useEffect(() => {
    if (selectedSongs.length > 0) {
      setDisplaySongs(selectedSongs)
      setExitingSongs([])
      setRevealedCount(0)
      setPhase('building')
      setAutoSyncStage(null)
      setAutoSyncGroup('')

      timeoutRefs.current.push(
        setTimeout(() => {
          setPhase('revealing')
        }, 300)
      )

      const songCount = selectedSongs.length
      for (let index = 0; index < songCount; index++) {
        const delay = 600 + index * 350
        timeoutRefs.current.push(
          setTimeout(() => {
            setRevealedCount(index + 1)
            if (index === songCount - 1) {
              setTimeout(() => setPhase('done'), 400)
            }
          }, delay)
        )
      }
    }
  }, [drawKey, selectedSongs, selectedSongs.length])

  // 当前阶段或分组变化时，重置目标分组
  useEffect(() => {
    const stageData = tournamentStages[tournamentCurrentStage]
    const groups = stageData?.groups || []
    setSendTargetGroup(groups[0]?.id || '')
  }, [tournamentCurrentStage, tournamentStages])

  // 抽卡全部揭晓后，自动同步到当前赛事阶段（非分组阶段）
  useEffect(() => {
    if (phase !== 'done') return
    if (!isTournamentStarted) return
    if (drawKey === autoSentDrawKeyRef.current) return
    if (displaySongs.length === 0) return

    const stageData = tournamentStages[tournamentCurrentStage]
    if (stageData?.groups && stageData.groups.length > 0) return

    autoSentDrawKeyRef.current = drawKey
    syncSongsToStage(tournamentCurrentStage, displaySongs)
    setAutoSyncStage(tournamentCurrentStage)
    setAutoSyncGroup('')
  }, [phase, drawKey, displaySongs, isTournamentStarted, syncSongsToStage, tournamentCurrentStage, tournamentStages])

  const handleReset = useCallback(() => {
    if (phase === 'exiting') return

    const currentSongs = [...displaySongs]
    setExitingSongs(currentSongs)
    setPhase('exiting')
    setRevealedCount(0)

    const lastCardDelay = currentSongs.length * 150
    const exitDuration = 600 + lastCardDelay

    timeoutRefs.current.push(
      setTimeout(() => {
        setExitingSongs([])
        clearSelectedSongs()
        storeDrawSongs(drawCount)
        setExitKey((prev) => prev + 1)
        setPhase('building')
      }, exitDuration)
    )
  }, [displaySongs, phase, clearSelectedSongs, storeDrawSongs, drawCount])

  const songsToShow = exitingSongs.length > 0 ? exitingSongs : displaySongs
  const isExitingPhase = exitingSongs.length > 0

  const renderCards = useMemo(
    () => songsToShow.map((song, index) => (
      <div key={`card-${exitKey}-${index}`} className="flex justify-center">
        <DrawCard
          song={song}
          index={index}
          showFront={isExitingPhase || index < revealedCount}
          animationState={isExitingPhase ? 'exit' : 'enter'}
        />
      </div>
    )),
    [songsToShow, exitKey, isExitingPhase, revealedCount]
  )

  if (songsToShow.length === 0 && selectedSongs.length === 0) return null

  return (
    <section className="py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Command bar */}
        <div className="glass-panel-strong rounded-2xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge phase={phase} revealedCount={revealedCount} total={songsToShow.length} />
            {autoSyncStage && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-xs font-bold">
                <CheckCircle2 size={12} />
                已同步至 {STAGE_LABELS[autoSyncStage]}{autoSyncGroup && ` · ${autoSyncGroup}`}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={handleReset}
              disabled={phase === 'exiting'}
              className={cn(
                'btn-secondary-2 text-xs sm:text-sm',
                phase === 'exiting' && 'opacity-50 cursor-not-allowed'
              )}
            >
              <RefreshCw size={16} className={cn(phase === 'exiting' && 'animate-spin')} />
              继续抽卡
            </button>

            <a
              href="/?obs=1"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary-2 text-xs sm:text-sm"
            >
              <ExternalLink size={16} />
              OBS 展示页
            </a>

            <select
              value={sendTargetStage}
              onChange={(e) => setSendTargetStage(e.target.value as TournamentStage | '')}
              className="input-refined w-auto text-xs sm:text-sm py-2 px-3"
              title="赛事目标阶段"
            >
              <option value="">自动 ({tournamentCurrentStage || '无'})</option>
              <option value="n216">N进16</option>
              <option value="16to8">16进8</option>
              <option value="8to4">8进4</option>
              <option value="semi">半决赛</option>
              <option value="final">决赛</option>
            </select>

            {(() => {
              const stageData = tournamentStages[sendTargetStage || tournamentCurrentStage]
              const groups = stageData?.groups || []
              if (groups.length === 0) return null
              return (
                <select
                  value={sendTargetGroup}
                  onChange={(e) => setSendTargetGroup(e.target.value)}
                  className="input-refined w-auto text-xs sm:text-sm py-2 px-3"
                  title="目标分组"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              )
            })()}

            <button
              onClick={handleSendToTournament}
              className="btn-secondary-2 text-xs sm:text-sm"
            >
              <Trophy size={16} />
              发送到赛事
            </button>

            <button
              onClick={() => onSwitchPage?.('selector')}
              className="btn-primary-2 text-xs sm:text-sm"
            >
              <MousePointerClick size={16} />
              指定选曲
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="text-center relative">
          <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          <h2 className="relative inline-block font-orbitron font-black text-2xl sm:text-3xl px-6 bg-dark-bg">
            <span className="title-gradient">抽卡结果</span>
          </h2>
        </div>

        {/* Cards */}
        <div className="relative">
          {/* Background burst effect during reveal */}
          {(phase === 'revealing' || phase === 'done') && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              <div className="w-[120%] h-[120%] bg-gradient-radial from-yellow-400/5 via-transparent to-transparent animate-burstFade" />
            </div>
          )}

          <div className="relative z-10 flex flex-wrap justify-center gap-6 lg:gap-8">
            {renderCards}
          </div>
        </div>
      </div>
    </section>
  )
}
