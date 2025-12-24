import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SSL_KEY = process.env.SSL_KEY || 'certs/server.key';
const SSL_CERT = process.env.SSL_CERT || 'certs/server.crt';

const app = express();

// Serve static files
app.use(express.static(__dirname));
app.get('/health', (req, res) => res.send('OK'));

const HTTPS_PORT = process.env.HTTPS_PORT || 443;
const HTTP_PORT = process.env.PORT || 80;

let mainServer;

if (existsSync(SSL_KEY) && existsSync(SSL_CERT)) {
    console.log('🔒 HTTPS mode enabled');

    // HTTPS Server
    const options = {
        key: readFileSync(SSL_KEY),
        cert: readFileSync(SSL_CERT)
    };
    mainServer = createHttpsServer(options, app);
    mainServer.listen(HTTPS_PORT, '0.0.0.0', () => {
        console.log(`HTTPS Server running on port ${HTTPS_PORT}`);
    });

    // HTTP Redirect Server
    const httpApp = express();
    httpApp.get('*', (req, res) => {
        res.redirect(`https://${req.headers.host}${req.url}`);
    });
    createServer(httpApp).listen(HTTP_PORT, '0.0.0.0', () => {
        console.log(`HTTP Redirect Server running on port ${HTTP_PORT}`);
    });

} else {
    console.log('⚠️ HTTPS certs not found, falling back to HTTP');
    // HTTP Server
    mainServer = createServer(app);
    mainServer.listen(HTTP_PORT, '0.0.0.0', () => {
        console.log(`HTTP Server running on port ${HTTP_PORT}`);
    });
}

// WebSocket Signaling Server (Attach to main server)
const wss = new WebSocketServer({ server: mainServer });

const rooms = new Map();

wss.on('connection', (ws) => {
    ws.room = null;
    ws.id = Math.random().toString(36).substr(2, 9); // Simple server-side ID tracking

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'get_rooms') {
                const roomList = Array.from(rooms.entries()).map(([id, set]) => ({ id, count: set.size }));
                ws.send(JSON.stringify({ type: 'rooms_list', rooms: roomList }));
            } else if (data.type === 'join') {
                const { roomId } = data;
                if (!roomId) return;

                if (ws.room) leaveRoom(ws);

                ws.room = roomId;
                if (!rooms.has(roomId)) rooms.set(roomId, new Set());
                rooms.get(roomId).add(ws);

                console.log(`Client joined room: ${roomId}, total: ${rooms.get(roomId).size}`);

                // Notify peer count
                ws.send(JSON.stringify({
                    type: 'joined',
                    peerCount: rooms.get(roomId).size,
                    sender: 'server'
                }));
            } else if (data.type === 'leave') {
                leaveRoom(ws);
            } else {
                // Forward to others
                if (ws.room && rooms.has(ws.room)) {
                    rooms.get(ws.room).forEach(client => {
                        if (client !== ws && client.readyState === 1) {
                            client.send(message);
                        }
                    });
                }
            }
        } catch (e) {
            console.error('Signaling error:', e);
        }
    });

    ws.on('close', () => {
        leaveRoom(ws);
    });
});

function leaveRoom(ws) {
    if (ws.room && rooms.has(ws.room)) {
        rooms.get(ws.room).delete(ws);
        if (rooms.get(ws.room).size === 0) {
            rooms.delete(ws.room);
        }
    }
}
