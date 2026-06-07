import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Music, RefreshCw, ExternalLink, MousePointerClick } from 'lucide-react'
import { Song, Difficulty, useSongStore } from '@/store/songStore'
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
          <div className="relative w-full h-full rounded-[32px] overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.28)] bg-gradient-to-b from-blue-800 to-blue-900">
            <div className="absolute inset-0 animate-cardGlow opacity-40" />
            <img
              src={bgForBack}
              alt="Card Background"
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-black/30" />

            <div className="absolute top-[72px] left-1/2 z-20 w-[220px] -translate-x-1/2">
              <div className="relative h-12 rounded-full bg-white/10 border-2 border-white/30">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-black uppercase tracking-[0.26em] text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.75)]">
                    {song.chartType}
                  </span>
                </div>
              </div>
            </div>

            <div className="absolute top-[150px] left-1/2 z-10 -translate-x-1/2">
              <div className="w-48 h-48 rounded-full bg-white/10 flex items-center justify-center animate-cardPulse">
                <Music size={80} className="text-white/70" />
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
  const [revealedCount, setRevealedCount] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'building' | 'revealing' | 'done' | 'exiting'>('idle')
  const [displaySongs, setDisplaySongs] = useState<Song[]>([])
  const [exitingSongs, setExitingSongs] = useState<Song[]>([])
  const [exitKey, setExitKey] = useState(0)
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([])

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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {phase === 'exiting' && (
              <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-2 rounded-xl border-3 border-orange-300 shadow-lg animate-pulse">
                <p className="text-white font-rajdhani font-bold text-lg">
                  🎴 卡片回收中...
                </p>
              </div>
            )}
            {phase === 'revealing' && (
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-6 py-2 rounded-xl border-3 border-yellow-300 shadow-lg animate-pulse">
                <p className="text-white font-rajdhani font-bold text-lg animate-shine">
                  ✨ 开卡中... {revealedCount} / {songsToShow.length}
                </p>
              </div>
            )}
            {phase === 'done' && (
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-2 rounded-xl border-3 border-green-300 shadow-lg">
                <p className="text-white font-rajdhani font-bold text-lg">
                  🎉 全部揭晓！
                </p>
              </div>
            )}
            {phase === 'building' && (
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-2 rounded-xl border-3 border-blue-400 shadow-lg">
                <p className="text-white font-rajdhani font-bold text-lg animate-pulse">
                  🎴 卡片生成中...
                </p>
              </div>
            )}
          </div>
          <button
            onClick={handleReset}
            disabled={phase === 'exiting'}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl border-3 text-white font-rajdhani font-bold shadow-lg transition-all duration-200 ${
              phase === 'exiting'
                ? 'bg-gray-600 border-gray-500 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-b from-blue-600 to-blue-700 border-blue-400 hover:from-blue-500 hover:to-blue-600 hover:scale-105'
            }`}
          >
            <RefreshCw size={20} />
            继续抽卡
          </button>
          <a
            href="/?obs=1"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 rounded-xl border-3 border-orange-400 bg-gradient-to-b from-orange-600 to-orange-700 text-white font-rajdhani font-bold shadow-lg hover:from-orange-500 hover:to-orange-600 hover:scale-105 transition-all duration-200"
          >
            <ExternalLink size={20} />
            OBS 展示页
          </a>
          <button
            onClick={() => onSwitchPage?.('selector')}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border-3 border-purple-400 bg-gradient-to-b from-purple-600 to-purple-700 text-white font-rajdhani font-bold shadow-lg hover:from-purple-500 hover:to-purple-600 hover:scale-105 transition-all duration-200"
          >
            <MousePointerClick size={20} />
            指定选曲
          </button>
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
