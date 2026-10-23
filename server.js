const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
app.use(express.static(path.join(__dirname)));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'Runaway multiplayer' }));
const clients = new Map();
function send(ws, data) { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); }
function broadcastRoom(room) {
  const players = [];
  for (const [ws, p] of clients) if (p.room === room) players.push({ id:p.id, name:p.name, x:p.x, y:p.y, z:p.z, ry:p.ry });
  for (const [ws, p] of clients) if (p.room === room) send(ws, { type:'snapshot', id:p.id, players });
}
wss.on('connection', ws => {
  const p = { id: Math.random().toString(36).slice(2, 11), name:'Игрок', room:'', x:0, y:0, z:0, ry:0 };
  clients.set(ws, p);
  ws.on('message', raw => {
    if (raw.length > 4096) return;
    let m; try { m = JSON.parse(raw.toString()); } catch { return; }
    if (m.type === 'join') {
      p.room = String(m.room || 'Комната 1').trim().slice(0,24) || 'Комната 1';
      p.name = String(m.name || 'Игрок').trim().slice(0,16) || 'Игрок';
      broadcastRoom(p.room);
    } else if (m.type === 'move' && p.room) {
      for (const k of ['x','y','z','ry']) if (Number.isFinite(m[k])) p[k] = Math.max(-500, Math.min(500, m[k]));
      broadcastRoom(p.room);
    }
  });
  ws.on('close', () => { clients.delete(ws); if (p.room) broadcastRoom(p.room); });
  ws.on('error', () => {});
});
const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => console.log(`Runaway server listening on ${port}`));
