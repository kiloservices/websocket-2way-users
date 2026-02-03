const { WebSocketServer } = require('ws');
const express = require('express');
const app = express();

const port = process.env.PORT || 8080;

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Monitor</title>
            <style>
                body { background: #111; color: white; font-family: sans-serif; text-align: center; padding: 50px; }
                .user { background: #222; padding: 15px; margin: 10px auto; border-radius: 10px; border-left: 4px solid red; max-width: 400px; }
                .name { font-weight: bold; color: #ff4444; }
            </style>
        </head>
        <body>
            <h1>Active Users</h1>
            <div id="list">No users online</div>
            <script>
                const ws = new WebSocket((location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host);
                ws.onmessage = (e) => {
                    const data = JSON.parse(e.data);
                    const list = document.getElementById('list');
                    list.innerHTML = "";
                    data.users.forEach(u => {
                        list.innerHTML += '<div class="user"><div class="name">' + u.name + '</div><div>ID: ' + u.id + '</div></div>';
                    });
                };
            </script>
        </body>
        </html>
    `);
});

const server = app.listen(port, () => console.log('Online'));
const wss = new WebSocketServer({ server });
let players = new Map();

wss.on('connection', (ws) => {
    ws.on('message', (rawData) => {
        try {
            const data = JSON.parse(rawData);
            if (data.type === "join") {
                players.set(ws, { name: data.name, id: data.id });
                broadcast();
            }
        } catch (e) {}
    });
    ws.on('close', () => {
        players.delete(ws);
        broadcast();
    });
});

function broadcast() {
    const list = Array.from(players.values());
    const payload = JSON.stringify({ type: "update", users: list });
    wss.clients.forEach(c => {
        if (c.readyState === 1) c.send(payload);
    });
}
