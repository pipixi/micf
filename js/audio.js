let localStream = null;
let currentSender = null;

const bitrateMap = {
    high: 128000,
    standard: 64000,
    low: 32000
};

export function getLocalStream() {
    return localStream;
}

// Issue 2 fix: Allow main.js to set the sender
export function setSender(sender) {
    currentSender = sender;
}

export async function startAudioStream(constraints = {}) {
    try {
        const audioConstraints = {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            ...constraints // Override with provided
        };

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: false
        });
        localStream = stream;
        return stream;
    } catch (err) {
        console.error('获取麦克风失败:', err);
        throw err;
    }
}

export function togglePause() {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            return audioTrack.enabled;
        }
    }
    return false;
}

export async function setAudioQuality(quality) {
    if (!currentSender) {
        console.warn('No sender set for audio quality adjustment');
        return false;
    }
    const bitrate = bitrateMap[quality] || 64000;
    const params = currentSender.getParameters();
    if (!params.encodings) params.encodings = [{}];
    params.encodings[0].maxBitrate = bitrate;
    try {
        await currentSender.setParameters(params);
        console.log('Audio quality set to:', quality, bitrate);
        return true;
    } catch (e) {
        console.error('Bitrate set failed:', e);
        return false;
    }
}

export function stopAudio() {
    if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
        localStream = null;
        currentSender = null;
    }
}