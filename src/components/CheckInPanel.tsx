import { useState, useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useTournamentStore } from '@/store/tournamentStore'
import { QrCode, Users, Copy, CheckCircle2 } from 'lucide-react'

interface CheckInPanelProps {
  onSwitchPage?: (target: 'home' | 'selector' | 'tournament') => void
  checkinNames: string[]
}

/**
 * 生成 WebSocket 签到 URL
 * 自动根据当前页面地址推断 ws://hostname:8765
 */
function buildWsCheckinUrl(): string {
  const isHttps = window.location.protocol === 'https:'
  const wsProto = isHttps ? 'wss://' : 'ws://'
  const wsUrl = `${wsProto}${window.location.hostname}:8765`
  const checkinUrl = `${window.location.origin}${window.location.pathname}?checkin=1&ws=${encodeURIComponent(wsUrl)}`
  return checkinUrl
}

/**
 * 选手扫码签到面板
 * 生成 WebSocket 签到二维码，选手扫码后通过 WebSocket 提交签到
 */
export default function CheckInPanel({ checkinNames }: CheckInPanelProps) {
  const { stages, setPlayerNames } = useTournamentStore()
  const [showQR, setShowQR] = useState(false)
  const [copied, setCopied] = useState(false)

  const checkinUrl = useMemo(() => buildWsCheckinUrl(), [])

  // 应用签到名单到选手列表
  const handleApplyCheckin = () => {
    const targetStage = 'n216'
    const existingNames = stages[targetStage].players.map((p) => p.name)
    // 合并已存在的选手和新签到的选手
    const newNames = checkinNames.filter((n) => !existingNames.includes(n))
    const allNames = [...existingNames, ...newNames]
    if (allNames.length > 0) {
      setPlayerNames(targetStage, allNames)
      alert(`已将 ${newNames.length} 名签到选手添加到列表！`)
    } else {
      alert('没有新选手需要添加')
    }
  }

  // 获取已签到的选手数量
  const checkinCount = checkinNames.length

  // 获取已存在的选手列表
  const existingPlayers = stages.n216.players

  return (
    <div className="glass-panel rounded-3xl p-6 border border-white/10 animate-enter">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <QrCode className="text-cyan-400" size={22} />
        选手扫码签到
      </h3>

      <p className="text-sm text-white/50 mb-4">
        选手扫描二维码后，在签到页输入自己的名字完成签到。签到数据通过 WebSocket 实时同步。
      </p>

      {/* 签到状态 */}
      <div className="mb-4 p-3 glass-panel rounded-2xl border border-white/10 flex items-center justify-between hover-lift">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-white/40" />
          <span className="text-sm text-white/70">已签到人数</span>
        </div>
        <span className="text-lg font-bold text-cyan-300">{checkinCount}</span>
      </div>

      {/* 签到选手列表 */}
      {checkinNames.length > 0 && (
        <div className="mb-4 p-3 glass-panel rounded-2xl border border-white/10 hover-lift">
          <div className="flex flex-wrap gap-2 mb-3 stagger-children">
            {checkinNames.map((name, idx) => {
              const isExisting = existingPlayers.some((p) => p.name === name)
              return (
                <span
                  key={idx}
                  className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                    isExisting ? 'badge-success' : 'badge-info'
                  }`}
                >
                  {isExisting && <CheckCircle2 size={10} />}
                  {name}
                </span>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setShowQR(!showQR)}
          className="flex-1 btn-primary press-down btn-shimmer"
        >
          <QrCode size={18} />
          {showQR ? '隐藏二维码' : '显示签到二维码'}
        </button>
        <button
          onClick={handleApplyCheckin}
          className="btn-secondary press-down"
          disabled={checkinCount === 0}
        >
          应用签到名单
        </button>
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-panel rounded-3xl p-8 border border-white/10 max-w-sm w-full text-center">
            <h3 className="text-xl font-bold text-white mb-2">扫码签到</h3>
            <p className="text-sm text-white/50 mb-6">
              使用手机扫描二维码，在签到页输入自己的名字
            </p>

            <div className="bg-white p-6 rounded-2xl inline-block mb-4">
              <QRCodeSVG
                value={checkinUrl}
                size={220}
                level="M"
                includeMargin={false}
              />
            </div>

            {/* Copy URL */}
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
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="btn-secondary text-xs px-3 py-2 press-down"
              >
                {copied ? '✓' : <Copy size={14} />}
              </button>
            </div>

            <button
              onClick={() => setShowQR(false)}
              className="btn-secondary w-full press-down"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
