import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  useTournamentStore,
  STAGE_LABELS,
  type TournamentStageData,
  type TournamentPlayer,
  type MatchGroup,
  type StageSong,
  type MatchGroupStatus,
  type CustomStageConfig,
} from '@/store/tournamentStore'
import { useSongStore, type Song, type PlayerSelection, type Difficulty } from '@/store/songStore'
import { subscribeSyncEvents, broadcastSyncEvent, useSyncStatus, reconnectSync } from '@/utils/tabSync'
import { useToast } from '@/components/Toast'
import {
  Gavel,
  ArrowLeft,
  Swords,
  CheckCircle2,
  Circle,
  Wifi,
  WifiOff,
  Radio,
  Save,
  Eye,
  Disc3,
  Users,
  Zap,
  Database,
  BookOpen,
  Trash2,
  MonitorPlay,
  ChevronDown,
  ChevronUp,
  Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ORDER_2PLUS2 = ['自选1', '随机1', '自选2', '随机2']
const RANDOM_PLAYER_ID_1 = '__random-1__'
const RANDOM_PLAYER_ID_2 = '__random-2__'

type StageRuleType = 'common-random' | 'random-per-group' | 'four-self' | 'two-plus-two'

interface StageRule {
  type: StageRuleType
  label: string
  randomPerGroup: number
  selfCount: number
  description: string
}

const STAGE_RULES: Record<string, StageRule> = {
  n216: {
    type: 'common-random',
    label: 'N进16',
    randomPerGroup: 2,
    selfCount: 0,
    description: '课题曲全组通用（2 首随机）',
  },
  '16to8': {
    type: 'random-per-group',
    label: '16进8',
    randomPerGroup: 3,
    selfCount: 0,
    description: '每组 3 首随机，组间不同',
  },
  '8to4': {
    type: 'four-self',
    label: '8进4',
    randomPerGroup: 0,
    selfCount: 4,
    description: '4 首选曲',
  },
  semi: {
    type: 'two-plus-two',
    label: '半决赛',
    randomPerGroup: 2,
    selfCount: 2,
    description: '2 首选曲 + 2 首随机',
  },
  final: {
    type: 'two-plus-two',
    label: '决赛',
    randomPerGroup: 2,
    selfCount: 2,
    description: '2 首选曲 + 2 首随机',
  },
  semiLoser: {
    type: 'two-plus-two',
    label: '半决赛败者组',
    randomPerGroup: 2,
    selfCount: 2,
    description: '2 首选曲 + 2 首随机',
  },
}

function getStageRule(stage: string, customStages?: CustomStageConfig[]): StageRule | null {
  // 先查默认规则
  const defaultRule = STAGE_RULES[stage]
  if (defaultRule) return defaultRule

  // 自定义阶段：根据 songCount 生成规则
  if (customStages) {
    const custom = customStages.find((c) => c.id === stage)
    if (custom) {
      const selfCount = Math.floor(custom.songCount / 2)
      const randomCount = custom.songCount - selfCount
      return {
        type: randomCount > 0 ? 'two-plus-two' : 'four-self',
        label: custom.name,
        randomPerGroup: randomCount,
        selfCount,
        description: `${selfCount} 首选曲 + ${randomCount} 首随机`,
      }
    }
  }
  return null
}

function getDiffColor(diff: string) {
  switch (diff) {
    case 'BASIC':
      return 'from-green-500/80 to-emerald-600/80 border-green-400/50'
    case 'ADVANCED':
      return 'from-yellow-500/80 to-amber-600/80 border-yellow-400/50'
    case 'EXPERT':
      return 'from-pink-500/80 to-rose-600/80 border-pink-400/50'
    case 'MASTER':
      return 'from-purple-500/80 to-purple-700/80 border-purple-400/50'
    case 'Re:MASTER':
      return 'from-amber-400/80 to-orange-500/80 border-amber-400/50'
    case 'UTAGE':
      return 'from-cyan-500/80 to-blue-600/80 border-cyan-400/50'
    default:
      return 'from-gray-500/80 to-gray-600/80 border-gray-400/50'
  }
}

function getDiffCode(diff: Difficulty | string): string {
  switch (diff) {
    case 'BASIC':
      return 'BSC'
    case 'ADVANCED':
      return 'ADV'
    case 'EXPERT':
      return 'EXP'
    case 'MASTER':
      return 'MST'
    case 'Re:MASTER':
      return 'Re:M'
    case 'UTAGE':
      return 'UTG'
    default:
      return diff.slice(0, 3)
  }
}

function isRandomLabel(label?: string): boolean {
  return label === '随机1' || label === '随机2'
}

function sortStageSongs(songs: StageSong[]): StageSong[] {
  return [...songs].sort((a, b) => {
    const idxA = ORDER_2PLUS2.indexOf(a.label)
    const idxB = ORDER_2PLUS2.indexOf(b.label)
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return 0
  })
}

function getSongByPlayer(playerName: string, selections: PlayerSelection[]): Song | null {
  const normalized = playerName.trim().toLowerCase()
  const found = selections.find(
    (s) => s.playerName.trim().toLowerCase() === normalized && s.song && !s.playerId.startsWith('__random')
  )
  return found?.song || null
}

function getRandomIndex(max: number): number {
  if (max <= 1) return 0
  const array = new Uint32Array(1)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
    return array[0] % max
  }
  return Math.floor(Math.random() * max)
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function getPoolSongsFromStore(poolId: string): Song[] {
  const state = useSongStore.getState()
  if (poolId === 'main') return state.songs
  return state.songPools.find((p) => p.id === poolId)?.songs || []
}

function getFilteredSongsForPool(poolSongs: Song[]): Song[] {
  const state = useSongStore.getState()
  return state.getFilteredSongs(
    state.activeFilters,
    state.includePlusOnly,
    state.chartTypeFilter,
    state.genreFilter,
    poolSongs
  )
}

function shuffleSongs(songs: Song[]): Song[] {
  const pool = [...songs]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = getRandomIndex(i + 1)
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool
}

function drawFreshRandomSongs(
  poolIds: string[],
  multiDrawMode: 'mixed' | 'perPool',
  perPoolCounts: Record<string, number>,
  count: number,
  excludeIds?: Set<string>
): Song[] {
  const result: Song[] = []

  if (poolIds.length > 1 && multiDrawMode === 'perPool') {
    for (const poolId of poolIds) {
      const poolSongs = getPoolSongsFromStore(poolId)
      const filtered = getFilteredSongsForPool(poolSongs).filter((s) => !excludeIds?.has(s.id))
      const need = Math.max(1, perPoolCounts[poolId] || 1)
      const shuffled = shuffleSongs(filtered)
      result.push(...shuffled.slice(0, Math.min(need, shuffled.length)))
    }
    return result
  }

  const allSongs: Song[] = []
  for (const poolId of poolIds) {
    allSongs.push(...getFilteredSongsForPool(getPoolSongsFromStore(poolId)).filter((s) => !excludeIds?.has(s.id)))
  }
  const shuffled = shuffleSongs(allSongs)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

function SongBadge({ song, className }: { song: Song; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold text-white bg-gradient-to-b border',
        getDiffColor(song.difficulty),
        className
      )}
    >
      {getDiffCode(song.difficulty)} {song.level}
      {song.isPlus ? '+' : ''}
    </span>
  )
}

