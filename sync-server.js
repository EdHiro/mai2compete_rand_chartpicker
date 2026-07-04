import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8081 });

// 缓存最新的赛事全量状态，新客户端连接时自动推送
let lastTournamentState = null;

wss.on('connection', (ws) => {
  console.log('Client connected');

  // 新设备连接时立即同步当前赛事进度
  if (lastTournamentState) {
    ws.send(lastTournamentState);
  }

  ws.on('message', (message) => {
    const text = message.toString();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return;
    }

    // 客户端请求同步时，返回缓存的最新赛事状态
    if (data.type === 'requestSync') {
      if (lastTournamentState) {
        ws.send(lastTournamentState);
      }
      return;
    }

    // 缓存赛事全量状态
    if (data.type === 'tournament') {
      lastTournamentState = text;
    }

    // Broadcast to all other clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(text);
      }
    });
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

console.log(`Sync server started on ws://localhost:${wss.options.port}`);
