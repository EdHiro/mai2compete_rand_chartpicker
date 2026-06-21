/**
 * 签到同步工具 - 使用 Cloudflare Worker + D1 实现跨设备实时同步
 *
 * 签到页 (CheckInPage):
 *   POST /checkin { name: "xxx" }  → 提交签到
 *
 * 控制台 (TournamentControl):
 *   GET  /checkin?since=TIMESTAMP  → 轮询获取新签到
 */

export interface CheckinRecord {
  name: string
  created_at: number
}

export interface CheckinApiConfig {
  /** Cloudflare Worker URL, e.g. "https://tournament-checkin-api.your-subdomain.workers.dev" */
  apiUrl: string
}

/**
 * 提交签到
 */
export async function submitCheckin(name: string, config: CheckinApiConfig): Promise<{ success: boolean; duplicate?: boolean; error?: string }> {
  try {
    const res = await fetch(`${config.apiUrl}/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
    const data = await res.json() as { success?: boolean; duplicate?: boolean; error?: string }
    return {
      success: res.ok && data.success === true,
      duplicate: data.duplicate === true,
      error: data.error,
    }
  } catch {
    return { success: false, error: '网络请求失败' }
  }
}

/**
 * 获取指定时间以来的签到记录
 */
export async function fetchCheckinsSince(since: number, config: CheckinApiConfig): Promise<CheckinRecord[]> {
  try {
    const res = await fetch(`${config.apiUrl}/checkin?since=${since}`)
    if (!res.ok) return []
    const data = await res.json() as { checkins?: CheckinRecord[] }
    return data.checkins ?? []
  } catch {
    return []
  }
}
