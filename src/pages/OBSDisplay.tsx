import { useState, useEffect, useRef, useMemo } from 'react'
import { Music } from 'lucide-react'
import { Song, Difficulty } from '@/store/songStore'
import SongCardContent from '@/components/SongCardContent'
import { subscribeSyncEvents, type SyncEvent, getConnectionStatus } from '@/utils/tabSync'

// 扩展 Song 类型以支持多玩家信息
type MultiSong = Song & { _playerName?: string; _playerId?: string }

interface DrawCardProps {
  song: MultiSong
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
  const hasPlayerName = song._playerName

  return (
    <div className="flex flex-col items-center gap-3 relative">
      <div
        className={`relative w-[300px] h-[520px] perspective-1000 ${
          isExiting ? 'animate-cardExit' : 'animate-cardEntrance'
        }`}
        style={{ animationDelay: `${index * 120}ms` }}
      >
        <div
          className={
            `w-full h-full preserve-3d transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative z-10 ${showFront ? 'rotate-y-180' : ''}`
          }
        >
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

          <div
            className={`absolute inset-0 backface-hidden rotate-y-180 transition-opacity duration-100 ${
              showFront ? 'opacity-100 visible' : 'opacity-0 invisible'
            }`}
          >
            <SongCardContent song={song} className="w-full h-full" />
          </div>
        </div>

        {/* 翻转闪光效果 */}
        <div
          className={`absolute inset-0 pointer-events-none rounded-[32px] z-30 ${
            showFront ? 'animate-cardFlipReveal' : ''
          }`}
        />
      </div>

      {/* 玩家名称标签 - 卡片下方 */}
      {hasPlayerName && (
        <div
          className={`flex items-center gap-2 mt-1 ${
            isExiting ? 'animate-tagExit' : 'animate-tagEntrance'
          }`}
          style={{ animationDelay: `${index * 240}ms` }}
        >
          <div className="w-1.5 h-7 rounded-full bg-yellow-400" />
          <div className="px-5 py-2 rounded-xl bg-white text-slate-900 text-base font-black tracking-wide">
            {song._playerName}
          </div>
        </div>
      )}
    </div>
  )
}

