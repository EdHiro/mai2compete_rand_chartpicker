import { useState, useEffect, useRef } from 'react'
import { Music } from 'lucide-react'
import { Song, Difficulty } from '@/store/songStore'
import { STAGE_LABELS, type TournamentStage } from '@/store/tournamentStore'
import SongCardContent from '@/components/SongCardContent'
import { subscribeSyncEvents, type SyncEvent, getConnectionStatus } from '@/utils/tabSync'

// 扩展 Song 类型以支持多玩家信息与歌曲标签
type MultiSong = Song & { _playerName?: string; _playerId?: string; _label?: string }

const chunk = <T,>(arr: T[], size: number): T[][] =>
  arr.reduce((acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]), [] as T[][])

interface DrawCardProps {
  song: MultiSong
  index: number
  showFront: boolean
  animationState: 'enter' | 'exit'
}

const getDifficultyCode = (difficulty: Difficulty): string => {
  switch (difficulty) {
    case 'BASIC':
      return 'BSC'
    case 'ADVANCED':
      return 'ADV'
    case 'EXPERT':
      return 'EXP'
    case 'MASTER':
      return 'MST'
    case 'Re:MASTER':
      return 'MST_Re'
    case 'UTAGE':
      return 'UTG'
    default:
      return 'EXP'
  }
}

const getCardBgImage = (difficulty: Difficulty, chartType: 'dx' | 'standard'): string => {
  const code = getDifficultyCode(difficulty)
  // UTAGE 没有 STD/DX 之分，沿用单一背景
  if (difficulty === 'UTAGE') {
    return `/levbg/Sprite/UI_TST_MBase_${code}.png`
  }
  const suffix = chartType === 'dx' ? 'DX' : 'STD'
  return `/levbg/Sprite/UI_TST_MBase_${code}_${suffix}.png`
}

const ENTRANCE_BG = '/levbg/Sprite/UI_TST_MBase_DMY.png'

const DrawCard = function ({ song, index, showFront, animationState }: DrawCardProps) {
  const isExiting = animationState === 'exit'
  const bgForBack = isExiting ? getCardBgImage(song.difficulty, song.chartType) : ENTRANCE_BG
  // 统一底部标签：自选曲显示玩家名，随机曲显示 随机1/随机2
  const displayName = song._playerName || song._label

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

      {/* 统一底部标签 - 卡片下方 */}
      {displayName && (
        <div
          className={`flex items-center gap-2 mt-1 ${
            isExiting ? 'animate-tagExit' : 'animate-tagEntrance'
          }`}
          style={{ animationDelay: `${index * 240}ms` }}
        >
          <div className="w-1.5 h-7 rounded-full bg-yellow-400" />
          <div className="px-5 py-2 rounded-xl glass-panel text-white text-base font-black tracking-wide border border-white/10">
            {displayName}
          </div>
        </div>
      )}
    </div>
  )
}

// 2+2 插槽模式卡片：随机曲采用正常翻牌入场，自选曲自下而上滑入
interface SlotCardProps {
  song: MultiSong
  index: number
  isNew?: boolean
  isMoved?: boolean
  selfEntranceDelay?: number
}

