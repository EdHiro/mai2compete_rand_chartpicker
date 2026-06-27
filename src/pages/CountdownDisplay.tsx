import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { subscribeSyncEvents, type SyncEvent, getConnectionStatus } from '@/utils/tabSync'
import { Timer, Wifi, WifiOff, Radio } from 'lucide-react'

interface TimerState {
  running: boolean
  seconds: number
  total: number
  label: string
}

function formatMmSs(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function loadInitialTimer(): TimerState {
  try {
    const raw = localStorage.getItem('tournament-data')
    if (raw) {
      const data = JSON.parse(raw)
      const seconds = Math.max(0, Number(data.timerSeconds) || 0)
      return {
        running: !!data.timerRunning,
        seconds,
        total: seconds,
        label: String(data.timerLabel || ''),
      }
    }
  } catch {
    // ignore
  }
  return { running: false, seconds: 0, total: 0, label: '' }
}

export default function CountdownDisplay() {
  const [timer, setTimer] = useState<TimerState>(loadInitialTimer)
  const [finished, setFinished] = useState(false)
  const [connStatus, setConnStatus] = useState<'connected' | 'connecting' | 'local-only'>(
    getConnectionStatus() as 'connected' | 'connecting' | 'local-only'
  )
  const [pulseKey, setPulseKey] = useState(0)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const connIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const finishedAtRef = useRef<number | null>(null)

  const applyRemoteTimer = useCallback((payload: {
    timerRunning?: boolean
    timerSeconds?: number
    timerLabel?: string
  }) => {
    const running = !!payload.timerRunning
    const seconds = Math.max(0, Math.round(Number(payload.timerSeconds) || 0))
    const label = String(payload.timerLabel || '')

    setTimer(prev => {
      const nextTotal = running && seconds > prev.total ? seconds : prev.total
      return {
        running,
        seconds,
        total: nextTotal > 0 ? nextTotal : seconds,
        label,
      }
    })
    setFinished(false)
    finishedAtRef.current = null
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeSyncEvents((event: SyncEvent) => {
      if (event.type === 'tournament') {
        const payload = event.payload as {
          type: string
          timerRunning?: boolean
          timerSeconds?: number
          timerLabel?: string
        }
        if (payload.type === 'update') {
          applyRemoteTimer(payload)
        } else if (payload.type === 'reset') {
          setTimer({ running: false, seconds: 0, total: 0, label: '' })
          setFinished(false)
          finishedAtRef.current = null
        }
      }
    })
    return unsubscribe
  }, [applyRemoteTimer])

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (!timer.running || timer.seconds <= 0) {
      if (timer.running && timer.seconds <= 0 && !finished && !finishedAtRef.current) {
        setFinished(true)
        finishedAtRef.current = Date.now()
      }
      return
    }

    intervalRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev.seconds <= 1) {
          if (!finishedAtRef.current) {
            setFinished(true)
            finishedAtRef.current = Date.now()
          }
          return { ...prev, running: false, seconds: 0 }
        }
        return { ...prev, seconds: prev.seconds - 1 }
      })
      setPulseKey(k => k + 1)
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [timer.running, timer.seconds, finished])

  useEffect(() => {
    connIntervalRef.current = setInterval(() => {
      setConnStatus(getConnectionStatus() as 'connected' | 'connecting' | 'local-only')
    }, 1000)
    return () => {
      if (connIntervalRef.current) clearInterval(connIntervalRef.current)
    }
  }, [])

  useEffect(() => {
    if (finished) {
      document.title = 'START!'
    } else if (timer.running || timer.seconds > 0) {
      document.title = `${formatMmSs(timer.seconds)} - Countdown`
    } else {
      document.title = 'Countdown - Ready'
    }
  }, [timer, finished])

  const progress = useMemo(() => {
    if (timer.total <= 0) return 0
    const ratio = timer.seconds / timer.total
    return Math.max(0, Math.min(1, ratio))
  }, [timer.seconds, timer.total])

  const displayTime = useMemo(() => {
    if (timer.seconds <= 60) {
      return timer.seconds.toString().padStart(2, '0')
    }
    return formatMmSs(timer.seconds)
  }, [timer.seconds])

  const phase = useMemo(() => {
    if (timer.seconds <= 3) return 'critical'
    if (timer.seconds <= 10) return 'warning'
    return 'normal'
  }, [timer.seconds])

  const theme =
    phase === 'critical'
      ? {
          from: 'from-rose-400',
          via: 'via-fuchsia-400',
          to: 'to-orange-400',
          text: 'text-rose-50',
          glow: 'shadow-rose-500/40',
          blob1: 'bg-rose-400',
          blob2: 'bg-fuchsia-400',
          blob3: 'bg-orange-400',
        }
      : phase === 'warning'
      ? {
          from: 'from-amber-300',
          via: 'via-orange-400',
          to: 'to-rose-400',
          text: 'text-amber-50',
          glow: 'shadow-amber-500/35',
          blob1: 'bg-amber-400',
          blob2: 'bg-orange-400',
          blob3: 'bg-rose-400',
        }
      : {
          from: 'from-cyan-300',
          via: 'via-violet-400',
          to: 'to-pink-400',
          text: 'text-white',
          glow: 'shadow-violet-500/35',
          blob1: 'bg-cyan-400',
          blob2: 'bg-violet-400',
          blob3: 'bg-pink-400',
        }

  const radius = 220
  const stroke = 10
  const normalizedRadius = radius - stroke / 2
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - progress * circumference

  const statusText =
    finished
      ? 'Started'
      : timer.running
      ? 'Counting'
      : timer.seconds > 0
      ? 'Paused'
      : 'Ready'

  return (
    <div className="min-h-screen w-full bg-[#0b0c15] relative overflow-hidden flex flex-col items-center justify-center select-none font-display">
      {/* 流体渐变背景 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.18)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(236,72,153,0.14)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.08)_0%,transparent_60%)]" />

        {/* 流动光球 */}
        <div
          className={`absolute top-[10%] left-[15%] w-[45vw] h-[45vw] rounded-full ${theme.blob1} opacity-25 blur-[120px] animate-[float_12s_ease-in-out_infinite]`}
        />
        <div
          className={`absolute top-[40%] right-[10%] w-[40vw] h-[40vw] rounded-full ${theme.blob2} opacity-20 blur-[140px] animate-[float_14s_ease-in-out_infinite_reverse]`}
        />
        <div
          className={`absolute bottom-[5%] left-[30%] w-[50vw] h-[50vw] rounded-full ${theme.blob3} opacity-15 blur-[160px] animate-[float_16s_ease-in-out_infinite]`}
        />

        {/* 柔和噪点 */}
        <div className="absolute inset-0 bg-noise opacity-30" />
      </div>

      {/* 顶部状态栏 */}
      <div className="absolute top-0 left-0 right-0 z-20 px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center">
            <Timer size={18} className="text-white/80" />
          </div>
          <div>
            <h1 className="font-display font-black text-lg text-white tracking-wide">
              Countdown
            </h1>
            <p className="font-body text-[10px] text-white/40 tracking-[0.15em] uppercase">
              Sync Display
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {timer.label && (
            <span className="hidden sm:inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/60 text-xs font-bold tracking-wide">
              {timer.label}
            </span>
          )}
          <span
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-md border
              ${connStatus === 'connected'
                ? 'bg-white/10 border-white/10 text-emerald-300'
                : connStatus === 'connecting'
                ? 'bg-white/10 border-white/10 text-amber-300'
                : 'bg-white/10 border-white/10 text-rose-300'}
            `}
          >
            {connStatus === 'connected' ? <Wifi size={12} /> : connStatus === 'connecting' ? <Radio size={12} /> : <WifiOff size={12} />}
            {connStatus === 'connected' ? 'Synced' : connStatus === 'connecting' ? 'Syncing' : 'Local'}
          </span>
        </div>
      </div>

      {/* 主体内容 */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full px-6">
        {finished ? (
          <div className="flex flex-col items-center animate-[scaleIn_0.7s_cubic-bezier(0.16,1,0.3,1)_both]">
            <div className="relative">
              <div className={`absolute inset-0 bg-gradient-to-r ${theme.from} ${theme.via} ${theme.to} blur-[80px] opacity-60 animate-pulse`} />
              <h1
                className={`relative font-display font-black text-[8rem] sm:text-[12rem] md:text-[15rem] leading-none tracking-tight text-transparent bg-clip-text bg-gradient-to-br ${theme.from} ${theme.via} ${theme.to} drop-shadow-[0_0_60px_rgba(255,255,255,0.25)]`}
              >
                START
              </h1>
            </div>
            <p className="mt-6 font-body text-lg text-white/50 tracking-[0.4em] uppercase">
              Let the game begin
            </p>
          </div>
        ) : (
          <div
            className={`
              relative w-full max-w-2xl rounded-[3rem] p-10 sm:p-14
              bg-white/5 backdrop-blur-2xl border border-white/10
              shadow-[0_32px_80px_-24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]
              transition-all duration-700
            `}
          >
            {/* 卡片顶部渐变线 */}
            <div className={`absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent ${theme.via} to-transparent opacity-60`} />

            {/* 状态 */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <span className={`w-2 h-2 rounded-full ${timer.running ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
              <span className="text-xs font-body font-bold tracking-[0.25em] uppercase text-white/40">
                {statusText}
              </span>
            </div>

            {/* 倒计时圆环 + 数字 */}
            <div className="relative w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] mx-auto flex items-center justify-center">
              {/* 外发光 */}
              <div className={`absolute inset-0 rounded-full blur-3xl ${theme.blob1} opacity-20 transition-colors duration-700`} />

              <svg
                width={radius * 2}
                height={radius * 2}
                className="absolute transform -rotate-90"
              >
                <circle
                  cx={radius}
                  cy={radius}
                  r={normalizedRadius}
                  fill="transparent"
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={stroke}
                />
                <circle
                  cx={radius}
                  cy={radius}
                  r={normalizedRadius}
                  fill="transparent"
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  stroke={`url(#fluidRing-${phase})`}
                  strokeDasharray={`${circumference} ${circumference}`}
                  style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s linear' }}
                />
                <defs>
                  <linearGradient id="fluidRing-normal" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                  <linearGradient id="fluidRing-warning" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fcd34d" />
                    <stop offset="50%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#fb7185" />
                  </linearGradient>
                  <linearGradient id="fluidRing-critical" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fb7185" />
                    <stop offset="50%" stopColor="#e879f9" />
                    <stop offset="100%" stopColor="#fb923c" />
                  </linearGradient>
                </defs>
              </svg>

              {/* 数字 */}
              <div className="relative flex flex-col items-center">
                <div
                  key={pulseKey}
                  className={`
                    font-display font-black text-[6rem] sm:text-[8rem] leading-none tabular-nums tracking-tight
                    text-transparent bg-clip-text bg-gradient-to-br ${theme.from} ${theme.via} ${theme.to}
                    drop-shadow-[0_0_40px_rgba(255,255,255,0.15)]
                    ${phase === 'critical' ? 'animate-[pulseSoft_0.6s_ease-in-out_infinite]' : ''}
                  `}
                >
                  {displayTime}
                </div>
                <span className="mt-2 text-xs font-body font-bold tracking-[0.3em] uppercase text-white/30">
                  {timer.seconds <= 60 ? 'Seconds' : 'Minutes'}
                </span>
              </div>
            </div>

            {/* 底部进度条 */}
            <div className="mt-10">
              <div className="flex items-center justify-between mb-2 text-[10px] font-body font-bold tracking-[0.2em] uppercase text-white/30">
                <span>Progress</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${theme.from} ${theme.to} transition-all duration-1000 linear`}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>

            {/* 暂停 / 等待提示 */}
            {!timer.running && timer.seconds > 0 && (
              <div className="mt-6 text-center">
                <span className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-xs font-bold tracking-widest uppercase">
                  Paused
                </span>
              </div>
            )}
            {!timer.running && timer.seconds === 0 && (
              <div className="mt-6 text-center">
                <span className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/30 text-xs font-bold tracking-widest uppercase">
                  Waiting for tournament timer
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 底部信息 */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-8 py-6 flex items-center justify-between">
        <span className="text-[10px] font-body font-bold tracking-[0.2em] uppercase text-white/25">
          /countdown · OBS Browser Source
        </span>
        <span className="text-[10px] font-body font-bold tracking-[0.2em] uppercase text-white/25">
          Live
        </span>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -40px) scale(1.05); }
          66% { transform: translate(-20px, 30px) scale(0.95); }
        }
        @keyframes scaleIn {
          0% { opacity: 0; transform: scale(0.85) translateY(20px); filter: blur(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
        @keyframes pulseSoft {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.03); }
        }
      `}</style>
    </div>
  )
}
