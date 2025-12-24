// signaling.js - 使用 WebSocket
// 自动推断 WS 地址：如果是 https 则 wss, 否则 ws
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const SIGNALING_URL = `${protocol}//${window.location.host}`;

let socket = null;
let callbacks = {};
let room = '';
let myId = Math.random().toString(36).substr(2, 9);

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

    console.log(`Connecting to Signaling Server at ${SIGNALING_URL}...`);
    socket = new WebSocket(SIGNALING_URL);

    socket.onopen = () => {
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
        console.error('WebSocket Error:', e);
        // Convert Event object to readable message
        const errorMsg = e.message || '无法连接到服务器';
        callbacks.onError?.(errorMsg);
    };

    socket.onclose = (e) => {
        console.log('WebSocket closed, code:', e.code);
        // Notify UI about disconnect
        callbacks.onDisconnect?.();

        // Only auto-reconnect if not a clean close
        if (e.code !== 1000 && e.code !== 1001) {
            setTimeout(() => connect(room, callbacks), 3000);
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