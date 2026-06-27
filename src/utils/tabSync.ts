import { useEffect, useState } from 'react'

/**
 * Tab sync utility for cross-tab / cross-device communication.
 * Uses localStorage events for same-browser tabs and WebSocket for cross-device sync.
 *
 * This module does NOT perform side effects on import. The WebSocket connection
 * is established lazily on the first call to subscribeSyncEvents or broadcastSyncEvent.
 */

export type SyncEventType = 'draw' | 'clear' | 'import' | 'select' | 'multiSelect' | 'tournament' | 'stageSongs' | 'playerSelections' | 'syncPlayers' | 'upcoming'

export interface SyncEventPayload {
  songs?: unknown
  labels?: string[]
  type?: string
  stages?: unknown
  currentStage?: unknown
  stage?: unknown
  groupId?: unknown
  // 赛事全状态同步
  isTournamentStarted?: boolean
  timerRunning?: boolean
  timerSeconds?: number
  timerLabel?: string
  isCustomMode?: boolean
  customStages?: unknown
  // playerSelections: 多玩家选曲在多设备间同步
  selections?: unknown
  // syncPlayers: 从赛事同步选手到多玩家模式
  players?: unknown
  sourceStage?: unknown
}

export interface SyncEvent {
  type: SyncEventType
  payload: SyncEventPayload
  timestamp: number
  source?: string
}

const SYNC_KEY = 'smc-gacha-sync'

// Dynamically get WebSocket URL from current hostname and protocol
function getWsUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:8081'
  const host = window.location.hostname
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${host}:8081`
}

const clientId = Math.random().toString(36).slice(2, 10)

let ws: WebSocket | null = null
let wsConnected = false
let connectionState: 'connecting' | 'connected' | 'local-only' = 'connecting'

const listeners: Array<(event: SyncEvent) => void> = []
const statusListeners: Array<(status: typeof connectionState) => void> = []

// 重连计时器和退避策略
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_DELAY = 15000

function setConnectionState(next: typeof connectionState): void {
  if (connectionState === next) return
  connectionState = next
  statusListeners.forEach((cb) => cb(connectionState))
}

function scheduleReconnect(): void {
  if (reconnectTimer) return
  reconnectAttempts += 1
  // 指数退避: 1.5s, 3s, 6s, 12s, 最大 15s
  const delay = Math.min(1500 * Math.pow(2, reconnectAttempts - 1), MAX_RECONNECT_DELAY)
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connectWebSocket()
  }, delay)
}

function cleanupWebSocket(): void {
  if (!ws) return
  try {
    ws.onopen = null
    ws.onmessage = null
    ws.onclose = null
    ws.onerror = null
    ws.close()
  } catch {
    // ignore
  }
  ws = null
}

/**
 * Try to connect to WebSocket server for cross-device sync.
 * Includes automatic reconnection with exponential backoff.
 */
function connectWebSocket(): void {
  if (typeof window === 'undefined') return

  // 如果已经有连接或在连接中，避免重复连接
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) return

  cleanupWebSocket()
  setConnectionState('connecting')

  try {
    ws = new WebSocket(getWsUrl())

    ws.onopen = () => {
      wsConnected = true
      reconnectAttempts = 0
      setConnectionState('connected')
      // 新设备连接后主动请求一次最新赛事状态
      ws?.send(JSON.stringify({ type: 'requestSync', payload: {}, timestamp: Date.now(), source: clientId }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        // 过滤内部同步请求
        if (data.type === 'requestSync') return
        const syncEvent = data as SyncEvent
        // Ignore events from ourselves
        if (syncEvent.source === clientId) return
        listeners.forEach((cb) => cb(syncEvent))
      } catch {
        // ignore parse errors
      }
    }

    ws.onclose = () => {
      wsConnected = false
      setConnectionState('local-only')
      scheduleReconnect()
    }

    ws.onerror = () => {
      // WebSocket not available, fall back to localStorage only
      wsConnected = false
      setConnectionState('local-only')
    }
  } catch {
    // WebSocket not supported
    setConnectionState('local-only')
    scheduleReconnect()
  }
}

function ensureConnected(): void {
  if (typeof window === 'undefined') return
  if (ws || reconnectTimer) return
  connectWebSocket()
}

/**
 * Send event via both localStorage (same browser) and WebSocket (cross-device)
 */
function broadcastEvent(event: SyncEvent): void {
  if (typeof window === 'undefined') return

  const data: SyncEvent = {
    ...event,
    timestamp: Date.now(),
    source: clientId,
  }

  // Broadcast via localStorage for same-browser tabs
  localStorage.setItem(SYNC_KEY, JSON.stringify(data))

  // Broadcast via WebSocket for cross-device sync
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data))
  }
}

/**
 * Main tab: broadcast a sync event
 */
export function broadcastSyncEvent(type: SyncEventType, payload: SyncEventPayload): void {
  ensureConnected()
  broadcastEvent({ type, payload, timestamp: Date.now(), source: clientId })
}

/**
 * Subscribe to sync events (works for both localStorage and WebSocket)
 */
export function subscribeSyncEvents(callback: (event: SyncEvent) => void): () => void {
  ensureConnected()
  listeners.push(callback)

  // Also listen for localStorage events (same browser tabs)
  const storageHandler = (e: StorageEvent) => {
    if (e.key === SYNC_KEY && e.newValue) {
      try {
        const event: SyncEvent = JSON.parse(e.newValue)
        // Ignore our own events
        if (event.source === clientId) return
        listeners.forEach((cb) => cb(event))
      } catch {
        // ignore
      }
    }
  }
  window.addEventListener('storage', storageHandler)

  return () => {
    const idx = listeners.indexOf(callback)
    if (idx >= 0) listeners.splice(idx, 1)
    window.removeEventListener('storage', storageHandler)
  }
}

/**
 * Check if WebSocket is connected (cross-device sync available)
 */
export function isWSSyncAvailable(): boolean {
  return wsConnected
}

/**
 * Get connection status text
 */
export function getConnectionStatus(): typeof connectionState {
  return connectionState
}

/**
 * React hook to subscribe to connection status changes without polling.
 */
export function useSyncStatus(): typeof connectionState {
  const [status, setStatus] = useState<typeof connectionState>(() => {
    if (typeof window === 'undefined') return 'connecting'
    return connectionState
  })

  useEffect(() => {
    ensureConnected()
    // 注册时立即同步当前状态
    setStatus(connectionState)
    statusListeners.push(setStatus)
    return () => {
      const idx = statusListeners.indexOf(setStatus)
      if (idx >= 0) statusListeners.splice(idx, 1)
    }
  }, [])

  return status
}

/**
 * Manually trigger a reconnection attempt. Useful after network recovery.
 */
export function reconnectSync(): void {
  if (typeof window === 'undefined') return
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  connectWebSocket()
}
