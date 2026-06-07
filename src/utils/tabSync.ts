/**
 * Tab sync utility for cross-tab / cross-device communication.
 * Uses localStorage events for same-browser tabs and WebSocket for cross-device sync.
 */

export type SyncEventType = 'draw' | 'clear' | 'import' | 'select' | 'multiSelect'

export interface SyncEventPayload {
  songs?: unknown
}

export interface SyncEvent {
  type: SyncEventType
  payload: SyncEventPayload
  timestamp: number
  source?: string
}

const SYNC_KEY = 'smc-gacha-sync'

// Dynamically get WebSocket URL from current hostname
function getWsUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:8081'
  const host = window.location.hostname
  return `ws://${host}:8081`
}

let ws: WebSocket | null = null
let wsConnected = false
let clientId = Math.random().toString(36).slice(2, 10)

const listeners: Array<(event: SyncEvent) => void> = []

/**
 * Try to connect to WebSocket server for cross-device sync
 */
function connectWebSocket(): void {
  if (typeof window === 'undefined') return

  try {
    ws = new WebSocket(getWsUrl())

    ws.onopen = () => {
      wsConnected = true
    }

    ws.onmessage = (event) => {
      try {
        const data: SyncEvent = JSON.parse(event.data)
        // Ignore events from ourselves
        if (data.source === clientId) return
        listeners.forEach(cb => cb(data))
      } catch {
        // ignore parse errors
      }
    }

    ws.onclose = () => {
      wsConnected = false
      ws = null
    }

    ws.onerror = () => {
      // WebSocket not available, fall back to localStorage only
      ws = null
      wsConnected = false
    }
  } catch {
    // WebSocket not supported
  }
}

// Auto-connect on load
if (typeof window !== 'undefined') {
  connectWebSocket()
}

/**
 * Send event via both localStorage (same browser) and WebSocket (cross-device)
 */
function broadcastEvent(event: SyncEvent): void {
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
  broadcastEvent({ type, payload, timestamp: Date.now(), source: clientId })
}

/**
 * Subscribe to sync events (works for both localStorage and WebSocket)
 */
export function subscribeSyncEvents(callback: (event: SyncEvent) => void): () => void {
  listeners.push(callback)

  // Also listen for localStorage events (same browser tabs)
  const storageHandler = (e: StorageEvent) => {
    if (e.key === SYNC_KEY && e.newValue) {
      try {
        const event: SyncEvent = JSON.parse(e.newValue)
        // Ignore our own events
        if (event.source === clientId) return
        listeners.forEach(cb => cb(event))
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
export function getConnectionStatus(): string {
  if (wsConnected) return 'connected'
  if (ws === null && typeof window !== 'undefined') {
    // WebSocket failed, localStorage only
    return 'local-only'
  }
  return 'connecting'
}
