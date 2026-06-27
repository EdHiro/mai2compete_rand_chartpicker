import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, X, Send } from 'lucide-react'

/**
 * 获取 WebSocket 服务器地址
 * 优先从 URL query ?ws=xxx 读取，否则根据当前页面地址自动推断
 */
function getWsUrl(): string {
  const params = new URLSearchParams(window.location.search)
  const wsParam = params.get('ws')
  if (wsParam) return wsParam

  const isHttps = window.location.protocol === 'https:'
  const protocol = isHttps ? 'wss://' : 'ws://'
  const host = window.location.hostname
  return `${protocol}${host}:8765`
}

export default function CheckInPage() {
  const [name, setName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const wsUrl = getWsUrl()
    let ws: WebSocket

    const connect = () => {
      setWsStatus('connecting')
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        setWsStatus('connected')
      }

      ws.onclose = () => {
        setWsStatus('disconnected')
        // 5秒后重连
        setTimeout(connect, 5000)
      }

      ws.onerror = () => {
        setWsStatus('disconnected')
      }

      wsRef.current = ws
    }

    connect()

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [])

  const handleSubmit = () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('请输入你的名字')
      return
    }
    if (trimmedName.length > 20) {
      setError('名字不能超过20个字符')
      return
    }
    if (wsStatus !== 'connected') {
      setError('WebSocket 未连接，请检查网络后重试')
      return
    }

    try {
      wsRef.current?.send(JSON.stringify({ type: 'checkin', name: trimmedName }))
      setSubmitted(true)
    } catch {
      setError('签到失败，请重试')
    }
  }

  const handleReset = () => {
    setName('')
    setSubmitted(false)
    setError('')
  }

  const statusColor =
    wsStatus === 'connected'
      ? 'text-green-300'
      : wsStatus === 'connecting'
      ? 'text-yellow-300'
      : 'text-red-300'

  const statusDotBg =
    wsStatus === 'connected'
      ? 'bg-green-300'
      : wsStatus === 'connecting'
      ? 'bg-yellow-300 animate-pulse'
      : 'bg-red-300'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden page-enter">
      {/* Hero 背景装饰 */}
      <div className="absolute inset-0 hero-grid pointer-events-none opacity-60" />
      <div className="absolute inset-0 radial-glow pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-pink-500/5 pointer-events-none" />

      <div className="relative w-full max-w-md z-10">
        <div className="glass-panel rounded-3xl overflow-hidden">
          {/* 顶部渐变装饰条 */}
          <div className="top-gradient-bar" />

          <div className="p-8">
            {/* 标题区 */}
            <div className="text-center mb-6 animate-enter-scale">
              <h1 className="text-3xl font-black font-orbitron title-gradient mb-2 tracking-wider">
                选手签到
              </h1>
              <p className="text-white/60 text-sm font-rajdhani">输入你的名字完成签到</p>
            </div>

            {/* WebSocket 状态指示 */}
            <div className="mb-6 flex items-center justify-center gap-2 text-sm">
              <span className={`status-dot ${statusDotBg} ${statusColor}`} />
              <span className={`font-rajdhani font-semibold ${statusColor}`}>
                {wsStatus === 'connected' ? '已连接' : wsStatus === 'connecting' ? '连接中...' : '已断开'}
              </span>
            </div>

            {submitted ? (
              <div className="text-center py-6 animate-fadeIn">
                <div className="relative mx-auto mb-5 w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-green-400/20 animate-pulse" />
                  <div className="absolute inset-2 rounded-full bg-green-400/10" />
                  <CheckCircle2 size={56} className="relative text-green-300 drop-shadow-[0_0_16px_rgba(74,222,128,0.6)]" />
                </div>
                <h2 className="text-2xl font-bold font-orbitron text-green-300 mb-2">签到成功！</h2>
                <p className="text-white/60 mb-6 font-rajdhani">你的名字已记录</p>
                <button onClick={handleReset} className="btn-secondary press-down">
                  继续签到
                </button>
              </div>
            ) : (
              <div className="space-y-5 animate-fadeIn">
                {error && (
                  <div className="error-banner">
                    <X size={16} className="shrink-0" />
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-rajdhani font-semibold text-white/70 mb-2">
                    选手名字
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      setError('')
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="请输入你的参赛名字"
                    maxLength={20}
                    disabled={wsStatus !== 'connected'}
                    className="input-refined text-lg"
                    autoFocus
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={wsStatus !== 'connected'}
                  className="btn-primary w-full text-base flex items-center justify-center gap-2 press-down"
                >
                  <Send size={18} /> 确认签到
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-white/40 text-xs mt-5 font-rajdhani tracking-widest">
          赛事签到系统
        </p>
      </div>
    </div>
  )
}
