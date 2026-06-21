import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Music, RefreshCw, ExternalLink, MousePointerClick, Trophy } from 'lucide-react'
import { Song, Difficulty, useSongStore } from '@/store/songStore'
import { useTournamentStore, type TournamentStage } from '@/store/tournamentStore'
import { broadcastSyncEvent } from '@/utils/tabSync'
import SongCardContent from './SongCardContent'

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
      className={`relative w-[300px] h-[520px] perspective-1000 ${
        isExiting ? 'animate-cardExit' : 'animate-cardEntrance'
      }`}
      style={{ animationDelay: `${index * 150}ms` }}
    >
      <div
        className={
          `w-full h-full preserve-3d transition-transform duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${showFront ? 'rotate-y-180' : ''}`
        }
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
        className={`absolute inset-0 pointer-events-none rounded-[32px] z-30 ${
          showFront ? 'animate-cardReveal' : ''
        }`}
      />
    </div>
  )
}

interface GachaResultsProps {
  onSwitchPage?: (target: 'home' | 'selector') => void
}

export default function GachaResults({ onSwitchPage }: GachaResultsProps) {
  const { selectedSongs, clearSelectedSongs, drawKey, drawSongs: storeDrawSongs, drawCount } = useSongStore()
  const tournamentCurrentStage = useTournamentStore((state) => state.currentStage)
  const tournamentStages = useTournamentStore((state) => state.stages)
  const [sendTargetStage, setSendTargetStage] = useState<TournamentStage | ''>('')

  const [revealedCount, setRevealedCount] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'building' | 'revealing' | 'done' | 'exiting'>('idle')
  const [displaySongs, setDisplaySongs] = useState<Song[]>([])
  const [exitingSongs, setExitingSongs] = useState<Song[]>([])
  const [exitKey, setExitKey] = useState(0)
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([])

  const handleSendToTournament = useCallback(() => {
    const sourceSongs = exitingSongs.length > 0 ? exitingSongs : displaySongs
    if (sourceSongs.length === 0) return
    const targetStage = sendTargetStage || tournamentCurrentStage
    if (!targetStage) return

    const stageData = tournamentStages[targetStage]
    const groupId = stageData?.groups?.[0]?.id

    const payloadSongs = sourceSongs.map((song, idx) => ({
      song,
      label: `课题曲${idx + 1}`,
    }))

    broadcastSyncEvent('stageSongs', {
      stage: targetStage,
      groupId,
      songs: payloadSongs,
    })
  }, [displaySongs, exitingSongs, sendTargetStage, tournamentCurrentStage, tournamentStages])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(clearTimeout)
    }
  }, [])

  // Start reveal animation when songs change
  useEffect(() => {
    if (selectedSongs.length > 0) {
      setDisplaySongs(selectedSongs)
      setExitingSongs([])
      setRevealedCount(0)
      setPhase('building')

      // Phase 1: Cards "assemble" with scale-in
      timeoutRefs.current.push(
        setTimeout(() => {
          setPhase('revealing')
        }, 300)
      )

      // Phase 2: Reveal cards one by one
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
  }, [drawKey, selectedSongs.length])

  const handleReset = useCallback(() => {
    if (phase === 'exiting') return

    // Save current songs for exit animation
    const currentSongs = [...displaySongs]
    setExitingSongs(currentSongs)
    setPhase('exiting')
    setRevealedCount(0)

    // Wait for exit animation to complete (600ms + staggered delays)
    const lastCardDelay = currentSongs.length * 150
    const exitDuration = 600 + lastCardDelay

    timeoutRefs.current.push(
      setTimeout(() => {
        setExitingSongs([])
        // Clear old data and increment drawKey to trigger entrance
        clearSelectedSongs()
        // Trigger new draw
        storeDrawSongs(drawCount)
        setExitKey(prev => prev + 1)
        setPhase('building')
      }, exitDuration)
    )
  }, [displaySongs, phase, clearSelectedSongs, storeDrawSongs, drawCount])

  // Determine which songs to show
  const songsToShow = exitingSongs.length > 0 ? exitingSongs : displaySongs
  const isExitingPhase = exitingSongs.length > 0

  if (songsToShow.length === 0 && selectedSongs.length === 0) return null

  const renderCards = useMemo(
    () => songsToShow.map((song, index) => (
      <div
        key={`card-${exitKey}-${index}`}
      >
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

  return (
    <section className="py-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {phase === 'exiting' && (
              <div className="glass-panel px-5 py-2.5 rounded-xl border border-amber-500/30 ring-1 ring-inset ring-white/10">
                <p className="text-amber-300 font-rajdhani font-bold text-sm">
                  卡片回收中...
                </p>
              </div>
            )}
            {phase === 'revealing' && (
              <div className="glass-panel px-5 py-2.5 rounded-xl border border-yellow-500/30 animate-pulse ring-1 ring-inset ring-white/10">
                <p className="text-yellow-300 font-rajdhani font-bold text-sm">
                  开卡中... {revealedCount} / {songsToShow.length}
                </p>
              </div>
            )}
            {phase === 'done' && (
              <div className="glass-panel px-5 py-2.5 rounded-xl border border-green-500/30 ring-1 ring-inset ring-white/10">
                <p className="text-green-300 font-rajdhani font-bold text-sm">
                  全部揭晓！
                </p>
              </div>
            )}
            {phase === 'building' && (
              <div className="glass-panel px-5 py-2.5 rounded-xl border border-blue-500/30 ring-1 ring-inset ring-white/10">
                <p className="text-blue-300 font-rajdhani font-bold text-sm animate-pulse">
                  卡片生成中...
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleReset}
              disabled={phase === 'exiting'}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 text-white font-rajdhani font-bold text-sm shadow-md transition-all duration-200 ring-1 ring-inset ring-white/10 ${
                phase === 'exiting'
                  ? 'bg-gray-600/50 border-gray-500/50 cursor-not-allowed opacity-50'
                  : 'bg-dark-card border-dark-border/50 hover:bg-dark-hover hover:border-white/20 hover:-translate-y-0.5'
              }`}
            >
              <RefreshCw size={16} />
              继续抽卡
            </button>
            <a
              href="/?obs=1"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-amber-500/50 bg-amber-500/10 text-amber-300 font-rajdhani font-bold text-sm hover:bg-amber-500/20 hover:-translate-y-0.5 transition-all duration-200 ring-1 ring-inset ring-white/10"
            >
              <ExternalLink size={16} />
              OBS 展示页
            </a>
            <select
              value={sendTargetStage}
              onChange={(e) => setSendTargetStage(e.target.value as TournamentStage | '')}
              className="px-3 py-2 rounded-xl bg-dark-card border-2 border-dark-border/50 text-white text-sm focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all ring-1 ring-inset ring-white/10"
              title="赛事目标阶段"
            >
              <option value="">自动 ({tournamentCurrentStage || '无'})</option>
              <option value="n216">N进16</option>
              <option value="16to8">16进8</option>
              <option value="8to4">8进4</option>
              <option value="semi">半决赛</option>
              <option value="final">决赛</option>
            </select>
            <button
              onClick={handleSendToTournament}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-purple-500/50 bg-purple-500/10 text-purple-300 font-rajdhani font-bold text-sm hover:bg-purple-500/20 hover:-translate-y-0.5 transition-all duration-200 ring-1 ring-inset ring-white/10"
            >
              <Trophy size={16} />
              赛事
            </button>
            <button
              onClick={() => onSwitchPage?.('selector')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-blue-500/50 bg-blue-500/10 text-blue-300 font-rajdhani font-bold text-sm hover:bg-blue-500/20 hover:-translate-y-0.5 transition-all duration-200 ring-1 ring-inset ring-white/10"
            >
              <MousePointerClick size={16} />
              指定选曲
            </button>
          </div>
        </div>

        {/* Decorative section divider with neon arcade title */}
        <div className="relative mb-8">
          <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          <div className="flex justify-center relative">
            <p className="font-orbitron text-lg sm:text-xl font-black px-6 bg-dark-bg">
              <span className="title-gradient">★ 抽卡结果 ★</span>
            </p>
          </div>
        </div>

        {/* Gacha cards with burst background effect */}
        <div className="relative">
          {/* Background burst effect during reveal */}
          {(phase === 'revealing' || phase === 'done') && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              <div className="w-[120%] h-[120%] bg-gradient-radial from-yellow-400/5 via-transparent to-transparent animate-burstFade" />
            </div>
          )}

          {/* Cards */}
          <div className="relative z-10 flex flex-wrap justify-center gap-8">
            {renderCards}
          </div>
        </div>
      </div>
    </section>
  )
}
