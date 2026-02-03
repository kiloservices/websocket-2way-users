const { WebSocketServer } = require('ws');
const express = require('express');
const app = express();

const port = process.env.PORT || 8080;

// Health check for Cron-job.org to keep it alive
app.get('/', (req, res) => res.send('ESP Server is Online'));

const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

const wss = new WebSocketServer({ server });
let activePlayers = new Map();

wss.on('connection', (ws) => {
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);
            if (msg.type === "join") {
                // Store player by their connection
                activePlayers.set(ws, { name: msg.name, id: msg.id });
                console.log(`User Joined: ${msg.name}`);
                broadcast();
            }
        } catch (e) {
            console.error("Invalid data received");
        }
    });

    ws.on('close', () => {
        const player = activePlayers.get(ws);
        if (player) {
            console.log(`User Left: ${player.name}`);
            activePlayers.delete(ws);
            broadcast();
        }
    });
});

function broadcast() {
    const list = Array.from(activePlayers.values());
    const data = JSON.stringify({ type: "update", users: list });
    wss.clients.forEach(client => {
        if (client.readyState === 1) client.send(data);
    });
}
