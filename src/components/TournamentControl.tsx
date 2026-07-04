import { useState, useEffect, useRef, useCallback } from 'react'
import {
  useTournamentStore,
  type TournamentStage,
  type CustomStageConfig,
  type TournamentTemplate,
  STAGE_LABELS,
  STAGE_ORDER,
  STAGE_ADVANCE_COUNT,
} from '@/store/tournamentStore'
import { useToast } from '@/components/Toast'
import { QRCodeSVG } from 'qrcode.react'
import { Trophy, Lock, Unlock, ChevronRight, RotateCcw, Save, Users, Download, Upload, Clock, History, Trash2, Eye, X, LayoutList, Plus, Minus, Hash, FolderOpen, Edit3, QrCode, Music, Swords, Shuffle, Undo2, Wifi, WifiOff, Timer } from 'lucide-react'
import { getConnectionStatus } from '@/utils/tabSync'
import { cn } from '@/lib/utils'

export default function TournamentControl() {
  const { showToast } = useToast()
  const {
    stages,
    currentStage,
    isTournamentStarted,
    isCustomMode,
    customStages,
    previewRankings,
    rankingSnapshots,
    updatePlayer,
    updatePlayerCheckIn,
    removePlayer,
    addPlayer,
    addPlayers,
    clearPlayers,
    toggleStageLock,
    calculateRankingsPreview,
    clearPreviewRankings,
    commitRankings,
    undoRankings,
    resetTournament,
    startTournament,
    setCurrentStage,
    broadcastTournamentData,
    exportTournamentData,
    importTournamentData,
    saveToHistory,
    loadHistory,
    deleteHistoryRecord,
    clearHistory,
    timerRunning,
    timerSeconds,
    timerLabel,
    startTimer,
    stopTimer,
    resetTimer,
    setCustomMode,
    setCustomStages,
    setPlayerSeed,
    applySeeding,
    autoUpdateSeedsFromRankings,
    saveTemplate,
    loadTemplate,
    deleteTemplate,
    getTemplates,
    createGroupsN216,
    createGroups16to8,
    shuffleGroups8to4,
    createGroupsSemi,
  } = useTournamentStore()

  const [playerNameInput, setPlayerNameInput] = useState('')
  const [bulkNameInput, setBulkNameInput] = useState('')
  const [useBulkMode, setUseBulkMode] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [timerInputMin, setTimerInputMin] = useState(0)
  const [timerInputSec, setTimerInputSec] = useState(0)
  const [timerCustomLabel] = useState('')
  const [checkinNames, setCheckinNames] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tournament-checkin-names')
      if (saved) return JSON.parse(saved)
    } catch { /* ignore */ }
    return []
  })
  const [showCheckInPanel, setShowCheckInPanel] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Custom stage editor state
  const [editingStages, setEditingStages] = useState<CustomStageConfig[]>([])
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [templates, setTemplates] = useState<TournamentTemplate[]>([])
  const [templateNameInput, setTemplateNameInput] = useState('')
  const [showCustomStageEditor, setShowCustomStageEditor] = useState(false)

  // 弹窗 Escape 关闭
  useEffect(() => {
    if (!showCustomStageEditor && !showTemplateManager && !showCheckInPanel) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setShowCustomStageEditor(false)
      setShowTemplateManager(false)
      setShowCheckInPanel(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showCustomStageEditor, showTemplateManager, showCheckInPanel])

  // 同步连接状态
  const [connStatus, setConnStatus] = useState<'connected' | 'connecting' | 'local-only'>(
    getConnectionStatus() as 'connected' | 'connecting' | 'local-only'
  )
  useEffect(() => {
    const id = setInterval(() => {
      setConnStatus(getConnectionStatus() as 'connected' | 'connecting' | 'local-only')
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Timer tick effect
  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        useTournamentStore.getState().tickTimer()
      }, 1000)
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [timerRunning])

  // 加载模板列表
  useEffect(() => {
    if (showTemplateManager) {
      setTemplates(getTemplates())
    }
  }, [showTemplateManager, getTemplates])

  // 同步自定义阶段编辑状态
  useEffect(() => {
    setEditingStages(customStages)
  }, [customStages])

  const checkinChannelRef = useRef<WebSocket | null>(null)

  // Listen for check-in events from WebSocket server
  useEffect(() => {
    const isHttps = window.location.protocol === 'https:'
    const protocol = isHttps ? 'wss://' : 'ws://'
    const wsUrl = `${protocol}${window.location.hostname}:8765`

    const connectWs = () => {
      const ws = new WebSocket(wsUrl)
      checkinChannelRef.current = ws

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string)
          if (data.type === 'checkin' && data.name) {
            const name = data.name as string
            setCheckinNames(prev => {
              if (prev.includes(name)) return prev
              return [...prev, name]
            })
            // 自动标记已存在的选手为已签到
            const normalized = name.trim().toLowerCase()
            const player = stages.n216.players.find(
              (p) => p.name.trim().toLowerCase() === normalized
            )
            if (player) {
              updatePlayerCheckIn('n216', player.id, true)
            }
          }
        } catch {
          // ignore invalid messages
        }
      }

      ws.onclose = () => {
        // Reconnect after 5s if tournament hasn't started
        setTimeout(connectWs, 5000)
      }
    }

    connectWs()

    return () => {
      checkinChannelRef.current?.close()
      checkinChannelRef.current = null
    }
  }, [])

  // 持久化签到名单
  useEffect(() => {
    try {
      localStorage.setItem('tournament-checkin-names', JSON.stringify(checkinNames))
    } catch { /* ignore */ }
  }, [checkinNames])

  const handleStartTournament = () => {
    const n216Players = stages.n216.players
    if (n216Players.length === 0) {
      showToast('请至少为 N进16 添加选手', 'error')
      return
    }
    startTournament(['n216'])
    showToast('赛事已开始！', 'success')
  }

  const handleBulkAddPlayers = () => {
    const names = bulkNameInput
      .split('\n')
      .map((n) => n.trim())
      .filter((n) => n.length > 0)
    if (names.length === 0) return
    addPlayers(currentStage, names)
    setBulkNameInput('')
  }

  const handleAddSinglePlayer = () => {
    const name = playerNameInput.trim()
    if (!name) return
    addPlayer(currentStage, name)
    setPlayerNameInput('')
  }

  const handleScoreChange = (playerId: string, value: string) => {
    if (value === '') {
      updatePlayer(currentStage, playerId, { score: null })
      return
    }
    const num = parseFloat(value)
    if (!isNaN(num) && num >= 0 && num <= 500) {
      updatePlayer(currentStage, playerId, { score: num })
    }
  }

  const handlePreviewRankings = () => {
    calculateRankingsPreview(currentStage)
  }

  const handleCommitRankings = () => {
    commitRankings(currentStage)
    showToast('排名已锁定并晋级！', 'success')
  }

  const handleUndoRankings = () => {
    if (confirm('确定要撤销本次排名计算吗？当前阶段与下一阶段的数据将恢复到计算前状态。')) {
      undoRankings(currentStage)
      showToast('已撤销排名计算', 'info')
    }
  }

  const handleCancelPreview = () => {
    clearPreviewRankings(currentStage)
  }

  const handleBroadcast = () => {
    broadcastTournamentData()
  }

  const handleReset = () => {
    if (confirm('确定要重置整个赛事吗？所有数据将被清除。')) {
      resetTournament()
    }
  }

  const handleNextStage = () => {
    const stageIdx = STAGE_ORDER.indexOf(currentStage)
    const nextStage = STAGE_ORDER[stageIdx + 1]
    if (nextStage) {
      setCurrentStage(nextStage as TournamentStage)
    }
  }

  // Export tournament data as JSON file
  const handleExport = () => {
    const json = exportTournamentData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tournament-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Import tournament data from JSON file
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const json = ev.target?.result as string
        importTournamentData(json)
        showToast('导入成功！', 'success')
      } catch {
        showToast('导入失败，文件格式不正确', 'error')
      }
    }
    reader.readAsText(file)
    // Reset input
    e.target.value = ''
  }

  // Save to history
  const handleSaveHistory = () => {
    saveToHistory()
    showToast('已保存到历史记录！', 'success')
  }

  // Handle timer start
  const handleStartTimer = () => {
    const totalSeconds = timerInputMin * 60 + timerInputSec
    if (totalSeconds <= 0) return
    startTimer(timerCustomLabel || '计时', totalSeconds)
  }

  // 打开独立倒计时同步屏
  const openCountdownDisplay = () => {
    const base = window.location.origin + window.location.pathname.replace(/\/$/, '')
    window.open(`${base}/countdown`, 'countdownDisplay', 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no')
  }

  // Format seconds to mm:ss
  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }, [])

  // 获取当前阶段晋级人数（支持自定义阶段）
  const getAdvanceCount = (stage: string): number => {
    const custom = customStages.find((c) => c.id === stage)
    if (custom) return custom.advanceCount
    return STAGE_ADVANCE_COUNT[stage as TournamentStage] ?? 0
  }

  // 获取当前阶段显示名称（支持自定义阶段）
  const getStageLabel = (stage: string): string => {
    const custom = customStages.find((c) => c.id === stage)
    if (custom) return custom.name
    return STAGE_LABELS[stage as TournamentStage] ?? stage
  }

  // ========== 自定义阶段编辑器操作 ==========

  const handleAddCustomStage = () => {
    const newStage: CustomStageConfig = {
      id: `custom-stage-${Date.now()}`,
      name: `新阶段 ${editingStages.length + 1}`,
      playerCount: 16,
      advanceCount: 8,
    }
    setEditingStages([...editingStages, newStage])
  }

  const handleRemoveCustomStage = (id: string) => {
    setEditingStages(editingStages.filter((s) => s.id !== id))
  }

  const handleUpdateCustomStage = (id: string, field: keyof CustomStageConfig, value: string | number) => {
    setEditingStages(editingStages.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
  }

  const handleSaveCustomStages = () => {
    // 验证：每个阶段的 advanceCount 必须 <= playerCount
    const invalid = editingStages.find((s) => s.advanceCount > s.playerCount || s.playerCount <= 0 || s.advanceCount <= 0)
    if (invalid) {
      showToast(`阶段 "${invalid.name}" 配置无效：晋级人数必须 ≤ 参赛人数，且都必须 > 0`, 'error')
      return
    }
    setCustomStages(editingStages)
    setShowCustomStageEditor(false)
    showToast('自定义赛制已保存！', 'success')
  }

  const handleCancelCustomStageEdit = () => {
    setEditingStages(customStages)
    setShowCustomStageEditor(false)
  }

  // ========== 种子排名操作 ==========

  const handleApplySeeding = () => {
    if (stages[currentStage].players.length < 2) {
      showToast('至少需要 2 名选手才能应用种子排序', 'error')
      return
    }
    applySeeding(currentStage)
    showToast('种子排序已应用！', 'success')
  }

  const handleAutoUpdateSeeds = () => {
    autoUpdateSeedsFromRankings(currentStage)
    showToast('种子排名已根据当前排名自动更新！', 'success')
  }

  // ========== 模板操作 ==========

  const handleSaveTemplate = () => {
    if (!templateNameInput.trim()) {
      showToast('请输入模板名称', 'error')
      return
    }
    saveTemplate(templateNameInput.trim())
    setTemplateNameInput('')
    setTemplates(getTemplates())
    showToast('模板已保存！', 'success')
  }

  const handleLoadTemplate = (id: string) => {
    if (confirm('加载模板将覆盖当前赛事配置，确定继续吗？')) {
      loadTemplate(id)
      setShowTemplateManager(false)
      showToast('模板已加载！', 'success')
    }
  }

  const handleDeleteTemplate = (id: string) => {
    if (confirm('确定删除此模板吗？')) {
      deleteTemplate(id)
      setTemplates(getTemplates())
      showToast('模板已删除', 'info')
    }
  }

  // ========== 自定义赛制切换 ==========

  const handleToggleCustomMode = (enabled: boolean) => {
    if (enabled) {
      // 切换到自定义模式时，如果还没有自定义阶段，初始化一个默认配置
      if (customStages.length === 0) {
        const defaultCustom: CustomStageConfig[] = [
          { id: 'round1', name: 'N进16', playerCount: 24, advanceCount: 16 },
          { id: 'round2', name: '16进8', playerCount: 16, advanceCount: 8 },
          { id: 'round3', name: '8进4', playerCount: 8, advanceCount: 4 },
          { id: 'round4', name: '半决赛', playerCount: 4, advanceCount: 2 },
          { id: 'round5', name: '决赛', playerCount: 2, advanceCount: 1 },
        ]
        setEditingStages(defaultCustom)
        setCustomStages(defaultCustom)
      } else {
        setEditingStages(customStages)
      }
    }
    setCustomMode(enabled)
  }

  const stageData = stages[currentStage]
  const stageIndex = STAGE_ORDER.indexOf(currentStage)
  const advanceCount = getAdvanceCount(currentStage)
  const stageLabel = getStageLabel(currentStage)

  // 阶段导航项渲染
  const renderStageNavItem = (stage: TournamentStage, idx: number) => {
    const isCompleted = stages[stage].locked && stages[stage].players.length > 0
    const isCurrent = stage === currentStage
    const isAvailable = idx === 0 || (stages[STAGE_ORDER[idx - 1]].locked && stages[STAGE_ORDER[idx - 1]].players.length > 0)

    return (
      <button
        key={stage}
        onClick={() => isAvailable && setCurrentStage(stage)}
        disabled={!isAvailable}
        className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
          isCurrent
            ? 'btn-primary press-down'
            : isCompleted
            ? 'glass-panel border-green-400/40 text-green-300 shadow-lg shadow-green-500/10 press-down'
            : isAvailable
            ? 'glass-panel text-white/70 hover:border-white/20 hover:text-white press-down'
            : 'glass-panel opacity-50 text-white/30 cursor-not-allowed'
        }`}
      >
        <span className="flex-1 truncate">{getStageLabel(stage)}</span>
        <span className="text-xs opacity-70">{stages[stage].players.length}人</span>
        {stages[stage].locked && <Lock size={12} className="opacity-70" />}
        {isCompleted && !isCurrent && <span className="text-green-400">✓</span>}
      </button>
    )
  }

  // 小屏幕顶部水平导航
  const renderMobileStageNav = () => (
    <div className="md:hidden flex gap-2 overflow-x-auto pb-2 scrollbar-thin mb-4">
      {STAGE_ORDER.map((stage, idx) => {
        const isCompleted = stages[stage].locked && stages[stage].players.length > 0
        const isCurrent = stage === currentStage
        const isAvailable = idx === 0 || (stages[STAGE_ORDER[idx - 1]].locked && stages[STAGE_ORDER[idx - 1]].players.length > 0)

        return (
          <button
            key={stage}
            onClick={() => isAvailable && setCurrentStage(stage as TournamentStage)}
            disabled={!isAvailable}
            className={`flex-shrink-0 px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
              isCurrent
                ? 'tab-item press-down'
                : isCompleted
                ? 'glass-panel border-green-400/40 text-green-300 shadow-lg shadow-green-500/10 press-down'
                : isAvailable
                ? 'tab-item press-down'
                : 'glass-panel opacity-50 text-white/30 cursor-not-allowed'
            }`}
          >
            <span>{getStageLabel(stage)}</span>
            {stages[stage].locked && <Lock size={10} />}
          </button>
        )
      })}
    </div>
  )

  // 左侧边栏
  const renderSidebar = () => (
    <aside className="hidden md:flex w-72 flex-col glass-panel border-r border-white/5">
      <div className="p-5 border-b border-white/5">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <Trophy className="text-amber-400" size={24} />
          赛事管理
        </h2>
        <div className="mt-2 flex items-center gap-2 text-xs">
          {connStatus === 'connected' ? (
            <Wifi size={13} className="text-green-400" />
          ) : (
            <WifiOff size={13} className={cn(connStatus === 'connecting' ? 'text-yellow-400' : 'text-red-400')} />
          )}
          <span
            className={cn(
              'font-medium',
              connStatus === 'connected' && 'text-green-400',
              connStatus === 'connecting' && 'text-yellow-400',
              connStatus === 'local-only' && 'text-red-400'
            )}
          >
            {connStatus === 'connected' ? '跨设备同步已连接' : connStatus === 'connecting' ? '跨设备同步连接中…' : '仅本设备同步'}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2 stagger-children">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 px-1">阶段导航</h3>
        {STAGE_ORDER.map((stage, idx) => renderStageNavItem(stage, idx))}
      </div>

      {/* 底部计时器 */}
      <div className="p-4 border-t border-white/5">
        {(timerRunning || timerSeconds > 0) ? (
          <div className="glass-panel p-3 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className="text-amber-400" />
              <span className="text-xs font-bold text-white/60">{timerLabel || '计时器'}</span>
            </div>
            <div className={`font-mono text-2xl font-black text-center ${timerSeconds <= 10 && timerRunning ? 'text-red-400 animate-pulse' : 'text-amber-300'}`}>
              {formatTime(timerSeconds)}
            </div>
            <div className="flex gap-2 mt-2">
              {timerRunning ? (
                <button onClick={stopTimer} className="btn-secondary flex-1 text-xs py-2 press-down">暂停</button>
              ) : (
                <button onClick={() => startTimer(timerLabel, timerSeconds)} className="btn-primary press-down flex-1 text-xs py-2">继续</button>
              )}
              <button onClick={resetTimer} className="btn-danger flex-1 text-xs py-2 press-down">重置</button>
            </div>
          </div>
        ) : (
          <div className="glass-panel p-3 space-y-2 rounded-2xl">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-amber-400" />
              <span className="text-xs font-bold text-white/60">计时器</span>
            </div>
            <div className="flex gap-1">
              <input
                type="number"
                min="0"
                max="59"
                value={timerInputMin}
                onChange={(e) => setTimerInputMin(parseInt(e.target.value) || 0)}
                placeholder="分"
                className="input-refined w-full py-2 text-center text-xs"
              />
              <span className="text-white/40 self-center text-xs">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={timerInputSec}
                onChange={(e) => setTimerInputSec(parseInt(e.target.value) || 0)}
                placeholder="秒"
                className="input-refined w-full py-2 text-center text-xs"
              />
            </div>
            <button
              onClick={handleStartTimer}
              disabled={timerInputMin * 60 + timerInputSec <= 0}
              className={cn(
                'w-full py-2 rounded-xl font-bold text-xs transition-all',
                timerInputMin * 60 + timerInputSec <= 0
                  ? 'btn-secondary press-down opacity-50 cursor-not-allowed'
                  : 'btn-primary press-down btn-shimmer'
              )}
            >
              开始计时
            </button>
          </div>
        )}
      </div>
    </aside>
  )

  // 顶部操作栏（赛事进行中）
  const renderTopActionBar = () => (
    <div className="glass-panel p-4 mb-4 flex flex-wrap gap-3 items-center justify-between rounded-2xl">
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-2xl font-black title-gradient">{stageLabel}</h3>
        <span className="text-sm text-white/50">
          {stageData.players.length} 名选手 · 前 {advanceCount} 名晋级
        </span>
        {isCustomMode && (
          <span className="chip">自定义赛制</span>
        )}
        {stageData.locked && (
          <span className="badge-success">已锁定</span>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        {stageData.locked ? (
          <>
            <button onClick={() => toggleStageLock(currentStage)} className="btn-secondary press-down">
              <Unlock size={16} /> 解锁修改
            </button>
            {rankingSnapshots[currentStage] && (
              <button onClick={handleUndoRankings} className="btn-danger press-down">
                <Undo2 size={16} /> 撤销排名
              </button>
            )}
            {stageIndex < STAGE_ORDER.length - 1 && (
              <button onClick={handleNextStage} className="btn-primary press-down btn-shimmer">
                进入下一阶段 <ChevronRight size={16} />
              </button>
            )}
          </>
        ) : previewRankings[currentStage] ? (
          <>
            <button onClick={handleCommitRankings} className="btn-primary press-down btn-shimmer">
              <Lock size={16} /> 确认锁定
            </button>
            <button onClick={handleCancelPreview} className="btn-secondary press-down">
              <X size={16} /> 取消预览
            </button>
          </>
        ) : (
          <>
            <button onClick={handlePreviewRankings} className="btn-primary press-down btn-shimmer">
              <Eye size={16} /> 预览排名
            </button>
            {rankingSnapshots[currentStage] && (
              <button onClick={handleUndoRankings} className="btn-danger press-down">
                <Undo2 size={16} /> 撤销排名
              </button>
            )}
          </>
        )}
        <button onClick={handleBroadcast} className="btn-secondary press-down">
          同步到 OBS
        </button>
        <button onClick={openCountdownDisplay} className="btn-secondary press-down">
          <Timer size={16} /> 倒计时屏
        </button>
        <button onClick={handleSaveHistory} className="btn-secondary press-down">
          <History size={16} /> 保存历史
        </button>
        <button onClick={handleExport} className="btn-secondary press-down">
          <Download size={16} /> 导出
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="btn-secondary press-down">
          <Upload size={16} /> 导入
        </button>
        <button onClick={handleReset} className="btn-danger press-down">
          <RotateCcw size={16} /> 重置赛事
        </button>
      </div>
    </div>
  )

  if (!isTournamentStarted) {
    return (
      <div className="flex min-h-screen page-enter">
        {renderSidebar()}
        <main className="flex-1 overflow-auto px-4 py-6 md:px-8 md:py-8">
          {/* 小屏幕顶部导航 */}
          {renderMobileStageNav()}

          <div className="max-w-4xl mx-auto">
            <div className="glass-panel rounded-2xl p-6 md:p-8">
              <h2 className="text-3xl font-black title-gradient mb-6 flex items-center gap-3 animate-enter">
                <Trophy className="text-amber-400" size={32} />
                赛事设置
              </h2>

              {/* 赛制模式切换 */}
              <div className="glass-panel rounded-2xl p-5 mb-6">
                <h3 className="text-xs font-bold text-white/50 mb-3 uppercase tracking-wider">赛制模式</h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleToggleCustomMode(false)}
                    className={`flex-1 px-5 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm ${
                      !isCustomMode ? 'btn-primary press-down' : 'btn-secondary press-down'
                    }`}
                  >
                    固定赛制（N→16→8→4→2→1）
                  </button>
                  <button
                    onClick={() => handleToggleCustomMode(true)}
                    className={`flex-1 px-5 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-sm ${
                      isCustomMode ? 'btn-primary press-down' : 'btn-secondary press-down'
                    }`}
                  >
                    自定义赛制
                  </button>
                </div>
                {isCustomMode && (
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        setEditingStages(customStages)
                        setShowCustomStageEditor(true)
                      }}
                      className="btn-secondary text-sm press-down"
                    >
                      <Edit3 size={16} /> 编辑自定义阶段
                    </button>
                    {customStages.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {customStages.map((s) => (
                          <span key={s.id} className="chip">
                            {s.name} ({s.playerCount}人 → {s.advanceCount}人)
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 模板管理 */}
              <div className="glass-panel rounded-2xl p-5 mb-6">
                <h3 className="text-xs font-bold text-white/50 mb-3 uppercase tracking-wider">赛事模板</h3>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={templateNameInput}
                    onChange={(e) => setTemplateNameInput(e.target.value)}
                    placeholder="输入模板名称（如：常规赛第3期）"
                    className="input-refined flex-1"
                  />
                  <button onClick={handleSaveTemplate} className="btn-primary press-down btn-shimmer">
                    <Save size={16} /> 保存模板
                  </button>
                  <button
                    onClick={() => {
                      setTemplates(getTemplates())
                      setShowTemplateManager(true)
                    }}
                    className="btn-secondary press-down"
                  >
                    <FolderOpen size={16} /> 管理模板
                  </button>
                </div>
              </div>

              {/* 选手扫码签到 */}
              <div className="glass-panel rounded-2xl p-5 mb-6">
                <h3 className="text-xs font-bold text-white/50 mb-3 uppercase tracking-wider">选手扫码签到</h3>
                <div className="flex gap-2 mb-3 flex-wrap">
                  <button onClick={() => setShowCheckInPanel(true)} className="btn-primary press-down btn-shimmer">
                    <QrCode size={16} /> 打开签到面板（二维码）
                  </button>
                  {checkinNames.length > 0 && (
                    <button
                      onClick={() => {
                        const names = [...checkinNames]
                        addPlayers('n216', names)
                        setCheckinNames([])
                      }}
                      className="btn-primary press-down btn-shimmer"
                    >
                      一键添加签到选手 ({checkinNames.length})
                    </button>
                  )}
                </div>
                {checkinNames.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {checkinNames.map((name, idx) => (
                      <span key={idx} className="badge-info">
                        ✓ {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Import/Export section */}
              <div className="glass-panel rounded-2xl p-5 mb-6">
                <h3 className="text-xs font-bold text-white/50 mb-3 uppercase tracking-wider">数据备份</h3>
                <div className="flex gap-3 flex-wrap">
                  <button onClick={handleExport} className="btn-secondary press-down">
                    <Download size={16} /> 导出 JSON 备份
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="btn-secondary press-down">
                    <Upload size={16} /> 导入 JSON 备份
                  </button>
                  <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
                </div>
              </div>

              {/* 选手录入 */}
              <div className="glass-panel rounded-2xl p-5 mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">
                  {isCustomMode ? (customStages[0]?.name || '第一阶段') : 'N进16'} 选手名单
                </h3>
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setUseBulkMode(false)}
                    className={`px-5 py-2.5 rounded-xl font-medium transition-all text-sm ${
                      !useBulkMode ? 'btn-primary press-down' : 'btn-secondary press-down'
                    }`}
                  >
                    逐个添加
                  </button>
                  <button
                    onClick={() => setUseBulkMode(true)}
                    className={`px-5 py-2.5 rounded-xl font-medium transition-all text-sm ${
                      useBulkMode ? 'btn-primary press-down' : 'btn-secondary press-down'
                    }`}
                  >
                    批量导入
                  </button>
                </div>

                {useBulkMode ? (
                  <div>
                    <textarea
                      value={bulkNameInput}
                      onChange={(e) => setBulkNameInput(e.target.value)}
                      placeholder="每行一个选手名称，例如：&#10;选手A&#10;选手B&#10;选手C"
                      className="input-refined w-full h-44 resize-none"
                    />
                    <button onClick={handleBulkAddPlayers} className="btn-primary press-down mt-3">
                      <Users size={16} /> 导入选手
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={playerNameInput}
                      onChange={(e) => setPlayerNameInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddSinglePlayer()}
                      placeholder="输入选手名称后回车或点击添加"
                      className="input-refined flex-1"
                    />
                    <button onClick={handleAddSinglePlayer} className="btn-primary press-down">
                      <Plus size={16} /> 添加
                    </button>
                  </div>
                )}
              </div>

              {/* 预览选手列表 */}
              {stages.n216.players.length > 0 && (
                <div className="glass-panel rounded-2xl p-5 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white/80">
                      已添加 <span className="text-amber-400 font-bold">{stages.n216.players.length}</span> 名选手
                    </h4>
                    <button
                      onClick={() => {
                        if (confirm('确定要清空所有选手吗？')) {
                          clearPlayers('n216')
                        }
                      }}
                      className="btn-danger text-xs py-1.5 px-3 press-down"
                    >
                      <Trash2 size={12} /> 清空全部
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto stagger-children">
                    {stages.n216.players.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-panel text-white/90 text-sm group hover:border-rose-400/30 transition-colors hover-lift"
                      >
                        {p.seed !== undefined && p.seed !== null && (
                          <span className="text-amber-400 font-black text-xs mr-1">#{p.seed}</span>
                        )}
                        <span className="font-medium">{p.name}</span>
                        <button
                          onClick={() => {
                            if (confirm(`确定要删除选手 "${p.name}" 吗？`)) {
                              removePlayer('n216', p.id)
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-red-400 text-xs ml-1"
                          title="删除选手"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* History section */}
              <div className="mb-6">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="btn-secondary text-sm press-down"
                >
                  <History size={16} /> {showHistory ? '收起历史记录' : '查看历史记录'}
                </button>
                {showHistory && (
                  <div className="mt-3 glass-panel rounded-2xl p-4 max-h-72 overflow-y-auto">
                    {(() => {
                      const history = loadHistory()
                      if (history.length === 0) {
                        return <p className="text-white/40 text-sm text-center py-4">暂无历史记录</p>
                      }
                      return (
                        <div className="space-y-2 stagger-children">
                          {history.map((h) => (
                            <div key={h.id} className="flex items-center justify-between p-3 rounded-xl glass-panel hover-lift">
                              <div>
                                <span className="text-white font-medium">{h.champion}</span>
                                <span className="text-white/50 text-sm ml-3">{h.date}</span>
                              </div>
                              <button
                                onClick={() => deleteHistoryRecord(h.id)}
                                className="btn-danger text-xs py-1.5 px-2.5 press-down"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              if (confirm('确定清空所有历史记录吗？')) {
                                clearHistory()
                              }
                            }}
                            className="btn-danger text-sm w-full mt-2 press-down"
                          >
                            清空所有历史
                          </button>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>

              <button
                onClick={handleStartTournament}
                disabled={stages.n216.players.length < 2}
                className={cn(
                  'w-full py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3',
                  stages.n216.players.length < 2
                    ? 'btn-secondary press-down opacity-50 cursor-not-allowed'
                    : 'btn-primary press-down btn-shimmer hover:-translate-y-0.5'
                )}
              >
                <Trophy size={24} />
                开始赛事 {stages.n216.players.length >= 2 && `（${stages.n216.players.length}人参赛）`}
              </button>
            </div>
          </div>

          {/* 自定义阶段编辑器弹窗 */}
          {showCustomStageEditor && (
            <div
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
              role="dialog"
              aria-modal="true"
            >
              <div className="glass-panel rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <LayoutList size={22} className="text-purple-400" />
                    编辑自定义阶段
                  </h3>
                  <button onClick={handleCancelCustomStageEdit} className="btn-ghost press-down">
                    <X size={22} />
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  {editingStages.map((stage, index) => (
                    <div key={stage.id} className="glass-panel rounded-2xl p-4 hover-lift">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm font-bold text-white/60">阶段 {index + 1}</span>
                        <button onClick={() => handleRemoveCustomStage(stage.id)} className="btn-ghost ml-auto press-down">
                          <Minus size={18} className="text-red-400" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-white/50 block mb-1">阶段名称</label>
                          <input
                            type="text"
                            value={stage.name}
                            onChange={(e) => handleUpdateCustomStage(stage.id, 'name', e.target.value)}
                            className="input-refined"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-white/50 block mb-1">参赛人数</label>
                          <input
                            type="number"
                            min="2"
                            value={stage.playerCount}
                            onChange={(e) => handleUpdateCustomStage(stage.id, 'playerCount', parseInt(e.target.value) || 2)}
                            className="input-refined"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-white/50 block mb-1">晋级人数</label>
                          <input
                            type="number"
                            min="1"
                            value={stage.advanceCount}
                            onChange={(e) => handleUpdateCustomStage(stage.id, 'advanceCount', parseInt(e.target.value) || 1)}
                            className="input-refined"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={handleAddCustomStage} className="btn-secondary w-full mb-3 press-down">
                  <Plus size={18} /> 添加阶段
                </button>

                <div className="flex gap-3">
                  <button onClick={handleCancelCustomStageEdit} className="btn-secondary flex-1 press-down">
                    取消
                  </button>
                  <button onClick={handleSaveCustomStages} className="btn-primary press-down flex-1 btn-shimmer">
                    保存配置
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 模板管理弹窗 */}
          {showTemplateManager && (
            <div
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
              role="dialog"
              aria-modal="true"
            >
              <div className="glass-panel rounded-2xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <FolderOpen size={22} className="text-blue-400" />
                    模板管理
                  </h3>
                  <button onClick={() => setShowTemplateManager(false)} className="btn-ghost press-down">
                    <X size={22} />
                  </button>
                </div>

                {templates.length === 0 ? (
                  <p className="text-white/40 text-center py-8 text-sm">暂无模板</p>
                ) : (
                  <div className="space-y-2 mb-4">
                    {templates.map((t) => (
                      <div key={t.id} className="glass-panel rounded-2xl p-4 flex items-center justify-between hover-lift">
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium truncate">{t.name}</div>
                          <div className="text-white/50 text-xs mt-1">
                            {new Date(t.createdAt).toLocaleString()} · {t.isCustomMode ? '自定义赛制' : '固定赛制'}
                            {t.n216PlayerNames.length > 0 && ` · ${t.n216PlayerNames.length}名选手`}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-3">
                          <button onClick={() => handleLoadTemplate(t.id)} className="btn-primary press-down btn-shimmer text-xs py-1.5 px-3">
                            <FolderOpen size={14} /> 加载
                          </button>
                          <button onClick={() => handleDeleteTemplate(t.id)} className="btn-danger text-xs py-1.5 px-3 press-down">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 签到面板弹窗 */}
          {showCheckInPanel && (() => {
            const isHttps = window.location.protocol === 'https:'
            const wsProto = isHttps ? 'wss://' : 'ws://'
            const wsUrl = `${wsProto}${window.location.hostname}:8765`
            const checkinUrl = `${window.location.origin}${window.location.pathname}?checkin=1&ws=${encodeURIComponent(wsUrl)}`
            return (
              <div
                className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
                role="dialog"
                aria-modal="true"
              >
                <div className="glass-panel rounded-2xl p-8 max-w-sm w-full text-center">
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                    <QrCode className="text-cyan-400" size={24} />
                    扫码签到
                  </h3>
                  <p className="text-sm text-white/50 mb-4">
                    选手扫描二维码后，在签到页输入名字
                  </p>

                  <div className="bg-white p-4 rounded-xl inline-block mb-4">
                    <QRCodeSVG value={checkinUrl} size={200} level="M" />
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="text"
                      readOnly
                      value={checkinUrl}
                      className="input-refined flex-1 text-xs font-mono"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(checkinUrl)
                        showToast('链接已复制', 'success')
                      }}
                      className="btn-secondary text-xs py-2 px-3 press-down"
                    >
                      复制
                    </button>
                  </div>

                  <button onClick={() => setShowCheckInPanel(false)} className="btn-secondary w-full press-down">
                    关闭
                  </button>
                </div>
              </div>
            )
          })()}

        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen page-enter">
      {renderSidebar()}
      <main className="flex-1 overflow-auto px-4 py-6 md:px-8 md:py-8">
        {/* 小屏幕顶部导航 */}
        {renderMobileStageNav()}

        {/* 顶部操作栏 */}
        {renderTopActionBar()}

        {/* 排名预览面板 */}
        {previewRankings[currentStage] && !stageData.locked && (
          <div className="glass-panel rounded-2xl p-4 mb-4 border-l-4 border-yellow-400">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-bold text-white flex items-center gap-2">
                <Eye size={20} className="text-yellow-400" />
                排名预览
              </h4>
              <span className="text-xs text-white/50">仅预览，尚未生效</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-white/50 border-b border-white/10">
                    <th className="text-left py-2 px-2">排名</th>
                    <th className="text-left py-2 px-2">选手</th>
                    <th className="text-left py-2 px-2">分数</th>
                    <th className="text-left py-2 px-2">DX 分数</th>
                    <th className="text-left py-2 px-2">结果</th>
                  </tr>
                </thead>
                <tbody>
                  {[...previewRankings[currentStage]!]
                    .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
                    .map((player) => (
                      <tr
                        key={player.id}
                        className={`border-b border-white/10 ${
                          player.advanced ? 'bg-green-500/10' : player.eliminated ? 'bg-red-500/10' : ''
                        }`}
                      >
                        <td className="py-2 px-2 font-mono">{player.rank ?? '-'}</td>
                        <td className="py-2 px-2 font-medium">{player.name}</td>
                        <td className="py-2 px-2 font-mono">{player.score?.toFixed(4) ?? '-'}</td>
                        <td className="py-2 px-2 font-mono">{player.dxScore || '-'}</td>
                        <td className="py-2 px-2">
                          {player.advanced ? (
                            <span className="text-green-400 text-xs">晋级</span>
                          ) : player.eliminated ? (
                            <span className="text-red-400 text-xs">淘汰</span>
                          ) : (
                            <span className="text-white/40 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 种子排序操作栏 */}
        {!stageData.locked && (
          <div className="glass-panel rounded-2xl p-4 mb-4 flex flex-wrap gap-3 items-center">
            <Hash size={20} className="text-yellow-400" />
            <span className="text-sm font-semibold text-white/70">种子排序</span>
            <button onClick={handleApplySeeding} className="btn-primary press-down btn-shimmer text-sm">
              <Hash size={16} /> 应用标准种子排序
            </button>
            {stageData.players.some(p => p.rank !== null) && (
              <button onClick={handleAutoUpdateSeeds} className="btn-secondary text-sm press-down">
                <RotateCcw size={16} /> 根据排名自动更新种子
              </button>
            )}
            <span className="text-xs text-white/40">
              已设置种子排名的选手将按标准 bracket 分配位置，未设置种子的选手随机填充
            </span>
          </div>
        )}

        {/* 选手录入（未锁定时） */}
        {!stageData.locked && (
          <div className="glass-panel rounded-2xl p-4 mb-4 flex flex-wrap gap-2">
            <input
              type="text"
              value={playerNameInput}
              onChange={(e) => setPlayerNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSinglePlayer()}
              placeholder="输入选手名称后回车或点击添加"
              className="input-refined flex-1"
            />
            <button onClick={handleAddSinglePlayer} className="btn-primary press-down">
              <Plus size={16} /> 添加选手
            </button>
          </div>
        )}

        {/* 阶段比赛用曲 */}
        {stageData.songs.length > 0 && (
          <div className="glass-panel rounded-2xl p-4 mb-4">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Music size={20} className="text-purple-400" />
              阶段比赛用曲
            </h3>
            <div className="flex flex-wrap gap-3">
              {stageData.songs.map((s) => (
                <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-xl glass-panel">
                  {s.song ? (
                    <>
                      <img src={s.song.cover} alt={s.song.name} className="w-10 h-10 rounded-lg object-cover" />
                      <div>
                        <p className="text-white text-sm font-bold">{s.song.name}</p>
                        <p className="text-white/50 text-xs">{s.label} · Lv.{s.song.level}{s.song.isPlus ? '+' : ''} · {s.song.difficulty}</p>
                      </div>
                    </>
                  ) : (
                    <span className="text-white/40 text-sm">{s.label}（未设置）</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* N进16 按种子分组（赛事开始后才可操作） */}
        {currentStage === 'n216' && stageData.players.length >= 16 && (
          <div className="glass-panel rounded-2xl p-4 mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Swords size={20} className="text-blue-400" />
              <div>
                <h3 className="text-base font-bold text-white">小组赛分组</h3>
                <p className="text-xs text-white/40">按种子排名两人为一组，高种子对阵低种子</p>
              </div>
            </div>
            <button
              onClick={() => {
                const result = createGroupsN216()
                if (result.message) showToast(result.message, result.success ? 'success' : 'info')
              }}
              className="btn-primary press-down btn-shimmer text-sm"
            >
              <Swords size={16} />
              {stageData.groups.length > 0 ? '重新按种子分组' : '按种子生成分组'}
            </button>
          </div>
        )}

        {/* 分组展示 */}
        {stageData.groups.length > 0 && (
          <div className="mb-4 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <Swords size={20} className="text-blue-400" />
              <h3 className="text-lg font-bold text-white">分组对阵</h3>
            </div>
            {stageData.groups.map((group) => (
              <div key={group.id} className="glass-panel rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-bold">{group.name}</h4>
                  <span className="text-white/50 text-xs">{group.playerIds.length} 人</span>
                </div>

                {/* 分组歌曲 */}
                {group.songs.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {group.songs.map((s) => (
                      <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-xl glass-panel">
                        {s.song ? (
                          <>
                            <img src={s.song.cover} alt={s.song.name} className="w-9 h-9 rounded-lg object-cover" />
                            <span className="text-white text-xs font-bold">{s.song.name}</span>
                            <span className="text-white/40 text-[11px]">{s.label}</span>
                          </>
                        ) : (
                          <span className="text-white/40 text-xs">{s.label}（未设置）</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* 分组选手 */}
                <div className="space-y-2">
                  {group.playerIds.map((pid) => {
                    const p = stageData.players.find((pl) => pl.id === pid)
                    if (!p) return null
                    return (
                      <div key={pid} className="flex items-center gap-3 px-3 py-2 rounded-xl glass-panel">
                        {p.seed && <span className="text-yellow-400 font-mono text-xs w-6">#{p.seed}</span>}
                        <span className="flex-1 text-white text-sm font-bold">{p.name}</span>

                        {stageData.locked ? (
                          <>
                            <span className="text-green-300 font-mono text-sm w-24 text-right">{p.score?.toFixed(4) ?? '-'}</span>
                            <span className="text-blue-300 font-mono text-sm w-20 text-right">{p.dxScore || '-'}</span>
                          </>
                        ) : (
                          <>
                            <input
                              type="number"
                              step="0.0001"
                              min="0"
                              max="500"
                              value={p.score ?? ''}
                              onChange={(e) => handleScoreChange(p.id, e.target.value)}
                              placeholder="完成率"
                              className="input-refined w-28 text-right py-1.5 font-mono text-sm"
                            />
                            <input
                              type="text"
                              value={p.dxScore}
                              onChange={(e) => updatePlayer(currentStage, p.id, { dxScore: e.target.value })}
                              placeholder="DX分数"
                              className="input-refined w-28 text-right py-1.5 text-blue-300 font-mono text-sm"
                            />
                          </>
                        )}

                        {p.rank !== null && (
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                            p.rank === 1 ? 'bg-yellow-500 text-yellow-900' : 'bg-white/5 text-white/60'
                          }`}>
                            {p.rank}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 创建分组按钮（未锁定时） */}
        {!stageData.locked && stageData.players.length > 0 && stageData.groups.length === 0 && (
          <div className="glass-panel rounded-2xl p-4 mb-4 flex flex-wrap gap-3 items-center">
            <Swords size={20} className="text-blue-400" />
            <span className="text-sm font-semibold text-white/70">分组设置</span>
            {currentStage === '16to8' && (
              <button
                onClick={() => {
                  const res = createGroups16to8()
                  showToast(res.message ?? '', res.success ? 'success' : 'info')
                }}
                className="btn-primary press-down btn-shimmer text-sm"
              >
                <Swords size={16} /> 按种子自动配对 (1vs9...)
              </button>
            )}
            {currentStage === '8to4' && (
              <button
                onClick={() => {
                  const res = shuffleGroups8to4()
                  showToast(res.message ?? '', res.success ? 'success' : 'info')
                }}
                className="btn-primary press-down btn-shimmer text-sm"
              >
                <Shuffle size={16} /> 随机抽签分两组
              </button>
            )}
            {currentStage === 'semi' && (
              <button
                onClick={() => {
                  const res = createGroupsSemi()
                  showToast(res.message ?? '', res.success ? 'success' : 'info')
                }}
                className="btn-primary press-down btn-shimmer text-sm"
              >
                <Swords size={16} /> 1v3 / 2v4 对阵
              </button>
            )}
          </div>
        )}

        {/* 分数表格 */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.03]">
                <th className="px-4 py-3 text-left text-sm font-bold text-white/60 w-16">排名</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-white/60 w-16">种子</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-white/60">选手</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-white/60 w-40">完成率</th>
                <th className="px-4 py-3 text-right text-sm font-bold text-white/60 w-40">DX分数</th>
              </tr>
            </thead>
            <tbody>
              {stageData.players.map((player, index) => (
                <tr
                  key={player.id}
                  className={`border-t border-white/10 transition-colors ${
                    index % 2 === 0 ? 'bg-white/5' : 'bg-white/[0.02]'
                  }`}
                >
                  <td className="px-4 py-3">
                    {player.rank !== null ? (
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-black ${
                          player.rank === 1
                            ? 'bg-yellow-500 text-yellow-900'
                            : player.rank === 2
                            ? 'bg-white/70 text-gray-800'
                            : player.rank === 3
                            ? 'bg-orange-600 text-orange-100'
                            : 'bg-white/5 text-white/60'
                        }`}
                      >
                        {player.rank}
                      </span>
                    ) : (
                      <span className="text-white/40">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {stageData.locked ? (
                      <span className="text-yellow-400 font-mono text-sm">
                        {player.seed !== undefined && player.seed !== null ? `#${player.seed}` : '-'}
                      </span>
                    ) : (
                      <input
                        type="number"
                        min="1"
                        value={player.seed ?? ''}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val === '') {
                            setPlayerSeed(currentStage, player.id, null)
                          } else {
                            const num = parseInt(val)
                            if (!isNaN(num) && num > 0) {
                              setPlayerSeed(currentStage, player.id, num)
                            }
                          }
                        }}
                        placeholder="#"
                        className="input-refined w-16 py-2 text-yellow-400 font-mono text-sm"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white font-medium">{player.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    {stageData.locked ? (
                      <span className="text-right block text-white font-mono">
                        {player.score !== null ? player.score.toFixed(4) : '-'}
                      </span>
                    ) : (
                      <input
                        type="number"
                        step="0.0001"
                        min="0"
                        max="500"
                        value={player.score ?? ''}
                        onChange={(e) => handleScoreChange(player.id, e.target.value)}
                        placeholder="0.0000"
                        className="input-refined w-full text-right py-2 font-mono text-sm"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {stageData.locked ? (
                      <span className="text-right block text-blue-300 font-mono">
                        {player.dxScore || '-'}
                      </span>
                    ) : (
                      <input
                        type="text"
                        value={player.dxScore}
                        onChange={(e) => updatePlayer(currentStage, player.id, { dxScore: e.target.value })}
                        placeholder="自由填写"
                        className="input-refined w-full text-right py-2 text-blue-300 font-mono text-sm"
                      />
                    )}
                  </td>
                </tr>
              ))}
              {stageData.players.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-white/40">
                    暂无选手
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 上一阶段晋级选手单元块展示 */}
        {stageIndex > 0 && (() => {
          const prevStage = STAGE_ORDER[stageIndex - 1]
          const prevStageData = stages[prevStage]
          if (!prevStageData || prevStageData.players.length === 0) return null
          const advancedPlayers = prevStageData.players
            .filter((p) => p.advanced)
            .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
          if (advancedPlayers.length === 0) return null

          return (
            <div className="mt-6 glass-panel rounded-2xl p-6 border border-green-500/40">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Trophy className="text-yellow-400" size={22} />
                {getStageLabel(prevStage)} 晋级名单（前 {getAdvanceCount(prevStage)} 名）
              </h3>
              <div className="flex flex-wrap gap-3">
                {advancedPlayers.map((p) => (
                  <div
                    key={p.id}
                    className={`flex flex-col items-center gap-2 px-5 py-4 rounded-xl min-w-[140px] glass-panel ${
                      prevStage === '16to8'
                        ? 'border-blue-400/50 shadow-lg shadow-blue-500/10'
                        : 'border-green-400/40 shadow-lg shadow-green-500/10'
                    }`}
                  >
                    {prevStage === '16to8' && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/30 border border-blue-400/50 text-blue-300 text-xs font-bold">
                        8强
                      </span>
                    )}
                    <span className={`w-10 h-10 rounded-full font-black flex items-center justify-center ${
                      p.rank === 1 ? 'bg-yellow-500 text-yellow-900' :
                      p.rank === 2 ? 'bg-white/70 text-gray-800' :
                      p.rank === 3 ? 'bg-orange-600 text-orange-100' :
                      'bg-white/5 text-white/60'
                    }`}>
                      {p.rank}
                    </span>
                    <span className="text-white font-bold text-center">{p.name}</span>
                    <span className="text-green-300 font-mono text-sm">{(p.score ?? 0).toFixed(4)}</span>
                    {p.dxScore && (
                      <span className="text-blue-300 font-mono text-xs">DX: {p.dxScore}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* 当前阶段已锁定：显示晋级单元块 */}
        {stageData.locked && stageData.players.filter((p) => p.advanced).length > 0 && (
          <div className="mt-6 glass-panel rounded-2xl p-6 border border-green-500/40">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="text-yellow-400" size={22} />
              {stageLabel} 晋级名单（前 {advanceCount} 名）
            </h3>
            <div className="flex flex-wrap gap-3">
              {stageData.players
                .filter((p) => p.advanced)
                .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
                .map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col items-center gap-2 px-5 py-4 rounded-xl glass-panel border-green-400/40 shadow-lg shadow-green-500/10 min-w-[140px]"
                  >
                    <span className={`w-10 h-10 rounded-full font-black flex items-center justify-center ${
                      p.rank === 1 ? 'bg-yellow-500 text-yellow-900' :
                      p.rank === 2 ? 'bg-white/70 text-gray-800' :
                      p.rank === 3 ? 'bg-orange-600 text-orange-100' :
                      'bg-white/5 text-white/60'
                    }`}>
                      {p.rank}
                    </span>
                    <span className="text-white font-bold text-center">{p.name}</span>
                    <span className="text-green-300 font-mono text-sm">{(p.score ?? 0).toFixed(4)}</span>
                    {p.dxScore && (
                      <span className="text-blue-300 font-mono text-xs">DX: {p.dxScore}</span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
