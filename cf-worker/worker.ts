/**
 * Cloudflare Worker + D1 签到同步服务
 *
 * API:
 *   POST /checkin  { name: "PlayerName" }  → 签到
 *   GET  /checkin?since=TIMESTAMP           → 获取自指定时间以来的所有签到
 *   GET  /health                             → 健康检查
 */

export interface Env {
  DB: D1Database
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    // Health check
    if (url.pathname === '/health') {
      return jsonResponse({ status: 'ok' })
    }

    // Submit check-in
    if (url.pathname === '/checkin' && request.method === 'POST') {
      try {
        const body = await request.json() as { name?: string }
        if (!body.name || body.name.trim().length === 0) {
          return jsonResponse({ error: 'name is required' }, 400)
        }
        const name = body.name.trim().slice(0, 50)

        // Check duplicate
        const existing = await env.DB
          .prepare('SELECT id FROM checkins WHERE name = ? ORDER BY created_at DESC LIMIT 1')
          .bind(name)
          .first()
        if (existing) {
          return jsonResponse({ error: 'already checked in', duplicate: true })
        }

        // Insert
        const result = await env.DB
          .prepare('INSERT INTO checkins (name) VALUES (?)')
          .bind(name)
          .run()

        return jsonResponse({ success: true, id: result.meta.last_row_id, name })
      } catch (err) {
        return jsonResponse({ error: String(err) }, 500)
      }
    }

    // Get check-ins since timestamp
    if (url.pathname === '/checkin' && request.method === 'GET') {
      const since = url.searchParams.get('since')
      const sinceTs = since ? parseInt(since, 10) : 0

      try {
        const rows = await env.DB
          .prepare('SELECT name, created_at FROM checkins WHERE created_at > ? ORDER BY created_at ASC')
          .bind(sinceTs)
          .all()
        return jsonResponse({ checkins: rows.results })
      } catch (err) {
        return jsonResponse({ error: String(err) }, 500)
      }
    }

    return jsonResponse({ error: 'not found' }, 404)
  },
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