export default function OBSDisplay() {
  const [revealedCount, setRevealedCount] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'building' | 'revealing' | 'done' | 'exiting'>('idle')
  const [displaySongs, setDisplaySongs] = useState<MultiSong[]>([])
  const [exitingSongs, setExitingSongs] = useState<MultiSong[]>([])
  const [exitKey, setExitKey] = useState(0)
  // Refs to avoid stale closures in event handlers
  const displaySongsRef = useRef<MultiSong[]>([])
  const phaseRef = useRef(phase)
  const lastEventTimestampRef = useRef<number>(0)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    displaySongsRef.current = displaySongs
  }, [displaySongs])

  // Listen for sync events from main tab
  useEffect(() => {
    const effectTimeouts: ReturnType<typeof setTimeout>[] = []

    const scheduleTimeout = (callback: () => void, delay: number) => {
      const id = setTimeout(callback, delay)
      effectTimeouts.push(id)
    }

    const playEntrance = (songs: MultiSong[]) => {
      setDisplaySongs(songs)
      setExitKey(prev => prev + 1)
      setRevealedCount(0)
      setPhase('building')

      scheduleTimeout(() => setPhase('revealing'), 250)

      songs.forEach((_, index) => {
        const delay = 500 + index * 300
        scheduleTimeout(() => {
          setRevealedCount(index + 1)
          if (index === songs.length - 1) {
            scheduleTimeout(() => setPhase('done'), 350)
          }
        }, delay)
      })
    }

    const playExitThen = (currentSongs: MultiSong[], onExited: () => void) => {
      setExitingSongs(currentSongs)
      setPhase('exiting')
      setRevealedCount(0)

      const lastCardDelay = currentSongs.length * 120
      const exitDuration = 600 + lastCardDelay

      scheduleTimeout(() => {
        setExitingSongs([])
        onExited()
      }, exitDuration)
    }

    const startRevealSequence = (songs: MultiSong[]) => {
      const currentSongs = displaySongsRef.current
      const currentPhase = phaseRef.current

      if (currentPhase === 'exiting') return

      if (currentSongs.length > 0) {
        playExitThen(currentSongs, () => playEntrance(songs))
      } else {
        playEntrance(songs)
      }
    }

    const handleClearEvent = () => {
      const currentSongs = displaySongsRef.current
      if (currentSongs.length === 0) return

      playExitThen(currentSongs, () => {
        setDisplaySongs([])
        setPhase('idle')
      })
    }

    const handleImportEvent = () => {
      // Reset state when songs are imported
      setDisplaySongs([])
      setExitingSongs([])
      setPhase('idle')
      setRevealedCount(0)
    }

    const handleMultiSelectEvent = (selections: { playerId: string; playerName: string; song: MultiSong }[]) => {
      const multiSongs = selections.map(s => ({
        ...s.song,
        _playerName: s.playerName,
        _playerId: s.playerId,
      })) as MultiSong[]

      startRevealSequence(multiSongs)
    }

    const unsubscribe = subscribeSyncEvents((event: SyncEvent) => {
      // 同一事件可能通过 localStorage 和 WebSocket 两个通道同时送达，按时间戳去重
      if (event.timestamp === lastEventTimestampRef.current) return
      lastEventTimestampRef.current = event.timestamp

      if (event.type === 'draw') {
        const payload = event.payload as { songs: Song[] }
        startRevealSequence(payload.songs)
      } else if (event.type === 'clear') {
        handleClearEvent()
      } else if (event.type === 'import') {
        handleImportEvent()
      } else if (event.type === 'select') {
        const payload = event.payload as { songs: MultiSong[] }
        startRevealSequence(payload.songs)
      } else if (event.type === 'multiSelect') {
        const payload = event.payload as { songs: { playerId: string; playerName: string; song: MultiSong }[] }
        handleMultiSelectEvent(payload.songs)
      }
    })

    return () => {
      unsubscribe()
      effectTimeouts.forEach(clearTimeout)
    }
  }, [])

  const songsToShow = exitingSongs.length > 0 ? exitingSongs : displaySongs
  const isExitingPhase = exitingSongs.length > 0

  const renderCards = useMemo(
    () => songsToShow.map((song, index) => (
      <div key={`obs-${exitKey}-${index}`}>
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
    <div className="min-h-screen bg-dark-bg py-12 px-4 relative overflow-hidden flex flex-col items-center justify-center">
      {/* Background ambient effect - Neon Arcade / Stage Performance */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-radial from-blue-900/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-radial from-violet-700/15 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-radial from-amber-600/10 via-transparent to-transparent" style={{ backgroundPosition: '30% 80%' }} />
        <div className="absolute inset-0 hero-grid opacity-30 [background-size:48px_48px]" />
      </div>

      {/* Connection status */}
      <div className="relative z-10 text-center mb-8">
        <div className="inline-flex items-center gap-4 px-6 py-4 rounded-full text-sm font-bold tracking-wider glass-panel border-dark-border/40">
          <span className="title-gradient font-orbitron">OBS DISPLAY</span>
          <span className="w-px h-5 bg-dark-border/50" />
          {(() => {
            const status = getConnectionStatus()
            if (status === 'connected') {
              return (
                <span className="inline-flex items-center gap-2 font-rajdhani text-green-400">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-400 animate-status-dot" />
                  <span className="font-bold">多设备已连接 · 主页面控制</span>
                </span>
              )
            } else if (status === 'local-only') {
              return (
                <span className="inline-flex items-center gap-2 font-rajdhani text-yellow-400">
                  <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="font-bold">仅同浏览器联动 (启动 sync-server 以支持多设备)</span>
                </span>
              )
            }
            return (
              <span className="inline-flex items-center gap-2 font-rajdhani text-yellow-400">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
                <span className="font-bold">连接中...</span>
              </span>
            )
          })()}
        </div>
      </div>

      {/* Cards area */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full">
        {(phase === 'revealing' || phase === 'done') && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <div className="w-[120%] h-[120%] bg-gradient-radial from-yellow-400/5 via-transparent to-transparent animate-burstFade" />
          </div>
        )}

        <div className="relative z-10 flex flex-wrap items-center justify-center gap-10">
          {renderCards}
        </div>
      </div>
    </div>
  )
}