function MiniSongCard({ song, label }: { song: Song; label?: string }) {
  return (
    <div className="relative w-28 sm:w-32 aspect-[3/4] rounded-xl overflow-hidden border border-white/10 shadow-lg group flex-shrink-0">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 z-20" />
      <img
        src={song.cover}
        alt={song.name}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div
        className={cn(
          'absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white bg-gradient-to-b border',
          getDiffColor(song.difficulty)
        )}
      >
        {getDiffCode(song.difficulty)}
      </div>
      <div className="absolute top-6 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white bg-black/50 backdrop-blur-sm border border-white/10">
        Lv.{song.level}
        {song.isPlus ? '+' : ''}
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-2">
        {label && <p className="text-[9px] font-bold text-cyan-300 mb-0.5 truncate">{label}</p>}
        <p className="text-white text-[10px] font-bold leading-tight line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {song.name}
        </p>
      </div>
    </div>
  )
}

function ConnectionBadge() {
  const status = useSyncStatus()

  return (
    <button
      onClick={() => status !== 'connected' && reconnectSync()}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors',
        status === 'connected'
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
          : status === 'local-only'
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : 'bg-white/5 border-white/10 text-white/40'
      )}
      title={status === 'connected' ? '多设备在线' : '点击重连'}
    >
      {status === 'connected' ? <Wifi size={10} /> : status === 'local-only' ? <WifiOff size={10} /> : <Radio size={10} />}
      {status === 'connected' ? '在线同步' : status === 'local-only' ? '本地同步' : '连接中'}
    </button>
  )
}

function EmptyState() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center page-enter px-4">
      <div className="glass-panel rounded-3xl p-8 max-w-md w-full text-center">
        <Gavel size={48} className="mx-auto text-cyan-400 mb-4" />
        <h1 className="title-gradient text-2xl mb-2">裁判台</h1>
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

interface PlayerRowProps {
  player: TournamentPlayer
  selection: Song | null
  onScoreChange: (playerId: string, value: string) => void
  onDxScoreChange: (playerId: string, value: string) => void
  onToggleCheckIn: (playerId: string) => void
  locked?: boolean
}

function PlayerRow({ player, selection, onScoreChange, onDxScoreChange, onToggleCheckIn, locked }: PlayerRowProps) {
  return (
    <div className={cn(
      'p-3 rounded-xl border transition-colors',
      locked ? 'bg-white/[0.03] border-white/5' : 'bg-white/5 border-white/5 hover:border-white/10'
    )}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              'w-2 h-2 rounded-full flex-shrink-0',
              player.advanced ? 'bg-emerald-400' : player.eliminated ? 'bg-white/20' : 'bg-cyan-400'
            )}
          />
          <span className="text-sm font-medium text-white truncate">{player.name}</span>
          {player.seed ? (
            <span className="text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
              种子 {player.seed}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {locked && (
            <span className="text-[10px] text-white/40 flex items-center gap-1">
              <Lock size={12} />
              已锁定
            </span>
          )}
          <button
            onClick={() => !locked && onToggleCheckIn(player.id)}
            disabled={locked}
            className={cn(
              'p-1.5 rounded-lg transition-all flex-shrink-0',
              locked
                ? 'bg-white/5 text-white/20 cursor-not-allowed'
                : player.checkedIn
                  ? 'bg-emerald-500/20 text-emerald-400 press-down'
                  : 'bg-white/5 text-white/30 hover:text-white/60 press-down'
            )}
            title={player.checkedIn ? '已签到' : '未签到'}
          >
            {player.checkedIn ? <CheckCircle2 size={14} /> : <Circle size={14} />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.0001"
            value={player.score ?? ''}
            onChange={(e) => !locked && onScoreChange(player.id, e.target.value)}
            disabled={locked}
            placeholder="达成率"
            className={cn(
              'input-glass flex-1 min-w-0 px-2 py-1.5 text-xs',
              locked && 'opacity-50 cursor-not-allowed'
            )}
          />
          <input
            type="text"
            value={player.dxScore}
            onChange={(e) => !locked && onDxScoreChange(player.id, e.target.value)}
            disabled={locked}
            placeholder="DX分"
            className={cn(
              'input-glass flex-1 min-w-0 px-2 py-1.5 text-xs',
              locked && 'opacity-50 cursor-not-allowed'
            )}
          />
        </div>
        {selection ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 aspect-[3/4] rounded overflow-hidden border border-white/10 flex-shrink-0">
              <img src={selection.cover} alt={selection.name} className="w-full h-full object-cover" loading="lazy" />
            </div>
            <SongBadge song={selection} />
            <span className="text-[10px] text-white/50 truncate">{selection.name}</span>
          </div>
        ) : (
          <span className="text-[10px] text-white/30">未选曲</span>
        )}
      </div>
    </div>
  )
}

interface GroupCardProps {
  group: MatchGroup
  stageData: TournamentStageData
  selections: PlayerSelection[]
  index: number
  stage: string
  onScoreChange: (playerId: string, value: string) => void
  onDxScoreChange: (playerId: string, value: string) => void
  onToggleCheckIn: (playerId: string) => void
  onStatusChange?: (groupId: string, status: MatchGroupStatus) => void
}

