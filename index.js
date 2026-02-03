const { WebSocketServer } = require('ws');
const express = require('express');
const app = express();

const port = process.env.PORT || 8080;

// THE DASHBOARD WEB PAGE
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Roblox Executor Monitor</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f0f0f; color: #e0e0e0; display: flex; flex-direction: column; align-items: center; padding: 40px; }
                h1 { color: #ffffff; margin-bottom: 30px; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid #ff4b2b; padding-bottom: 10px; }
                #user-container { width: 100%; max-width: 600px; display: grid; gap: 15px; }
                .user-card { background: #1a1a1a; padding: 20px; border-radius: 12px; border-left: 6px solid #ff4b2b; box-shadow: 0 4px 15px rgba(0,0,0,0.5); transition: transform 0.2s; }
                .user-card:hover { transform: translateY(-3px); }
                .username { font-size: 1.4em; font-weight: bold; color: #ff4b2b; margin-bottom: 5px; }
                .userid { font-family: monospace; color: #888; background: #252525; padding: 4px 8px; border-radius: 4px; display: inline-block; }
                .status-badge { float: right; font-size: 0.7em; background: #4caf50; color: white; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; }
                .empty-msg { font-style: italic; color: #555; text-align: center; margin-top: 50px; }
            </style>
        </head>
        <body>
            <h1>Live Script Users</h1>
            <div id="user-container">
                <div class="empty-msg">No active users found. Execute the script to appear here.</div>
            </div>

            <script>
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const ws = new WebSocket(protocol + '//' + window.location.host);

                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    if (data.type === "update") {
                        const container = document.getElementById('user-container');
                        container.innerHTML = ""; 

                        if (data.users.length === 0) {
                            container.innerHTML = '<div class="empty-msg">No active users found.</div>';
                            return;
                        }

                        data.users.forEach(user => {
                            container.innerHTML += \`
                                <div class="user-card">
                                    <span class="status-badge">Active</span>
                                    <div class="username">\${user.name}</div>
                                    <div class="userid">ID: \${user.id}</div>
                                </div>
                            \`;
                        });
                    }
                };
            </script>
        </body>
        </html>
    `);
});

const server = app.listen(port, () => console.log(\`Server started on port \${port}\`));
const wss = new WebSocketServer({ server });
let players = new Map();

wss.on('connection', (ws) => {
    ws.on('message', (rawData) => {
        try {
            const data = JSON.parse(rawData);
            if (data.type === "join") {
                // Save name and id to the connection
                players.set(ws, { name: data.name, id: data.id });
                broadcast();
            }
        } catch (e) { console.log("Data Error"); }
    });

    ws.on('close', () => {
        players.delete(ws);
        broadcast(); // This clears the user from the website automatically
    });
});

function broadcast() {
    const userList = Array.from(players.values());
    const payload = JSON.stringify({ type: "update", users: userList });
    wss.clients.forEach(client => {
        if (client.readyState === 1) client.send(payload);
    });
}