function SlotCard({ song, index, isNew, isMoved, selfEntranceDelay = 0 }: SlotCardProps) {
  const isRandom = song._label?.startsWith('随机') ?? false
  const needsFlip = isNew && isRandom
  const [showFront, setShowFront] = useState(!needsFlip)

  // 随机曲翻牌时序：按 随机1 / 随机2 顺序，与正常抽卡节奏对齐
  const randomOrder = song._label === '随机1' ? 0 : song._label === '随机2' ? 1 : index
  const flipDelay = needsFlip ? 500 + randomOrder * 300 : 0

  useEffect(() => {
    if (needsFlip) {
      const timer = setTimeout(() => setShowFront(true), flipDelay)
      return () => clearTimeout(timer)
    }
  }, [needsFlip, flipDelay])

  const displayName = song._playerName || song._label
  const innerAnim = needsFlip
    ? 'animate-cardEntrance'
    : isNew && !isRandom
      ? 'animate-slotSlideUp'
      : isMoved
        ? 'animate-slotMove'
        : ''
  const animDelay = isNew && !isRandom ? selfEntranceDelay + index * 80 : 0

  return (
    <div
      className={`flex flex-col items-center gap-3 ${innerAnim}`}
      style={animDelay > 0 ? { animationDelay: `${animDelay}ms` } : undefined}
    >
      <div className="relative w-[300px] h-[520px] perspective-1000">
        <div
          className={`w-full h-full preserve-3d transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] relative z-10 ${
            showFront ? 'rotate-y-180' : ''
          }`}
        >
          {/* 背面：与正常随机入场一致的封面 */}
          <div className="absolute inset-0 backface-hidden">
            <div className="relative w-full h-full rounded-[32px] overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.28)] bg-gradient-to-b from-blue-800 to-blue-900">
              <div className="absolute inset-0 animate-cardGlow opacity-40" />
              <img
                src={ENTRANCE_BG}
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

          {/* 正面 */}
          <div
            className={`absolute inset-0 backface-hidden rotate-y-180 transition-opacity duration-100 ${
              showFront ? 'opacity-100 visible' : 'opacity-0 invisible'
            }`}
          >
            <div className="relative w-full h-full rounded-[32px] overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
              <SongCardContent song={song} className="w-full h-full" />
            </div>
          </div>
        </div>

        {/* 翻转闪光效果 */}
        <div
          className={`absolute inset-0 pointer-events-none rounded-[32px] z-30 ${
            showFront ? 'animate-cardFlipReveal' : ''
          }`}
        />
      </div>

      {displayName && (
        <div className="flex items-center gap-2 mt-1">
          <div className="w-1.5 h-7 rounded-full bg-yellow-400" />
          <div className="px-5 py-2 rounded-xl glass-panel text-white text-base font-black tracking-wide border border-white/10">
            {displayName}
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
  const [currentStage, setCurrentStage] = useState<TournamentStage>('n216')
  const [isTournamentStarted, setIsTournamentStarted] = useState(false)
  // 2+2 流程：分别保存自选曲与随机曲，OBS 按 自选1/随机1/自选2/随机2 组合展示
  const [selfSongs, setSelfSongs] = useState<MultiSong[]>([])
  const [randomSongs, setRandomSongs] = useState<MultiSong[]>([])
  // 2+2 插槽模式：随机曲保持不动，自选曲插入时随机曲自动移动到目标位置
  const [slotSongs, setSlotSongs] = useState<(MultiSong | undefined)[]>([undefined, undefined, undefined, undefined])
  const [slotMode, setSlotMode] = useState(false)
  const [slotNewMask, setSlotNewMask] = useState<boolean[]>([false, false, false, false])
  const [slotMovedMask, setSlotMovedMask] = useState<boolean[]>([false, false, false, false])
  // Refs to avoid stale closures in event handlers
  const displaySongsRef = useRef<MultiSong[]>([])
  const slotSongsRef = useRef<(MultiSong | undefined)[]>([undefined, undefined, undefined, undefined])
  const phaseRef = useRef(phase)
  const lastEventRef = useRef<{ timestamp: number; type: string } | null>(null)
  const selfSongsRef = useRef<MultiSong[]>([])
  const randomSongsRef = useRef<MultiSong[]>([])
  const slotModeRef = useRef(false)
  const slotMovedMaskRef = useRef<boolean[]>([false, false, false, false])

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    displaySongsRef.current = displaySongs
  }, [displaySongs])

  useEffect(() => {
    slotSongsRef.current = slotSongs
  }, [slotSongs])

  useEffect(() => {
    selfSongsRef.current = selfSongs
  }, [selfSongs])

  useEffect(() => {
    randomSongsRef.current = randomSongs
  }, [randomSongs])

  useEffect(() => {
    slotModeRef.current = slotMode
  }, [slotMode])

  useEffect(() => {
    slotMovedMaskRef.current = slotMovedMask
  }, [slotMovedMask])

  // 将自选曲与随机曲合并为 自选1/随机1/自选2/随机2 的展示顺序
  const buildMergedQueue = (self: MultiSong[], random: MultiSong[]): MultiSong[] => {
    const labeledSelf = self.map((s, i) => ({ ...s, _label: s._label || `自选${i + 1}` }))
    const labeledRandom = random.map((s, i) => ({ ...s, _label: s._label || `随机${i + 1}` }))

    if (labeledSelf.length === 2 && labeledRandom.length === 2) {
      return [
        { ...labeledSelf[0], _label: '自选1' },
        { ...labeledRandom[0], _label: '随机1' },
        { ...labeledSelf[1], _label: '自选2' },
        { ...labeledRandom[1], _label: '随机2' },
      ]
    }
    if (labeledSelf.length > 0) return labeledSelf
    return labeledRandom
  }

  // 将 2+2 歌曲分配到 4 个插槽：0=自选1, 1=随机1, 2=自选2, 3=随机2
  // 若只有随机曲，先放在插槽 0/1，插入自选后随机曲会移动到 1/3
  const assignToSlots = (self: MultiSong[], random: MultiSong[]): (MultiSong | undefined)[] => {
    const slots: (MultiSong | undefined)[] = [undefined, undefined, undefined, undefined]
    const labeledSelf = self.map((s, i) => ({ ...s, _label: s._label || `自选${i + 1}` }))
    const labeledRandom = random.map((s, i) => ({ ...s, _label: s._label || `随机${i + 1}` }))

    if (labeledSelf.length === 2 && labeledRandom.length === 2) {
      slots[0] = { ...labeledSelf[0], _label: '自选1' }
      slots[1] = { ...labeledRandom[0], _label: '随机1' }
      slots[2] = { ...labeledSelf[1], _label: '自选2' }
      slots[3] = { ...labeledRandom[1], _label: '随机2' }
    } else if (labeledSelf.length > 0) {
      labeledSelf.forEach((s, i) => { slots[i] = s })
    } else if (labeledRandom.length > 0) {
      labeledRandom.forEach((s, i) => { slots[i] = s })
    }
    return slots
  }

  const is2Plus2Pattern = (songs: { label: string }[]): boolean => {
    const labels = songs.map(s => s.label)
    return labels.includes('随机1') || labels.includes('随机2') || labels.includes('自选1') || labels.includes('自选2')
  }

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

    const revealSlots = (nextSlots: (MultiSong | undefined)[], sourceSelf: MultiSong[], sourceRandom: MultiSong[]) => {
      const prevSlots = slotSongsRef.current
      const prevKeys = new Set(prevSlots.map((s) => (s ? s._label || s.id : undefined)).filter(Boolean))
      const newMask = nextSlots.map((song) => !!song && !prevKeys.has(song._label || song.id))
      const movedMask = nextSlots.map((song, idx) => {
        if (!song || newMask[idx]) return false
        const key = song._label || song.id
        return prevSlots.some((ps, pidx) => !!ps && (ps._label || ps.id) === key && pidx !== idx)
      })

      const hasNewRandom = newMask.some((isNew, idx) => isNew && nextSlots[idx]?._label?.startsWith('随机'))

      setSlotMode(true)
      setSlotSongs(nextSlots)
      setSelfSongs(sourceSelf)
      setRandomSongs(sourceRandom)
      setSlotNewMask(newMask)
      setSlotMovedMask(movedMask)

      // 模拟正常抽卡流程：新随机曲入场时触发 building -> revealing -> done 背景光效
      if (hasNewRandom) {
        setPhase('building')
        scheduleTimeout(() => setPhase('revealing'), 250)
        scheduleTimeout(() => setPhase('done'), 1500)
      } else {
        setPhase('done')
      }

      scheduleTimeout(() => {
        setSlotNewMask([false, false, false, false])
        setSlotMovedMask([false, false, false, false])
      }, 1600)
    }

    const handleClearEvent = () => {
      const currentSongs = displaySongsRef.current
      if (currentSongs.length === 0 && !slotModeRef.current) return

      const clear = () => {
        setDisplaySongs([])
        setSelfSongs([])
        setRandomSongs([])
        setSlotSongs([undefined, undefined, undefined, undefined])
        setSlotMode(false)
        setSlotNewMask([false, false, false, false])
        setSlotMovedMask([false, false, false, false])
        setPhase('idle')
      }

      if (slotModeRef.current) {
        clear()
        return
      }

      playExitThen(currentSongs, clear)
    }

    const handleImportEvent = () => {
      // Reset state when songs are imported
      setDisplaySongs([])
      setExitingSongs([])
      setSelfSongs([])
      setRandomSongs([])
      setSlotSongs([undefined, undefined, undefined, undefined])
      setSlotMode(false)
      setSlotNewMask([false, false, false, false])
      setSlotMovedMask([false, false, false, false])
      setPhase('idle')
      setRevealedCount(0)
    }

    const handleMultiSelectEvent = (selections: { playerId: string; playerName: string; song: MultiSong; label?: string }[]) => {
      const hasSelfOrRandomLabel = selections.some(s => {
        const label = s.label || s.playerName
        return label.startsWith('自选') || label.startsWith('随机')
      })

      if (hasSelfOrRandomLabel) {
        const self: MultiSong[] = []
        const random: MultiSong[] = []
        selections.forEach(s => {
          const label = s.label || s.playerName
          const item = { ...s.song, _label: label, _playerName: s.playerName } as MultiSong
          if (label.startsWith('自选')) self.push(item)
          else if (label.startsWith('随机')) random.push(item)
        })

        // 2+2 模式：随机曲保持，自选曲插入时自动重排
        if (self.length === 2 || random.length === 2 || slotModeRef.current) {
          revealSlots(assignToSlots(self, random), self, random)
          return
        }

        setSelfSongs(self)
        setRandomSongs(random)
        startRevealSequence(buildMergedQueue(self, random))
        return
      }

      // 非 2+2 标签的多选：退出插槽模式，使用常规 reveal
      setSlotMode(false)
      const multiSongs = selections.map(s => ({
        ...s.song,
        _playerName: s.playerName,
        _playerId: s.playerId,
      })) as MultiSong[]

      startRevealSequence(multiSongs)
    }

    const unsubscribe = subscribeSyncEvents((event: SyncEvent) => {
      // 同一事件可能通过 localStorage 和 WebSocket 两个通道同时送达，按时间戳+类型去重
      const last = lastEventRef.current
      if (last && last.timestamp === event.timestamp && last.type === event.type) return
      lastEventRef.current = { timestamp: event.timestamp, type: event.type }

      if (event.type === 'draw') {
        const payload = event.payload as { songs: Song[] }
        const currentSelf = selfSongsRef.current
        // 2+2 流程：抽卡 2 首且当前已有 2 首自选曲时，将随机曲插入到自选曲之间/之后
        if (payload.songs.length === 2 && currentSelf.length === 2) {
          const random = payload.songs.map((s, i) => ({ ...s, _label: `随机${i + 1}` })) as MultiSong[]
          setRandomSongs(random)
          startRevealSequence(buildMergedQueue(currentSelf, random))
        } else {
          setSelfSongs([])
          setRandomSongs([])
          startRevealSequence(payload.songs as MultiSong[])
        }
      } else if (event.type === 'clear') {
        handleClearEvent()
      } else if (event.type === 'import') {
        handleImportEvent()
      } else if (event.type === 'select') {
        const payload = event.payload as { songs: MultiSong[]; labels?: string[] }
        if (payload.songs.length === 2) {
          const self = payload.songs.map((s, i) => ({
            ...s,
            _label: payload.labels?.[i] || `自选${i + 1}`,
          })) as MultiSong[]
          setSelfSongs(self)
          setRandomSongs([])
          startRevealSequence(self)
        } else {
          setSelfSongs([])
          setRandomSongs([])
          startRevealSequence(payload.songs)
        }
      } else if (event.type === 'multiSelect') {
        const payload = event.payload as { songs: { playerId: string; playerName: string; song: MultiSong; label?: string }[] }
        handleMultiSelectEvent(payload.songs)
      } else if (event.type === 'stageSongs') {
        const payload = event.payload as {
          stage: TournamentStage
          groupId?: string
          songs: { song: Song; label: string }[]
        }
        const songs = payload.songs.filter(s => s.song)
        // 随机曲按标签识别；非随机曲（自选*或玩家名）都视为自选曲
        const incomingRandom = songs
          .filter(s => s.label.startsWith('随机'))
          .map(s => ({ ...s.song, _label: s.label } as MultiSong))
        const incomingSelf = songs
          .filter(s => !s.label.startsWith('随机'))
          .map((s, i) => {
            const isSelfLabel = s.label.startsWith('自选')
            return {
              ...s.song,
              _label: isSelfLabel ? s.label : `自选${i + 1}`,
              // 标签为玩家名时，保留为底部展示名
              _playerName: isSelfLabel ? undefined : s.label,
            } as MultiSong
          })

        // 2+2 模式：随机曲保持，自选曲插入时自动重排
        if (is2Plus2Pattern(songs) || slotModeRef.current) {
          // 增量更新：如果事件只包含随机曲，保留当前已展示的自选曲
          const nextSelf = incomingSelf.length > 0 ? incomingSelf : selfSongsRef.current
          const nextRandom = incomingRandom.length > 0 ? incomingRandom : randomSongsRef.current
          if (nextSelf.length > 0 || nextRandom.length > 0) {
            revealSlots(assignToSlots(nextSelf, nextRandom), nextSelf, nextRandom)
          }
          return
        }

        // 非 2+2 模式：退出插槽模式，使用常规 reveal
        setSlotMode(false)
        const nextSelf = incomingSelf.length > 0 ? incomingSelf : selfSongsRef.current
        const nextRandom = incomingRandom.length > 0 ? incomingRandom : randomSongsRef.current

        if (nextSelf.length > 0 || nextRandom.length > 0) {
          setSelfSongs(nextSelf)
          setRandomSongs(nextRandom)
          startRevealSequence(buildMergedQueue(nextSelf, nextRandom))
        }
      }
    })

    return () => {
      unsubscribe()
      effectTimeouts.forEach(clearTimeout)
    }
  }, [])

  // 监听赛事阶段变化，用于背景展示
  useEffect(() => {
    const loadCached = () => {
      try {
        const saved = localStorage.getItem('tournament-cache')
        if (saved) {
          const data = JSON.parse(saved)
          if (data.currentStage) setCurrentStage(data.currentStage)
          if (typeof data.isTournamentStarted === 'boolean') setIsTournamentStarted(data.isTournamentStarted)
        }
      } catch { /* ignore */ }
    }
    loadCached()

    const unsubscribe = subscribeSyncEvents((event: SyncEvent) => {
      if (event.type === 'tournament') {
        const payload = event.payload as {
          type: string
          currentStage?: TournamentStage
          isTournamentStarted?: boolean
        }
        if (payload.type === 'update') {
          if (payload.currentStage) setCurrentStage(payload.currentStage)
          if (typeof payload.isTournamentStarted === 'boolean') setIsTournamentStarted(payload.isTournamentStarted)
        } else if (payload.type === 'reset') {
          setCurrentStage('n216')
          setIsTournamentStarted(false)
        }
      }
    })
    return unsubscribe
  }, [])

  const songsToShow = exitingSongs.length > 0 ? exitingSongs : displaySongs
  const isExitingPhase = exitingSongs.length > 0

  return (
    <div className="min-h-screen w-full bg-[#0b0c15] relative overflow-hidden flex flex-col items-center justify-center select-none page-enter">
      {/* Background ambient effect - fluid gradient / stage performance */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.18)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(236,72,153,0.14)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.08)_0%,transparent_60%)]" />
        <div className="absolute inset-0 hero-grid opacity-20 [background-size:48px_48px]" />
      </div>

      {/* 背景当前阶段大字 */}
      {isTournamentStarted && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
          <span className="text-[10rem] lg:text-[14rem] md:text-[18rem] font-black text-white/[0.05] tracking-[0.12em] whitespace-nowrap">
            {STAGE_LABELS[currentStage]}
          </span>
        </div>
      )}

      {/* Connection status */}
      <div className="relative z-10 text-center mb-8">
        <div className="inline-flex items-center gap-4 px-6 py-4 rounded-full text-sm font-bold tracking-wider glass-panel border border-white/10">
          <span className="title-gradient font-orbitron">OBS DISPLAY</span>
          <span className="w-px h-5 bg-white/10" />
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

        <div className="relative z-10 flex flex-col items-center gap-8">
          {slotMode ? (
            <div className="relative h-[620px]" style={{ width: `${4 * 300 + 3 * 40}px` }}>
              {(() => {
                const hasNewRandom = slotSongs.some(
                  (s, i) => s && slotNewMask[i] && s._label?.startsWith('随机')
                )
                const selfEntranceDelay = hasNewRandom ? 1500 : 0
                const occupiedCount = slotSongs.filter(Boolean).length
                const totalWidth = occupiedCount * 300 + Math.max(0, occupiedCount - 1) * 40
                const centerOffset = Math.max(0, (4 * 300 + 3 * 40 - totalWidth) / 2)
                return slotSongs.map((song, idx) => {
                  const isNew = slotNewMask[idx]
                  const isMoved = slotMovedMask[idx]
                  return (
                    <div
                      key={song ? song._label || song.id : `empty-${idx}`}
                      className="absolute top-0 left-0 transition-transform duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                      style={{
                        transform: `translateX(${idx * (300 + 40) + centerOffset}px)`,
                        opacity: song ? 1 : 0,
                        pointerEvents: song ? 'auto' : 'none',
                        transitionDelay: `${idx * 40}ms`,
                      }}
                    >
                      {song && (
                        <SlotCard
                          song={song}
                          index={idx}
                          isNew={isNew}
                          isMoved={isMoved}
                          selfEntranceDelay={selfEntranceDelay}
                        />
                      )}
                    </div>
                  )
                })
              })()}
            </div>
          ) : (
            chunk(songsToShow, 4).map((row, rowIdx) => (
              <div key={`obs-row-${exitKey}-${rowIdx}`} className="flex flex-wrap items-center justify-center gap-10">
                {row.map((song, colIdx) => {
                  const index = rowIdx * 4 + colIdx
                  return (
                    <div key={`obs-${exitKey}-${index}`}>
                      <DrawCard
                        song={song}
                        index={index}
                        showFront={isExitingPhase || index < revealedCount}
                        animationState={isExitingPhase ? 'exit' : 'enter'}
                      />
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
