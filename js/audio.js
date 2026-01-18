let localStream = null;
let currentSender = null;

const bitrateMap = {
    high: 320000,
    standard: 128000,
    low: 64000
};



// Issue 2 fix: Allow main.js to set the sender
export function setSender(sender) {
    currentSender = sender;
}

let audioCtx;
let mixerDest;
let sources = new Map(); // id -> { sourceNode, stream }

export function getLocalStream() {
    return mixerDest ? mixerDest.stream : localStream;
}

// Initialize Web Audio Context and Mixer
function ensureMixer() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        mixerDest = audioCtx.createMediaStreamDestination();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return mixerDest.stream;
}

export async function addSource(stream, type = 'mic') {
    ensureMixer();
    const sourceId = type + '_' + Date.now();

    const sourceNode = audioCtx.createMediaStreamSource(stream);
    sourceNode.connect(mixerDest);

    sources.set(sourceId, { sourceNode, stream, type });
    return sourceId;
}

export function removeSource(sourceId) {
    const source = sources.get(sourceId);
    if (source) {
        source.sourceNode.disconnect();
        // Only stop tracks if it's not the last mic or specific logic? 
        // Usually we stop tracks when removing source.
        source.stream.getTracks().forEach(t => t.stop());
        sources.delete(sourceId);
        return true;
    }
    return false;
}

export function getSources() {
    return Array.from(sources.entries()).map(([id, data]) => ({
        id,
        type: data.type,
        label: data.stream.getAudioTracks()[0].label
    }));
}

export async function startAudioStream(constraints = {}) {
    try {
        // Updated to support profiles
        // constraints can now include { profile: 'music' } or standard constraints
        const isMusic = constraints.profile === 'music';

        // Default to Speech constraints if not music
        let audioConstraints = {};

        if (isMusic) {
            console.log('Using High Fidelity Music Mode');
            audioConstraints = {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false,
                channelCount: 2,
                sampleRate: 48000,
                sampleSize: 16
            };
        } else {
            audioConstraints = {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            };
        }

        // Merge any manual overrides passed in 'constraints' (excluding our custom 'profile' key)
        const { profile, ...overrides } = constraints;
        audioConstraints = { ...audioConstraints, ...overrides };

        // 1. Get Mic Stream
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: false
        });

        // 2. Add to Mixer
        ensureMixer();
        await addSource(stream, 'mic');

        localStream = mixerDest.stream;
        return localStream;
    } catch (err) {
        console.error('获取麦克风失败:', err);
        throw err;
    }
}

export async function addSystemAudio() {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true, // Required for getDisplayMedia usually
            audio: true
        });

        // We only want audio. IMPORTANT: Do NOT stop the video track, as it often kills the audio track too
        // in 'getDisplayMedia' sessions (browser behavior). Just disable it or ignore it.
        stream.getVideoTracks().forEach(t => {
            t.enabled = false; // Mute video
            // We keep it running so the session stays active
        });

        if (stream.getAudioTracks().length === 0) {
            throw new Error('No audio track selected');
        }

        // Add to mixer
        const id = await addSource(stream, 'system');

        // Listen for track ending (user stopped sharing via browser UI)
        stream.getAudioTracks()[0].onended = () => {
            // Dispatch event or callback to UI to remove from list?
            // For now just remove from mixer internal
            removeSource(id);
            // We need a way to notify UI. Dispatch global event?
            window.dispatchEvent(new CustomEvent('audio-source-removed', { detail: { id } }));
        };

        return id;
    } catch (err) {
        console.error('Failed to get system audio:', err);
        throw err;
    }
}

export async function applyMicConstraints(constraints) {
    const promises = [];
    for (const [id, data] of sources) {
        if (data.type === 'mic') {
            const track = data.stream.getAudioTracks()[0];
            if (track) {
                // Check capabilities if available to avoid OverconstrainedError
                const supported = track.getCapabilities ? track.getCapabilities() : {};
                const safeConstraints = {};

                for (const key in constraints) {
                    // Only apply if supported or if getCapabilities is missing (try best effort)
                    // Note: Boolean constraints usually don't throw unless required (exact), 
                    // but applyConstraints can be picky.
                    if (!track.getCapabilities || key in supported) {
                        safeConstraints[key] = constraints[key];
                    }
                }

                if (Object.keys(safeConstraints).length > 0) {
                    console.log(`Applying constraints to mic ${id}:`, safeConstraints);
                    promises.push(track.applyConstraints(safeConstraints)
                        .catch(e => console.warn(`Failed to apply constraints to ${id}:`, e)));
                }
            }
        }
    }
    return Promise.all(promises);
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

export async function getOutputDevices() {
    try {
        // Only request permission if labels might be missing
        const devicesInitial = await navigator.mediaDevices.enumerateDevices();
        const hasLabels = devicesInitial.some(d => d.label);

        if (!hasLabels) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(t => t.stop());
            } catch (e) {
                console.warn('Permission denied or no mic, labels may be unavailable');
            }
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter(d => d.kind === 'audiooutput');
    } catch (err) {
        console.error('Failed to list devices:', err);
        return [];
    }
}

export async function setOutputDevice(elementId, deviceId) {
    const element = document.getElementById(elementId);
    if (!element) return false;

    if (typeof element.setSinkId !== 'function') {
        console.warn('Browser does not support setSinkId');
        return false;
    }

    try {
        await element.setSinkId(deviceId);
        console.log(`Audio output set to device: ${deviceId}`);
        return true;
    } catch (err) {
        console.error('Failed to set audio output:', err);
        return false;
    }
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
    sources.forEach((data, id) => {
        data.sourceNode.disconnect();
        data.stream.getTracks().forEach(t => t.stop());
    });
    sources.clear();

    if (mixerDest) {
        mixerDest = null;
    }
    if (audioCtx) {
        audioCtx.close();
        audioCtx = null;
    }

    localStream = null;
    currentSender = null;
}