const STATUS_OPTIONS: { value: MatchGroupStatus; label: string; color: string }[] = [
  { value: 'pending', label: '未开始', color: 'bg-white/10 text-white/60 border-white/10' },
  { value: 'playing', label: '进行中', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { value: 'completed', label: '已完成', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
]

function GroupCard({ group, stageData, selections, index, stage, onScoreChange, onDxScoreChange, onToggleCheckIn, onStatusChange }: GroupCardProps) {
  const groupPlayers = useMemo(
    () =>
      group.playerIds
        .map((pid) => stageData.players.find((p) => p.id === pid))
        .filter(Boolean) as TournamentPlayer[],
    [group, stageData]
  )

  return (
    <div className="glass-panel rounded-3xl p-4 hover-lift animate-fadeIn" style={{ animationDelay: `${index * 80}ms` }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {index + 1}
          </div>
          <h3 className="font-bold text-white truncate">{group.name}</h3>
          {stage !== 'n216' && group.completed && (
            <span className="text-[10px] text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
              <CheckCircle2 size={10} />
              已完成
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {stage === 'n216' && onStatusChange && (
            <div className="flex items-center rounded-lg bg-black/20 p-0.5 border border-white/5">
              {STATUS_OPTIONS.map((opt) => {
                const active = (group.status || 'pending') === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => onStatusChange(group.id, opt.value)}
                    className={cn(
                      'px-2 py-1 rounded-md text-[10px] font-bold transition-all border',
                      active ? opt.color : 'border-transparent text-white/40 hover:text-white/70'
                    )}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          )}
          <span className="text-white/40 text-xs font-rajdhani">{groupPlayers.length} 人</span>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {groupPlayers.map((player) => (
          <PlayerRow
            key={player.id}
            player={player}
            selection={getSongByPlayer(player.name, selections)}
            onScoreChange={onScoreChange}
            onDxScoreChange={onDxScoreChange}
            onToggleCheckIn={onToggleCheckIn}
            locked={group.completed}
          />
        ))}
      </div>

      {group.songs.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2 font-rajdhani">已同步到赛事的选曲</p>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {group.songs.map((s) =>
              s.song ? <MiniSongCard key={s.id} song={s.song} label={s.label} /> : null
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface PlayerTableProps {
  players: TournamentPlayer[]
  selections: PlayerSelection[]
  onScoreChange: (playerId: string, value: string) => void
  onDxScoreChange: (playerId: string, value: string) => void
  onToggleCheckIn: (playerId: string) => void
}

function PlayerTable({ players, selections, onScoreChange, onDxScoreChange, onToggleCheckIn }: PlayerTableProps) {
  if (players.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-8 text-center text-white/40 text-sm">当前阶段暂无选手</div>
    )
  }

  return (
    <>
      <div className="sm:hidden space-y-3">
        {players.map((player) => (
          <div key={player.id} className="glass-panel rounded-2xl p-3 animate-fadeIn">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    player.advanced ? 'bg-emerald-400' : player.eliminated ? 'bg-white/20' : 'bg-cyan-400'
                  )}
                />
                <span className="text-sm font-medium text-white truncate">{player.name}</span>
                {player.advanced && <span className="badge-success text-[9px]">晋级</span>}
                {player.eliminated && (
                  <span className="bg-white/10 text-white/50 px-1.5 py-0.5 rounded-full text-[9px]">淘汰</span>
                )}
              </div>
              <button
                onClick={() => onToggleCheckIn(player.id)}
                className={cn(
                  'p-1.5 rounded-lg transition-all press-down flex-shrink-0',
                  player.checkedIn ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/30 hover:text-white/60'
                )}
                title={player.checkedIn ? '已签到' : '未签到'}
              >
                {player.checkedIn ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              </button>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <input
                type="number"
                step="0.0001"
                value={player.score ?? ''}
                onChange={(e) => onScoreChange(player.id, e.target.value)}
                placeholder="达成率"
                className="input-glass flex-1 min-w-0 px-2 py-1.5 text-xs"
              />
              <input
                type="text"
                value={player.dxScore}
                onChange={(e) => onDxScoreChange(player.id, e.target.value)}
                placeholder="DX分"
                className="input-glass flex-1 min-w-0 px-2 py-1.5 text-xs"
              />
            </div>

            {getSongByPlayer(player.name, selections) ? (
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 aspect-[3/4] rounded overflow-hidden border border-white/10 flex-shrink-0">
                  <img
                    src={getSongByPlayer(player.name, selections)!.cover}
                    alt={getSongByPlayer(player.name, selections)!.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <SongBadge song={getSongByPlayer(player.name, selections)!} />
                <span className="text-[10px] text-white/60 truncate">
                  {getSongByPlayer(player.name, selections)!.name}
                </span>
              </div>
            ) : (
              <span className="text-[10px] text-white/30">未选曲</span>
            )}
          </div>
        ))}
      </div>

      <div className="hidden sm:block glass-panel rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 font-rajdhani text-xs uppercase tracking-wider text-white/40">状态</th>
                <th className="px-4 py-3 font-rajdhani text-xs uppercase tracking-wider text-white/40">选手</th>
                <th className="px-4 py-3 font-rajdhani text-xs uppercase tracking-wider text-white/40">签到</th>
                <th className="px-4 py-3 font-rajdhani text-xs uppercase tracking-wider text-white/40">比分</th>
                <th className="px-4 py-3 font-rajdhani text-xs uppercase tracking-wider text-white/40">DX分</th>
                <th className="px-4 py-3 font-rajdhani text-xs uppercase tracking-wider text-white/40">已选谱面</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {players.map((player) => {
                const selectedSong = getSongByPlayer(player.name, selections)
                return (
                  <tr key={player.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-3">
                      {player.advanced ? (
                        <span className="badge-success">晋级</span>
                      ) : player.eliminated ? (
                        <span className="bg-white/10 text-white/50 px-2 py-0.5 rounded-full text-[10px]">淘汰</span>
                      ) : (
                        <span className="badge-info">进行中</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{player.name}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onToggleCheckIn(player.id)}
                        className={cn(
                          'p-1.5 rounded-lg transition-all press-down',
                          player.checkedIn ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/30 hover:text-white/60'
                        )}
                        title={player.checkedIn ? '已签到' : '未签到'}
                      >
                        {player.checkedIn ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.0001"
                        value={player.score ?? ''}
                        onChange={(e) => onScoreChange(player.id, e.target.value)}
                        placeholder="-"
                        className="input-glass w-24 px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={player.dxScore}
                        onChange={(e) => onDxScoreChange(player.id, e.target.value)}
                        placeholder="-"
                        className="input-glass w-28 px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {selectedSong ? (
                        <div className="flex items-center gap-2">
                          <div className="w-12 aspect-[3/4] rounded-md overflow-hidden border border-white/10">
                            <img src={selectedSong.cover} alt={selectedSong.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <SongBadge song={selectedSong} />
                            <p className="text-[10px] text-white/50 truncate mt-0.5">{selectedSong.name}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-white/30 text-xs">未选曲</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function StageSongList({ songs, title }: { songs: StageSong[]; title: string }) {
  if (songs.length === 0) return null
  return (
    <div className="glass-panel rounded-3xl p-4">
      <h3 className="text-xs font-rajdhani uppercase tracking-wider text-white/40 mb-3 flex items-center gap-2">
        <Disc3 size={14} />
        {title}
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {songs.map((s) =>
          s.song ? <MiniSongCard key={s.id} song={s.song} label={s.label} /> : null
        )}
      </div>
    </div>
  )
}

function StageInstructions({ stage, groupsCount }: { stage: string; groupsCount: number }) {
  const { isCustomMode, customStages } = useTournamentStore()
  const rule = getStageRule(stage, isCustomMode ? customStages : undefined)
  if (!rule) return null

  const steps: string[] = []
  switch (rule.type) {
    case 'common-random':
      steps.push(
        '在「按规则同步曲库」中选择要使用的曲库（可多选并切换混合/按库模式）。',
        '点击「按阶段规则同步」抽取 2 首全组通用的课题曲，OBS 会自动展示。',
        '对局结束后在分组卡片内录入各选手达成率 / DX 分。',
        '确认分数无误后，在分组卡片右上角点击「已完成」锁定该组分数。',
        '本阶段所有分组均锁定后，由赛事面板（排行榜页）计算排名并锁定本阶段。'
      )
      break
    case 'random-per-group':
      steps.push(
        '选择曲库后，每点击一次「按阶段规则同步」会依次为下一组生成 3 首不重复随机曲。',
        'OBS 会自动展示当前同步的分组；顶部下拉框也会自动跟随，可手动切换分组。',
        '对局结束后先录入该组选手分数，再点击顶部「已完成」锁定分数编辑。',
        '本阶段所有分组均锁定后，由赛事面板（排行榜页）计算排名并锁定本阶段。'
      )
      break
    case 'four-self':
      steps.push(
        groupsCount > 0
          ? '在顶部分组下拉框中选择要操作的分组。'
          : '确认当前阶段有 4 名选手。',
        '等待该组 4 名选手在选曲页完成选曲。',
        '点击「同步到赛事」，OBS 会自动播放该组的展示动画（无需点击「按阶段规则同步」）。',
        '对局结束后先录入该组 4 名选手分数，再点击顶部「已完成」锁定。',
        '本阶段所有分组均锁定后，由赛事面板（排行榜页）计算排名并锁定本阶段。'
      )
      break
    case 'two-plus-two':
      steps.push(
        '选择曲库，点击「按阶段规则同步」为当前分组生成 2 首随机曲，OBS 会自动展示。',
        '选手完成 2 首选曲后，点击「同步到赛事」即可将自选插入同一分组，OBS 会自动展示完整 2+2 排列。',
        '对局结束后先录入该组 2 名选手分数，再点击顶部「已完成」锁定。',
        '本阶段所有分组均锁定后，由赛事面板（排行榜页）计算排名并锁定本阶段。'
      )
      break
  }

  return (
    <div className="glass-panel rounded-2xl p-4 animate-fadeIn">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={16} className="text-cyan-400" />
        <h2 className="text-sm font-bold text-white">
          {rule.label} 操作说明
          {groupsCount > 0 && <span className="ml-2 text-[10px] font-normal text-white/40">共 {groupsCount} 组</span>}
        </h2>
      </div>
      <ol className="space-y-2">
        {steps.map((step, idx) => (
          <li key={idx} className="flex items-start gap-2 text-xs text-white/70 leading-relaxed">
            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-bold mt-0.5">
              {idx + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function RefereePage() {
  const { showToast } = useToast()
  const tournament = useTournamentStore()
  const { stages, currentStage, isTournamentStarted, isCustomMode, customStages, updatePlayer, updatePlayerCheckIn, setGroupSongs, setStageSongs, setGroupCompleted, setGroupStatus } = tournament

  const playerSelections = useSongStore((state) => state.playerSelections)
  const setPlayerSelections = useSongStore((state) => state.setPlayerSelections)
  const activePoolId = useSongStore((state) => state.activePoolId)
  const songs = useSongStore((state) => state.songs)
  const songPools = useSongStore((state) => state.songPools)

  const [selectedPools, setSelectedPools] = useState<string[]>([activePoolId])
  const [multiDrawMode, setMultiDrawMode] = useState<'mixed' | 'perPool'>('mixed')
  const [perPoolCounts, setPerPoolCounts] = useState<Record<string, number>>({})
  const [obsGroupId, setObsGroupId] = useState<string | null>(null)
  const [ruleSyncGroupIndex, setRuleSyncGroupIndex] = useState(0)
  const [songsCollapsed, setSongsCollapsed] = useState(false)

  // 监听跨标签同步事件
  useEffect(() => {
    const unsubscribe = subscribeSyncEvents((event) => {
      if (event.type === 'playerSelections' && event.payload.selections) {
        setPlayerSelections(event.payload.selections as PlayerSelection[])
      }
      if (event.type === 'syncPlayers' && event.payload.players) {
        setPlayerSelections(event.payload.players as PlayerSelection[])
      }
    })
    return unsubscribe
  }, [setPlayerSelections])

  const stageData: TournamentStageData | null = stages[currentStage] || null
  const stageLabel = STAGE_LABELS[currentStage]

  const players = useMemo(() => stageData?.players || [], [stageData])
  const groups = useMemo(() => stageData?.groups || [], [stageData])
  const stageSongs = useMemo(() => stageData?.songs || [], [stageData])

  // 阶段切换时重置轮换索引
  useEffect(() => {
    setRuleSyncGroupIndex(0)
  }, [currentStage])

  // 分组存在时默认展示第一个分组；N进16 阶段只展示统一课题曲
  useEffect(() => {
    if (currentStage === 'n216') {
      setObsGroupId(null)
      return
    }
    if (groups.length > 0) {
      setObsGroupId((prev) => {
        const stillExists = prev ? groups.some((g) => g.id === prev) : false
        return stillExists ? prev : groups[0].id
      })
    } else {
      setObsGroupId(null)
    }
  }, [currentStage, groups])

  const availablePools = useMemo(
    () => [
      { id: 'main', name: '主库', count: songs.length },
      ...songPools.map((p) => ({ id: p.id, name: p.name, count: p.songs.length })),
    ],
    [songs.length, songPools]
  )

  const isMultiPool = selectedPools.length > 1

  const activePoolSummary = useMemo(() => {
    if (selectedPools.length === 0) return '未选择曲库'
    if (selectedPools.length === 1) {
      const pool = availablePools.find((p) => p.id === selectedPools[0])
      return pool?.name || '主库'
    }
    return `已选 ${selectedPools.length} 个曲库`
  }, [availablePools, selectedPools])

  const totalAvailableCount = useMemo(() => {
    return selectedPools.reduce((sum, poolId) => {
      const pool = availablePools.find((p) => p.id === poolId)
      return sum + (pool?.count || 0)
    }, 0)
  }, [availablePools, selectedPools])

  const nonRandomSelections = useMemo(
    () => playerSelections.filter((ps) => ps.song && !ps.playerId.startsWith('__random')),
    [playerSelections]
  )

  const handleScoreChange = useCallback(
    (playerId: string, value: string) => {
      const num = value === '' ? null : parseFloat(value)
      updatePlayer(currentStage, playerId, { score: num })
    },
    [currentStage, updatePlayer]
  )

  const handleDxScoreChange = useCallback(
    (playerId: string, value: string) => {
      updatePlayer(currentStage, playerId, { dxScore: value })
    },
    [currentStage, updatePlayer]
  )

  const toggleCheckIn = useCallback(
    (playerId: string) => {
      const player = players.find((p) => p.id === playerId)
      if (player) {
        updatePlayerCheckIn(currentStage, playerId, !player.checkedIn)
      }
    },
    [currentStage, players, updatePlayerCheckIn]
  )

  const togglePoolSelection = useCallback((poolId: string) => {
    setSelectedPools((prev) => {
      if (prev.includes(poolId)) {
        // 至少保留一个选中
        if (prev.length <= 1) return prev
        return prev.filter((id) => id !== poolId)
      }
      return [...prev, poolId]
    })
  }, [])

  const updatePerPoolCount = useCallback((poolId: string, value: number) => {
    setPerPoolCounts((prev) => ({ ...prev, [poolId]: Math.max(1, value) }))
  }, [])

  // 将 playerSelections 的选曲按 playerName 匹配回写到 tournament 分组/阶段
  const syncSelectionsToTournament = useCallback(() => {
    if (!stageData) return
    const selections = useSongStore.getState().playerSelections
    const validSelections = selections.filter((ps) => ps.song && !ps.playerId.startsWith('__random'))
    if (validSelections.length === 0) {
      showToast('暂无选手选曲可同步', 'info')
      return
    }

    const currentRule = getStageRule(currentStage, isCustomMode ? customStages : undefined)
    const is2Plus2 = currentRule?.type === 'two-plus-two'

    let syncedCount = 0

    if (is2Plus2) {
      const selfSelections = validSelections.slice(0, 2)
      if (selfSelections.length < 2) {
        showToast('半决赛/决赛 2+2 需要 2 首选曲', 'info')
        return
      }

      const build2Plus2 = (randomSongs: StageSong[]): StageSong[] => {
        const ordered = [...randomSongs].sort(
          (a, b) => ORDER_2PLUS2.indexOf(a.label) - ORDER_2PLUS2.indexOf(b.label)
        )
        return [
          { id: generateId('referee-2plus2'), song: selfSelections[0].song!, label: selfSelections[0].playerName },
          { id: generateId('referee-2plus2'), song: ordered[0].song!, label: ordered[0].label },
          { id: generateId('referee-2plus2'), song: selfSelections[1].song!, label: selfSelections[1].playerName },
          { id: generateId('referee-2plus2'), song: ordered[1].song!, label: ordered[1].label },
        ]
      }

      if (groups.length > 0) {
        const targetGroup = obsGroupId
          ? groups.find((g) => g.id === obsGroupId) || groups[ruleSyncGroupIndex % groups.length]
          : groups[ruleSyncGroupIndex % groups.length]
        if (!targetGroup) {
          showToast('未找到目标分组', 'info')
          return
        }
        const existingRandomSongs = (targetGroup.songs || []).filter((s) => isRandomLabel(s.label))
        if (existingRandomSongs.length < 2) {
          showToast(`${targetGroup.name} 尚未生成随机曲，请先按阶段规则同步`, 'info')
          return
        }
        const arranged = build2Plus2(existingRandomSongs)
        setGroupSongs(currentStage, targetGroup.id, arranged)
        broadcastSyncEvent('stageSongs', {
          stage: currentStage,
          groupId: targetGroup.id,
          songs: arranged.map((s) => ({ song: s.song, label: s.label })),
        })
        setObsGroupId(targetGroup.id)
        syncedCount += arranged.length
      } else {
        const existingRandomSongs = (stageData.songs || []).filter((s) => isRandomLabel(s.label))
        if (existingRandomSongs.length < 2) {
          showToast('尚未生成随机曲，请先按阶段规则同步', 'info')
          return
        }
        const arranged = build2Plus2(existingRandomSongs)
        setStageSongs(currentStage, arranged)
        broadcastSyncEvent('stageSongs', {
          stage: currentStage,
          songs: arranged.map((s) => ({ song: s.song, label: s.label })),
        })
        syncedCount += arranged.length
      }

      if (syncedCount > 0) {
        showToast('2+2 自选已插入，可点击展示用曲发送到 OBS', 'success')
      }
      return
    }

    if (groups.length > 0) {
      groups.forEach((group) => {
        const groupPlayerNames = new Set(
          group.playerIds
            .map((pid) => stageData.players.find((p) => p.id === pid)?.name)
            .filter(Boolean) as string[]
        )
        const existingRandomSongs = (group.songs || []).filter((s) => isRandomLabel(s.label))
        const playerSongs: StageSong[] = validSelections
          .filter((p) => groupPlayerNames.has(p.playerName))
          .map((p) => ({
            id: generateId('referee-group'),
            song: p.song!,
            label: p.playerName,
          }))

        const groupSongs = sortStageSongs([...playerSongs, ...existingRandomSongs])

        if (groupSongs.length > 0) {
          setGroupSongs(currentStage, group.id, groupSongs)
          broadcastSyncEvent('stageSongs', {
            stage: currentStage,
            groupId: group.id,
            songs: groupSongs.map((s) => ({ song: s.song, label: s.label })),
          })
          syncedCount += groupSongs.length
        }
      })
    } else {
      const existingRandomSongs = (stageData.songs || []).filter((s) => isRandomLabel(s.label))
      const playerSongs: StageSong[] = validSelections.map((p) => ({
        id: generateId('referee-stage'),
        song: p.song!,
        label: p.playerName,
      }))

      const stageSongs = sortStageSongs([...playerSongs, ...existingRandomSongs])

      if (stageSongs.length > 0) {
        setStageSongs(currentStage, stageSongs)
        broadcastSyncEvent('stageSongs', {
          stage: currentStage,
          songs: stageSongs.map((s) => ({ song: s.song, label: s.label })),
        })
        syncedCount = stageSongs.length
      }
    }

    if (syncedCount > 0) {
      showToast(`已同步 ${syncedCount} 首选曲到赛事`, 'success')
    } else {
      showToast('未找到可匹配的选曲', 'info')
    }
  }, [currentStage, groups, showToast, stageData, setGroupSongs, setStageSongs, obsGroupId, setObsGroupId, ruleSyncGroupIndex])

  // 按当前阶段规则自动同步用曲
  const syncByStageRule = useCallback(() => {
    if (!stageData) return
    const rule = getStageRule(currentStage, isCustomMode ? customStages : undefined)
    if (!rule) {
      showToast('当前阶段未配置规则，请使用手动同步', 'info')
      return
    }

    switch (rule.type) {
      case 'common-random': {
        const songs = drawFreshRandomSongs(selectedPools, multiDrawMode, perPoolCounts, rule.randomPerGroup)
        if (songs.length === 0) {
          showToast('曲库不足，无法抽取课题曲', 'info')
          return
        }
        if (songs.length < rule.randomPerGroup) {
          showToast(`曲库不足，仅抽到 ${songs.length}/${rule.randomPerGroup} 首课题曲`, 'info')
        }
        const stageSongs: StageSong[] = songs.map((song, idx) => ({
          id: generateId('referee-rule'),
          song,
          label: `课题曲${idx + 1}`,
        }))
        setStageSongs(currentStage, stageSongs)
        broadcastSyncEvent('stageSongs', {
          stage: currentStage,
          songs: stageSongs.map((s) => ({ song: s.song, label: s.label })),
        })
        showToast('N进16 课题曲已同步到赛事', 'success')
        break
      }

      case 'random-per-group': {
        const usedIds = new Set(
          groups.flatMap((g) => g.songs.map((s) => s.song?.id).filter((id): id is string => !!id))
        )
        const songs = drawFreshRandomSongs(
          selectedPools,
          multiDrawMode,
          perPoolCounts,
          rule.randomPerGroup,
          usedIds
        )
        if (songs.length === 0) {
          showToast('曲库不足，无法抽取随机曲', 'info')
          return
        }
        if (songs.length < rule.randomPerGroup) {
          showToast(`曲库不足，仅抽到 ${songs.length}/${rule.randomPerGroup} 首不重复曲目`, 'info')
        }

        const groupSongs: StageSong[] = songs.map((song, idx) => ({
          id: generateId('referee-rule'),
          song,
          label: `课题曲${idx + 1}`,
        }))

        if (groups.length > 0) {
          const targetIndex = ruleSyncGroupIndex % groups.length
          const targetGroup = groups[targetIndex]
          setGroupSongs(currentStage, targetGroup.id, groupSongs)
          broadcastSyncEvent('stageSongs', {
            stage: currentStage,
            groupId: targetGroup.id,
            songs: groupSongs.map((s) => ({ song: s.song, label: s.label })),
          })
          setRuleSyncGroupIndex((prev) => (prev + 1) % groups.length)
          setObsGroupId(targetGroup.id)
          showToast(`16进8 ${targetGroup.name} 随机曲已同步`, 'success')
        } else {
          setStageSongs(currentStage, groupSongs)
          broadcastSyncEvent('stageSongs', {
            stage: currentStage,
            songs: groupSongs.map((s) => ({ song: s.song, label: s.label })),
          })
          showToast('16进8 随机曲已同步', 'success')
        }
        break
      }

      case 'four-self': {
        const selfSelections = nonRandomSelections.slice(0, 4)
        if (selfSelections.length < 4) {
          showToast(`8进4 需要 4 首选曲，当前只有 ${selfSelections.length} 首`, 'info')
          return
        }
        const stageSongs: StageSong[] = selfSelections.map((p, idx) => ({
          id: generateId('referee-rule'),
          song: p.song!,
          label: `自选${idx + 1}`,
        }))
        setStageSongs(currentStage, stageSongs)
        broadcastSyncEvent('stageSongs', {
          stage: currentStage,
          songs: stageSongs.map((s) => ({ song: s.song, label: s.label })),
        })
        showToast('8进4 四首选曲已同步', 'success')
        break
      }

      case 'two-plus-two': {
        const randomSongs = drawFreshRandomSongs(selectedPools, multiDrawMode, perPoolCounts, 2)
        if (randomSongs.length < 2) {
          showToast('需要至少 2 首随机曲才能生成 2+2', 'info')
          return
        }
        const randomStageSongs: StageSong[] = [
          { id: generateId('referee-random'), song: randomSongs[0], label: '随机1' },
          { id: generateId('referee-random'), song: randomSongs[1], label: '随机2' },
        ]
        const withoutRandom = playerSelections.filter((ps) => !ps.playerId.startsWith('__random'))
        setPlayerSelections([
          ...withoutRandom,
          { playerId: RANDOM_PLAYER_ID_1, playerName: '随机1', song: randomSongs[0] },
          { playerId: RANDOM_PLAYER_ID_2, playerName: '随机2', song: randomSongs[1] },
        ])
        broadcastSyncEvent('playerSelections', {
          selections: [
            ...withoutRandom,
            { playerId: RANDOM_PLAYER_ID_1, playerName: '随机1', song: randomSongs[0] },
            { playerId: RANDOM_PLAYER_ID_2, playerName: '随机2', song: randomSongs[1] },
          ],
        })
        if (groups.length > 0) {
          const targetIndex = ruleSyncGroupIndex % groups.length
          const targetGroup = groups[targetIndex]
          setGroupSongs(currentStage, targetGroup.id, randomStageSongs)
          broadcastSyncEvent('stageSongs', {
            stage: currentStage,
            groupId: targetGroup.id,
            songs: randomStageSongs.map((s) => ({ song: s.song, label: s.label })),
          })
          setRuleSyncGroupIndex((prev) => (prev + 1) % groups.length)
          setObsGroupId(targetGroup.id)
        } else {
          setStageSongs(currentStage, randomStageSongs)
          broadcastSyncEvent('stageSongs', {
            stage: currentStage,
            songs: randomStageSongs.map((s) => ({ song: s.song, label: s.label })),
          })
        }
        showToast(`${rule.label} 随机曲已生成并发送到 OBS，请同步自选后再次展示`, 'success')
        break
      }
    }
  }, [
    currentStage,
    groups,
    multiDrawMode,
    nonRandomSelections,
    perPoolCounts,
    playerSelections,
    ruleSyncGroupIndex,
    selectedPools,
    setGroupSongs,
    setObsGroupId,
    setPlayerSelections,
    setRuleSyncGroupIndex,
    setStageSongs,
    showToast,
    stageData,
  ])

  // 发送当前阶段/分组的赛事用曲到 OBS
  const sendStageSongsToOBS = useCallback(() => {
    if (!stageData) return

    let sourceSongs: StageSong[] = []
    let sourceName = '阶段通用曲目'

    if (obsGroupId) {
      const group = groups.find((g) => g.id === obsGroupId)
      if (group) {
        sourceSongs = group.songs
        sourceName = group.name
      }
    }

    if (sourceSongs.length === 0) {
      sourceSongs = stageData.songs
      sourceName = '阶段通用曲目'
    }

    const valid = sourceSongs.filter((s) => s.song)
    if (valid.length === 0) {
      showToast('当前没有可展示的赛事用曲', 'info')
      return
    }

    broadcastSyncEvent('multiSelect', {
      songs: valid.map((s) => ({
        playerId: s.label,
        playerName: s.label,
        song: s.song,
        label: s.label,
      })),
    })
    showToast(`已发送「${sourceName}」到 OBS 展示`, 'success')
  }, [groups, obsGroupId, showToast, stageData])

  // 清除当前阶段/分组的赛事用曲
  const clearStageSongs = useCallback(() => {
    if (!stageData) return

    if (obsGroupId) {
      const group = groups.find((g) => g.id === obsGroupId)
      if (!group) {
        showToast('未找到要清除的分组', 'info')
        return
      }
      setGroupSongs(currentStage, obsGroupId, [])
      broadcastSyncEvent('stageSongs', {
        stage: currentStage,
        groupId: obsGroupId,
        songs: [],
      })
      showToast(`已清除 ${group.name} 的用曲`, 'success')
    } else {
      setStageSongs(currentStage, [])
      broadcastSyncEvent('stageSongs', {
        stage: currentStage,
        songs: [],
      })
      showToast('已清除阶段通用用曲', 'success')
    }

    broadcastSyncEvent('clear', {})
  }, [currentStage, groups, obsGroupId, setGroupSongs, setStageSongs, showToast, stageData])

  // N进16 分组对局状态切换
  const handleGroupStatusChange = useCallback(
    (groupId: string, status: MatchGroupStatus) => {
      setGroupStatus(currentStage, groupId, status)
      const labels: Record<MatchGroupStatus, string> = {
        pending: '未开始',
        playing: '进行中',
        completed: '已完成',
      }
      const group = groups.find((g) => g.id === groupId)
      showToast(`${group?.name ?? '分组'} 已设为「${labels[status]}」`, 'success')
    },
    [currentStage, groups, setGroupStatus, showToast]
  )

  // 将当前分组发送到场间展示页
  const showUpcomingForGroup = useCallback(() => {
    if (!obsGroupId) {
      showToast('请先选择要展示的分组', 'info')
      return
    }
    broadcastSyncEvent('upcoming', { stage: currentStage, groupId: obsGroupId })
    const group = groups.find((g) => g.id === obsGroupId)
    showToast(group ? `已发送「${group.name}」到场间展示` : '已发送上场展示', 'success')
  }, [currentStage, groups, obsGroupId, showToast])

  // 切换当前分组对局完成状态
  const toggleGroupCompleted = useCallback(() => {
    if (!obsGroupId) {
      showToast('请先选择要标记的分组', 'info')
      return
    }
    const group = groups.find((g) => g.id === obsGroupId)
    if (!group) return
    const next = !group.completed
    setGroupCompleted(currentStage, obsGroupId, next)
    showToast(`${group.name} 已标记为${next ? '已完成' : '未完成'}`, 'success')
  }, [currentStage, groups, obsGroupId, setGroupCompleted, showToast])

  const currentGroup = groups.find((g) => g.id === obsGroupId)
  const isCurrentGroupCompleted = currentGroup?.completed ?? false

  if (!isTournamentStarted || !stageData) {
    return <EmptyState />
  }

  return (
    <div className="min-h-screen flex flex-col page-enter">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/10">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500" />
        <div className="relative z-10 max-w-7xl mx-auto px-3 py-2.5 sm:px-4 sm:py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Gavel size={20} className="text-white" />
              </div>
              <div>
                <h1 className="title-gradient text-xl sm:text-2xl">裁判台</h1>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="font-rajdhani text-[11px] uppercase tracking-wider text-white/40">{stageLabel}</span>
                  {(() => {
                    const rule = getStageRule(currentStage, isCustomMode ? customStages : undefined)
                    if (!rule) return null
                    const isRandomPerGroup = rule.type === 'random-per-group' && groups.length > 0
                    const nextGroup = isRandomPerGroup ? groups[ruleSyncGroupIndex % groups.length] : null
                    return (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-200"
                        title={rule.description}
                      >
                        {rule.description}
                        {nextGroup && ` · 下组：${nextGroup.name}`}
                      </span>
                    )
                  })()}
                  <span className="badge-info text-[10px]">{players.length} 人</span>
                  {groups.length > 0 && <span className="badge-info text-[10px]">{groups.length} 组</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <ConnectionBadge />
              {(() => {
                const rule = getStageRule(currentStage, isCustomMode ? customStages : undefined)
                if (rule?.type === 'four-self') return null
                return (
                  <button onClick={syncByStageRule} className="btn-primary press-down btn-shimmer">
                    <Zap size={14} />
                    <span className="hidden sm:inline">按阶段规则同步</span>
                    <span className="sm:hidden">阶段同步</span>
                  </button>
                )
              })()}
              {currentStage !== 'n216' && groups.length > 0 && (
                <select
                  value={obsGroupId || ''}
                  onChange={(e) => setObsGroupId(e.target.value || null)}
                  className="h-9 px-2 rounded-xl bg-white/5 border border-white/10 text-white/80 text-xs focus:outline-none focus:border-white/20"
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              )}
              <button onClick={sendStageSongsToOBS} className="btn-secondary press-down" title="发送赛事用曲到 OBS">
                <Eye size={14} />
                <span className="hidden sm:inline">展示用曲</span>
              </button>
              <button
                onClick={clearStageSongs}
                className="btn-secondary press-down text-rose-300 hover:text-rose-200"
                title="清除当前分组/阶段用曲"
              >
                <Trash2 size={14} />
                <span className="hidden sm:inline">清除用曲</span>
              </button>
              {currentStage !== 'n216' && groups.length > 0 && (
                <>
                  <button
                    onClick={showUpcomingForGroup}
                    className="btn-secondary press-down text-cyan-300 hover:text-cyan-200"
                    title="发送当前分组到场间展示页"
                  >
                    <MonitorPlay size={14} />
                    <span className="hidden sm:inline">展示该组上场</span>
                  </button>
                  <button
                    onClick={toggleGroupCompleted}
                    className={cn(
                      'btn-secondary press-down',
                      isCurrentGroupCompleted
                        ? 'text-emerald-300 hover:text-emerald-200'
                        : 'text-white/60 hover:text-white/80'
                    )}
                    title="标记该组对局是否完成"
                  >
                    {isCurrentGroupCompleted ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    <span className="hidden sm:inline">
                      {isCurrentGroupCompleted ? '已完成' : '未完成'}
                    </span>
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  window.history.pushState({}, '', '/')
                  window.location.reload()
                }}
                className="btn-secondary press-down"
              >
                <ArrowLeft size={14} />
                <span className="hidden sm:inline">返回</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <StageInstructions stage={currentStage} groupsCount={groups.length} />

        {/* 选曲与随机曲操作面板 */}
        <section className="glass-panel rounded-3xl p-4 sm:p-5 animate-fadeIn">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-amber-400" />
              <h2 className="text-lg font-bold text-white">选曲与随机曲同步</h2>
            </div>
            {(() => {
              const rule = getStageRule(currentStage, isCustomMode ? customStages : undefined)
              if (!rule) return null
              return (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-white/40">当前阶段规则</span>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-200">
                    {rule.description}
                  </span>
                </div>
              )
            })()}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 已选曲预览 */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users size={14} className="text-cyan-400" />
                  已选曲选手
                  <span className="text-[10px] text-white/40 font-normal">({nonRandomSelections.length})</span>
                </h3>
                <button onClick={syncSelectionsToTournament} className="btn-primary text-xs px-2.5 py-1.5 press-down btn-shimmer">
                  <Save size={12} />
                  同步到赛事
                </button>
              </div>

              {nonRandomSelections.length === 0 ? (
                <div className="text-center py-6 text-white/30 text-xs">暂无选手选曲，请在选曲页分配</div>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto scrollbar-thin pr-1">
                  {nonRandomSelections.map((ps) =>
                    ps.song ? (
                      <div
                        key={ps.playerId}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10"
                      >
                        <span className="text-xs text-white/70 truncate max-w-[80px]">{ps.playerName}</span>
                        <SongBadge song={ps.song} />
                      </div>
                    ) : null
                  )}
                </div>
              )}
            </div>

            {/* 按规则同步曲库选择 */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database size={14} className="text-violet-400" />
                  按规则同步曲库
                  <span className="text-[10px] text-white/40 font-normal">
                    ({activePoolSummary} · {totalAvailableCount} 张)
                  </span>
                </h3>
                {selectedPools.length > 1 && (
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10">
                    <button
                      onClick={() => setMultiDrawMode('mixed')}
                      className={cn(
                        'px-2 py-0.5 rounded-md text-[10px] transition-colors',
                        multiDrawMode === 'mixed' ? 'bg-violet-500/30 text-violet-200' : 'text-white/40 hover:text-white/70'
                      )}
                    >
                      混合
                    </button>
                    <button
                      onClick={() => setMultiDrawMode('perPool')}
                      className={cn(
                        'px-2 py-0.5 rounded-md text-[10px] transition-colors',
                        multiDrawMode === 'perPool' ? 'bg-violet-500/30 text-violet-200' : 'text-white/40 hover:text-white/70'
                      )}
                    >
                      按库
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[10px] text-white/40 mb-3">
                以下曲库将用于「按阶段规则同步」中的随机曲/课题曲抽取（N进16、16进8、半决赛、决赛）。
              </p>

              <div className="space-y-1.5">
                {availablePools.map((pool) => {
                  const selected = selectedPools.includes(pool.id)
                  return (
                    <div
                      key={pool.id}
                      className={cn(
                        'flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition-colors',
                        selected
                          ? 'bg-violet-500/10 border-violet-500/30 text-white'
                          : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/[0.07]'
                      )}
                    >
                      <button
                        onClick={() => togglePoolSelection(pool.id)}
                        className="flex items-center gap-2 flex-1 text-left"
                      >
                        <div
                          className={cn(
                            'w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors',
                            selected
                              ? 'bg-violet-500 border-violet-500'
                              : 'border-white/20'
                          )}
                        >
                          {selected && <CheckCircle2 size={10} className="text-white" />}
                        </div>
                        <span className={cn('truncate', selected && 'text-violet-200')}>{pool.name}</span>
                        <span className="text-[10px] text-white/30">{pool.count} 张</span>
                      </button>

                      {selectedPools.length > 1 && multiDrawMode === 'perPool' && selected && (
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => updatePerPoolCount(pool.id, (perPoolCounts[pool.id] || 1) - 1)}
                            className="w-5 h-5 rounded flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/50"
                          >
                            -
                          </button>
                          <span className="w-4 text-center text-[10px] tabular-nums">
                            {perPoolCounts[pool.id] || 1}
                          </span>
                          <button
                            onClick={() => updatePerPoolCount(pool.id, (perPoolCounts[pool.id] || 1) + 1)}
                            className="w-5 h-5 rounded flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/50"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {isMultiPool && (
                <div className="mt-3 text-[10px] text-white/30">
                  {multiDrawMode === 'mixed'
                    ? '混合模式：从所有选中曲库合并后随机抽取'
                    : '按库模式：分别从每个选中曲库抽取指定数量'}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 阶段/分组用曲概览 */}
        {(stageSongs.length > 0 || (currentStage !== 'n216' && groups.some((g) => g.songs.length > 0))) && (
          <section className="animate-fadeIn">
            <button
              onClick={() => setSongsCollapsed((c) => !c)}
              className="flex items-center gap-2 mb-4 group"
              title={songsCollapsed ? '展开赛事用曲' : '折叠赛事用曲'}
            >
              <Disc3 size={18} className="text-cyan-400" />
              <h2 className="text-lg font-bold text-white">赛事用曲</h2>
              {songsCollapsed ? (
                <ChevronDown size={18} className="text-white/40 group-hover:text-white/70 transition-colors" />
              ) : (
                <ChevronUp size={18} className="text-white/40 group-hover:text-white/70 transition-colors" />
              )}
            </button>
            {!songsCollapsed && (
              <>
                {stageSongs.length > 0 && <StageSongList songs={stageSongs} title="阶段通用曲目" />}
                {currentStage !== 'n216' &&
                  groups.map(
                    (group) =>
                      group.songs.length > 0 && (
                        <div key={group.id} className="mt-4">
                          <StageSongList songs={group.songs} title={group.name} />
                        </div>
                      )
                  )}
              </>
            )}
          </section>
        )}

        {/* 分组对阵 */}
        <section className="animate-fadeIn">
          <div className="flex items-center gap-2 mb-4">
            <Swords size={18} className="text-violet-400" />
            <h2 className="text-lg font-bold text-white">分组对阵</h2>
          </div>

          {groups.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {groups.map((group, idx) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  stageData={stageData}
                  selections={playerSelections}
                  index={idx}
                  stage={currentStage}
                  onScoreChange={handleScoreChange}
                  onDxScoreChange={handleDxScoreChange}
                  onToggleCheckIn={toggleCheckIn}
                  onStatusChange={currentStage === 'n216' ? handleGroupStatusChange : undefined}
                />
              ))}
            </div>
          ) : (
            <PlayerTable
              players={players}
              selections={playerSelections}
              onScoreChange={handleScoreChange}
              onDxScoreChange={handleDxScoreChange}
              onToggleCheckIn={toggleCheckIn}
            />
          )}
        </section>
      </main>
    </div>
  )
}
