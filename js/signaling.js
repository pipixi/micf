// signaling.js - 使用 WebSocket
// 自动推断 WS 地址：如果是 https 则 wss, 否则 ws
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const DEFAULT_SIGNALING_URL = `${protocol}//${window.location.host}`;

// 公用服务器列表（备选方案）
const PUBLIC_SERVERS = [
    'wss://0.peerjs.com', // Alternative public server
];

let socket = null;
let callbacks = {};
let room = '';
let myId = Math.random().toString(36).substr(2, 9);
let currentServerUrl = DEFAULT_SIGNALING_URL;
let serverAttemptIndex = 0;
let connectionAttempts = 0;
const MAX_ATTEMPTS = 3;

export function connect(roomId, cb) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        room = roomId;
        callbacks = cb;
        if (room) {
            socket.send(JSON.stringify({ type: 'join', roomId: room, id: myId }));
        }
        getRooms();
        return;
    }

    room = roomId;
    callbacks = cb;
    connectionAttempts = 0;
    serverAttemptIndex = 0;

    connectToServer();
}

function connectToServer() {
    if (connectionAttempts >= MAX_ATTEMPTS) {
        const errorMsg = `无法连接到任何服务器，已尝试 ${MAX_ATTEMPTS} 次`;
        console.error(errorMsg);
        callbacks.onError?.(errorMsg);
        return;
    }

    connectionAttempts++;

    // 优先尝试默认服务器，失败后尝试公用服务器
    let urlToTry = DEFAULT_SIGNALING_URL;
    if (serverAttemptIndex > 0 && serverAttemptIndex <= PUBLIC_SERVERS.length) {
        urlToTry = PUBLIC_SERVERS[serverAttemptIndex - 1];
    }

    currentServerUrl = urlToTry;
    console.log(`尝试连接到服务器 (尝试 ${connectionAttempts}/${MAX_ATTEMPTS}): ${urlToTry}`);

    socket = new WebSocket(urlToTry);

    // 设置超时
    const connectionTimeout = setTimeout(() => {
        if (socket && socket.readyState !== WebSocket.OPEN) {
            console.warn(`连接超时: ${urlToTry}`);
            socket.close();
            serverAttemptIndex++;
            connectToServer();
        }
    }, 5000);

    socket.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log(`✅ 成功连接到: ${urlToTry}`);
        callbacks.onConnected?.(urlToTry);
        
        if (room) {
            socket.send(JSON.stringify({ type: 'join', roomId: room, id: myId }));
        }
        getRooms();
    };

    socket.onmessage = async (event) => {
        try {
            let data = event.data;
            if (data instanceof Blob) {
                data = await data.text();
            }
            const msg = JSON.parse(data);
            handleMessage(msg);
        } catch (e) {
            console.error('Signaling message parse error:', e);
        }
    };

    socket.onerror = (e) => {
        clearTimeout(connectionTimeout);
        const errorMsg = e.message || '无法连接到服务器';
        console.error('WebSocket Error:', errorMsg, 'URL:', urlToTry);
    };

    socket.onclose = (e) => {
        clearTimeout(connectionTimeout);
        console.log('WebSocket closed, code:', e.code, 'URL:', urlToTry);
        
        // 如果是默认服务器的连接关闭，尝试公用服务器
        if (urlToTry === DEFAULT_SIGNALING_URL && e.code !== 1000 && e.code !== 1001) {
            console.warn('默认服务器连接失败，尝试切换到公用服务器');
            serverAttemptIndex++;
            connectToServer();
        } else if (e.code !== 1000 && e.code !== 1001 && serverAttemptIndex < PUBLIC_SERVERS.length) {
            // 公用服务器连接失败，继续尝试下一个
            serverAttemptIndex++;
            connectToServer();
        } else {
            // 所有服务器都已尝试或正常关闭
            callbacks.onDisconnect?.();
        }
    };
}

function handleMessage(msg) {
    // Prevent handling own messages if echoed back (server should filter, but safety first)
    if (msg.sender === myId) return;

    if (msg.type === 'joined') callbacks.onJoined?.(msg.peerCount);
    if (msg.type === 'rooms_list') callbacks.onRoomsList?.(msg.rooms);
    if (msg.type === 'hello') callbacks.onHello?.();
    if (msg.type === 'offer') callbacks.onOffer?.(msg.offer);
    if (msg.type === 'answer') callbacks.onAnswer?.(msg.answer);
    if (msg.type === 'ice') callbacks.onIce?.(msg.ice);
}

export function getRooms() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'get_rooms' }));
    }
}

export function send(message) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        message.sender = myId;
        message.roomId = room; // Ensure server knows which room context
        socket.send(JSON.stringify(message));
    } else {
        console.warn('Socket not open, cannot send:', message);
    }
}

export function leave() {
    if (socket && socket.readyState === WebSocket.OPEN && room) {
        socket.send(JSON.stringify({ type: 'leave', roomId: room, id: myId }));
        room = '';
    }
}

export function close() {
    if (socket) {
        socket.close();
        socket = null;
    }
}

export function getCurrentServerUrl() {
    return currentServerUrl;
}