import { useState, useEffect, useMemo } from 'react'
import {
  getStageLabel,
  getStageOrder,
  type CustomStageConfig,
  type TournamentStage,
  type TournamentStageData,
  type TournamentPlayer,
  type StageSong,
} from '@/store/tournamentStore'
import { subscribeSyncEvents, type SyncEvent, getConnectionStatus } from '@/utils/tabSync'
import { Trophy, Medal, Crown, User, Music, Swords } from 'lucide-react'

interface PlayerMatch {
  stage: TournamentStage
  stageLabel: string
  player: TournamentPlayer
  isCurrent: boolean
}

function loadCachedData(): { stages?: Record<string, unknown>; currentStage?: string; isTournamentStarted?: boolean; isCustomMode?: boolean; customStages?: CustomStageConfig[] } | null {
  try {
    const saved = localStorage.getItem('tournament-cache')
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return null
}

export default function PlayerTerminal() {
  const [playerName, setPlayerName] = useState<string>('')
  const [inputName, setInputName] = useState<string>('')
  const [isStarted, setIsStarted] = useState(false)
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [customStages, setCustomStages] = useState<CustomStageConfig[]>([])

  const stageOrder = useMemo(() => getStageOrder(isCustomMode, customStages), [isCustomMode, customStages])
  const defaultStages = useMemo(() => {
    const obj: Record<string, null> = {}
    for (const stage of stageOrder) {
      obj[stage] = null
    }
    return obj
  }, [stageOrder])

  const [stages, setStages] = useState<Record<string, TournamentStageData | null>>(defaultStages)
  const [currentStage, setCurrentStage] = useState<TournamentStage>('n216')

  // 从 URL 参数获取选手名
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlPlayer = params.get('player')
    if (urlPlayer) {
      setPlayerName(decodeURIComponent(urlPlayer))
      setInputName(decodeURIComponent(urlPlayer))
    }
  }, [])

  // Load cached data on mount
  useEffect(() => {
    const cached = loadCachedData()
    if (cached?.isTournamentStarted) {
      setIsStarted(true)
      if (cached.isCustomMode) setIsCustomMode(cached.isCustomMode)
      if (cached.customStages) setCustomStages(cached.customStages)
      if (cached.currentStage) setCurrentStage(cached.currentStage as TournamentStage)
      if (cached.stages) setStages({ ...defaultStages, ...cached.stages } as Record<string, TournamentStageData | null>)
    }
  }, [])

  // Listen for tournament sync events
  useEffect(() => {
    const handleEvent = (payload: { type: string; stages?: Record<string, TournamentStageData>; currentStage?: TournamentStage; isCustomMode?: boolean; customStages?: CustomStageConfig[] }) => {
      if (payload.type === 'update') {
        if (payload.isCustomMode !== undefined) setIsCustomMode(payload.isCustomMode)
        if (payload.customStages) setCustomStages(payload.customStages)
        if (payload.stages) setStages({ ...defaultStages, ...payload.stages })
        if (payload.currentStage) setCurrentStage(payload.currentStage)
        setIsStarted(true)
        localStorage.setItem('tournament-cache', JSON.stringify({
          isTournamentStarted: true,
          isCustomMode: payload.isCustomMode,
          customStages: payload.customStages,
          stages: payload.stages ? { ...defaultStages, ...payload.stages } : undefined,
          currentStage: payload.currentStage,
        }))
      } else if (payload.type === 'reset') {
        setIsStarted(false)
        setIsCustomMode(false)
        setCustomStages([])
        setStages(defaultStages)
        localStorage.removeItem('tournament-cache')
      }
    }

    const unsubscribe = subscribeSyncEvents((event: SyncEvent) => {
      if (event.type === 'tournament') {
        handleEvent(event.payload as { type: string; stages?: Record<string, TournamentStageData>; currentStage?: TournamentStage; isCustomMode?: boolean; customStages?: CustomStageConfig[] })
      }
    })
    return unsubscribe
  }, [])

  // 查找选手在所有阶段中的数据
  const findPlayerMatches = (name: string): PlayerMatch[] => {
    if (!name) return []
    const matches: PlayerMatch[] = []
    for (const stage of stageOrder) {
      const stageData = stages[stage]
      if (!stageData) continue
      const player = stageData.players.find(
        (p) => p.name.toLowerCase() === name.toLowerCase()
      )
      if (player) {
        matches.push({
          stage,
          stageLabel: getStageLabel(stage, customStages),
          player,
          isCurrent: stage === currentStage,
        })
      }
    }
    return matches
  }

  // 获取选手在当前阶段的比赛曲目（优先分组曲目，其次阶段通用曲目）
  const getPlayerStageSongs = (match: PlayerMatch): StageSong[] => {
    if (!match) return []
    const stageData = stages[match.stage]
    if (!stageData) return []
    const group = stageData.groups.find((g) => g.playerIds.includes(match.player.id))
    if (group && group.songs.length > 0) return group.songs
    return stageData.songs
  }

  // 查找下一场对阵对手
  const getNextOpponent = (match: PlayerMatch): TournamentPlayer | null => {
    if (!match || (match.stage === 'final' && !isCustomMode)) return null
    const stageData = stages[match.stage]
    if (!stageData) return null
    const currentIndex = stageOrder.indexOf(match.stage)
    const nextStage = stageOrder[currentIndex + 1]
    if (!nextStage) return null
    const nextStageData = stages[nextStage]
    if (!nextStageData) return null

    if (!match.player.advanced) return null

    if (!isCustomMode) {
      // 16进8：同组另一位选手即为对手
      if (match.stage === '16to8') {
        const group = stageData.groups.find((g) => g.playerIds.includes(match.player.id))
        if (group) {
          const opponentId = group.playerIds.find((id) => id !== match.player.id)
          if (opponentId) {
            return nextStageData.players.find((p) => p.id === opponentId) || null
          }
        }
      }

      // 半决赛：按 seed 1vs4 / 2vs3 规则
      if (match.stage === '8to4') {
        const seed = match.player.seed
        if (typeof seed !== 'number') return null
        const opponentSeed = seed === 1 ? 4 : seed === 2 ? 3 : seed === 3 ? 2 : seed === 4 ? 1 : null
        if (opponentSeed === null) return null
        return nextStageData.players.find((p) => p.seed === opponentSeed) || null
      }
    }

    return null
  }

  const handleSearch = () => {
    const name = inputName.trim()
    if (!name) return
    setPlayerName(name)
    // 更新 URL 参数
    const url = new URL(window.location.href)
    url.searchParams.set('player', encodeURIComponent(name))
    window.history.replaceState({}, '', url.toString())
  }

  const playerMatches = findPlayerMatches(playerName)
  const currentMatch = playerMatches.find((m) => m.isCurrent) || playerMatches[0]
  const latestMatch = playerMatches[playerMatches.length - 1]
  const isEliminated = latestMatch?.player.eliminated === true
  const isChampion = latestMatch?.stage === 'final' && latestMatch?.player.rank === 1

  // 未找到选手
  if (playerName && playerMatches.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden page-enter">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.18)_0%,transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(236,72,153,0.14)_0%,transparent_50%)]" />
        </div>
        <div className="relative z-10 text-center max-w-md w-full glass-panel p-8 rounded-3xl border border-white/10 hover-lift">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
            <User className="text-red-400" size={40} />
          </div>
          <h1 className="text-3xl font-black text-white mb-2 animate-enter">未找到选手</h1>
          <p className="text-white/50 mb-8">
            未找到名为 "<span className="text-white font-bold">{playerName}</span>" 的选手
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="输入选手名称"
              className="input-refined flex-1 text-center text-lg"
            />
            <button
              onClick={handleSearch}
              className="btn-primary press-down"
            >
              查询
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 初始状态
  if (!playerName) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden page-enter">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.18)_0%,transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(236,72,153,0.14)_0%,transparent_50%)]" />
        </div>
        <div className="relative z-10 text-center max-w-md w-full glass-panel p-8 rounded-3xl border border-white/10 hover-lift">
          <Trophy className="mx-auto mb-6 text-amber-400" size={64} />
          <h1 className="text-3xl font-black text-white mb-2 animate-enter">选手查询</h1>
          <p className="text-white/50 mb-8">输入你的选手名称，查询当前赛事成绩</p>
          <div className="space-y-3">
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="输入选手名称"
              className="input-refined text-center text-lg"
            />
            <button
              onClick={handleSearch}
              disabled={!inputName.trim()}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed press-down"
            >
              进入查询
            </button>
          </div>
          {!isStarted && (
            <div className="mt-6 flex items-center justify-center gap-2 text-white/40 text-sm">
              <span className="text-amber-400">○</span> 等待赛事开始...
            </div>
          )}
        </div>
      </div>
    )
  }

  // 冠军展示
  if (isChampion) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-radial from-amber-500/25 via-amber-900/5 to-transparent animate-pulse" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60vw] h-[60vh] bg-gradient-to-b from-amber-400/20 via-transparent to-transparent blur-3xl animate-pulse" />
        </div>
        <div className="relative z-10 text-center px-4">
          <div className="opacity-0 animate-[fadeIn_0.8s_ease-out_forwards]">
            <Crown className="mx-auto text-amber-400 drop-shadow-[0_0_40px_rgba(245,158,11,0.8)] animate-[crownFloat_2s_ease-in-out_infinite]" size={80} />
          </div>
          <div className="opacity-0 animate-[fadeIn_0.6s_ease-out_0.4s_forwards] mt-6 mb-2">
            <span className="badge-warning">
              <Medal size={16} /> 冠军诞生
            </span>
          </div>
          <h1 className="opacity-0 animate-[fadeIn_0.8s_ease-out_0.7s_forwards] text-6xl md:text-8xl font-black text-white mb-6">
            {playerName}
          </h1>
          {latestMatch?.player.score !== null && (
            <div className="opacity-0 animate-[fadeIn_0.6s_ease-out_1.2s_forwards]">
              <div className="inline-flex flex-col items-center gap-1 px-8 py-4 rounded-3xl glass-panel border border-amber-500/40 hover-lift">
                <span className="text-white/50 text-sm">决赛完成率</span>
                <span className="text-amber-300 font-mono text-4xl font-black">{latestMatch.player.score.toFixed(4)}</span>
              </div>
              {latestMatch.player.dxScore && (
                <div className="mt-3 inline-flex flex-col items-center gap-1 px-6 py-2 rounded-2xl glass-panel border border-blue-400/30 hover-lift">
                  <span className="text-blue-400/70 text-xs">DX分数</span>
                  <span className="text-blue-300 font-mono text-2xl font-bold">DX {latestMatch.player.dxScore}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes crownFloat {
            0%, 100% { transform: translateY(0) rotate(-2deg); }
            50% { transform: translateY(-10px) rotate(2deg); }
          }
        `}</style>
      </div>
    )
  }

  // 正常选手页面
  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden page-enter">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.18)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(236,72,153,0.14)_0%,transparent_50%)]" />
      </div>
      <div className="relative z-10 max-w-2xl mx-auto space-y-6">
        {/* 顶部标题 */}
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
            <User className="text-white/60" size={32} />
          </div>
          <h1 className="text-3xl font-black text-white">{playerName}</h1>
          {latestMatch && (
            <div className="mt-2 flex items-center justify-center gap-3">
              <span className={isEliminated ? 'badge-error' : 'badge-success'}>
                {isEliminated ? '已淘汰' : '晋级中'}
              </span>
              <span className="text-white/50 text-sm">{latestMatch.stageLabel}</span>
            </div>
          )}
        </div>

        {/* 当前阶段信息 */}
        {currentMatch && (
          <div className="glass-panel rounded-3xl p-6 border border-white/10 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Trophy size={20} className={currentMatch.isCurrent ? 'text-amber-400' : 'text-white/40'} />
                {currentMatch.stageLabel}
                {currentMatch.isCurrent && (
                  <span className="badge-info">
                    当前阶段
                  </span>
                )}
              </h2>
              {currentMatch.player.rank !== null && (
                <span className={`w-10 h-10 rounded-full font-black flex items-center justify-center text-lg ${
                  currentMatch.player.rank === 1 ? 'bg-amber-500 text-amber-900' :
                  currentMatch.player.rank === 2 ? 'bg-white/70 text-gray-800' :
                  currentMatch.player.rank === 3 ? 'bg-orange-600 text-orange-100' :
                  'bg-white/10 text-white/60'
                }`}>
                  {currentMatch.player.rank}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
                <span className="text-white/50 text-xs font-medium block mb-1">完成率</span>
                <span className={`font-mono text-2xl font-black ${
                  currentMatch.player.score !== null ? 'text-emerald-300' : 'text-white/30'
                }`}>
                  {currentMatch.player.score !== null ? currentMatch.player.score.toFixed(4) : '---'}
                </span>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
                <span className="text-white/50 text-xs font-medium block mb-1">DX分数</span>
                <span className="font-mono text-2xl font-black text-blue-300">
                  {currentMatch.player.dxScore || '---'}
                </span>
              </div>
            </div>

            {currentMatch.player.seed !== undefined && (
              <div className="mt-3 text-center">
                <span className="badge-warning">
                  种子 #{currentMatch.player.seed}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 比赛曲目 */}
        {currentMatch && getPlayerStageSongs(currentMatch).length > 0 && (
          <div className="glass-panel rounded-3xl p-5 border border-white/10">
            <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Music size={16} /> 比赛曲目
            </h3>
            <div className="space-y-3 stagger-children">
              {getPlayerStageSongs(currentMatch).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 hover-lift"
                >
                  {s.song?.cover ? (
                    <img
                      src={s.song.cover}
                      alt={s.song.name}
                      className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                      <Music size={24} className="text-white/30" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-white font-bold truncate">{s.label}</p>
                    <p className="text-white/60 text-sm truncate">
                      {s.song?.name || '未指定'}
                      {s.song && (
                        <span className="ml-2 text-white/40">
                          {s.song.difficulty} Lv.{s.song.level}{s.song.isPlus ? '+' : ''}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 下一场对阵 */}
        {currentMatch && getNextOpponent(currentMatch) && (
          <div className="glass-panel rounded-3xl p-5 border border-white/10 hover-lift">
            <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Swords size={16} /> 下一场对阵
            </h3>
            <div className="flex items-center justify-center gap-4 py-2">
              <span className="text-white font-bold text-lg">{playerName}</span>
              <span className="badge-warning">
                VS
              </span>
              <span className="text-white font-bold text-lg">{getNextOpponent(currentMatch)!.name}</span>
            </div>
          </div>
        )}

        {/* 历届成绩 */}
        {playerMatches.length > 1 && (
          <div className="glass-panel rounded-3xl p-5 border border-white/10">
            <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">历届成绩</h3>
            <div className="space-y-2 stagger-children">
              {playerMatches.map((match) => (
                <div key={match.stage} className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white/5 border border-white/10 hover-lift">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-bold">{match.stageLabel}</span>
                    {match.player.eliminated && (
                      <span className="badge-error">淘汰</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    {match.player.score !== null && (
                      <span className="text-emerald-300 font-mono text-sm">{match.player.score.toFixed(4)}</span>
                    )}
                    {match.player.rank !== null && (
                      <span className={`w-7 h-7 rounded-full font-black flex items-center justify-center text-sm ${
                        match.player.rank === 1 ? 'bg-amber-500 text-amber-900' :
                        match.player.rank === 2 ? 'bg-white/70 text-gray-800' :
                        match.player.rank === 3 ? 'bg-orange-600 text-orange-100' :
                        'bg-white/10 text-white/60'
                      }`}>
                        {match.player.rank}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 淘汰提示 */}
        {isEliminated && (
          <div className="text-center p-6 rounded-3xl bg-red-500/10 border border-red-500/30">
            <p className="text-red-400 font-bold text-lg mb-1">很遗憾，你在本轮赛事中被淘汰</p>
            <p className="text-white/50 text-sm">感谢参与，下次赛事再接再厉！</p>
          </div>
        )}

        {/* 切换选手 */}
        <div className="flex gap-2">
          <input
            type="text"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="查询其他选手..."
            className="input-refined flex-1"
          />
          <button
            onClick={handleSearch}
            className="btn-primary press-down"
          >
            查询
          </button>
        </div>

        {/* 连接状态 */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-white/40">
            {getConnectionStatus() === 'connected' ? (
              <span className="text-emerald-400">● 已连接</span>
            ) : (
              <span className="text-amber-400">○ 连接中...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
