// recording.js - Audio Recording Module using MediaRecorder API

let mediaRecorder = null;
let recordedChunks = [];
let recordingStartTime = null;
let timerInterval = null;

/**
 * Start recording the given audio stream
 * @param {MediaStream} stream - The audio stream to record
 * @param {Function} onTimeUpdate - Callback for timer updates (receives formatted time string)
 * @returns {boolean} - Whether recording started successfully
 */
export function startRecording(stream, onTimeUpdate) {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        console.warn('Already recording');
        return false;
    }

    if (!stream) {
        console.error('No stream provided for recording');
        return false;
    }

    try {
        // Prefer webm/opus, fallback to other formats
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : MediaRecorder.isTypeSupported('audio/webm')
                ? 'audio/webm'
                : 'audio/mp4';

        recordedChunks = [];
        mediaRecorder = new MediaRecorder(stream, { mimeType });

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            clearInterval(timerInterval);
            timerInterval = null;
        };

        mediaRecorder.onerror = (event) => {
            console.error('MediaRecorder error:', event.error);
            stopRecording();
        };

        mediaRecorder.start(1000); // Collect data every second
        recordingStartTime = Date.now();

        // Start timer
        if (onTimeUpdate) {
            timerInterval = setInterval(() => {
                const elapsed = Date.now() - recordingStartTime;
                onTimeUpdate(formatTime(elapsed));
            }, 1000);
            onTimeUpdate('00:00'); // Initial
        }

        console.log('Recording started with mimeType:', mimeType);
        return true;
    } catch (err) {
        console.error('Failed to start recording:', err);
        return false;
    }
}

/**
 * Stop recording and return the recorded blob
 * @returns {Promise<Blob|null>} - The recorded audio blob, or null if no recording
 */
export function stopRecording() {
    return new Promise((resolve) => {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') {
            console.warn('No active recording to stop');
            resolve(null);
            return;
        }

        mediaRecorder.onstop = () => {
            clearInterval(timerInterval);
            timerInterval = null;

            if (recordedChunks.length === 0) {
                resolve(null);
                return;
            }

            const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType });
            recordedChunks = [];
            console.log('Recording stopped, blob size:', blob.size);
            resolve(blob);
        };

        mediaRecorder.stop();
    });
}

/**
 * Download the recorded blob as a file
 * @param {Blob} blob - The recorded audio blob
 * @param {string} filename - The filename (without extension)
 */
export function downloadRecording(blob, filename = 'recording') {
    if (!blob) {
        console.warn('No blob to download');
        return;
    }

    const ext = blob.type.includes('webm') ? 'webm' : 'mp4';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${formatTimestamp()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Check if currently recording
 * @returns {boolean}
 */
export function isRecording() {
    return mediaRecorder && mediaRecorder.state === 'recording';
}

/**
 * Format milliseconds to MM:SS
 */
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Format current timestamp for filename
 */
function formatTimestamp() {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
}
