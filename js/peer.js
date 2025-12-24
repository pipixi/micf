let pc = null;
let onIceCallback = null;
let onTrackCallback = null;

export function createPeerConnection(iceCb, trackCb) {
    onIceCallback = iceCb;
    onTrackCallback = trackCb;

    pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.onicecandidate = e => {
        if (e.candidate) onIceCallback(e.candidate);
    };

    pc.ontrack = e => {
        onTrackCallback(e.streams[0]);
    };

    return pc;
}

export function getPeerConnection() {
    return pc;
}

export function addTrack(track, stream) {
    if (pc) {
        return pc.addTrack(track, stream);
    }
    return null;
}

export async function createOffer() {
    if (pc) return await pc.createOffer();
    return null;
}

export async function createAnswer() {
    if (pc) return await pc.createAnswer();
    return null;
}

export async function setLocalDescription(desc) {
    if (pc) await pc.setLocalDescription(desc);
}

export async function setRemoteDescription(desc) {
    if (pc) await pc.setRemoteDescription(desc);
}

export async function closeConnection() {
    if (pc) {
        pc.close();
        pc = null;
    }
}