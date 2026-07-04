/**
 * Lightweight WebSocket server for tournament check-in synchronization.
 * 
 * Usage: node ws-server.js
 * 
 * Listens on port 8765 by default (configurable via WS_PORT env var).
 * Supports two client roles:
 *   - admin: receives check-in events (TournamentControl.tsx)
 *   - player: sends check-in events (CheckInPage.tsx)
 * 
 * Protocol (JSON messages):
 *   Client -> Server: { type: 'checkin', name: 'PlayerName' }
 *   Server -> Admin:  { type: 'checkin', name: 'PlayerName', timestamp: 1234567890 }
 */

import { WebSocketServer } from 'ws'
import http from 'http'

const PORT = parseInt(process.env.WS_PORT || '8765', 10)

// Create HTTP server (for health check)
const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', clients: wss.clients.size }))
    return
  }
  res.writeHead(404)
  res.end('Not Found')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws) => {
  console.log(`[${new Date().toLocaleTimeString()}] Client connected. Total: ${wss.clients.size}`)

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString())
      if (msg.type === 'checkin' && msg.name) {
        // Broadcast to all connected clients (admins will pick it up)
        const broadcastMsg = JSON.stringify({
          type: 'checkin',
          name: msg.name,
          timestamp: Date.now(),
        })
        wss.clients.forEach((client) => {
          if (client.readyState === 1) {
            client.send(broadcastMsg)
          }
        })
        console.log(`  Check-in: ${msg.name}`)
      }
    } catch {
      // Ignore invalid messages
    }
  })

  ws.on('close', () => {
    console.log(`[${new Date().toLocaleTimeString()}] Client disconnected. Total: ${wss.clients.size}`)
  })

  ws.on('error', (err) => {
    console.error(`  WebSocket error:`, err.message)
  })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Tournament WebSocket Server running on port ${PORT}`)
  console.log(`  Health check: http://localhost:${PORT}/health\n`)
})
